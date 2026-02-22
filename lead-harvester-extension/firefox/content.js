/* ============================================
   LeadHarvest — Content Script
   Google Maps Lead Scraper
   ============================================ */

(function () {
  'use strict';

  // Prevent double-injection
  if (window.__leadHarvestInjected) return;
  window.__leadHarvestInjected = true;

  // ---- Constants ----
  const FREE_DAILY_LIMIT = 25;
  const STORAGE_KEYS = {
    leads: 'lh_leads',
    dailyCount: 'lh_daily_count',
    dailyDate: 'lh_daily_date',
    totalLifetime: 'lh_total_lifetime',
    isPremium: 'lh_is_premium',
    licenseKey: 'lh_license_key',
  };

  // ---- State ----
  let scrapedLeads = [];
  let isScraping = false;
  let isVisitingWebsites = false;
  let visitProgress = { current: 0, total: 0 };
  let panelVisible = true;

  // ---- Utility: Storage helpers ----
  function storageGet(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }

  function storageSet(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }

  // ---- Utility: Date string ----
  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  // ---- Freemium: Check daily limit ----
  async function getDailyUsage() {
    const data = await storageGet([
      STORAGE_KEYS.dailyCount,
      STORAGE_KEYS.dailyDate,
      STORAGE_KEYS.isPremium,
    ]);
    const today = todayStr();
    if (data[STORAGE_KEYS.dailyDate] !== today) {
      await storageSet({
        [STORAGE_KEYS.dailyCount]: 0,
        [STORAGE_KEYS.dailyDate]: today,
      });
      return { count: 0, isPremium: !!data[STORAGE_KEYS.isPremium] };
    }
    return {
      count: data[STORAGE_KEYS.dailyCount] || 0,
      isPremium: !!data[STORAGE_KEYS.isPremium],
    };
  }

  async function incrementDailyCount(amount) {
    const usage = await getDailyUsage();
    const newCount = usage.count + amount;
    await storageSet({ [STORAGE_KEYS.dailyCount]: newCount });
    // Also bump lifetime total
    const ltData = await storageGet([STORAGE_KEYS.totalLifetime]);
    const newLifetime = (ltData[STORAGE_KEYS.totalLifetime] || 0) + amount;
    await storageSet({ [STORAGE_KEYS.totalLifetime]: newLifetime });
    return newCount;
  }

  async function canScrape() {
    const usage = await getDailyUsage();
    if (usage.isPremium) return { allowed: true, remaining: Infinity };
    const remaining = FREE_DAILY_LIMIT - usage.count;
    return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
  }

  // ---- DOM Selectors for Google Maps ----
  // These target the business result cards in the left panel
  const SELECTORS = {
    // Main feed container that holds result cards
    feedContainer: 'div[role="feed"]',
    // Individual result items
    resultItems: 'div[role="feed"] > div > div > a[href*="/maps/place/"]',
    // Alternative: the clickable result cards
    resultCards:
      'div[role="article"], div.Nv2PK, a.hfpxzc',
    // Business name
    businessName:
      'div.qBF1Pd, div.fontHeadlineSmall, span.fontHeadlineSmall',
    // Rating
    rating: 'span.MW4etd, span[role="img"][aria-label*="star"]',
    // Review count
    reviewCount: 'span.UY7F9',
    // Category
    category:
      'button[jsaction*="category"] span, span.mgr77e span, div.W4Efsd:first-child span:nth-child(2)',
    // Address text spans
    address: 'div.W4Efsd span[style*="color"], span.W4Efsd',
    // Phone - look in aria-labels and text
    phone: 'button[data-tooltip*="phone"], span[style*="color"]',
    // Website link
    websiteLink: 'a[data-value="Website"], a[aria-label*="Website"]',
    // Hours
    hours:
      'span[aria-label*="hours"], span[aria-label*="Hours"], div.t39EBf',
    // Detail panel (when a single business is clicked)
    detailPanel: 'div[role="main"]',
    // Detail panel name
    detailName: 'h1.DUwDvf, h1.fontHeadlineLarge',
    // Detail phone
    detailPhone:
      'button[data-item-id*="phone"] div.fontBodyMedium, button[aria-label*="Phone"]',
    // Detail website
    detailWebsite:
      'a[data-item-id="authority"], a[aria-label*="Website"]',
    // Detail address
    detailAddress:
      'button[data-item-id="address"] div.fontBodyMedium, button[aria-label*="Address"]',
    // Detail hours
    detailHours:
      'div[aria-label*="hours"] table, div.t39EBf',
    // Detail category
    detailCategory: 'button[jsaction*="category"]',
  };

  // ---- Scraping Logic ----

  /**
   * Extract text content from an element safely.
   */
  function getText(el) {
    return el ? el.textContent.trim() : '';
  }

  /**
   * Extract phone number from text using regex.
   */
  function extractPhone(text) {
    if (!text) return '';
    // Match common phone patterns
    const phoneRegex =
      /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
    const matches = text.match(phoneRegex);
    return matches ? matches[0] : '';
  }

  /**
   * Extract email addresses from text.
   */
  function extractEmails(text) {
    if (!text) return [];
    const emailRegex =
      /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);
    return matches ? [...new Set(matches)] : [];
  }

  /**
   * Extract rating number from aria-label or text.
   */
  function extractRating(el) {
    if (!el) return '';
    const ariaLabel = el.getAttribute('aria-label') || '';
    const ratingMatch = ariaLabel.match(/([\d.]+)\s*star/i);
    if (ratingMatch) return ratingMatch[1];
    const text = el.textContent.trim();
    const numMatch = text.match(/^[\d.]+$/);
    return numMatch ? numMatch[0] : text;
  }

  /**
   * Extract review count from text like "(123)" or "123 reviews".
   */
  function extractReviewCount(el) {
    if (!el) return '';
    const text = el.textContent.trim();
    const match = text.match(/\(?([\d,]+)\)?/);
    return match ? match[1].replace(/,/g, '') : '';
  }

  /**
   * Scrape a single result card from the search results feed.
   */
  function scrapeResultCard(card) {
    const lead = {
      name: '',
      address: '',
      phone: '',
      website: '',
      rating: '',
      reviewCount: '',
      category: '',
      hours: '',
      email: '',
      socialLinks: [],
      scrapedAt: new Date().toISOString(),
    };

    // Try to find business name
    const nameEl = card.querySelector(SELECTORS.businessName);
    lead.name = getText(nameEl);
    if (!lead.name) {
      // Try aria-label on the card itself
      const ariaLabel = card.getAttribute('aria-label') || '';
      if (ariaLabel) lead.name = ariaLabel;
    }

    // Skip if no name found
    if (!lead.name) return null;

    // Rating
    const ratingEl = card.querySelector(SELECTORS.rating);
    lead.rating = extractRating(ratingEl);

    // Review count
    const reviewEl = card.querySelector(SELECTORS.reviewCount);
    lead.reviewCount = extractReviewCount(reviewEl);

    // Category and address are often in W4Efsd spans
    const infoSpans = card.querySelectorAll('div.W4Efsd');
    infoSpans.forEach((span) => {
      const text = span.textContent.trim();
      // Phone detection
      const phone = extractPhone(text);
      if (phone && !lead.phone) lead.phone = phone;
      // Address-like text (contains street indicators)
      if (
        !lead.address &&
        /\d+\s+\w+\s+(st|ave|blvd|rd|dr|ln|way|ct|pl|hwy|pike|pkwy|cir)/i.test(
          text
        )
      ) {
        lead.address = text;
      }
    });

    // Category: often the first info span text
    const categorySpans = card.querySelectorAll(
      'span.mgr77e span, div.W4Efsd span.fontBodyMedium'
    );
    categorySpans.forEach((s) => {
      const t = s.textContent.trim();
      if (
        t &&
        !lead.category &&
        t.length < 50 &&
        !/\d/.test(t) &&
        !t.includes('$') &&
        !/closed|open/i.test(t)
      ) {
        lead.category = t;
      }
    });

    // Website from href if the card is a link
    const websiteBtn = card.querySelector('a[href*="http"]');
    if (websiteBtn) {
      const href = websiteBtn.getAttribute('href') || '';
      if (href && !href.includes('google.com')) {
        lead.website = href;
      }
    }

    // Hours
    const hoursEl = card.querySelector(SELECTORS.hours);
    lead.hours = getText(hoursEl);

    return lead;
  }

  /**
   * Scrape the detail panel (when a user clicks a specific business).
   */
  function scrapeDetailPanel() {
    const panel = document.querySelector(SELECTORS.detailPanel);
    if (!panel) return null;

    const lead = {
      name: '',
      address: '',
      phone: '',
      website: '',
      rating: '',
      reviewCount: '',
      category: '',
      hours: '',
      email: '',
      socialLinks: [],
      scrapedAt: new Date().toISOString(),
    };

    // Name
    const nameEl = panel.querySelector(SELECTORS.detailName);
    lead.name = getText(nameEl);
    if (!lead.name) return null;

    // Rating
    const ratingEl = panel.querySelector(SELECTORS.rating);
    lead.rating = extractRating(ratingEl);

    // Review count
    const reviewEl = panel.querySelector(SELECTORS.reviewCount);
    lead.reviewCount = extractReviewCount(reviewEl);

    // Phone
    const phoneBtn = panel.querySelector(SELECTORS.detailPhone);
    if (phoneBtn) {
      lead.phone =
        extractPhone(phoneBtn.textContent) ||
        extractPhone(phoneBtn.getAttribute('aria-label') || '');
    }
    // Also look for phone in all buttons with phone-related aria-labels
    if (!lead.phone) {
      panel
        .querySelectorAll('button[aria-label*="Phone"], button[data-item-id*="phone"]')
        .forEach((btn) => {
          if (!lead.phone) {
            const aria = btn.getAttribute('aria-label') || '';
            lead.phone = extractPhone(aria) || extractPhone(btn.textContent);
          }
        });
    }

    // Website
    const websiteEl = panel.querySelector(SELECTORS.detailWebsite);
    if (websiteEl) {
      lead.website =
        websiteEl.getAttribute('href') || getText(websiteEl);
    }
    if (!lead.website) {
      panel
        .querySelectorAll('a[data-item-id="authority"], a[aria-label*="website" i]')
        .forEach((a) => {
          if (!lead.website) {
            lead.website = a.getAttribute('href') || getText(a);
          }
        });
    }

    // Address
    const addressEl = panel.querySelector(SELECTORS.detailAddress);
    if (addressEl) {
      lead.address =
        getText(addressEl) ||
        extractAddressFromAria(addressEl);
    }
    if (!lead.address) {
      panel
        .querySelectorAll('button[data-item-id="address"]')
        .forEach((btn) => {
          if (!lead.address) {
            const aria = btn.getAttribute('aria-label') || '';
            lead.address = aria.replace(/^Address:\s*/i, '') || getText(btn);
          }
        });
    }

    // Category
    const catEl = panel.querySelector(SELECTORS.detailCategory);
    lead.category = getText(catEl);

    // Hours
    const hoursEl = panel.querySelector(SELECTORS.detailHours);
    if (hoursEl) {
      lead.hours = getText(hoursEl).replace(/\n+/g, ', ');
    }

    // Email from page text
    const pageText = panel.textContent || '';
    const emails = extractEmails(pageText);
    if (emails.length) lead.email = emails[0];

    // Social links
    const socialPatterns = [
      'facebook.com',
      'instagram.com',
      'twitter.com',
      'x.com',
      'linkedin.com',
      'youtube.com',
      'tiktok.com',
    ];
    panel.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      socialPatterns.forEach((pattern) => {
        if (href.includes(pattern) && !lead.socialLinks.includes(href)) {
          lead.socialLinks.push(href);
        }
      });
    });

    return lead;
  }

  function extractAddressFromAria(el) {
    const aria = el.getAttribute('aria-label') || '';
    return aria.replace(/^Address:\s*/i, '');
  }

  /**
   * Scrape all visible result cards from the feed.
   */
  function scrapeAllVisibleResults() {
    const results = [];
    const seen = new Set(scrapedLeads.map((l) => l.name));

    // Strategy 1: Find result cards in the feed
    const feed = document.querySelector(SELECTORS.feedContainer);
    if (feed) {
      const cards = feed.querySelectorAll(':scope > div');
      cards.forEach((card) => {
        const lead = scrapeResultCard(card);
        if (lead && !seen.has(lead.name)) {
          results.push(lead);
          seen.add(lead.name);
        }
      });
    }

    // Strategy 2: Find article-role cards
    if (results.length === 0) {
      document
        .querySelectorAll(SELECTORS.resultCards)
        .forEach((card) => {
          // If it's a link, get its parent container for more info
          const container = card.closest('div') || card;
          const lead = scrapeResultCard(container);
          if (lead && !seen.has(lead.name)) {
            results.push(lead);
            seen.add(lead.name);
          }
        });
    }

    // Strategy 3: Look for .Nv2PK class cards (common Google Maps class)
    if (results.length === 0) {
      document.querySelectorAll('.Nv2PK').forEach((card) => {
        const lead = scrapeResultCard(card);
        if (lead && !seen.has(lead.name)) {
          results.push(lead);
          seen.add(lead.name);
        }
      });
    }

    return results;
  }

  /**
   * Attempt to scrape the currently open detail panel.
   */
  function scrapeCurrentDetail() {
    const lead = scrapeDetailPanel();
    if (!lead) return null;
    // Check if already scraped
    const existing = scrapedLeads.find((l) => l.name === lead.name);
    if (existing) {
      // Merge in any new data
      Object.keys(lead).forEach((key) => {
        if (
          lead[key] &&
          (!existing[key] ||
            (key === 'socialLinks' && existing[key].length === 0))
        ) {
          existing[key] = lead[key];
        }
      });
      return existing;
    }
    return lead;
  }

  // ---- Visit Websites Mode ----

  /**
   * Visit each business website in an iframe and try to scrape emails.
   */
  async function visitWebsitesForEmails() {
    const leadsWithWebsites = scrapedLeads.filter(
      (l) => l.website && !l.email
    );
    if (leadsWithWebsites.length === 0) {
      setStatus('No websites to visit or all leads already have emails.', 'info');
      return;
    }

    isVisitingWebsites = true;
    visitProgress = { current: 0, total: leadsWithWebsites.length };
    renderPanel();

    for (let i = 0; i < leadsWithWebsites.length; i++) {
      if (!isVisitingWebsites) break; // Allow cancellation
      visitProgress.current = i + 1;
      renderVisitProgress();

      const lead = leadsWithWebsites[i];
      try {
        const emails = await fetchEmailsFromWebsite(lead.website);
        if (emails.length > 0) {
          lead.email = emails[0]; // Primary email
        }
      } catch (err) {
        console.warn(
          `LeadHarvest: Failed to scan ${lead.website}:`,
          err.message
        );
      }

      // Small delay to avoid hammering
      await new Promise((r) => setTimeout(r, 1500));
    }

    isVisitingWebsites = false;
    renderPanel();
    setStatus(
      `Scanned ${visitProgress.total} websites for emails.`,
      'success'
    );
    saveLeadsToStorage();
  }

  /**
   * Fetch a website and extract emails from its content.
   * Uses the background service worker to make the request (avoids CORS).
   */
  function fetchEmailsFromWebsite(url) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'FETCH_PAGE', url: url },
        (response) => {
          if (response && response.success && response.text) {
            const emails = extractEmails(response.text);
            // Filter for common contact emails
            const contactEmails = emails.filter((e) => {
              const lower = e.toLowerCase();
              return (
                lower.startsWith('info@') ||
                lower.startsWith('contact@') ||
                lower.startsWith('hello@') ||
                lower.startsWith('support@') ||
                lower.startsWith('sales@') ||
                lower.startsWith('admin@') ||
                lower.startsWith('help@') ||
                lower.startsWith('office@') ||
                lower.startsWith('mail@') ||
                lower.startsWith('enquiries@') ||
                lower.startsWith('inquiries@') ||
                lower.startsWith('general@') ||
                // If no common prefix found, include all
                emails.length <= 2
              );
            });
            resolve(contactEmails.length > 0 ? contactEmails : emails.slice(0, 3));
          } else {
            resolve([]);
          }
        }
      );
    });
  }

  // ---- CSV Export ----

  function escapeCSV(val) {
    if (!val) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function exportToCSV() {
    if (scrapedLeads.length === 0) {
      setStatus('No leads to export.', 'error');
      return;
    }

    const headers = [
      'Business Name',
      'Address',
      'Phone',
      'Website',
      'Email',
      'Rating',
      'Reviews',
      'Category',
      'Hours',
      'Social Links',
      'Scraped At',
    ];

    const rows = scrapedLeads.map((l) =>
      [
        l.name,
        l.address,
        l.phone,
        l.website,
        l.email,
        l.rating,
        l.reviewCount,
        l.category,
        l.hours,
        (l.socialLinks || []).join('; '),
        l.scrapedAt,
      ]
        .map(escapeCSV)
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leadharvest-${todayStr()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus(`Exported ${scrapedLeads.length} leads to CSV.`, 'success');
  }

  // ---- Copy Emails ----

  function copyAllEmails() {
    const emails = scrapedLeads
      .map((l) => l.email)
      .filter(Boolean);
    if (emails.length === 0) {
      setStatus('No emails found yet. Try "Visit Websites" first.', 'info');
      return;
    }
    const text = [...new Set(emails)].join('\n');
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setStatus(
          `Copied ${[...new Set(emails)].length} email(s) to clipboard.`,
          'success'
        );
      })
      .catch(() => {
        setStatus('Failed to copy to clipboard.', 'error');
      });
  }

  // ---- Storage ----

  async function saveLeadsToStorage() {
    await storageSet({ [STORAGE_KEYS.leads]: scrapedLeads });
  }

  async function loadLeadsFromStorage() {
    const data = await storageGet([STORAGE_KEYS.leads]);
    if (data[STORAGE_KEYS.leads]) {
      scrapedLeads = data[STORAGE_KEYS.leads];
    }
  }

  // ---- Premium ----

  async function activateLicenseKey(key) {
    if (!key || key.trim().length < 8) {
      setStatus('Please enter a valid license key.', 'error');
      return false;
    }
    // For now, accept any key with 16+ chars as valid (placeholder for real validation)
    if (key.trim().length >= 16) {
      await storageSet({
        [STORAGE_KEYS.isPremium]: true,
        [STORAGE_KEYS.licenseKey]: key.trim(),
      });
      setStatus('Premium activated! Unlimited leads unlocked.', 'success');
      renderPanel();
      return true;
    }
    setStatus('Invalid license key. Please try again.', 'error');
    return false;
  }

  // ---- UI: Build floating panel ----

  let statusTimeout = null;

  function setStatus(message, type) {
    const statusEl = document.querySelector('.lh-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = 'lh-status';
    if (type) statusEl.classList.add('lh-status-' + type);
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'lh-status';
    }, 5000);
  }

  function createPanel() {
    // Remove existing
    const existing = document.getElementById('leadharvest-panel');
    if (existing) existing.remove();
    const existingToggle = document.getElementById('leadharvest-toggle');
    if (existingToggle) existingToggle.remove();

    // Toggle button (shown when panel hidden)
    const toggle = document.createElement('button');
    toggle.id = 'leadharvest-toggle';
    toggle.innerHTML = 'LH';
    toggle.title = 'Show LeadHarvest';
    toggle.addEventListener('click', () => {
      panelVisible = true;
      panel.style.display = 'flex';
      toggle.style.display = 'none';
    });
    document.body.appendChild(toggle);

    // Main panel
    const panel = document.createElement('div');
    panel.id = 'leadharvest-panel';
    document.body.appendChild(panel);

    renderPanel();
    makeDraggable(panel);
  }

  function renderPanel() {
    const panel = document.getElementById('leadharvest-panel');
    if (!panel) return;

    const emailCount = scrapedLeads.filter((l) => l.email).length;

    panel.innerHTML = `
      <div class="lh-header">
        <div class="lh-header-left">
          <div class="lh-logo">LH</div>
          <span class="lh-title">LeadHarvest</span>
        </div>
        <div class="lh-header-actions">
          <button class="lh-btn-icon lh-tooltip" data-tooltip="Minimize" id="lh-minimize">_</button>
          <button class="lh-btn-icon lh-tooltip" data-tooltip="Close" id="lh-close">&times;</button>
        </div>
      </div>

      <div class="lh-stats">
        <div class="lh-stat">
          <span class="lh-stat-value">${scrapedLeads.length}</span>
          <span class="lh-stat-label">Leads</span>
        </div>
        <div class="lh-stat">
          <span class="lh-stat-value">${emailCount}</span>
          <span class="lh-stat-label">Emails</span>
        </div>
        <div class="lh-stat">
          <span class="lh-stat-value">${scrapedLeads.filter((l) => l.phone).length}</span>
          <span class="lh-stat-label">Phones</span>
        </div>
      </div>

      <div class="lh-actions">
        <div class="lh-actions-row">
          <button class="lh-btn lh-btn-primary" id="lh-scrape" ${isScraping ? 'disabled' : ''}>
            ${isScraping ? '<span class="lh-scraping">Scraping...</span>' : 'Scrape Results'}
          </button>
          <button class="lh-btn lh-btn-secondary" id="lh-scrape-detail">
            Scrape Detail
          </button>
        </div>
        <div class="lh-actions-row">
          <button class="lh-btn lh-btn-warning" id="lh-visit-websites" ${isVisitingWebsites ? 'disabled' : ''}>
            ${isVisitingWebsites ? 'Scanning...' : 'Visit Websites'}
          </button>
          <button class="lh-btn lh-btn-secondary" id="lh-copy-emails">
            Copy Emails
          </button>
        </div>
        <div class="lh-actions-row">
          <button class="lh-btn lh-btn-success" id="lh-export-csv">
            Export CSV
          </button>
          <button class="lh-btn lh-btn-secondary" id="lh-clear">
            Clear All
          </button>
        </div>
      </div>

      ${
        isVisitingWebsites
          ? `
        <div class="lh-visit-progress">
          <div class="lh-visit-progress-bar">
            <div class="lh-visit-progress-fill" style="width: ${
              visitProgress.total > 0
                ? (visitProgress.current / visitProgress.total) * 100
                : 0
            }%"></div>
          </div>
          <div class="lh-visit-status">
            Scanning website ${visitProgress.current} of ${visitProgress.total}...
            <button class="lh-btn-icon" id="lh-cancel-visit" style="display:inline; margin-left: 8px; font-size: 11px;">Cancel</button>
          </div>
        </div>
      `
          : ''
      }

      <div class="lh-leads-container">
        ${
          scrapedLeads.length === 0
            ? `
          <div class="lh-empty">
            <div class="lh-empty-icon">&#128269;</div>
            <div class="lh-empty-text">
              Search for businesses on Google Maps,<br>then click <strong>Scrape Results</strong>
            </div>
          </div>
        `
            : `
          <div class="lh-leads-list">
            ${scrapedLeads
              .map(
                (lead, i) => `
              <div class="lh-lead-card">
                <div class="lh-lead-name">
                  ${escapeHTML(lead.name)}
                  ${lead.category ? `<span class="lh-lead-category">${escapeHTML(lead.category)}</span>` : ''}
                </div>
                <div class="lh-lead-details">
                  ${lead.rating ? `<div class="lh-lead-detail"><span class="lh-lead-detail-icon lh-lead-rating">&#9733;</span> ${escapeHTML(lead.rating)}${lead.reviewCount ? ` (${escapeHTML(lead.reviewCount)} reviews)` : ''}</div>` : ''}
                  ${lead.phone ? `<div class="lh-lead-detail"><span class="lh-lead-detail-icon">&#9742;</span> ${escapeHTML(lead.phone)}</div>` : ''}
                  ${lead.address ? `<div class="lh-lead-detail"><span class="lh-lead-detail-icon">&#128205;</span> ${escapeHTML(lead.address)}</div>` : ''}
                  ${lead.website ? `<div class="lh-lead-detail"><span class="lh-lead-detail-icon">&#127760;</span> <a href="${escapeHTML(lead.website)}" target="_blank" rel="noopener" style="color:#00d2ff;text-decoration:none;">${escapeHTML(truncate(lead.website, 40))}</a></div>` : ''}
                  ${lead.email ? `<div class="lh-lead-detail"><span class="lh-lead-detail-icon">&#9993;</span> <span class="lh-lead-email">${escapeHTML(lead.email)}</span></div>` : ''}
                  ${lead.hours ? `<div class="lh-lead-detail"><span class="lh-lead-detail-icon">&#128336;</span> ${escapeHTML(truncate(lead.hours, 50))}</div>` : ''}
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `
        }
      </div>

      <div class="lh-status"></div>
    `;

    // Wire up event listeners
    wireEvents();
  }

  function renderVisitProgress() {
    const progressFill = document.querySelector('.lh-visit-progress-fill');
    const progressStatus = document.querySelector('.lh-visit-status');
    if (progressFill) {
      progressFill.style.width =
        visitProgress.total > 0
          ? (visitProgress.current / visitProgress.total) * 100 + '%'
          : '0%';
    }
    if (progressStatus) {
      progressStatus.innerHTML = `Scanning website ${visitProgress.current} of ${visitProgress.total}...
        <button class="lh-btn-icon" id="lh-cancel-visit" style="display:inline; margin-left: 8px; font-size: 11px;">Cancel</button>`;
      const cancelBtn = document.getElementById('lh-cancel-visit');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          isVisitingWebsites = false;
          renderPanel();
        });
      }
    }
  }

  function wireEvents() {
    const scrapeBtn = document.getElementById('lh-scrape');
    const scrapeDetailBtn = document.getElementById('lh-scrape-detail');
    const visitBtn = document.getElementById('lh-visit-websites');
    const copyBtn = document.getElementById('lh-copy-emails');
    const exportBtn = document.getElementById('lh-export-csv');
    const clearBtn = document.getElementById('lh-clear');
    const minimizeBtn = document.getElementById('lh-minimize');
    const closeBtn = document.getElementById('lh-close');
    const cancelVisitBtn = document.getElementById('lh-cancel-visit');

    if (scrapeBtn) {
      scrapeBtn.addEventListener('click', handleScrape);
    }
    if (scrapeDetailBtn) {
      scrapeDetailBtn.addEventListener('click', handleScrapeDetail);
    }
    if (visitBtn) {
      visitBtn.addEventListener('click', handleVisitWebsites);
    }
    if (copyBtn) {
      copyBtn.addEventListener('click', copyAllEmails);
    }
    if (exportBtn) {
      exportBtn.addEventListener('click', exportToCSV);
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', handleClear);
    }
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        const panel = document.getElementById('leadharvest-panel');
        const toggle = document.getElementById('leadharvest-toggle');
        if (panel) panel.style.display = 'none';
        if (toggle) toggle.style.display = 'flex';
        panelVisible = false;
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const panel = document.getElementById('leadharvest-panel');
        const toggle = document.getElementById('leadharvest-toggle');
        if (panel) panel.remove();
        if (toggle) toggle.style.display = 'flex';
        panelVisible = false;
      });
    }
    if (cancelVisitBtn) {
      cancelVisitBtn.addEventListener('click', () => {
        isVisitingWebsites = false;
        renderPanel();
      });
    }
  }

  // ---- Handlers ----

  async function handleScrape() {
    const check = await canScrape();
    if (!check.allowed) {
      showFreemiumGate();
      return;
    }

    isScraping = true;
    renderPanel();
    setStatus('Scanning Google Maps results...', 'info');

    // Wait a moment for DOM to settle
    await new Promise((r) => setTimeout(r, 500));

    const newLeads = scrapeAllVisibleResults();

    if (newLeads.length === 0) {
      isScraping = false;
      renderPanel();
      setStatus(
        'No new results found. Make sure you have search results visible.',
        'info'
      );
      return;
    }

    // Apply freemium limit
    const usage = await getDailyUsage();
    let allowed = newLeads.length;
    if (!usage.isPremium) {
      const remaining = FREE_DAILY_LIMIT - usage.count;
      allowed = Math.min(newLeads.length, remaining);
    }

    const leadsToAdd = newLeads.slice(0, allowed);
    scrapedLeads.push(...leadsToAdd);
    await incrementDailyCount(leadsToAdd.length);
    await saveLeadsToStorage();

    // Notify background
    chrome.runtime.sendMessage({
      type: 'LEADS_SCRAPED',
      count: leadsToAdd.length,
    });

    isScraping = false;
    renderPanel();

    if (allowed < newLeads.length) {
      setStatus(
        `Added ${leadsToAdd.length} leads. Daily limit reached (${FREE_DAILY_LIMIT} free).`,
        'info'
      );
      showFreemiumGate();
    } else {
      setStatus(`Found ${leadsToAdd.length} new lead(s)!`, 'success');
    }
  }

  async function handleScrapeDetail() {
    const check = await canScrape();
    if (!check.allowed) {
      showFreemiumGate();
      return;
    }

    const lead = scrapeCurrentDetail();
    if (!lead) {
      setStatus(
        'No business detail panel open. Click a business first.',
        'info'
      );
      return;
    }

    // Check if it was a merge with existing
    const existing = scrapedLeads.find((l) => l.name === lead.name);
    if (!existing) {
      scrapedLeads.push(lead);
      await incrementDailyCount(1);
      chrome.runtime.sendMessage({ type: 'LEADS_SCRAPED', count: 1 });
    }

    await saveLeadsToStorage();
    renderPanel();
    setStatus(
      existing
        ? `Updated details for "${lead.name}".`
        : `Scraped "${lead.name}" from detail panel.`,
      'success'
    );
  }

  async function handleVisitWebsites() {
    const check = await canScrape();
    if (!check.allowed) {
      showFreemiumGate();
      return;
    }
    visitWebsitesForEmails();
  }

  async function handleClear() {
    if (
      scrapedLeads.length > 0 &&
      !confirm('Clear all scraped leads? This cannot be undone.')
    ) {
      return;
    }
    scrapedLeads = [];
    await storageSet({ [STORAGE_KEYS.leads]: [] });
    renderPanel();
    setStatus('All leads cleared.', 'info');
  }

  function showFreemiumGate() {
    const container = document.querySelector('.lh-leads-container');
    if (!container) return;
    container.innerHTML = `
      <div class="lh-gate">
        <div class="lh-gate-title">Daily Limit Reached</div>
        <div class="lh-gate-text">
          Free plan: ${FREE_DAILY_LIMIT} leads/day.<br>
          Enter a license key for unlimited access.
        </div>
        <input type="text" class="lh-gate-input" id="lh-license-input"
               placeholder="Enter license key..." />
        <button class="lh-btn lh-btn-primary" style="width:100%;" id="lh-activate-license">
          Activate Premium
        </button>
      </div>
    `;
    const activateBtn = document.getElementById('lh-activate-license');
    const input = document.getElementById('lh-license-input');
    if (activateBtn && input) {
      activateBtn.addEventListener('click', () => {
        activateLicenseKey(input.value);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') activateLicenseKey(input.value);
      });
    }
  }

  // ---- Drag support ----

  function makeDraggable(panel) {
    const header = panel.querySelector('.lh-header');
    if (!header) return;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.lh-btn-icon')) return;
      isDragging = true;
      offsetX = e.clientX - panel.getBoundingClientRect().left;
      offsetY = e.clientY - panel.getBoundingClientRect().top;
      panel.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      panel.style.left = x + 'px';
      panel.style.top = y + 'px';
      panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      panel.style.transition = '';
    });
  }

  // ---- Helpers ----

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '...' : str;
  }

  // ---- MutationObserver: Detect new results loading ----

  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      // Look for new result cards being added
      let hasNewResults = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              // Element node
              if (
                node.querySelector &&
                (node.querySelector(SELECTORS.businessName) ||
                  node.matches?.(SELECTORS.resultCards))
              ) {
                hasNewResults = true;
                break;
              }
            }
          }
        }
        if (hasNewResults) break;
      }

      if (hasNewResults && panelVisible) {
        // Update the scrape count indicator to show new results are available
        const statusEl = document.querySelector('.lh-status');
        if (statusEl && !statusEl.textContent) {
          statusEl.textContent = 'New results detected. Click "Scrape Results" to capture.';
          statusEl.className = 'lh-status lh-status-info';
        }
      }
    });

    // Observe the main content area for changes
    const target =
      document.getElementById('content-container') ||
      document.getElementById('QA0Szd') ||
      document.body;

    observer.observe(target, {
      childList: true,
      subtree: true,
    });
  }

  // ---- Initialize ----

  async function init() {
    await loadLeadsFromStorage();
    createPanel();
    setupMutationObserver();

    // Listen for messages from background
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'TOGGLE_PANEL') {
        const panel = document.getElementById('leadharvest-panel');
        const toggle = document.getElementById('leadharvest-toggle');
        if (panel) {
          if (panelVisible) {
            panel.style.display = 'none';
            if (toggle) toggle.style.display = 'flex';
            panelVisible = false;
          } else {
            panel.style.display = 'flex';
            if (toggle) toggle.style.display = 'none';
            panelVisible = true;
          }
        }
      }
    });
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
