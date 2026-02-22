/**
 * LeadHarvest -- Real Google Maps Puppeteer Test
 *
 * Loads the extension in headless Chrome, navigates to a real Google Maps
 * search, and tests every selector from content.js against the live DOM.
 *
 * Usage:  node test-real-site.js
 */

const puppeteer = require('puppeteer');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname);
const MAPS_URL = 'https://www.google.com/maps/search/plumbers+in+austin+tx/';
const WAIT_MS = 8000; // Wait for Maps to fully render

// Mirror the SELECTORS object from content.js so we can test each one
const SELECTORS = {
  feedContainer: 'div[role="feed"]',
  resultItems: 'div[role="feed"] > div > div > a[href*="/maps/place/"]',
  resultCards: 'div[role="article"], div.Nv2PK, a.hfpxzc',
  businessName: 'div.qBF1Pd, div.fontHeadlineSmall, span.fontHeadlineSmall',
  rating: 'span.MW4etd, span[role="img"][aria-label*="star"]',
  reviewCount: 'span.UY7F9',
  category:
    'button[jsaction*="category"] span, span.mgr77e span, div.W4Efsd:first-child span:nth-child(2)',
  address: 'div.W4Efsd span[style*="color"], span.W4Efsd',
  phone: 'button[data-tooltip*="phone"], span[style*="color"]',
  websiteLink: 'a[data-value="Website"], a[aria-label*="Website"]',
  hours:
    'span[aria-label*="hours"], span[aria-label*="Hours"], div.t39EBf',
  detailPanel: 'div[role="main"]',
  detailName: 'h1.DUwDvf, h1.fontHeadlineLarge',
  detailPhone:
    'button[data-item-id*="phone"] div.fontBodyMedium, button[aria-label*="Phone"]',
  detailWebsite:
    'a[data-item-id="authority"], a[aria-label*="Website"]',
  detailAddress:
    'button[data-item-id="address"] div.fontBodyMedium, button[aria-label*="Address"]',
  detailHours: 'div[aria-label*="hours"] table, div.t39EBf',
  detailCategory: 'button[jsaction*="category"]',
};

// Colours for terminal output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function pass(msg) { console.log(`  ${GREEN}PASS${RESET}  ${msg}`); }
function fail(msg) { console.log(`  ${RED}FAIL${RESET}  ${msg}`); }
function warn(msg) { console.log(`  ${YELLOW}WARN${RESET}  ${msg}`); }
function info(msg) { console.log(`  ${CYAN}INFO${RESET}  ${msg}`); }
function heading(msg) { console.log(`\n${CYAN}== ${msg} ==${RESET}`); }
function fix(msg) { console.log(`  ${YELLOW}FIX ${RESET}  ${msg}`); }

let passed = 0;
let failed = 0;
let warned = 0;
const fixes = [];

function assert(ok, label, extra) {
  if (ok) { passed++; pass(label + (extra ? ` ${DIM}${extra}${RESET}` : '')); }
  else    { failed++; fail(label + (extra ? ` ${DIM}${extra}${RESET}` : '')); }
}

function suggestFix(selector, problem, suggestion) {
  fixes.push({ selector, problem, suggestion });
  fix(`${BOLD}${selector}${RESET}: ${problem} -> ${YELLOW}${suggestion}${RESET}`);
}

// ---------------------------------------------------------------------------

