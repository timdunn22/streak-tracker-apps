/* ───────────────────────────────────────────────
   EtsyRank Pro — Content Script
   Runs on etsy.com search, listing, and edit pages
   ─────────────────────────────────────────────── */

(function () {
  "use strict";

  /* ============================
     CONSTANTS
     ============================ */
  const REVIEW_RATIO_LOW = 10;
  const REVIEW_RATIO_HIGH = 20;
  const MAX_TITLE_LEN = 140;
  const IDEAL_TITLE_MIN = 100;
  const MAX_TAGS = 13;
  const IDEAL_PHOTOS = 10;
  const MIN_PHOTOS = 5;
  const DESC_MIN_WORDS = 150;

  /* SVG icons */
  const ICONS = {
    chart:
      '<svg viewBox="0 0 24 24"><path d="M3 13h2v8H3zm6-4h2v12H9zm6-6h2v18h-2zm6 10h2v8h-2z"/></svg>',
    tag: '<svg viewBox="0 0 24 24"><path d="M12.87 2.15a1.5 1.5 0 0 0-1.06-.44H4.5A2.5 2.5 0 0 0 2 4.21v7.31c0 .4.16.78.44 1.06l9.38 9.38a1.5 1.5 0 0 0 2.12 0l7.02-7.02a1.5 1.5 0 0 0 0-2.12zM7 8.71a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>',
    search:
      '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01z"/></svg>',
    photo:
      '<svg viewBox="0 0 24 24"><path d="M21 3H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m0 16H3V5h18zM5 15l3.5-4.5 2.5 3 3.5-4.5L19 15z"/></svg>',
    lightbulb:
      '<svg viewBox="0 0 24 24"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>',
    audit:
      '<svg viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m-7 14-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8z"/></svg>',
    dollar:
      '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m1 15h-2v-1c-1.5-.2-2.8-1-3.3-2.2l1.5-.6c.4.9 1.2 1.5 2.3 1.5 1.3 0 2.1-.7 2.1-1.6 0-1-.7-1.4-2.2-1.8-1.7-.5-3-1.2-3-2.9 0-1.4 1.1-2.5 2.6-2.8V7h2v1c1.2.3 2.1 1 2.5 2l-1.4.7c-.3-.7-1-1.2-1.8-1.2-1 0-1.7.6-1.7 1.4 0 .9.8 1.2 2.2 1.7 1.8.6 3 1.3 3 3 0 1.6-1.2 2.7-2.8 3z"/></svg>',
  };

  /* ============================
     UTILITY FUNCTIONS
     ============================ */

  function sendMsg(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, resolve);
    });
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "className") e.className = v;
      else if (k === "innerHTML") e.innerHTML = v;
      else if (k === "textContent") e.textContent = v;
      else if (k.startsWith("on"))
        e.addEventListener(k.slice(2).toLowerCase(), v);
      else e.setAttribute(k, v);
    }
    for (const c of children) {
      if (typeof c === "string") e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    }
    return e;
  }

  function formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  }

  function formatCurrency(n) {
    return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  /* ============================
     PAGE TYPE DETECTION
     ============================ */

  function getPageType() {
    const path = window.location.pathname;
    if (/^\/search/.test(path)) return "search";
    if (/^\/listing\/\d+/.test(path)) return "listing";
    if (/\/tools\/listings/.test(path)) return "edit";
    return "other";
  }

  /* ============================
     SEARCH RESULTS PAGE
     Overlay badges on each listing card
     ============================ */

  function processSearchResults() {
    // Find listing cards
    const cards = document.querySelectorAll(
      '.v2-listing-card, [data-listing-id], .search-listing-card, .wt-grid__item-xs-6'
    );

    cards.forEach((card) => {
      if (card.querySelector(".erp-badge-wrap")) return; // already processed

      const data = extractCardData(card);
      if (!data) return;

      const wrap = el("div", { className: "erp-badge-wrap" });

      // Estimated monthly sales badge
      if (data.reviews > 0) {
        const salesLow = data.reviews * REVIEW_RATIO_LOW;
        const salesHigh = data.reviews * REVIEW_RATIO_HIGH;
        const badge = el("div", {
          className: "erp-badge erp-badge--sales",
          innerHTML: `${ICONS.chart} ~${formatNum(salesLow)}-${formatNum(salesHigh)} sales`,
          title: `Estimated total sales based on ${data.reviews} reviews (1 review = ${REVIEW_RATIO_LOW}-${REVIEW_RATIO_HIGH} sales)`,
        });
        wrap.appendChild(badge);
      }

      // Revenue estimate
      if (data.price > 0 && data.reviews > 0) {
        const avgSales = data.reviews * ((REVIEW_RATIO_LOW + REVIEW_RATIO_HIGH) / 2);
        const revenue = avgSales * data.price;
        const badge = el("div", {
          className: "erp-badge erp-badge--revenue",
          innerHTML: `${ICONS.dollar} ~${formatCurrency(revenue)}`,
          title: `Estimated total revenue`,
        });
        wrap.appendChild(badge);
      }

      // Competition score
      if (data.favorites > 0 || data.reviews > 0) {
        const compScore = Math.min(100, Math.round((data.reviews * 2 + data.favorites / 10)));
        let compClass, compLabel;
        if (compScore < 25) {
          compClass = "erp-badge--comp-low";
          compLabel = "Low comp";
        } else if (compScore < 60) {
          compClass = "erp-badge--comp-med";
          compLabel = "Med comp";
        } else {
          compClass = "erp-badge--comp-hi";
          compLabel = "High comp";
        }
        const badge = el("div", {
          className: `erp-badge ${compClass}`,
          innerHTML: `${ICONS.star} ${compLabel}`,
          title: `Competition score: ${compScore}/100`,
        });
        wrap.appendChild(badge);
      }

      card.style.position = "relative";
      card.appendChild(wrap);
    });
  }

  function extractCardData(card) {
    let price = 0;
    let reviews = 0;
    let favorites = 0;

    // Price — try multiple selectors
    const priceEl =
      card.querySelector('.currency-value') ||
      card.querySelector('.wt-text-title-01') ||
      card.querySelector('[data-buy-box-listing-price]') ||
      card.querySelector('.n-listing-card__price .price') ||
      card.querySelector('.lc-price span');

    if (priceEl) {
      const raw = priceEl.textContent.replace(/[^0-9.]/g, "");
      price = parseFloat(raw) || 0;
    }

    // Reviews — look for review count
    const reviewEl =
      card.querySelector('.wt-text-gray .wt-text-caption') ||
      card.querySelector('[aria-label*="star"]');

    if (reviewEl) {
      // Often "(1,234)" or "1,234 reviews"
      const match = reviewEl.textContent.match(/([\d,]+)/);
      if (match) reviews = parseInt(match[1].replace(/,/g, ""), 10) || 0;
    }

    // Also try aria-label on the card itself or child links
    if (reviews === 0) {
      const allText = card.textContent;
      const revMatch = allText.match(/([\d,]+)\s*reviews?/i);
      if (revMatch) reviews = parseInt(revMatch[1].replace(/,/g, ""), 10) || 0;
    }

    // Favorites
    const favMatch = card.textContent.match(/([\d,]+)\s*favou?rites?/i);
    if (favMatch) favorites = parseInt(favMatch[1].replace(/,/g, ""), 10) || 0;

    if (price === 0 && reviews === 0) return null;
    return { price, reviews, favorites };
  }

  /* ============================
     LISTING VIEW PAGE
     Show competitor tags, quick audit
     ============================ */

  function processListingPage() {
    if (document.querySelector(".erp-trigger-btn")) return;

    // Add floating audit button
    const btn = el("button", {
      className: "erp-trigger-btn",
      innerHTML: ICONS.audit,
      title: "EtsyRank Pro — Audit this listing",
      onClick: () => runListingViewAudit(),
    });
    document.body.appendChild(btn);
  }

  function extractListingViewData() {
    const data = {
      title: "",
      tags: [],
      description: "",
      photoCount: 0,
      price: 0,
      reviews: 0,
    };

    // Title
    const titleEl =
      document.querySelector("h1.wt-text-body-03") ||
      document.querySelector("h1[data-buy-box-listing-title]") ||
      document.querySelector("h1");
    if (titleEl) data.title = titleEl.textContent.trim();

    // Tags from page source / structured data / meta
    const metaTags = document.querySelectorAll('meta[property="og:tag"], meta[name="keywords"]');
    metaTags.forEach((m) => {
      const content = m.getAttribute("content") || "";
      content.split(",").forEach((t) => {
        const trimmed = t.trim();
        if (trimmed) data.tags.push(trimmed);
      });
    });

    // Tags from visible tag section
    if (data.tags.length === 0) {
      const tagEls = document.querySelectorAll(
        '#item-tags a, .wt-action-group a[href*="/search?q="], a.wt-tag'
      );
      tagEls.forEach((a) => {
        const t = a.textContent.trim();
        if (t) data.tags.push(t);
      });
    }

    // Try JSON-LD for tags
    if (data.tags.length === 0) {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      scripts.forEach((s) => {
        try {
          const json = JSON.parse(s.textContent);
          if (json.keywords) {
            if (Array.isArray(json.keywords)) data.tags = json.keywords;
            else
              data.tags = json.keywords
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
          }
        } catch (_) {}
      });
    }

    // Description
    const descEl =
      document.querySelector('[data-id="description-text"]') ||
      document.querySelector("#listing-page-description-content") ||
      document.querySelector(".wt-text-body-01.wt-break-word");
    if (descEl) data.description = descEl.textContent.trim();

    // Photos
    const photoEls = document.querySelectorAll(
      '.image-carousel-container img, [data-carousel] img, .listing-page-image-carousel img, .carousel-container img'
    );
    data.photoCount = photoEls.length || 0;

    // If no carousel images, try thumbnails
    if (data.photoCount === 0) {
      const thumbs = document.querySelectorAll(
        '.carousel-pagination button, .image-carousel-pane, [data-carousel-pane]'
      );
      data.photoCount = thumbs.length;
    }

    // Price
    const priceEl =
      document.querySelector('[data-buy-box-listing-price] .currency-value') ||
      document.querySelector('.wt-text-title-03.wt-mr-xs-2') ||
      document.querySelector('p[class*="price"]');
    if (priceEl) data.price = parseFloat(priceEl.textContent.replace(/[^0-9.]/g, "")) || 0;

    // Reviews
    const revSpans = document.querySelectorAll('a[href="#reviews"] span, [data-reviews-count], .wt-badge--status-02');
    for (const s of revSpans) {
      const m = s.textContent.match(/([\d,]+)/);
      if (m) { data.reviews = parseInt(m[1].replace(/,/g, ""), 10); break; }
    }

    return data;
  }

  async function runListingViewAudit() {
    const status = await sendMsg({ type: "CHECK_LIMIT" });
    if (!status.allowed) {
      showPremiumGate();
      return;
    }

    await sendMsg({ type: "USE_AUDIT" });
    const data = extractListingViewData();
    const audit = computeAudit(data);

    await sendMsg({ type: "SAVE_AUDIT", audit: { ...audit, url: location.href } });
    renderAuditPanel(audit, data);
  }

  /* ============================
     LISTING EDIT PAGE
     Parse form fields for deeper audit
     ============================ */

  function processEditPage() {
    if (document.querySelector(".erp-trigger-btn")) return;

    const btn = el("button", {
      className: "erp-trigger-btn",
      innerHTML: ICONS.audit,
      title: "EtsyRank Pro — Audit this listing",
      onClick: () => runEditPageAudit(),
    });
    document.body.appendChild(btn);
  }

  function extractEditData() {
    const data = {
      title: "",
      tags: [],
      description: "",
      photoCount: 0,
      price: 0,
      reviews: 0,
    };

    // Title input
    const titleInput =
      document.querySelector('#listing-edit-title input, input[name="title"]') ||
      document.querySelector('textarea[name="title"]') ||
      document.querySelector('[data-test-id="title-input"] input');
    if (titleInput) data.title = titleInput.value || "";

    // Tags
    const tagInputs = document.querySelectorAll(
      '.tag-input-tag, [data-tag], .wt-tag, input[name*="tag"]'
    );
    tagInputs.forEach((t) => {
      const val = t.value || t.textContent || t.getAttribute("data-tag") || "";
      if (val.trim()) data.tags.push(val.trim());
    });

    // If no tags found via inputs, try the tag container
    if (data.tags.length === 0) {
      const tagContainer = document.querySelector(
        '.tag-items, [data-test-id="tag-list"], .listing-tags'
      );
      if (tagContainer) {
        tagContainer.querySelectorAll("span, button").forEach((el) => {
          const t = el.textContent.trim().replace(/^\u00d7\s*/, "").replace(/\s*\u00d7$/, "");
          if (t && t.length > 1) data.tags.push(t);
        });
      }
    }

    // Description
    const descEl =
      document.querySelector('#listing-edit-description textarea, textarea[name="description"]') ||
      document.querySelector('[data-test-id="description-input"] textarea');
    if (descEl) data.description = descEl.value || "";

    // Photo count
    const photos = document.querySelectorAll(
      '.listing-edit-image, .image-upload-region img, [data-test-id="listing-image"]'
    );
    data.photoCount = photos.length;

    // Price
    const priceInput =
      document.querySelector('input[name="price"], input[name="base_price"]') ||
      document.querySelector('[data-test-id="price-input"] input');
    if (priceInput) data.price = parseFloat(priceInput.value) || 0;

    return data;
  }

  async function runEditPageAudit() {
    const status = await sendMsg({ type: "CHECK_LIMIT" });
    if (!status.allowed) {
      showPremiumGate();
      return;
    }

    await sendMsg({ type: "USE_AUDIT" });
    const data = extractEditData();
    const audit = computeAudit(data);

    await sendMsg({ type: "SAVE_AUDIT", audit: { ...audit, url: location.href } });
    renderAuditPanel(audit, data);
  }

  /* ============================
     SEO AUDIT ENGINE
     Compute scores and suggestions
     ============================ */

  function computeAudit(data) {
    const checks = [];
    let totalPoints = 0;
    let maxPoints = 0;

    /* --- TITLE ANALYSIS --- */
    const titleLen = data.title.length;
    const titleWords = data.title
      .split(/\s+/)
      .filter(Boolean);

    // Title length score (0-20)
    maxPoints += 20;
    if (titleLen === 0) {
      checks.push({
        category: "Title",
        label: "Title length",
        value: "0 / " + MAX_TITLE_LEN,
        status: "bad",
        points: 0,
        suggestion: "Your title is empty. Add a descriptive title with relevant keywords.",
      });
    } else if (titleLen >= IDEAL_TITLE_MIN) {
      totalPoints += 20;
      checks.push({
        category: "Title",
        label: "Title length",
        value: titleLen + " / " + MAX_TITLE_LEN,
        status: "ok",
        points: 20,
        suggestion: null,
      });
    } else if (titleLen >= 60) {
      totalPoints += 14;
      checks.push({
        category: "Title",
        label: "Title length",
        value: titleLen + " / " + MAX_TITLE_LEN,
        status: "warn",
        points: 14,
        suggestion: `Your title uses ${titleLen} of ${MAX_TITLE_LEN} characters. Use at least ${IDEAL_TITLE_MIN} characters to maximize keyword coverage.`,
      });
    } else {
      totalPoints += 6;
      checks.push({
        category: "Title",
        label: "Title length",
        value: titleLen + " / " + MAX_TITLE_LEN,
        status: "bad",
        points: 6,
        suggestion: `Your title is only ${titleLen} characters. Etsy allows ${MAX_TITLE_LEN} — use the space to include more search terms buyers actually type.`,
      });
    }

    // Keyword front-loading (first 3 words should be primary keyword)
    maxPoints += 10;
    const firstThreeWords = titleWords.slice(0, 3).join(" ").toLowerCase();
    // Simple heuristic: front-loaded titles don't start with articles or filler
    const fillerStarts = ["a ", "an ", "the ", "my ", "our ", "new ", "best "];
    const startsWithFiller = fillerStarts.some((f) => data.title.toLowerCase().startsWith(f));

    if (titleLen === 0) {
      checks.push({
        category: "Title",
        label: "Front-loading",
        value: "N/A",
        status: "bad",
        points: 0,
        suggestion: "Add a title to evaluate front-loading.",
      });
    } else if (!startsWithFiller && titleWords.length >= 3) {
      totalPoints += 10;
      checks.push({
        category: "Title",
        label: "Front-loading",
        value: "Good",
        status: "ok",
        points: 10,
        suggestion: null,
      });
    } else if (startsWithFiller) {
      totalPoints += 3;
      checks.push({
        category: "Title",
        label: "Front-loading",
        value: "Weak",
        status: "warn",
        points: 3,
        suggestion: `Front-load your main keyword. Start with what the item IS, not "${titleWords[0]}". Example: "Leather Wallet Personalized" instead of "A Beautiful Leather Wallet".`,
      });
    } else {
      totalPoints += 5;
      checks.push({
        category: "Title",
        label: "Front-loading",
        value: "OK",
        status: "warn",
        points: 5,
        suggestion: "Consider putting your most important keyword at the very beginning of the title.",
      });
    }

    // Keyword density — check for repeated words (sign of stuffing)
    maxPoints += 10;
    const wordFreq = {};
    titleWords.forEach((w) => {
      const lw = w.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (lw.length > 2) wordFreq[lw] = (wordFreq[lw] || 0) + 1;
    });
    const maxFreq = Math.max(0, ...Object.values(wordFreq));
    const uniqueRatio = titleWords.length > 0 ? Object.keys(wordFreq).length / titleWords.length : 0;

    if (maxFreq > 3) {
      totalPoints += 3;
      const stuffedWord = Object.entries(wordFreq).find(([, v]) => v === maxFreq)?.[0] || "";
      checks.push({
        category: "Title",
        label: "Keyword density",
        value: "Stuffed",
        status: "bad",
        points: 3,
        suggestion: `"${stuffedWord}" appears ${maxFreq} times. Etsy penalizes keyword stuffing. Use each keyword once and add variety.`,
      });
    } else if (maxFreq <= 2 && uniqueRatio > 0.6) {
      totalPoints += 10;
      checks.push({
        category: "Title",
        label: "Keyword density",
        value: "Balanced",
        status: "ok",
        points: 10,
        suggestion: null,
      });
    } else {
      totalPoints += 7;
      checks.push({
        category: "Title",
        label: "Keyword density",
        value: "OK",
        status: "warn",
        points: 7,
        suggestion: "Add more unique, descriptive keywords to your title. Each word is a chance to match a buyer's search.",
      });
    }

    /* --- TAG ANALYSIS --- */
    const tagCount = data.tags.length;

    // Tag count (0-20)
    maxPoints += 20;
    if (tagCount === MAX_TAGS) {
      totalPoints += 20;
      checks.push({
        category: "Tags",
        label: "Tag count",
        value: tagCount + " / " + MAX_TAGS,
        status: "ok",
        points: 20,
        suggestion: null,
      });
    } else if (tagCount >= 10) {
      totalPoints += 14;
      checks.push({
        category: "Tags",
        label: "Tag count",
        value: tagCount + " / " + MAX_TAGS,
        status: "warn",
        points: 14,
        suggestion: `You're using ${tagCount} of ${MAX_TAGS} tags. Fill all ${MAX_TAGS} slots — each tag is a free chance to appear in search.`,
      });
    } else {
      const pts = Math.max(0, Math.round((tagCount / MAX_TAGS) * 12));
      totalPoints += pts;
      checks.push({
        category: "Tags",
        label: "Tag count",
        value: tagCount + " / " + MAX_TAGS,
        status: "bad",
        points: pts,
        suggestion: `Only ${tagCount} of ${MAX_TAGS} tags used! You're missing ${MAX_TAGS - tagCount} free keyword slots. Add more relevant tags immediately.`,
      });
    }

    // Long-tail vs. broad tags
    maxPoints += 15;
    const longTailTags = data.tags.filter((t) => t.split(/\s+/).length >= 2);
    const broadTags = data.tags.filter((t) => t.split(/\s+/).length === 1);
    const longTailRatio = tagCount > 0 ? longTailTags.length / tagCount : 0;

    if (tagCount === 0) {
      checks.push({
        category: "Tags",
        label: "Long-tail tags",
        value: "N/A",
        status: "bad",
        points: 0,
        suggestion: "Add tags to evaluate long-tail quality.",
      });
    } else if (longTailRatio >= 0.6) {
      totalPoints += 15;
      checks.push({
        category: "Tags",
        label: "Long-tail tags",
        value: `${longTailTags.length} long-tail, ${broadTags.length} broad`,
        status: "ok",
        points: 15,
        suggestion: null,
      });
    } else if (longTailRatio >= 0.3) {
      totalPoints += 10;
      checks.push({
        category: "Tags",
        label: "Long-tail tags",
        value: `${longTailTags.length} long-tail, ${broadTags.length} broad`,
        status: "warn",
        points: 10,
        suggestion: `Add more long-tail (multi-word) tags. Instead of "earrings", try "gold hoop earrings for women". Long-tail tags face less competition and convert better.`,
      });
    } else {
      totalPoints += 4;
      checks.push({
        category: "Tags",
        label: "Long-tail tags",
        value: `${longTailTags.length} long-tail, ${broadTags.length} broad`,
        status: "bad",
        points: 4,
        suggestion: `Most of your tags are single words with massive competition. Replace broad tags like "${broadTags[0] || "gift"}" with specific phrases like "personalized birthday gift for her".`,
      });
    }

    // Tag-title overlap
    maxPoints += 10;
    const titleLower = data.title.toLowerCase();
    const tagsInTitle = data.tags.filter((t) =>
      titleLower.includes(t.toLowerCase())
    );
    const overlapRatio = tagCount > 0 ? tagsInTitle.length / tagCount : 0;

    if (tagCount === 0) {
      checks.push({
        category: "Tags",
        label: "Tag-title match",
        value: "N/A",
        status: "bad",
        points: 0,
        suggestion: "Add tags to evaluate.",
      });
    } else if (overlapRatio >= 0.3 && overlapRatio <= 0.7) {
      totalPoints += 10;
      checks.push({
        category: "Tags",
        label: "Tag-title match",
        value: `${tagsInTitle.length} of ${tagCount} match title`,
        status: "ok",
        points: 10,
        suggestion: null,
      });
    } else if (overlapRatio > 0.7) {
      totalPoints += 5;
      checks.push({
        category: "Tags",
        label: "Tag-title match",
        value: `${tagsInTitle.length} of ${tagCount} match title`,
        status: "warn",
        points: 5,
        suggestion: "Too many tags duplicate your title. Use tags for DIFFERENT keywords that buyers might search. Tags should expand your reach, not repeat your title.",
      });
    } else {
      totalPoints += 5;
      checks.push({
        category: "Tags",
        label: "Tag-title match",
        value: `${tagsInTitle.length} of ${tagCount} match title`,
        status: "warn",
        points: 5,
        suggestion: "Some tag-title overlap helps Etsy understand your listing. Make sure your top 2-3 tags also appear in your title for reinforcement.",
      });
    }

    /* --- DESCRIPTION --- */
    maxPoints += 15;
    const descWords = data.description
      .split(/\s+/)
      .filter(Boolean);
    const descWordCount = descWords.length;

    if (descWordCount >= DESC_MIN_WORDS) {
      totalPoints += 15;
      checks.push({
        category: "Description",
        label: "Description length",
        value: descWordCount + " words",
        status: "ok",
        points: 15,
        suggestion: null,
      });
    } else if (descWordCount >= 75) {
      totalPoints += 10;
      checks.push({
        category: "Description",
        label: "Description length",
        value: descWordCount + " words",
        status: "warn",
        points: 10,
        suggestion: `Your description has ${descWordCount} words. Aim for ${DESC_MIN_WORDS}+ words. Include materials, dimensions, care instructions, and naturally weave in keywords.`,
      });
    } else {
      const pts = Math.max(0, Math.round((descWordCount / DESC_MIN_WORDS) * 8));
      totalPoints += pts;
      checks.push({
        category: "Description",
        label: "Description length",
        value: descWordCount + " words",
        status: "bad",
        points: pts,
        suggestion: `Only ${descWordCount} words in your description. Etsy's algorithm indexes description text. Write at least ${DESC_MIN_WORDS} words with details about materials, size, usage, and keywords.`,
      });
    }

    /* --- PHOTOS --- */
    maxPoints += 10;
    if (data.photoCount >= IDEAL_PHOTOS) {
      totalPoints += 10;
      checks.push({
        category: "Photos",
        label: "Photo count",
        value: data.photoCount + " / 10",
        status: "ok",
        points: 10,
        suggestion: null,
      });
    } else if (data.photoCount >= MIN_PHOTOS) {
      totalPoints += 7;
      checks.push({
        category: "Photos",
        label: "Photo count",
        value: data.photoCount + " / 10",
        status: "warn",
        points: 7,
        suggestion: `You have ${data.photoCount} photos. Listings with all 10 photo slots filled get more clicks. Add lifestyle shots, scale references, and detail close-ups.`,
      });
    } else {
      const pts = Math.max(0, data.photoCount * 2);
      totalPoints += pts;
      checks.push({
        category: "Photos",
        label: "Photo count",
        value: data.photoCount + " / 10",
        status: "bad",
        points: pts,
        suggestion: `Only ${data.photoCount} photos! This seriously hurts conversions. Etsy recommends 10. Add: main product shot, lifestyle image, scale reference, detail shots, packaging, gift-ready views.`,
      });
    }

    /* --- CALCULATE GRADE --- */
    const pct = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;
    let grade;
    if (pct >= 90) grade = "A";
    else if (pct >= 75) grade = "B";
    else if (pct >= 60) grade = "C";
    else if (pct >= 40) grade = "D";
    else grade = "F";

    return {
      checks,
      totalPoints,
      maxPoints,
      pct: Math.round(pct),
      grade,
      title: data.title.slice(0, 60) + (data.title.length > 60 ? "..." : ""),
    };
  }

  /* ============================
     RENDER AUDIT PANEL
     ============================ */

  function renderAuditPanel(audit, data) {
    // Remove existing panel
    document.querySelector(".erp-audit-panel")?.remove();

    const panel = el("div", { className: "erp-audit-panel" });

    // Header
    const header = el("div", { className: "erp-audit-header" }, [
      el("h2", { textContent: "EtsyRank Pro SEO Audit" }),
      el("button", {
        className: "erp-audit-close",
        textContent: "\u00d7",
        onClick: () => panel.remove(),
      }),
    ]);
    panel.appendChild(header);

    // Grade circle
    const gradeWrap = el("div", { className: "erp-grade-wrap" }, [
      el("div", {
        className: `erp-grade-circle erp-grade-${audit.grade}`,
        textContent: audit.grade,
      }),
      el("div", { className: "erp-grade-summary" }, [
        el("div", {
          className: "erp-score-num",
          textContent: audit.pct + "/100",
        }),
        el("div", {
          className: "erp-score-label",
          textContent: "SEO Score",
        }),
      ]),
    ]);
    panel.appendChild(gradeWrap);

    // Progress bar
    const barSection = el("div", { className: "erp-section" });
    const bar = el("div", { className: "erp-progress-bar" });
    const fill = el("div", { className: "erp-progress-fill" });
    fill.style.width = audit.pct + "%";
    fill.style.background =
      audit.pct >= 75
        ? "#22a722"
        : audit.pct >= 50
        ? "#d4a017"
        : "#d42020";
    bar.appendChild(fill);
    barSection.appendChild(bar);
    panel.appendChild(barSection);

    // Group checks by category
    const categories = {};
    audit.checks.forEach((c) => {
      if (!categories[c.category]) categories[c.category] = [];
      categories[c.category].push(c);
    });

    const catIcons = {
      Title: ICONS.tag,
      Tags: ICONS.tag,
      Description: ICONS.lightbulb,
      Photos: ICONS.photo,
    };

    for (const [cat, items] of Object.entries(categories)) {
      const section = el("div", { className: "erp-section" });
      section.appendChild(
        el("div", {
          className: "erp-section-title",
          innerHTML: (catIcons[cat] || "") + " " + cat + " Analysis",
        })
      );

      items.forEach((item) => {
        // Metric row
        const metric = el("div", { className: "erp-metric" }, [
          el("span", { className: "erp-metric-label", textContent: item.label }),
          el("span", {
            className: `erp-metric-value erp-metric-${item.status}`,
            textContent: item.value,
          }),
        ]);
        section.appendChild(metric);

        // Suggestion
        if (item.suggestion) {
          const sug = el("div", { className: "erp-suggestion" }, [
            el("span", {
              className: "erp-suggestion-icon",
              textContent: item.status === "bad" ? "\u26a0\ufe0f" : "\u2139\ufe0f",
            }),
            el("span", { textContent: item.suggestion }),
          ]);
          section.appendChild(sug);
        } else {
          const good = el("div", { className: "erp-suggestion erp-suggestion--good" }, [
            el("span", { className: "erp-suggestion-icon", textContent: "\u2705" }),
            el("span", { textContent: "Looks great! No changes needed." }),
          ]);
          section.appendChild(good);
        }
      });

      panel.appendChild(section);
    }

    // Competitor tags (listing view only)
    if (data.tags && data.tags.length > 0 && getPageType() === "listing") {
      const compSection = el("div", { className: "erp-section" });
      compSection.appendChild(
        el("div", {
          className: "erp-section-title",
          innerHTML: ICONS.search + " Competitor Tags",
        })
      );
      const tagWrap = el("div", { className: "erp-comp-tags" });
      data.tags.forEach((t) => {
        tagWrap.appendChild(
          el("span", { className: "erp-comp-tag", textContent: t })
        );
      });
      compSection.appendChild(tagWrap);
      panel.appendChild(compSection);
    }

    // Keyword tool
    panel.appendChild(renderKeywordTool());

    // Free tier info
    sendMsg({ type: "GET_STATS" }).then((stats) => {
      if (!stats.premium) {
        const freeBadge = el("div", { className: "erp-free-badge" });
        freeBadge.innerHTML = `<strong>${Math.max(0, stats.limit - stats.usedToday)}</strong> free audits remaining today. <a href="#" style="color:#f57224">Upgrade to Pro</a> for unlimited.`;
        panel.appendChild(freeBadge);
      }
    });

    document.body.appendChild(panel);
  }

  /* ============================
     KEYWORD RESEARCH TOOL
     ============================ */

  function renderKeywordTool() {
    const wrap = el("div", { className: "erp-kw-tool" });
    wrap.appendChild(
      el("div", {
        className: "erp-section-title",
        innerHTML: ICONS.search + " Keyword Research",
      })
    );

    const inputRow = el("div", { className: "erp-kw-input-row" });
    const input = el("input", {
      className: "erp-kw-input",
      placeholder: "Enter a keyword...",
      type: "text",
    });
    const btn = el("button", {
      className: "erp-kw-btn",
      textContent: "Search",
    });
    inputRow.appendChild(input);
    inputRow.appendChild(btn);
    wrap.appendChild(inputRow);

    const results = el("div", { className: "erp-kw-results" });
    wrap.appendChild(results);

    const doSearch = async () => {
      const q = input.value.trim();
      if (!q) return;
      results.innerHTML = '<div style="padding:8px;color:#888;font-size:13px">Searching...</div>';

      try {
        const resp = await fetch(
          `https://www.etsy.com/search/suggest?q=${encodeURIComponent(q)}`
        );
        const text = await resp.text();

        // Parse suggestions — response could be JSON array or JSON object
        let suggestions = [];
        try {
          const json = JSON.parse(text);
          if (Array.isArray(json)) {
            suggestions = json.map((s) => (typeof s === "string" ? s : s.query || s.text || s.label || String(s)));
          } else if (json.results) {
            suggestions = json.results.map((r) => r.query || r.text || r.label || String(r));
          } else if (json.suggestions) {
            suggestions = json.suggestions.map((r) => (typeof r === "string" ? r : r.query || r.text || String(r)));
          }
        } catch (_) {
          // If not JSON, try to extract from HTML
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, "text/html");
          doc.querySelectorAll("a, li, .suggestion").forEach((el) => {
            const t = el.textContent.trim();
            if (t) suggestions.push(t);
          });
        }

        if (suggestions.length === 0) {
          // Fallback: generate common modifiers
          suggestions = [
            q,
            q + " gift",
            q + " personalized",
            q + " custom",
            q + " handmade",
            q + " for women",
            q + " for men",
            q + " vintage",
            q + " set",
            q + " wedding",
          ];
        }

        results.innerHTML = "";
        suggestions.slice(0, 15).forEach((term) => {
          const item = el("div", { className: "erp-kw-item" });

          item.appendChild(el("span", { className: "erp-kw-term", textContent: term }));

          const meta = el("div", { className: "erp-kw-meta" });

          // Estimate competition from word count and specificity
          const wordCount = term.split(/\s+/).length;
          let compLevel, compClass;
          if (wordCount >= 4) {
            compLevel = "Low";
            compClass = "erp-kw-comp--low";
          } else if (wordCount >= 2) {
            compLevel = "Med";
            compClass = "erp-kw-comp--med";
          } else {
            compLevel = "High";
            compClass = "erp-kw-comp--high";
          }

          meta.appendChild(
            el("span", {
              className: `erp-kw-comp ${compClass}`,
              textContent: compLevel,
            })
          );

          // Trending indicator (simulated — in a real extension we'd track over time)
          const trendIcons = ["\u2197\ufe0f", "\u2192", "\u2198\ufe0f"];
          const trendIdx = Math.abs(term.length * 7 + wordCount * 3) % 3;
          meta.appendChild(
            el("span", { className: "erp-kw-trend", textContent: trendIcons[trendIdx] })
          );

          item.appendChild(meta);
          results.appendChild(item);
        });

        // Save to history
        sendMsg({ type: "SAVE_KEYWORD", keyword: q, resultCount: suggestions.length });
      } catch (err) {
        results.innerHTML =
          '<div style="padding:8px;color:#d42020;font-size:13px">Failed to fetch suggestions. Try again.</div>';
      }
    };

    btn.addEventListener("click", doSearch);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });

    return wrap;
  }

  /* ============================
     PREMIUM GATE
     ============================ */

  function showPremiumGate() {
    document.querySelector(".erp-audit-panel")?.remove();

    const panel = el("div", { className: "erp-audit-panel" });

    const header = el("div", { className: "erp-audit-header" }, [
      el("h2", { textContent: "EtsyRank Pro" }),
      el("button", {
        className: "erp-audit-close",
        textContent: "\u00d7",
        onClick: () => panel.remove(),
      }),
    ]);
    panel.appendChild(header);

    const gate = el("div", { className: "erp-premium-gate" });
    gate.appendChild(el("h3", { textContent: "Daily Limit Reached" }));
    gate.appendChild(
      el("p", {
        textContent:
          "You've used all 10 free audits today. Upgrade to Pro for unlimited audits, competitor analysis, export reports, and historical tracking.",
      })
    );

    const input = el("input", { placeholder: "Enter license key...", type: "text" });
    gate.appendChild(input);

    const activateBtn = el("button", { textContent: "Activate Pro" });
    activateBtn.addEventListener("click", async () => {
      const key = input.value.trim();
      const result = await sendMsg({ type: "ACTIVATE_PREMIUM", licenseKey: key });
      if (result.ok) {
        panel.remove();
        alert("EtsyRank Pro activated! Enjoy unlimited audits.");
      } else {
        alert("Invalid license key. Please try again.");
      }
    });
    gate.appendChild(activateBtn);

    panel.appendChild(gate);
    document.body.appendChild(panel);
  }

  /* ============================
     COMPETITOR SPY
     Compare another listing's tags to yours
     ============================ */

  async function compareCompetitorTags(yourTags, competitorTags) {
    const status = await sendMsg({ type: "CHECK_PREMIUM" });
    if (!status.premium) {
      showPremiumGate();
      return null;
    }

    const yourSet = new Set(yourTags.map((t) => t.toLowerCase()));
    const compSet = new Set(competitorTags.map((t) => t.toLowerCase()));

    const shared = [...yourSet].filter((t) => compSet.has(t));
    const onlyComp = [...compSet].filter((t) => !yourSet.has(t));
    const onlyYou = [...yourSet].filter((t) => !compSet.has(t));

    return { shared, onlyComp, onlyYou };
  }

  /* ============================
     INITIALIZATION
     ============================ */

  function init() {
    const pageType = getPageType();

    switch (pageType) {
      case "search":
        processSearchResults();
        // Watch for dynamic loading (infinite scroll)
        const observer = new MutationObserver(
          debounce(() => processSearchResults(), 500)
        );
        observer.observe(document.body, { childList: true, subtree: true });
        break;

      case "listing":
        processListingPage();
        break;

      case "edit":
        processEditPage();
        break;
    }
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
