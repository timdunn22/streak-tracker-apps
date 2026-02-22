/**
 * NicheScout Extension — Real Amazon Site Test
 *
 * Tests the extension on a live Amazon search page using Puppeteer.
 * Checks whether the content script injects properly and whether
 * the CSS selectors actually match the real Amazon DOM.
 *
 * Usage:  node test-real-site.js
 */

const puppeteer = require('puppeteer');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname);
const AMAZON_SEARCH_URL = 'https://www.amazon.com/s?k=wireless+mouse';
// Fallback: a simpler search with fewer ad placements
const AMAZON_SEARCH_URL_ALT = 'https://www.amazon.com/s?k=usb+c+cable';

// ── Helpers ─────────────────────────────────────────────────────────────────

function log(label, msg) {
  const symbol = label === 'PASS' ? '\x1b[32m✓\x1b[0m' :
                 label === 'FAIL' ? '\x1b[31m✗\x1b[0m' :
                 label === 'INFO' ? '\x1b[36mℹ\x1b[0m' :
                 label === 'WARN' ? '\x1b[33m⚠\x1b[0m' : '·';
  console.log(`  ${symbol}  [${label}] ${msg}`);
}

function section(title) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(70)}`);
}

// ── Main Test ───────────────────────────────────────────────────────────────

(async () => {
  let browser;
  const results = { pass: 0, fail: 0, warn: 0 };

  function pass(msg) { results.pass++; log('PASS', msg); }
  function fail(msg) { results.fail++; log('FAIL', msg); }
  function warn(msg) { results.warn++; log('WARN', msg); }
  function info(msg) { log('INFO', msg); }

  try {
    // ── 1. Launch Chrome with extension ──────────────────────────────────

    section('1. Launching Chrome with NicheScout extension');

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--disable-blink-features=AutomationControlled',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      ],
    });

    pass('Browser launched in headless mode');

    // Verify extension is loaded by checking service workers
    const targets = browser.targets();
    const extTarget = targets.find(t =>
      t.type() === 'service_worker' && t.url().includes('nichescout')
    );

    // Also check by extension ID pattern
    const extTargetById = targets.find(t =>
      t.type() === 'service_worker' && t.url().startsWith('chrome-extension://')
    );

    if (extTarget || extTargetById) {
      pass(`Extension service worker loaded: ${(extTarget || extTargetById).url()}`);
    } else {
      // List all targets for debugging
      info('All browser targets:');
      targets.forEach(t => info(`  type=${t.type()} url=${t.url()}`));
      warn('Extension service worker not found in targets (may load lazily)');
    }

    // ── 2. Navigate to Amazon search page ────────────────────────────────

    section('2. Navigating to Amazon search page');

    const page = await browser.newPage();

    // Set a realistic viewport
    await page.setViewport({ width: 1440, height: 900 });

    info(`Navigating to: ${AMAZON_SEARCH_URL}`);

    let response;
    try {
      response = await page.goto(AMAZON_SEARCH_URL, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
    } catch (err) {
      warn(`Primary URL failed (${err.message}), trying alternate...`);
      response = await page.goto(AMAZON_SEARCH_URL_ALT, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
    }

    const status = response ? response.status() : 'unknown';
    const finalUrl = page.url();
    info(`Response status: ${status}`);
    info(`Final URL: ${finalUrl}`);

    if (status === 200 || status === 301 || status === 302) {
      pass(`Amazon page loaded (HTTP ${status})`);
    } else if (status === 503) {
      fail(`Amazon returned 503 — likely a CAPTCHA/bot block. Status: ${status}`);
    } else {
      warn(`Unexpected status: ${status}`);
    }

    // Check for CAPTCHA / bot detection
    const pageTitle = await page.title();
    info(`Page title: "${pageTitle}"`);

    const captchaDetected = await page.evaluate(() => {
      const body = document.body.innerText || '';
      return body.includes('Enter the characters you see below') ||
             body.includes('Sorry, we just need to make sure') ||
             body.includes('Type the characters you see in this image') ||
             !!document.querySelector('#captchacharacters');
    });

    if (captchaDetected) {
      fail('CAPTCHA detected — Amazon blocked automated access');
      info('This is expected with headless browsers. Results below will be limited.');
    } else {
      pass('No CAPTCHA detected');
    }

    // ── 3. Wait for content script injection ─────────────────────────────

    section('3. Waiting for content script injection (6 seconds)');

    await new Promise(r => setTimeout(r, 6000));

    // Check if our content script's global flag was set
    const scriptInjected = await page.evaluate(() => {
      return !!window.__nichescout_loaded;
    });

    if (scriptInjected) {
      pass('Content script injected (window.__nichescout_loaded = true)');
    } else {
      fail('Content script NOT injected (window.__nichescout_loaded is falsy)');
      info('This could mean: URL pattern mismatch, extension not loaded, or CAPTCHA redirect');

      // Check the URL pattern match
      const currentUrl = await page.url();
      const isSearchPage = currentUrl.includes('amazon.com/s?') || currentUrl.includes('amazon.com/s/');
      info(`Current URL matches content_scripts pattern? ${isSearchPage}`);
    }

    // ── 4. Check NicheScout DOM injection ────────────────────────────────

    section('4. Checking NicheScout DOM elements');

    const overlayExists = await page.evaluate(() => !!document.querySelector('.ns-overlay'));
    const badgeCount = await page.evaluate(() => document.querySelectorAll('.ns-badge').length);
    const reportPanelExists = await page.evaluate(() => !!document.querySelector('.ns-report-panel'));

    if (overlayExists) {
      pass('NicheScout overlay bar (.ns-overlay) found in DOM');

      // Inspect overlay contents
      const overlayData = await page.evaluate(() => {
        const overlay = document.querySelector('.ns-overlay');
        const stats = overlay.querySelectorAll('.ns-overlay-stat-value');
        return {
          html: overlay.innerHTML.substring(0, 500),
          statCount: stats.length,
          statValues: Array.from(stats).map(el => el.textContent.trim()),
        };
      });
      info(`Overlay has ${overlayData.statCount} stat values: ${JSON.stringify(overlayData.statValues)}`);
    } else {
      fail('NicheScout overlay bar (.ns-overlay) NOT found in DOM');
    }

    if (badgeCount > 0) {
      pass(`NicheScout badges found: ${badgeCount} badges (.ns-badge)`);
    } else {
      fail('No NicheScout badges (.ns-badge) found on product cards');
    }

    info(`Report panel present: ${reportPanelExists} (expected: false until clicked)`);

    // ── 5. Test Amazon DOM selectors used by content.js ──────────────────

    section('5. Testing Amazon DOM selectors from content.js');

    // 5a. Search result cards
    const selectorTests = await page.evaluate(() => {
      const results = {};

      // Main selector: product cards
      const cards = document.querySelectorAll('[data-component-type="s-search-result"]');
      results.searchResultCards = {
        selector: '[data-component-type="s-search-result"]',
        count: cards.length,
        hasDataAsin: cards.length > 0 ? !!cards[0].getAttribute('data-asin') : false,
        firstAsin: cards.length > 0 ? cards[0].getAttribute('data-asin') : null,
      };

      // Title selector
      const titleEls1 = document.querySelectorAll('[data-component-type="s-search-result"] h2 a span');
      const titleEls2 = document.querySelectorAll('[data-component-type="s-search-result"] h2 span');
      results.titleSelector = {
        'h2 a span': titleEls1.length,
        'h2 span': titleEls2.length,
        firstTitle: titleEls1.length > 0 ? titleEls1[0].textContent.trim().substring(0, 80) : null,
      };

      // Price selectors
      const priceWholeEls = document.querySelectorAll('[data-component-type="s-search-result"] .a-price-whole');
      const priceFracEls = document.querySelectorAll('[data-component-type="s-search-result"] .a-price-fraction');
      results.priceSelectors = {
        '.a-price-whole': priceWholeEls.length,
        '.a-price-fraction': priceFracEls.length,
        firstPrice: priceWholeEls.length > 0 ?
          `$${priceWholeEls[0].textContent.trim()}${priceFracEls.length > 0 ? priceFracEls[0].textContent.trim() : ''}` :
          null,
      };

      // Rating selector
      const ratingEls = document.querySelectorAll('[data-component-type="s-search-result"] .a-icon-alt');
      results.ratingSelector = {
        '.a-icon-alt': ratingEls.length,
        firstRating: ratingEls.length > 0 ? ratingEls[0].textContent.trim() : null,
      };

      // Review count selector
      const reviewEls = document.querySelectorAll('[data-component-type="s-search-result"] .a-size-base.s-underline-text');
      results.reviewCountSelector = {
        '.a-size-base.s-underline-text': reviewEls.length,
        firstReviewCount: reviewEls.length > 0 ? reviewEls[0].textContent.trim() : null,
      };

      // Link selector
      const linkEls = document.querySelectorAll('[data-component-type="s-search-result"] h2 a');
      results.linkSelector = {
        'h2 a': linkEls.length,
        firstHref: linkEls.length > 0 ? linkEls[0].href.substring(0, 100) : null,
      };

      // Main results container
      results.mainSlot = {
        '.s-main-slot': !!document.querySelector('.s-main-slot'),
        '#search': !!document.querySelector('#search'),
      };

      // Search keyword extraction
      const params = new URLSearchParams(window.location.search);
      results.keyword = {
        k: params.get('k'),
        'field-keywords': params.get('field-keywords'),
      };

      return results;
    });

    // Report each selector
    for (const [name, data] of Object.entries(selectorTests)) {
      info(`\n  ${name}:`);
      for (const [key, val] of Object.entries(data)) {
        const valStr = typeof val === 'string' ? `"${val}"` : JSON.stringify(val);
        if (key === 'count' || key.startsWith('.') || key.startsWith('#') || key.startsWith('h2')) {
          const numVal = typeof val === 'number' ? val : (val ? 1 : 0);
          if (numVal > 0) {
            pass(`  ${name} > ${key}: ${valStr}`);
          } else {
            fail(`  ${name} > ${key}: ${valStr} (selector found NOTHING)`);
          }
        } else {
          info(`  ${name} > ${key}: ${valStr}`);
        }
      }
    }

    // ── 6. Explore actual DOM structure if selectors failed ──────────────

    section('6. Exploring actual Amazon DOM structure');

    const domExploration = await page.evaluate(() => {
      const exploration = {};

      // What data-component-type values exist?
      const allComponents = document.querySelectorAll('[data-component-type]');
      const componentTypes = {};
      allComponents.forEach(el => {
        const t = el.getAttribute('data-component-type');
        componentTypes[t] = (componentTypes[t] || 0) + 1;
      });
      exploration.dataComponentTypes = componentTypes;

      // What [data-asin] elements exist?
      const asinEls = document.querySelectorAll('[data-asin]');
      exploration.dataAsinCount = asinEls.length;
      exploration.firstFiveAsins = Array.from(asinEls).slice(0, 5).map(el => ({
        tag: el.tagName,
        asin: el.getAttribute('data-asin'),
        classes: el.className.substring(0, 100),
        componentType: el.getAttribute('data-component-type'),
      }));

      // What price-related classes exist?
      const priceClasses = [
        '.a-price', '.a-price-whole', '.a-price-fraction', '.a-price-symbol',
        '.a-offscreen', '[data-a-color="price"]',
      ];
      exploration.priceElements = {};
      priceClasses.forEach(sel => {
        exploration.priceElements[sel] = document.querySelectorAll(sel).length;
      });

      // What does the first product card structure look like?
      const firstCard = document.querySelector('[data-component-type="s-search-result"]');
      if (firstCard) {
        exploration.firstCardOuterHTML = firstCard.outerHTML.substring(0, 2000);
        exploration.firstCardChildTags = Array.from(firstCard.children).map(c => ({
          tag: c.tagName,
          class: c.className.substring(0, 80),
        }));
      }

      // If no search result cards, look for alternative product containers
      if (!firstCard) {
        const alternativeSelectors = [
          '.s-result-item',
          '.s-asin',
          '[data-index]',
          '.sg-col-inner',
          '.a-section',
          '#search .s-main-slot > *',
        ];
        exploration.alternativeContainers = {};
        alternativeSelectors.forEach(sel => {
          try {
            exploration.alternativeContainers[sel] = document.querySelectorAll(sel).length;
          } catch (e) {
            exploration.alternativeContainers[sel] = `error: ${e.message}`;
          }
        });
      }

      // Review count: check alternative selectors
      const reviewSelectors = [
        '.a-size-base.s-underline-text',
        '.a-size-small .a-link-normal .a-size-base',
        '[aria-label*="stars"]',
        'span[data-component-type="s-client-side-analytics"]',
        '.s-link-style .a-size-base',
        '.a-row .a-size-small span.a-size-base',
      ];
      exploration.reviewElements = {};
      reviewSelectors.forEach(sel => {
        try {
          const els = document.querySelectorAll(sel);
          exploration.reviewElements[sel] = {
            count: els.length,
            firstText: els.length > 0 ? els[0].textContent.trim().substring(0, 60) : null,
          };
        } catch (e) {
          exploration.reviewElements[sel] = { count: 0, error: e.message };
        }
      });

      // Page body text snippet for debugging (first 500 chars)
      exploration.bodyTextSnippet = (document.body.innerText || '').substring(0, 500);

      return exploration;
    });

    info('Data component types found:');
    for (const [type, count] of Object.entries(domExploration.dataComponentTypes || {})) {
      info(`  "${type}": ${count}`);
    }

    info(`\nTotal [data-asin] elements: ${domExploration.dataAsinCount}`);
    if (domExploration.firstFiveAsins) {
      domExploration.firstFiveAsins.forEach((a, i) => {
        info(`  [${i}] tag=${a.tag} asin=${a.asin} componentType=${a.componentType}`);
      });
    }

    info('\nPrice elements found:');
    for (const [sel, count] of Object.entries(domExploration.priceElements || {})) {
      info(`  ${sel}: ${count}`);
    }

    info('\nReview elements (various selectors):');
    for (const [sel, data] of Object.entries(domExploration.reviewElements || {})) {
      info(`  ${sel}: count=${data.count}${data.firstText ? `, first="${data.firstText}"` : ''}`);
    }

    if (domExploration.alternativeContainers) {
      info('\nAlternative product containers:');
      for (const [sel, count] of Object.entries(domExploration.alternativeContainers)) {
        info(`  ${sel}: ${count}`);
      }
    }

    info(`\nPage body text (first 500 chars):\n  "${domExploration.bodyTextSnippet}"`);

    // ── 7. Test content.js parseProductCards logic manually ──────────────

    section('7. Simulating content.js parseProductCards() in page context');

    const parseResult = await page.evaluate(() => {
      const BSR_DIVISOR = 150000;

      function parsePrice(text) {
        if (!text) return null;
        const m = text.replace(/[^0-9.]/g, '');
        const val = parseFloat(m);
        return isNaN(val) ? null : val;
      }

      const cards = document.querySelectorAll('[data-component-type="s-search-result"]');
      const products = [];

      cards.forEach((card, idx) => {
        if (idx >= 5) return; // Only check first 5

        const titleEl = card.querySelector('h2 a span') || card.querySelector('h2 span');
        const priceWhole = card.querySelector('.a-price-whole');
        const priceFraction = card.querySelector('.a-price-fraction');
        const ratingEl = card.querySelector('.a-icon-alt');
        const reviewCountEl = card.querySelector('.a-size-base.s-underline-text');
        const linkEl = card.querySelector('h2 a');

        let price = null;
        if (priceWhole) {
          const whole = priceWhole.textContent.replace(/[^0-9]/g, '');
          const fraction = priceFraction ? priceFraction.textContent.replace(/[^0-9]/g, '') : '00';
          price = parseFloat(`${whole}.${fraction}`);
        }

        let rating = null;
        if (ratingEl) {
          const m = ratingEl.textContent.match(/([\d.]+)\s*out\s*of/);
          if (m) rating = parseFloat(m[1]);
        }

        let reviewCount = 0;
        if (reviewCountEl) {
          const raw = reviewCountEl.textContent.replace(/[^0-9]/g, '');
          reviewCount = parseInt(raw, 10) || 0;
        }

        const href = linkEl ? linkEl.href : '';
        const asin = card.getAttribute('data-asin') || '';

        products.push({
          index: idx,
          title: titleEl ? titleEl.textContent.trim().substring(0, 80) : '[NOT FOUND]',
          titleSelector: titleEl ? 'found' : 'MISSING',
          price,
          priceWholeFound: !!priceWhole,
          priceFractionFound: !!priceFraction,
          rating,
          ratingFound: !!ratingEl,
          reviewCount,
          reviewCountFound: !!reviewCountEl,
          asin,
          hrefFound: !!linkEl,
          href: href ? href.substring(0, 80) : '[NOT FOUND]',
        });
      });

      return {
        totalCards: cards.length,
        parsedProducts: products,
      };
    });

    info(`Total search result cards found: ${parseResult.totalCards}`);

    if (parseResult.totalCards > 0) {
      pass(`Found ${parseResult.totalCards} product cards`);
    } else {
      fail('Found 0 product cards — content script will do nothing');
    }

    parseResult.parsedProducts.forEach((p, i) => {
      info(`\n  Product #${i + 1} (ASIN: ${p.asin}):`);
      if (p.titleSelector === 'found') {
        pass(`    Title: "${p.title}"`);
      } else {
        fail(`    Title: SELECTOR MISS (h2 a span / h2 span)`);
      }

      if (p.priceWholeFound) {
        pass(`    Price: $${p.price}`);
      } else {
        fail('    Price: SELECTOR MISS (.a-price-whole)');
      }

      if (p.ratingFound) {
        pass(`    Rating: ${p.rating} stars`);
      } else {
        fail('    Rating: SELECTOR MISS (.a-icon-alt)');
      }

      if (p.reviewCountFound && p.reviewCount > 0) {
        pass(`    Reviews: ${p.reviewCount}`);
      } else if (p.reviewCountFound) {
        warn(`    Reviews: found element but parsed 0 (text may not be numeric)`);
      } else {
        fail('    Reviews: SELECTOR MISS (.a-size-base.s-underline-text)');
      }

      if (p.hrefFound) {
        pass(`    Link: ${p.href}`);
      } else {
        fail('    Link: SELECTOR MISS (h2 a)');
      }
    });

    // ── 8. Check for extension errors in console ─────────────────────────

    section('8. Checking for console errors');

    // Collect console messages from a fresh navigation
    const consoleMsgs = [];
    page.on('console', msg => consoleMsgs.push({ type: msg.type(), text: msg.text() }));

    // Re-evaluate to trigger any lazy errors
    await page.evaluate(() => {
      // Force a check
      return document.querySelectorAll('.ns-badge, .ns-overlay, .ns-report-panel').length;
    });

    await new Promise(r => setTimeout(r, 2000));

    const errors = consoleMsgs.filter(m => m.type === 'error');
    const warnings = consoleMsgs.filter(m => m.type === 'warning');
    const nicheScoutLogs = consoleMsgs.filter(m => m.text.includes('NicheScout'));

    if (errors.length > 0) {
      warn(`Console errors: ${errors.length}`);
      errors.forEach(e => info(`  ERROR: ${e.text}`));
    } else {
      pass('No console errors detected');
    }

    if (nicheScoutLogs.length > 0) {
      info('NicheScout-related console messages:');
      nicheScoutLogs.forEach(m => info(`  [${m.type}] ${m.text}`));
    }

    // ── 9. Take screenshot for visual verification ───────────────────────

    section('9. Taking screenshot');

    const screenshotPath = path.join(__dirname, 'test-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    pass(`Screenshot saved to: ${screenshotPath}`);

    // ── 10. Deep DOM dive: find correct selectors for broken ones ───────

    section('10. Deep DOM analysis of broken selectors');

    const deepDive = await page.evaluate(() => {
      const card = document.querySelector('[data-component-type="s-search-result"]');
      if (!card) return { error: 'No product card found' };

      const result = {};

      // ── h2 / link structure ──
      const h2 = card.querySelector('h2');
      result.h2HasAnchorChild = h2 ? !!h2.querySelector('a') : null;
      result.h2HasAnchorParent = h2 ? !!h2.closest('a') : null;
      result.h2ParentAnchorHref = h2 && h2.closest('a') ? h2.closest('a').href : null;

      // Amazon now wraps <a> AROUND <h2>, not inside it
      const wrapperAnchor = card.querySelector('a.a-link-normal.s-line-clamp-2');
      result.wrapperAnchorSelector = 'a.a-link-normal.s-line-clamp-2';
      result.wrapperAnchorFound = !!wrapperAnchor;
      result.wrapperAnchorHref = wrapperAnchor ? wrapperAnchor.href : null;
      result.wrapperAnchorContainsH2 = wrapperAnchor ? !!wrapperAnchor.querySelector('h2') : false;

      // Try generic dp link
      const dpLink = card.querySelector('a[href*="/dp/"]');
      result.dpLinkSelector = 'a[href*="/dp/"]';
      result.dpLinkFound = !!dpLink;
      result.dpLinkHref = dpLink ? dpLink.href : null;

      // ── Review count ──
      // Old selector: .a-size-base.s-underline-text -- BROKEN
      // New Amazon DOM: review count is inside a.s-underline-text span with class including s-underline-text
      const reviewLink = card.querySelector('a[aria-label*="ratings"]');
      result.reviewLinkSelector = 'a[aria-label*="ratings"]';
      result.reviewLinkFound = !!reviewLink;
      result.reviewLinkAriaLabel = reviewLink ? reviewLink.getAttribute('aria-label') : null;
      result.reviewLinkText = reviewLink ? reviewLink.textContent.trim() : null;

      // The span inside the review link
      const reviewSpan = card.querySelector('a[aria-label*="ratings"] span.s-underline-text');
      result.reviewSpanSelector = 'a[aria-label*="ratings"] span.s-underline-text';
      result.reviewSpanFound = !!reviewSpan;
      result.reviewSpanText = reviewSpan ? reviewSpan.textContent.trim() : null;

      // Alternative: s-client-side-analytics span
      const csaSpan = card.querySelector('span[data-component-type="s-client-side-analytics"]');
      result.csaSpanSelector = 'span[data-component-type="s-client-side-analytics"]';
      result.csaSpanFound = !!csaSpan;
      result.csaSpanText = csaSpan ? csaSpan.textContent.trim() : null;

      // ── Verify across 5 cards ──
      const cards = document.querySelectorAll('[data-component-type="s-search-result"]');
      result.multiCardTest = [];
      cards.forEach((c, i) => {
        if (i >= 5) return;
        const asin = c.getAttribute('data-asin') || '';
        const title = c.querySelector('h2 span');

        // NEW link selector: <a> wrapping <h2>
        const link = c.querySelector('a.s-line-clamp-2') || c.querySelector('a[href*="/dp/"]');
        // NEW review selector: aria-label on the review count link
        const revLink = c.querySelector('a[aria-label*="ratings"]');
        const revAriaLabel = revLink ? revLink.getAttribute('aria-label') : null;
        // Parse "49,444 ratings" from aria-label
        let parsedReviewCount = 0;
        if (revAriaLabel) {
          const m = revAriaLabel.replace(/[,]/g, '').match(/(\d+)/);
          if (m) parsedReviewCount = parseInt(m[1], 10);
        }

        result.multiCardTest.push({
          asin,
          title: title ? title.textContent.trim().substring(0, 50) : '[MISS]',
          linkFound: !!link,
          linkHref: link ? link.href.substring(0, 80) : null,
          reviewLinkFound: !!revLink,
          reviewAriaLabel: revAriaLabel,
          parsedReviewCount,
        });
      });

      return result;
    });

    if (deepDive.error) {
      fail(deepDive.error);
    } else {
      info('---- Link selector analysis ----');
      info(`h2 has <a> child inside? ${deepDive.h2HasAnchorChild}`);
      info(`h2 has <a> parent wrapping it? ${deepDive.h2HasAnchorParent}`);
      info(`Parent <a> href: ${deepDive.h2ParentAnchorHref ? deepDive.h2ParentAnchorHref.substring(0, 100) : 'null'}`);
      info(`Wrapper anchor (${deepDive.wrapperAnchorSelector}): found=${deepDive.wrapperAnchorFound}, contains h2=${deepDive.wrapperAnchorContainsH2}`);
      info(`dp link (${deepDive.dpLinkSelector}): found=${deepDive.dpLinkFound}`);

      info('\n---- Review count selector analysis ----');
      info(`Review link (${deepDive.reviewLinkSelector}): found=${deepDive.reviewLinkFound}`);
      info(`  aria-label: "${deepDive.reviewLinkAriaLabel}"`);
      info(`  text content: "${deepDive.reviewLinkText}"`);
      info(`Review span (${deepDive.reviewSpanSelector}): found=${deepDive.reviewSpanFound}, text="${deepDive.reviewSpanText}"`);
      info(`CSA span (${deepDive.csaSpanSelector}): found=${deepDive.csaSpanFound}, text="${deepDive.csaSpanText}"`);

      info('\n---- Proposed fix verification across 5 cards ----');
      deepDive.multiCardTest.forEach((c, i) => {
        const linkStatus = c.linkFound ? '\x1b[32mOK\x1b[0m' : '\x1b[31mMISS\x1b[0m';
        const revStatus = c.reviewLinkFound ? '\x1b[32mOK\x1b[0m' : '\x1b[31mMISS\x1b[0m';
        info(`  [${i}] ${c.asin} "${c.title}"`);
        info(`       Link: ${linkStatus}  Reviews: ${revStatus} (${c.parsedReviewCount} from "${c.reviewAriaLabel}")`);
      });
    }

    // ── Summary ──────────────────────────────────────────────────────────

    section('SUMMARY');

    console.log(`\n  Passed: ${results.pass}`);
    console.log(`  Failed: ${results.fail}`);
    console.log(`  Warnings: ${results.warn}`);
    console.log('');

    // ── Diagnosis & Recommendations ──────────────────────────────────────

    section('DIAGNOSIS & RECOMMENDATIONS');

    // Check if content script ran but found no products
    if (scriptInjected && parseResult.totalCards === 0) {
      info('Content script loaded but found 0 product cards.');
      info('Possible causes:');
      info('  1. Amazon served a CAPTCHA or different page to headless browser');
      info('  2. Amazon A/B testing a different DOM structure');
      info('  3. Page did not fully render (CSR content)');
    }

    if (!scriptInjected) {
      info('Content script did NOT load. Possible causes:');
      info('  1. URL did not match manifest content_scripts patterns');
      info(`     Manifest patterns: "https://www.amazon.com/s?*", "https://www.amazon.com/s/*"`);
      info(`     Actual URL: ${finalUrl}`);
      info('  2. Amazon redirected to CAPTCHA, which breaks the URL pattern match');
      info('  3. Extension failed to load (check chrome://extensions)');
    }

    if (parseResult.totalCards > 0 && !overlayExists) {
      info('Product cards found but overlay NOT injected.');
      info('This likely means chrome.runtime.sendMessage() failed (no service worker response).');
      info('The overlay injection depends on NICHE_SCORE response from background.js.');
    }

    if (parseResult.totalCards > 0) {
      const withPrice = parseResult.parsedProducts.filter(p => p.priceWholeFound).length;
      const withRating = parseResult.parsedProducts.filter(p => p.ratingFound).length;
      const withReviews = parseResult.parsedProducts.filter(p => p.reviewCountFound && p.reviewCount > 0).length;
      const total = parseResult.parsedProducts.length;

      info(`\nSelector hit rate (first ${total} products):`);
      info(`  Title:   ${parseResult.parsedProducts.filter(p => p.titleSelector === 'found').length}/${total}`);
      info(`  Price:   ${withPrice}/${total}`);
      info(`  Rating:  ${withRating}/${total}`);
      info(`  Reviews: ${withReviews}/${total}`);
      info(`  Link:    ${parseResult.parsedProducts.filter(p => p.hrefFound).length}/${total}`);

      if (withPrice < total) {
        info('\nNOTE: Not all products have prices (e.g., "See price in cart" items). This is normal.');
      }
    }

    // ── Specific fix instructions ──
    section('SPECIFIC FIX INSTRUCTIONS FOR content.js');

    info('BUG 1: Link selector "h2 a" fails — Amazon now wraps <a> AROUND <h2>, not inside it.');
    info('  OLD (broken): card.querySelector("h2 a")');
    info('  NEW (working): card.querySelector("a.s-line-clamp-2") || card.querySelector("a[href*=\\"/dp/\\"]")');
    info('  Alternatively, walk up from h2: card.querySelector("h2").closest("a")');
    info('');
    info('BUG 2: Title selector "h2 a span" fails because <a> is not inside <h2>.');
    info('  OLD (broken): card.querySelector("h2 a span")');
    info('  The fallback "h2 span" already works, but h2 a span is checked first and returns null.');
    info('  FIX: Swap the order or remove the h2 a span variant.');
    info('');
    info('BUG 3: Review count selector ".a-size-base.s-underline-text" misses.');
    info('  Amazon now uses <a aria-label="49,444 ratings"> with a <span class="s-underline-text">.');
    info('  The class is "a-size-mini puis-normal-weight-text s-underline-text" (NOT a-size-base).');
    info('  OLD (broken): card.querySelector(".a-size-base.s-underline-text")');
    info('  FIX OPTION A: Parse aria-label from card.querySelector("a[aria-label*=\\"ratings\\"]")');
    info('    Example: aria-label="49,444 ratings" -> parse to get 49444');
    info('  FIX OPTION B: card.querySelector("span.s-underline-text") and parse "(49.4K)" text');
    info('  FIX OPTION C: card.querySelector("span[data-component-type=\\"s-client-side-analytics\\"]") text "(49.4K)"');
    info('');
    info('BUG 4: Overlay stats show "0" for monthly sales and total reviews.');
    info('  Root cause: review count parsing fails (Bug 3), so reviewCount=0 for all products.');
    info('  With reviewCount=0, estimatedBSR=null and monthlySales=0, making the overlay useless.');
    info('  Fixing Bug 3 will cascade-fix the overlay statistics.');
    info('');
    info('NOTE: window.__nichescout_loaded reads as false from Puppeteer because');
    info('  content scripts run in an isolated world. The flag IS set, but in the');
    info('  extension world, not the main world. The overlay and badges DO inject.');

    console.log('');

  } catch (err) {
    console.error('\n  FATAL ERROR:', err.message);
    console.error(err.stack);
  } finally {
    if (browser) {
      await browser.close();
      info('Browser closed.');
    }
  }
})();