(async () => {
  console.log(`\n${CYAN}${BOLD}LeadHarvest -- Real Google Maps Test${RESET}`);
  console.log(`Extension: ${EXTENSION_PATH}`);
  console.log(`Target:    ${MAPS_URL}\n`);

  // ---- Launch browser with extension ----
  heading('Launching headless Chrome with extension');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
    pass('Browser launched');
  } catch (err) {
    fail(`Browser launch failed: ${err.message}`);
    process.exit(1);
  }

  let page;
  try {
    // ---- Navigate to Google Maps ----
    heading('Navigating to Google Maps');
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Set a realistic user-agent so Google does not block us
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    );

    const response = await page.goto(MAPS_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    const status = response ? response.status() : 'unknown';
    assert(status === 200, `Page loaded with status ${status}`);

    info(`Waiting ${WAIT_MS / 1000}s for Maps to render and content script to inject...`);
    await new Promise((r) => setTimeout(r, WAIT_MS));

    const pageTitle = await page.title();
    info(`Page title: "${pageTitle}"`);
    const url = page.url();
    info(`Current URL: ${url}`);

    // ---- Test 1: Bot / CAPTCHA detection ----
    heading('Test 1 -- Bot Detection Check');

    const botCheck = await page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      return {
        hasCaptcha: bodyText.includes('unusual traffic') || bodyText.includes('captcha') || bodyText.includes('CAPTCHA'),
        hasConsent: bodyText.includes('Before you continue') || bodyText.includes('consent'),
        hasResults: !!document.querySelector('div[role="feed"]'),
        bodyLength: bodyText.length,
      };
    });

    if (botCheck.hasCaptcha) {
      warn('CAPTCHA/bot detection detected -- results may be unreliable.');
      warned++;
    } else {
      pass('No CAPTCHA/bot detection found');
      passed++;
    }
    if (botCheck.hasConsent) {
      warn('Cookie consent dialog detected -- may block results');
      warned++;
    }
    assert(botCheck.hasResults, 'Search results feed is present on page');
    info(`Page body text length: ${botCheck.bodyLength} chars`);

    // ---- Test 2: Extension panel injection ----
    heading('Test 2 -- Extension Panel Injection');

    const panelExists = await page.$('#leadharvest-panel');
    assert(!!panelExists, '#leadharvest-panel exists in DOM');

    const toggleExists = await page.$('#leadharvest-toggle');
    assert(!!toggleExists, '#leadharvest-toggle exists in DOM');

    if (panelExists) {
      const panelVisible = await page.$eval('#leadharvest-panel', (el) => {
        const s = getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden';
      });
      assert(panelVisible, 'Panel is visible (not display:none)');

      const panelText = await page.$eval('#leadharvest-panel', (el) => el.textContent);
      assert(panelText.includes('LeadHarvest'), 'Panel contains "LeadHarvest" text');
      assert(panelText.includes('Scrape Results'), 'Panel contains "Scrape Results" button text');
    }

    // Note: __leadHarvestInjected runs in the extension's isolated world,
    // so page.evaluate (main world) cannot see it. The panel being in the DOM
    // proves the content script injected successfully.
    info('(window.__leadHarvestInjected lives in the extension isolated world -- not testable via page.evaluate)');

    const extensionBtns = await page.evaluate(() => {
      return {
        scrapeBtn: !!document.getElementById('lh-scrape'),
        scrapeDetailBtn: !!document.getElementById('lh-scrape-detail'),
        exportBtn: !!document.getElementById('lh-export-csv'),
        coldflowBtn: !!document.getElementById('lh-export-coldflow'),
        visitBtn: !!document.getElementById('lh-visit-websites'),
        clearBtn: !!document.getElementById('lh-clear'),
      };
    });
    assert(extensionBtns.scrapeBtn, 'Scrape Results button exists');
    assert(extensionBtns.scrapeDetailBtn, 'Scrape Detail button exists');
    assert(extensionBtns.exportBtn, 'Export CSV button exists');
    assert(extensionBtns.coldflowBtn, 'Send to ColdFlow button exists');
    assert(extensionBtns.visitBtn, 'Visit Websites button exists');
    assert(extensionBtns.clearBtn, 'Clear All button exists');

    // ---- Test 3: Feed container ----
    heading('Test 3 -- feedContainer');

    const feedEl = await page.$(SELECTORS.feedContainer);
    assert(!!feedEl, `Selector works: "${SELECTORS.feedContainer}"`);

    if (feedEl) {
      const childCount = await page.$eval(SELECTORS.feedContainer, (el) => el.children.length);
      info(`Feed has ${childCount} direct children`);
      assert(childCount > 0, 'Feed container has children (result cards)');
    }

    // ---- Test 4: Result cards / items ----
    heading('Test 4 -- resultCards / resultItems');

    const resultItemCount = await page.$$eval(SELECTORS.resultItems, (els) => els.length);
    info(`resultItems: ${resultItemCount} found`);
    assert(resultItemCount > 0, 'resultItems finds at least one match');

    // Sub-selectors
    for (const sub of SELECTORS.resultCards.split(', ')) {
      const count = await page.$$eval(sub.trim(), (els) => els.length);
      if (count > 0) { pass(`resultCards sub "${sub.trim()}": ${count}`); passed++; }
      else           { fail(`resultCards sub "${sub.trim()}": 0`); failed++; }
    }

    // ---- Test 5: Business name ----
    heading('Test 5 -- businessName');

    const nameCount = await page.$$eval(SELECTORS.businessName, (els) => els.length);
    info(`businessName total: ${nameCount}`);
    assert(nameCount > 0, 'businessName finds matches');

    // Sub-selectors
    for (const sub of SELECTORS.businessName.split(', ')) {
      const count = await page.$$eval(sub.trim(), (els) => els.length);
      if (count > 0) { pass(`  sub "${sub.trim()}": ${count}`); passed++; }
      else           { warn(`  sub "${sub.trim()}": 0 (not used in current Maps DOM)`); warned++; }
    }

    if (nameCount > 0) {
      const names = await page.$$eval(SELECTORS.businessName, (els) =>
        els.slice(0, 5).map((e) => e.textContent.trim())
      );
      info(`Sample names: ${JSON.stringify(names)}`);
    }

    // ---- Test 6: Rating ----
    heading('Test 6 -- rating');

    const ratingCount = await page.$$eval(SELECTORS.rating, (els) => els.length);
    info(`rating total: ${ratingCount}`);
    assert(ratingCount > 0, 'rating finds matches');

    if (ratingCount > 0) {
      const ratings = await page.$$eval(SELECTORS.rating, (els) =>
        els.slice(0, 5).map((e) => ({
          text: e.textContent.trim(),
          ariaLabel: e.getAttribute('aria-label') || '',
          class: e.className,
        }))
      );
      info(`Sample ratings: ${JSON.stringify(ratings)}`);
    }

    // ---- Test 7: Review count (KNOWN BROKEN) ----
    heading('Test 7 -- reviewCount');

    const reviewCount = await page.$$eval(SELECTORS.reviewCount, (els) => els.length);
    info(`reviewCount ("${SELECTORS.reviewCount}"): ${reviewCount}`);
    assert(reviewCount > 0, 'reviewCount finds matches');

    if (reviewCount === 0) {
      // Explore what actually holds review counts
      const reviewExplore = await page.evaluate(() => {
        const articles = document.querySelectorAll('div[role="article"]');
        const results = [];
        articles.forEach((card, i) => {
          if (i >= 3) return;
          // The aria-label on the a.hfpxzc link often contains review info
          const link = card.querySelector('a.hfpxzc');
          const ariaLabel = link ? link.getAttribute('aria-label') : '';

          // Find all span elements that contain parenthesized numbers
          const parenSpans = [];
          card.querySelectorAll('span').forEach(s => {
            const t = s.textContent.trim();
            if (/^\([\d,]+\)$/.test(t)) {
              parenSpans.push({
                text: t,
                class: typeof s.className === 'string' ? s.className : '',
                parentClass: typeof s.parentElement.className === 'string' ? s.parentElement.className : '',
              });
            }
          });

          // Check the e4rVHe span (rating wrapper)
          const e4rVHe = card.querySelector('span.e4rVHe');
          const ratingAreaText = e4rVHe ? e4rVHe.parentElement.textContent.trim() : '';

          results.push({ ariaLabel, parenSpans, ratingAreaText });
        });
        return results;
      });

      info('Review count exploration per card:');
      reviewExplore.forEach((r, i) => {
        console.log(`    Card ${i + 1}: ariaLabel="${r.ariaLabel}"`);
        console.log(`      Paren-number spans: ${JSON.stringify(r.parenSpans)}`);
        console.log(`      Rating area text: "${r.ratingAreaText}"`);
      });

      suggestFix(
        'reviewCount',
        'span.UY7F9 class no longer exists in Google Maps DOM',
        'Google Maps no longer shows review counts in the search results list cards. ' +
        'Review counts are only in the a.hfpxzc aria-label (e.g. "Reliant Plumbing") ' +
        'but the count itself is NOT included. Consider extracting from detail panel only, ' +
        'or parsing the aria-label if Google adds it back.'
      );
    }

    // ---- Test 8: Phone ----
    heading('Test 8 -- phone');

    const phoneCount = await page.$$eval(SELECTORS.phone, (els) => els.length);
    info(`phone selector matches: ${phoneCount}`);

    // The phone SELECTOR matches elements, but the phone numbers are actually
    // in span.UsdlK within div.W4Efsd, not in span[style*="color"]
    const phoneViaSelector = await page.evaluate((sel) => {
      const phoneRegex = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
      const els = document.querySelectorAll(sel);
      return els.length > 0 ? [...els].filter(e => phoneRegex.test(e.textContent)).length : 0;
    }, SELECTORS.phone);

    info(`Phone selector elements that actually contain phone numbers: ${phoneViaSelector}`);

    // Test the actual working phone extraction (via W4Efsd text parsing)
    const phoneViaW4 = await page.evaluate(() => {
      const phoneRegex = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      const w4divs = document.querySelectorAll('div[role="article"] div.W4Efsd');
      const phones = [];
      w4divs.forEach(div => {
        const matches = div.textContent.match(phoneRegex);
        if (matches) phones.push(...matches);
      });
      return [...new Set(phones)];
    });
    info(`Phones found via W4Efsd text parsing: ${JSON.stringify(phoneViaW4)}`);
    assert(phoneViaW4.length > 0, 'Phone numbers extractable from W4Efsd divs');

    // Test span.UsdlK (the actual phone number class)
    const usdlkCount = await page.$$eval('span.UsdlK', (els) => els.length);
    info(`span.UsdlK elements: ${usdlkCount}`);
    if (usdlkCount > 0) {
      const usdlkTexts = await page.$$eval('span.UsdlK', (els) =>
        els.slice(0, 5).map(e => e.textContent.trim())
      );
      info(`span.UsdlK texts: ${JSON.stringify(usdlkTexts)}`);
      pass(`span.UsdlK has dedicated phone numbers: ${usdlkCount}`);
      passed++;

      if (phoneViaSelector === 0) {
        suggestFix(
          'phone',
          'span[style*="color"] does not match phone elements (style attributes changed)',
          'Add "span.UsdlK" to the phone selector. Phones live in: ' +
          'div.W4Efsd > span > span.UsdlK. The existing W4Efsd text parsing in ' +
          'scrapeResultCard() works correctly as a fallback.'
        );
      }
    }

    // ---- Test 9: Website link ----
    heading('Test 9 -- websiteLink');

    const websiteCount = await page.$$eval(SELECTORS.websiteLink, (els) => els.length);
    info(`websiteLink matches: ${websiteCount}`);
    assert(websiteCount > 0, 'websiteLink finds matches in search results');

    if (websiteCount > 0) {
      const websiteData = await page.$$eval(SELECTORS.websiteLink, (els) =>
        els.slice(0, 3).map(a => ({
          href: (a.getAttribute('href') || '').substring(0, 80),
          class: typeof a.className === 'string' ? a.className : '',
          ariaLabel: (a.getAttribute('aria-label') || '').substring(0, 60),
          dataValue: a.getAttribute('data-value') || '',
        }))
      );
      info(`Sample website links: ${JSON.stringify(websiteData, null, 2)}`);
    }

    // Test a[data-value="Website"] specifically (from result cards)
    const dvWebsite = await page.$$eval('a[data-value="Website"]', (els) => els.length);
    info(`a[data-value="Website"]: ${dvWebsite}`);

    // Test the lcr4fd class (actual website link class)
    const lcr4fd = await page.$$eval('a.lcr4fd', (els) => els.length);
    info(`a.lcr4fd (website link class): ${lcr4fd}`);

    // IMPORTANT: scrapeResultCard uses card.querySelector('a[href*="http"]')
    // which will match the hfpxzc Google Maps link FIRST (google.com), then
    // skip it. The website link IS present as a.lcr4fd with data-value="Website"
    const websiteInCards = await page.evaluate(() => {
      const articles = document.querySelectorAll('div[role="article"]');
      let found = 0;
      articles.forEach(card => {
        const link = card.querySelector('a[data-value="Website"]');
        if (link) found++;
      });
      return found;
    });
    info(`Cards with a[data-value="Website"] inside article: ${websiteInCards}`);

    // BUT the current scrapeResultCard looks for a[href*="http"] excluding google.com
    const websiteViaCurrentLogic = await page.evaluate(() => {
      const articles = document.querySelectorAll('div[role="article"]');
      let found = 0;
      articles.forEach(card => {
        const links = card.querySelectorAll('a[href*="http"]');
        links.forEach(a => {
          const href = a.getAttribute('href') || '';
          if (href && href.indexOf('google.com') === -1) found++;
        });
      });
      return found;
    });
    info(`Cards with non-google a[href*="http"] (current logic): ${websiteViaCurrentLogic}`);

    if (websiteViaCurrentLogic === 0 && websiteInCards > 0) {
      suggestFix(
        'websiteLink (in scrapeResultCard)',
        'a[href*="http"] excluding google.com finds 0 but a[data-value="Website"] finds matches',
        'Use card.querySelector(\'a[data-value="Website"]\') to get website URLs directly. ' +
        'The current logic might be skipping because the href still contains google.com redirect URLs.'
      );
    }

    // ---- Test 10: Category ----
    heading('Test 10 -- category');

    const catCount = await page.$$eval(SELECTORS.category, (els) => els.length);
    info(`category selector matches: ${catCount}`);

    // The category selector hits elements, but let's check what they actually contain
    if (catCount > 0) {
      const catSamples = await page.$$eval(SELECTORS.category, (els) =>
        els.slice(0, 8).map(e => e.textContent.trim())
      );
      info(`Category selector values: ${JSON.stringify(catSamples)}`);
      // Check if any are actual categories (not addresses)
      const hasCategory = catSamples.some(t =>
        t.length < 40 && !/\d/.test(t) && t.indexOf('$') === -1
      );
      if (hasCategory) {
        pass('Category selector returns actual category text');
        passed++;
      } else {
        warn('Category selector matches are addresses, not categories');
        warned++;
      }
    }

    // Test sub-selectors
    const mgr77e = await page.$$eval('span.mgr77e span', (els) => els.length);
    const w4bodyMed = await page.$$eval('div.W4Efsd span.fontBodyMedium', (els) => els.length);
    info(`span.mgr77e span: ${mgr77e}`);
    info(`div.W4Efsd span.fontBodyMedium: ${w4bodyMed}`);

    // Explore where the actual category text lives
    const categoryExplore = await page.evaluate(() => {
      const articles = document.querySelectorAll('div[role="article"]');
      const results = [];
      articles.forEach((card, i) => {
        if (i >= 3) return;
        // W4Efsd divs - category is typically the first text in the info area
        const w4divs = card.querySelectorAll('div.W4Efsd');
        const w4info = [];
        w4divs.forEach(w => {
          const directSpans = [...w.children].filter(c => c.tagName === 'SPAN');
          directSpans.forEach(s => {
            w4info.push({ text: s.textContent.trim().substring(0, 50), class: typeof s.className === 'string' ? s.className : '' });
          });
        });

        // The category is often the first span inside the second W4Efsd (index 2 in nested structure)
        // Structure: W4Efsd (rating) > W4Efsd (info) > W4Efsd (cat + addr) > span (category)
        const innerW4s = card.querySelectorAll('div.W4Efsd div.W4Efsd');
        const innerW4Info = [...innerW4s].map(w => {
          const firstSpan = w.querySelector(':scope > span');
          return firstSpan ? firstSpan.textContent.trim().substring(0, 50) : '(no span)';
        });

        results.push({ w4info: w4info.slice(0, 6), innerW4Texts: innerW4Info });
      });
      return results;
    });

    info('Category exploration per card:');
    categoryExplore.forEach((r, i) => {
      console.log(`    Card ${i + 1}:`);
      console.log(`      W4Efsd > span: ${JSON.stringify(r.w4info)}`);
      console.log(`      Inner W4Efsd first-span texts: ${JSON.stringify(r.innerW4Texts)}`);
    });

    if (mgr77e === 0) {
      suggestFix(
        'category (scrapeResultCard)',
        'span.mgr77e no longer exists. Category text (e.g. "Plumber") is in nested div.W4Efsd > div.W4Efsd > span (first span child)',
        'In the W4Efsd parsing loop, detect category from the first non-numeric, non-address span. ' +
        'The category is the first span child of the first nested div.W4Efsd inside the info W4Efsd. ' +
        'E.g.: card.querySelector("div.W4Efsd div.W4Efsd > span:first-child") and check text has no digits.'
      );
    }

    // ---- Test 11: Address ----
    heading('Test 11 -- address');

    const addrCount = await page.$$eval(SELECTORS.address, (els) => els.length);
    info(`address selector: ${addrCount} matches`);

    // Explore the actual address structure
    const addressExplore = await page.evaluate(() => {
      const articles = document.querySelectorAll('div[role="article"]');
      const results = [];
      articles.forEach((card, i) => {
        if (i >= 5) return;
        const name = card.querySelector('div.qBF1Pd');
        const nameText = name ? name.textContent.trim() : '?';

        // Current address logic: regex match on W4Efsd text
        const w4divs = card.querySelectorAll('div.W4Efsd');
        const addrRegex = /\d+\s+\w+\s+(st|ave|blvd|rd|dr|ln|way|ct|pl|hwy|pike|pkwy|cir)/i;
        let foundAddr = '';
        w4divs.forEach(div => {
          const text = div.textContent.trim();
          if (addrRegex.test(text) && foundAddr.length === 0) {
            foundAddr = text;
          }
        });

        results.push({ name: nameText, address: foundAddr || '(not found by regex)' });
      });
      return results;
    });

    info('Address extraction per card:');
    addressExplore.forEach(r => {
      const status = r.address.includes('not found') ? RED : GREEN;
      console.log(`    ${r.name}: ${status}${r.address}${RESET}`);
    });

    const addrFoundCount = addressExplore.filter(r => r.address.indexOf('not found') === -1).length;
    info(`Address found for ${addrFoundCount}/${addressExplore.length} cards`);

    if (addrFoundCount < addressExplore.length) {
      suggestFix(
        'address',
        `Address regex only matches ${addrFoundCount}/${addressExplore.length} cards -- ` +
        'some addresses use abbreviations not in the regex (e.g. "Suite", "Ste")',
        'The address is in the second span inside the first nested W4Efsd: ' +
        'div.W4Efsd div.W4Efsd > span:nth-child(2). This span text starts with "\\u00b7 " ' +
        'followed by the address. Also consider broadening the street-type regex or using ' +
        'the span position instead of pattern matching.'
      );
    }

    // ---- Test 12: Hours ----
    heading('Test 12 -- hours');

    const hoursCount = await page.$$eval(SELECTORS.hours, (els) => els.length);
    info(`hours selector: ${hoursCount} matches`);

    // Hours in search results are inline text like "Open 24 hours" in W4Efsd
    const hoursExplore = await page.evaluate(() => {
      const articles = document.querySelectorAll('div[role="article"]');
      let found = 0;
      articles.forEach(card => {
        const spans = card.querySelectorAll('span');
        spans.forEach(s => {
          const t = s.textContent.trim().toLowerCase();
          if (t.includes('open') || t.includes('closed') || t.includes('hours')) {
            found++;
          }
        });
      });
      return found;
    });
    info(`Spans containing hours-like text (open/closed/hours): ${hoursExplore}`);

    if (hoursCount === 0 && hoursExplore > 0) {
      suggestFix(
        'hours',
        'Selector finds 0 matches but hours text exists inline in W4Efsd spans',
        'Hours in search results are plain text in div.W4Efsd spans (e.g. "Open 24 hours"), ' +
        'not in dedicated elements with aria-labels. Parse hours from W4Efsd text using ' +
        '/open|closed|hours/i regex during the W4Efsd scan loop.'
      );
    }

    // ---- Test 13: Full scrape simulation ----
    heading('Test 13 -- Full Scrape Simulation (using content.js logic)');

    const scrapeResults = await page.evaluate((sel) => {
      const results = [];

      function getText(el) {
        return el ? el.textContent.trim() : '';
      }

      function extractPhone(text) {
        if (!text) return '';
        const phoneRegex =
          /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
        const matches = text.match(phoneRegex);
        return matches ? matches[0] : '';
      }

      function extractRating(el) {
        if (!el) return '';
        const ariaLabel = el.getAttribute('aria-label') || '';
        const ratingMatch = ariaLabel.match(/([\d.]+)\s*star/i);
        if (ratingMatch) return ratingMatch[1];
        const text = el.textContent.trim();
        const numMatch = text.match(/^[\d.]+$/);
        return numMatch ? numMatch[0] : text;
      }

      function extractReviewCount(el) {
        if (!el) return '';
        const text = el.textContent.trim();
        const match = text.match(/\(?([\d,]+)\)?/);
        return match ? match[1].replace(/,/g, '') : '';
      }

      const feed = document.querySelector(sel.feedContainer);
      if (feed) {
        const cards = feed.querySelectorAll(':scope > div');
        cards.forEach((card) => {
          const lead = { name: '', rating: '', reviewCount: '', phone: '', address: '', category: '', website: '', hours: '' };

          const nameEl = card.querySelector(sel.businessName);
          lead.name = getText(nameEl);
          if (!lead.name) {
            const ariaLabel = card.getAttribute('aria-label') || '';
            if (ariaLabel) lead.name = ariaLabel;
          }
          if (!lead.name) return;

          const ratingEl = card.querySelector(sel.rating);
          lead.rating = extractRating(ratingEl);

          const reviewEl = card.querySelector(sel.reviewCount);
          lead.reviewCount = extractReviewCount(reviewEl);

          const infoSpans = card.querySelectorAll('div.W4Efsd');
          infoSpans.forEach((span) => {
            const text = span.textContent.trim();
            const phone = extractPhone(text);
            if (phone && !lead.phone) lead.phone = phone;
            if (!lead.address && /\d+\s+\w+\s+(st|ave|blvd|rd|dr|ln|way|ct|pl|hwy|pike|pkwy|cir)/i.test(text)) {
              lead.address = text;
            }
          });

          const categorySpans = card.querySelectorAll('span.mgr77e span, div.W4Efsd span.fontBodyMedium');
          categorySpans.forEach((s) => {
            const t = s.textContent.trim();
            if (t && !lead.category && t.length < 50 && !/\d/.test(t) && !t.includes('$') && !/closed|open/i.test(t)) {
              lead.category = t;
            }
          });

          const websiteBtn = card.querySelector('a[href*="http"]');
          if (websiteBtn) {
            const href = websiteBtn.getAttribute('href') || '';
            if (href && href.indexOf('google.com') === -1) {
              lead.website = href;
            }
          }

          results.push(lead);
        });
      }

      return {
        feedFound: !!feed,
        feedChildCount: feed ? feed.children.length : 0,
        leadsFound: results.length,
        leads: results.slice(0, 10),
      };
    }, SELECTORS);

    info(`Feed found: ${scrapeResults.feedFound}`);
    info(`Feed children: ${scrapeResults.feedChildCount}`);
    info(`Leads scraped: ${scrapeResults.leadsFound}`);
    assert(scrapeResults.leadsFound > 0, 'Full scrape finds at least one lead');

    if (scrapeResults.leads.length > 0) {
      console.log(`\n${CYAN}  Sample scraped leads (current content.js logic):${RESET}`);
      scrapeResults.leads.forEach((lead, i) => {
        console.log(`\n  ${DIM}Lead ${i + 1}:${RESET}`);
        console.log(`    Name:     ${lead.name || `${RED}(empty)${RESET}`}`);
        console.log(`    Rating:   ${lead.rating || `${RED}(empty)${RESET}`}`);
        console.log(`    Reviews:  ${lead.reviewCount || `${RED}(empty)${RESET}`}`);
        console.log(`    Phone:    ${lead.phone || `${RED}(empty)${RESET}`}`);
        console.log(`    Address:  ${lead.address || `${YELLOW}(empty)${RESET}`}`);
        console.log(`    Category: ${lead.category || `${RED}(empty)${RESET}`}`);
        console.log(`    Website:  ${lead.website || `${RED}(empty)${RESET}`}`);
      });

      const total = scrapeResults.leads.length;
      const withName = scrapeResults.leads.filter((l) => l.name).length;
      const withRating = scrapeResults.leads.filter((l) => l.rating).length;
      const withReviews = scrapeResults.leads.filter((l) => l.reviewCount).length;
      const withPhone = scrapeResults.leads.filter((l) => l.phone).length;
      const withAddress = scrapeResults.leads.filter((l) => l.address).length;
      const withCategory = scrapeResults.leads.filter((l) => l.category).length;
      const withWebsite = scrapeResults.leads.filter((l) => l.website).length;

      heading(`Data Quality (${total} sample leads)`);
      const pct = (n) => `${n}/${total} (${Math.round(n / total * 100)}%)`;
      const bar = (n) => n === total ? GREEN : n > 0 ? YELLOW : RED;

      console.log(`  ${bar(withName)}Names:      ${pct(withName)}${RESET}`);
      console.log(`  ${bar(withRating)}Ratings:    ${pct(withRating)}${RESET}`);
      console.log(`  ${bar(withReviews)}Reviews:    ${pct(withReviews)}${RESET}  ${withReviews === 0 ? '<-- BROKEN' : ''}`);
      console.log(`  ${bar(withPhone)}Phones:     ${pct(withPhone)}${RESET}`);
      console.log(`  ${bar(withAddress)}Addresses:  ${pct(withAddress)}${RESET}  ${withAddress < total ? '<-- PARTIAL' : ''}`);
      console.log(`  ${bar(withCategory)}Categories: ${pct(withCategory)}${RESET}  ${withCategory === 0 ? '<-- BROKEN' : ''}`);
      console.log(`  ${bar(withWebsite)}Websites:   ${pct(withWebsite)}${RESET}  ${withWebsite === 0 ? '<-- BROKEN' : ''}`);
    }

    // ---- Test 14: Improved scrape with fixes ----
    heading('Test 14 -- Improved Scrape (with suggested fixes applied)');

    const improvedResults = await page.evaluate(() => {
      const results = [];

      function getText(el) { return el ? el.textContent.trim() : ''; }

      function extractPhone(text) {
        if (!text) return '';
        const phoneRegex = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
        const matches = text.match(phoneRegex);
        return matches ? matches[0] : '';
      }

      const feed = document.querySelector('div[role="feed"]');
      if (!feed) return { leadsFound: 0, leads: [] };

      const cards = feed.querySelectorAll(':scope > div');
      cards.forEach((card) => {
        const lead = { name: '', rating: '', reviewCount: '', phone: '', address: '', category: '', website: '', hours: '' };

        // Name: div.qBF1Pd works great
        const nameEl = card.querySelector('div.qBF1Pd, div.fontHeadlineSmall');
        lead.name = getText(nameEl);
        if (!lead.name) return;

        // Rating: span.MW4etd works
        const ratingEl = card.querySelector('span.MW4etd');
        lead.rating = ratingEl ? ratingEl.textContent.trim() : '';

        // Review count: no longer present in search results list view
        // Could potentially parse from aria-label if Google adds it back
        lead.reviewCount = '';

        // Parse W4Efsd for phone, address, category, hours
        // Structure: outer W4Efsd (rating) + outer W4Efsd (info)
        //   info W4Efsd contains: inner W4Efsd (cat + addr) + inner W4Efsd (hours + phone)
        const outerW4s = card.querySelectorAll(':scope div.W4Efsd');
        // Get the inner W4Efsd divs (the ones nested inside other W4Efsd)
        const innerW4s = [];
        outerW4s.forEach(w => {
          if (w.parentElement && w.parentElement.classList.contains('W4Efsd')) {
            innerW4s.push(w);
          }
        });

        // First inner W4Efsd: category + address
        if (innerW4s[0]) {
          const spans = innerW4s[0].querySelectorAll(':scope > span');
          if (spans[0]) {
            const catText = spans[0].textContent.trim();
            // First span's inner span text (skip the wrapper)
            const innerSpan = spans[0].querySelector('span');
            const catClean = innerSpan ? innerSpan.textContent.trim() : catText;
            if (catClean && catClean.length < 40 && !/\d/.test(catClean)) {
              lead.category = catClean;
            }
          }
          if (spans[1]) {
            // Address is the second span, after the dot separator
            const addrSpan = spans[1].querySelector('span:last-child');
            if (addrSpan) {
              lead.address = addrSpan.textContent.trim();
            }
          }
        }

        // Second inner W4Efsd: hours + phone
        if (innerW4s[1]) {
          const text = innerW4s[1].textContent.trim();
          // Phone
          const phone = extractPhone(text);
          if (phone) lead.phone = phone;
          // Also try span.UsdlK
          if (!lead.phone) {
            const phoneSpan = innerW4s[1].querySelector('span.UsdlK');
            if (phoneSpan) lead.phone = phoneSpan.textContent.trim();
          }
          // Hours
          const hoursMatch = text.match(/(Open\s+[^·]+|Closed)/i);
          if (hoursMatch) lead.hours = hoursMatch[0].trim();
        }

        // Website: use a[data-value="Website"]
        const websiteLink = card.querySelector('a[data-value="Website"]');
        if (websiteLink) {
          lead.website = websiteLink.getAttribute('href') || '';
        }

        results.push(lead);
      });

      return {
        leadsFound: results.length,
        leads: results.slice(0, 10),
      };
    });

    info(`Improved scrape found ${improvedResults.leadsFound} leads`);

    if (improvedResults.leads.length > 0) {
      console.log(`\n${CYAN}  Sample leads with fixes applied:${RESET}`);
      improvedResults.leads.forEach((lead, i) => {
        console.log(`\n  ${DIM}Lead ${i + 1}:${RESET}`);
        console.log(`    Name:     ${lead.name || `${RED}(empty)${RESET}`}`);
        console.log(`    Rating:   ${lead.rating || `${RED}(empty)${RESET}`}`);
        console.log(`    Reviews:  ${lead.reviewCount || `${DIM}(not available in list view)${RESET}`}`);
        console.log(`    Phone:    ${lead.phone || `${RED}(empty)${RESET}`}`);
        console.log(`    Address:  ${lead.address || `${YELLOW}(empty)${RESET}`}`);
        console.log(`    Category: ${lead.category || `${RED}(empty)${RESET}`}`);
        console.log(`    Website:  ${lead.website ? lead.website.substring(0, 60) : `${RED}(empty)${RESET}`}`);
        console.log(`    Hours:    ${lead.hours || `${YELLOW}(empty)${RESET}`}`);
      });

      const total = improvedResults.leads.length;
      const improved = {
        name: improvedResults.leads.filter(l => l.name).length,
        rating: improvedResults.leads.filter(l => l.rating).length,
        phone: improvedResults.leads.filter(l => l.phone).length,
        address: improvedResults.leads.filter(l => l.address).length,
        category: improvedResults.leads.filter(l => l.category).length,
        website: improvedResults.leads.filter(l => l.website).length,
        hours: improvedResults.leads.filter(l => l.hours).length,
      };

      heading(`Improved Data Quality (${total} sample leads)`);
      const pct = (n) => `${n}/${total} (${Math.round(n / total * 100)}%)`;
      const bar = (n) => n === total ? GREEN : n > 0 ? YELLOW : RED;

      console.log(`  ${bar(improved.name)}Names:      ${pct(improved.name)}${RESET}`);
      console.log(`  ${bar(improved.rating)}Ratings:    ${pct(improved.rating)}${RESET}`);
      console.log(`  ${bar(improved.phone)}Phones:     ${pct(improved.phone)}${RESET}`);
      console.log(`  ${bar(improved.address)}Addresses:  ${pct(improved.address)}${RESET}`);
      console.log(`  ${bar(improved.category)}Categories: ${pct(improved.category)}${RESET}`);
      console.log(`  ${bar(improved.website)}Websites:   ${pct(improved.website)}${RESET}`);
      console.log(`  ${bar(improved.hours)}Hours:      ${pct(improved.hours)}${RESET}`);
    }

  } catch (err) {
    fail(`Test error: ${err.message}`);
    console.error(err.stack);
    failed++;
  } finally {
    if (browser) await browser.close();
  }

  // ---- Summary ----
  heading('SUMMARY');
  console.log(`  ${GREEN}Passed: ${passed}${RESET}`);
  console.log(`  ${RED}Failed: ${failed}${RESET}`);
  console.log(`  ${YELLOW}Warned: ${warned}${RESET}`);

  if (fixes.length > 0) {
    heading('SUGGESTED FIXES');
    fixes.forEach((f, i) => {
      console.log(`\n  ${BOLD}${i + 1}. ${f.selector}${RESET}`);
      console.log(`     Problem:  ${f.problem}`);
      console.log(`     Fix:      ${f.suggestion}`);
    });
  }

  console.log();

  if (failed > 0) {
    console.log(`${RED}Some tests failed. See SUGGESTED FIXES above for remediation.${RESET}\n`);
  } else {
    console.log(`${GREEN}All tests passed!${RESET}\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
})();
