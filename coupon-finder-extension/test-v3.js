/* ──────────────────────────────────────────────
   SaveSmart v3 Test — Real-site Puppeteer Tests
   Tests extension on 10 cart pages + 5 product pages
   ────────────────────────────────────────────── */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.resolve(__dirname);
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots-v3');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

/* ── Cart / Checkout Pages (extension SHOULD activate) ── */
const CART_SITES = [
  { name: 'Target Cart',    url: 'https://www.target.com/cart' },
  { name: 'Amazon Cart',    url: 'https://www.amazon.com/gp/cart/view.html' },
  { name: 'Nike Cart',      url: 'https://www.nike.com/cart' },
  { name: 'Best Buy Cart',  url: 'https://www.bestbuy.com/cart' },
  { name: 'Walmart Cart',   url: 'https://www.walmart.com/cart' },
  { name: 'Adidas Cart',    url: 'https://www.adidas.com/us/cart' },
  { name: 'H&M Cart',       url: 'https://www2.hm.com/en_us/cart' },
  { name: 'Sephora Basket', url: 'https://www.sephora.com/basket' },
  { name: 'Dominos Order',  url: 'https://www.dominos.com/pages/order/' },
  { name: 'GoDaddy Cart',   url: 'https://cart.godaddy.com/' },
];

/* ── Product / Browse Pages (extension should NOT aggressively notify) ── */
const PRODUCT_SITES = [
  { name: 'Target Deals',       url: 'https://www.target.com/c/deals' },
  { name: 'Amazon Product',     url: 'https://www.amazon.com/dp/B09V3KXJPB' },
  { name: 'Nike Product',       url: 'https://www.nike.com/t/air-max-270-mens-shoes-KkLcGR' },
  { name: 'Best Buy Search',    url: 'https://www.bestbuy.com/site/searchpage.jsp?st=laptop' },
  { name: 'Walmart Browse',     url: 'https://www.walmart.com/browse/electronics' },
];

/* ── Console error noise filter ── */
const NOISE_PATTERNS = [
  /net::ERR_/i,
  /CORS/i,
  /cross-origin/i,
  /favicon/i,
  /Failed to load resource/i,
  /third-party cookie/i,
  /DevTools/i,
  /Deprecation/i,
  /violation/i,
  /Content Security Policy/i,
  /Mixed Content/i,
  /ERR_BLOCKED/i,
  /ERR_ABORTED/i,
  /ERR_CONNECTION/i,
  /ERR_NAME_NOT_RESOLVED/i,
  /ERR_CERT/i,
  /Unrecognized feature/i,
  /permissions policy/i,
  /SharedArrayBuffer/i,
  /blocked by client/i,
  /Tracking Prevention/i,
  /same-site/i,
  /SameSite/i,
  /Error with Permissions-Policy/i,
  /blocked:csp/i,
  /ERR_HTTP2/i,
  /ERR_SSL/i,
  /cookie/i,
  /service worker/i,
  /workbox/i,
  /sw\.js/i,
  /analytics/i,
  /facebook/i,
  /doubleclick/i,
  /googletag/i,
  /clarity/i,
  /optimizely/i,
  /segment/i,
  /hotjar/i,
  /gtag/i,
  /gtm/i,
  /tealium/i,
  /cdn-cgi/i,
  /sentry/i,
  /newrelic/i,
  /datadog/i,
  /adobedtm/i,
  /bazaarvoice/i,
  /Refused to/i,
  /unsafe-eval/i,
  /unsafe-inline/i,
];

function isNoise(text) {
  return NOISE_PATTERNS.some(p => p.test(text));
}

/* ── Main Test Runner ── */
async function runTests() {
  console.log('='.repeat(72));
  console.log('  SaveSmart v3 Extension Test Suite');
  console.log('  ' + new Date().toISOString());
  console.log('='.repeat(72));
  console.log();

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1440,900',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ],
    });
  } catch (err) {
    console.error('FATAL: Could not launch browser:', err.message);
    process.exit(1);
  }

  const allResults = [];

  /* ── Test Cart Pages ── */
  console.log('-'.repeat(72));
  console.log('  PART 1: CART / CHECKOUT PAGES (expect extension to activate)');
  console.log('-'.repeat(72));
  console.log();

  for (const site of CART_SITES) {
    const result = await testSite(browser, site, 'cart');
    allResults.push(result);
  }

  /* ── Test Product Pages ── */
  console.log();
  console.log('-'.repeat(72));
  console.log('  PART 2: PRODUCT / BROWSE PAGES (expect NO aggressive notification)');
  console.log('-'.repeat(72));
  console.log();

  for (const site of PRODUCT_SITES) {
    const result = await testSite(browser, site, 'product');
    allResults.push(result);
  }

  await browser.close();

  /* ── Summary ── */
  printSummary(allResults);
}

/* ── Test a single site ── */
async function testSite(browser, site, pageType) {
  const result = {
    name: site.name,
    url: site.url,
    pageType,
    navigated: false,
    navigationError: null,
    notificationInDOM: false,
    notificationText: '',
    notificationType: 'none',  // 'active', 'passive', 'none'
    couponInputsVisible: false,
    couponInputCount: 0,
    expandClicked: [],
    consoleErrors: [],
    screenshotPath: '',
    pass: false,
    notes: '',
  };

  const safeName = site.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const screenshotFile = path.join(SCREENSHOTS_DIR, `${safeName}.png`);
  result.screenshotPath = screenshotFile;

  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    /* Collect console errors */
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!isNoise(text)) {
          consoleErrors.push(text.substring(0, 200));
        }
      }
    });

    /* Navigate */
    console.log(`  [${site.name}] Navigating to ${site.url}`);
    try {
      await page.goto(site.url, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      result.navigated = true;
    } catch (navErr) {
      result.navigationError = navErr.message.substring(0, 150);
      console.log(`    WARNING: Navigation issue: ${result.navigationError}`);
      // Still continue - partial loads can still have the extension injected
      result.navigated = true; // page may still be usable
    }

    /* Wait for content script + expand logic + mutation observer to do their work */
    console.log(`    Waiting 6s for extension activation...`);
    await new Promise(r => setTimeout(r, 6000));

    /* Evaluate page state */
    const pageState = await page.evaluate(() => {
      const state = {
        notificationInDOM: false,
        notificationText: '',
        notificationType: 'none',
        couponInputsVisible: false,
        couponInputCount: 0,
        expandClicked: [],
        pageTitle: document.title,
        url: window.location.href,
        hasSaveSmartLoaded: !!window.__savesmart_loaded,
      };

      /* Check notification bar */
      const notification = document.getElementById('savesmart-notification');
      if (notification) {
        state.notificationInDOM = true;
        state.notificationText = (notification.textContent || '').trim();

        if (state.notificationText.includes('Try Coupons')) {
          state.notificationType = 'active';
        } else if (state.notificationText.includes('available')) {
          state.notificationType = 'passive';
        } else {
          state.notificationType = 'unknown';
        }
      }

      /* Check for visible coupon inputs */
      const couponSelectors = [
        'input[name*="coupon" i]', 'input[name*="promo" i]', 'input[name*="discount" i]',
        'input[name*="voucher" i]', 'input[id*="coupon" i]', 'input[id*="promo" i]',
        'input[id*="discount" i]', 'input[id*="voucher" i]', 'input[class*="coupon" i]',
        'input[class*="promo" i]', 'input[class*="discount" i]',
        'input[placeholder*="coupon" i]', 'input[placeholder*="promo" i]',
        'input[placeholder*="discount" i]', 'input[placeholder*="voucher" i]',
        'input[placeholder*="code" i]', 'input[aria-label*="coupon" i]',
        'input[aria-label*="promo" i]', 'input[aria-label*="discount" i]',
      ];

      let visibleCount = 0;
      for (const sel of couponSelectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          const style = getComputedStyle(el);
          if (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            el.offsetWidth > 0 &&
            el.offsetHeight > 0
          ) {
            visibleCount++;
          }
        }
      }
      state.couponInputCount = visibleCount;
      state.couponInputsVisible = visibleCount > 0;

      /* Check for any expand trigger elements that might have been clicked
         by looking for elements matching expand selectors */
      const expandSelectors = [
        'button[class*="promo" i]', 'button[class*="coupon" i]',
        'a[class*="promo" i]', 'a[class*="coupon" i]',
        'button[id*="promo" i]', 'button[id*="coupon" i]',
        'button[aria-label*="promo" i]', 'button[aria-label*="coupon" i]',
      ];

      for (const sel of expandSelectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          const text = (el.textContent || '').trim().substring(0, 60);
          if (text) {
            state.expandClicked.push(`[${sel.split('[')[1]?.split(']')[0] || sel}] "${text}"`);
          }
        }
      }

      return state;
    });

    /* Populate results */
    result.notificationInDOM = pageState.notificationInDOM;
    result.notificationText = pageState.notificationText;
    result.notificationType = pageState.notificationType;
    result.couponInputsVisible = pageState.couponInputsVisible;
    result.couponInputCount = pageState.couponInputCount;
    result.expandClicked = pageState.expandClicked;
    result.consoleErrors = consoleErrors;

    /* Take screenshot */
    try {
      await page.screenshot({ path: screenshotFile, fullPage: false });
    } catch (ssErr) {
      console.log(`    WARNING: Screenshot failed: ${ssErr.message}`);
    }

    /* Determine pass/fail */
    if (pageType === 'cart') {
      // For cart pages: PASS if notification appeared (active or passive)
      if (result.notificationInDOM) {
        result.pass = true;
        if (result.notificationType === 'active') {
          result.notes = 'Active notification with "Try Coupons" button shown';
        } else if (result.notificationType === 'passive') {
          result.notes = 'Passive notification shown (no coupon input found)';
        } else {
          result.notes = 'Notification shown but type unclear';
        }
      } else {
        // The notification may have auto-dismissed (passive ones dismiss after 6s)
        // Check if the extension at least loaded
        if (pageState.hasSaveSmartLoaded) {
          result.pass = false;
          result.notes = 'Extension loaded but no notification visible (may have auto-dismissed or page not detected as checkout)';
        } else {
          result.pass = false;
          result.notes = 'Extension did not load on this page';
        }
      }
    } else {
      // For product pages: PASS if NO aggressive active notification
      // Passive notifications are acceptable, aggressive "Try Coupons" on non-cart is a fail
      if (result.notificationType === 'active' && result.couponInputsVisible) {
        // Active notification WITH a coupon input on a product page is actually fine
        result.pass = true;
        result.notes = 'Active notification shown - BUT coupon input was found, so this is appropriate';
      } else if (result.notificationType === 'active' && !result.couponInputsVisible) {
        result.pass = false;
        result.notes = 'PROBLEM: Active "Try Coupons" notification on a non-cart page without visible coupon inputs';
      } else if (result.notificationType === 'passive') {
        // Passive is borderline - it's subtle but could be annoying on product pages
        result.pass = true;
        result.notes = 'Passive notification shown - acceptable but could be more selective';
      } else {
        result.pass = true;
        result.notes = 'No notification shown - correct behavior for product/browse page';
      }
    }

    /* Print detailed result */
    console.log(`    Page Title: ${pageState.pageTitle?.substring(0, 70)}`);
    console.log(`    Final URL:  ${pageState.url?.substring(0, 80)}`);
    console.log(`    Extension Loaded: ${pageState.hasSaveSmartLoaded ? 'YES' : 'NO'}`);
    console.log(`    Notification in DOM: ${result.notificationInDOM ? 'YES' : 'NO'}`);
    if (result.notificationInDOM) {
      console.log(`    Notification Type: ${result.notificationType}`);
      console.log(`    Notification Text: "${result.notificationText.substring(0, 100)}"`);
    }
    console.log(`    Coupon Inputs Visible: ${result.couponInputsVisible} (count: ${result.couponInputCount})`);
    if (result.expandClicked.length > 0) {
      console.log(`    Expand Triggers Found: ${result.expandClicked.length}`);
      result.expandClicked.slice(0, 3).forEach(t => console.log(`      - ${t}`));
    }
    if (result.consoleErrors.length > 0) {
      console.log(`    Console Errors (non-noise): ${result.consoleErrors.length}`);
      result.consoleErrors.slice(0, 3).forEach(e => console.log(`      - ${e.substring(0, 120)}`));
    }
    console.log(`    Screenshot: ${path.basename(screenshotFile)}`);
    console.log(`    Result: ${result.pass ? 'PASS' : 'FAIL'} - ${result.notes}`);
    console.log();

  } catch (err) {
    result.pass = false;
    result.notes = `Error: ${err.message.substring(0, 150)}`;
    console.log(`    ERROR: ${err.message.substring(0, 150)}`);
    console.log();
  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
  }

  return result;
}

/* ── Summary Table & Analysis ── */
function printSummary(results) {
  console.log();
  console.log('='.repeat(72));
  console.log('  SUMMARY TABLE');
  console.log('='.repeat(72));
  console.log();

  // Table header
  const nameWidth = 22;
  const typeWidth = 10;
  const navWidth = 5;
  const notifWidth = 10;
  const notifTypeWidth = 10;
  const inputWidth = 8;
  const resultWidth = 6;

  const header = [
    'Site'.padEnd(nameWidth),
    'Type'.padEnd(typeWidth),
    'Nav'.padEnd(navWidth),
    'Notif?'.padEnd(notifWidth),
    'NotifType'.padEnd(notifTypeWidth),
    'Inputs'.padEnd(inputWidth),
    'Result'.padEnd(resultWidth),
  ].join(' | ');

  console.log(header);
  console.log('-'.repeat(header.length));

  for (const r of results) {
    const row = [
      r.name.substring(0, nameWidth).padEnd(nameWidth),
      r.pageType.padEnd(typeWidth),
      (r.navigated ? 'OK' : 'FAIL').padEnd(navWidth),
      (r.notificationInDOM ? 'YES' : 'NO').padEnd(notifWidth),
      r.notificationType.padEnd(notifTypeWidth),
      String(r.couponInputCount).padEnd(inputWidth),
      (r.pass ? 'PASS' : 'FAIL').padEnd(resultWidth),
    ].join(' | ');
    console.log(row);
  }

  console.log();

  /* Stats */
  const cartResults = results.filter(r => r.pageType === 'cart');
  const productResults = results.filter(r => r.pageType === 'product');

  const cartPassed = cartResults.filter(r => r.pass).length;
  const productPassed = productResults.filter(r => r.pass).length;
  const totalPassed = results.filter(r => r.pass).length;

  console.log('='.repeat(72));
  console.log('  PASS RATES');
  console.log('='.repeat(72));
  console.log();
  console.log(`  Cart pages:    ${cartPassed}/${cartResults.length} (${Math.round(cartPassed/cartResults.length*100)}%)`);
  console.log(`  Product pages: ${productPassed}/${productResults.length} (${Math.round(productPassed/productResults.length*100)}%)`);
  console.log(`  Overall:       ${totalPassed}/${results.length} (${Math.round(totalPassed/results.length*100)}%)`);
  console.log();

  /* What's Working */
  console.log('='.repeat(72));
  console.log('  WHAT IS WORKING');
  console.log('='.repeat(72));
  console.log();

  const working = [];

  // Check if extension loads at all
  const cartWithNotif = cartResults.filter(r => r.notificationInDOM);
  if (cartWithNotif.length > 0) {
    working.push(`Extension activates on ${cartWithNotif.length}/${cartResults.length} cart pages`);
  }

  const activeNotifs = results.filter(r => r.notificationType === 'active');
  if (activeNotifs.length > 0) {
    working.push(`Active "Try Coupons" notification shown on ${activeNotifs.length} pages: ${activeNotifs.map(r=>r.name).join(', ')}`);
  }

  const passiveNotifs = results.filter(r => r.notificationType === 'passive');
  if (passiveNotifs.length > 0) {
    working.push(`Passive "available" notification shown on ${passiveNotifs.length} pages: ${passiveNotifs.map(r=>r.name).join(', ')}`);
  }

  const inputsFound = results.filter(r => r.couponInputsVisible);
  if (inputsFound.length > 0) {
    working.push(`Coupon input fields detected on ${inputsFound.length} pages: ${inputsFound.map(r=>r.name).join(', ')}`);
  }

  const quietProducts = productResults.filter(r => !r.notificationInDOM);
  if (quietProducts.length > 0) {
    working.push(`Correctly stayed quiet on ${quietProducts.length}/${productResults.length} product/browse pages`);
  }

  const noErrors = results.filter(r => r.consoleErrors.length === 0);
  if (noErrors.length > results.length / 2) {
    working.push(`No extension console errors on ${noErrors.length}/${results.length} pages`);
  }

  if (working.length === 0) {
    working.push('Nothing clearly working yet');
  }

  working.forEach(w => console.log(`  + ${w}`));
  console.log();

  /* What's NOT Working */
  console.log('='.repeat(72));
  console.log('  WHAT IS NOT WORKING');
  console.log('='.repeat(72));
  console.log();

  const issues = [];

  const cartFailed = cartResults.filter(r => !r.pass);
  if (cartFailed.length > 0) {
    issues.push(`Failed to show notification on ${cartFailed.length} cart pages: ${cartFailed.map(r=>r.name).join(', ')}`);
  }

  const productFailed = productResults.filter(r => !r.pass);
  if (productFailed.length > 0) {
    issues.push(`Incorrectly showed aggressive notification on ${productFailed.length} product pages: ${productFailed.map(r=>r.name).join(', ')}`);
  }

  // Check for auto-dismiss issue (passive notifications dismiss after 6s, and we wait 6s)
  const possibleAutoDismiss = cartResults.filter(r => !r.notificationInDOM && r.navigated);
  if (possibleAutoDismiss.length > 0) {
    issues.push(`Possible auto-dismiss race: ${possibleAutoDismiss.length} cart pages had no notification after 6s wait (passive notifications auto-dismiss at 6s)`);
  }

  const aggressiveProducts = productResults.filter(r => r.notificationType === 'active' && !r.couponInputsVisible);
  if (aggressiveProducts.length > 0) {
    issues.push(`Aggressive "Try Coupons" on product pages without coupon inputs: ${aggressiveProducts.map(r=>r.name).join(', ')}`);
  }

  const passiveProducts = productResults.filter(r => r.notificationType === 'passive');
  if (passiveProducts.length > 0) {
    issues.push(`Passive notifications on product/browse pages (borderline): ${passiveProducts.map(r=>r.name).join(', ')}`);
  }

  const navErrors = results.filter(r => r.navigationError);
  if (navErrors.length > 0) {
    issues.push(`Navigation issues on ${navErrors.length} pages (may be bot-blocking): ${navErrors.map(r=>r.name).join(', ')}`);
  }

  const withErrors = results.filter(r => r.consoleErrors.length > 0);
  if (withErrors.length > 0) {
    issues.push(`Extension console errors on ${withErrors.length} pages`);
  }

  if (issues.length === 0) {
    issues.push('No significant issues found!');
  }

  issues.forEach(i => console.log(`  - ${i}`));
  console.log();

  /* ── Honest Assessment ── */
  console.log('='.repeat(72));
  console.log('  HONEST ASSESSMENT: IS THIS EXTENSION READY TO SHIP?');
  console.log('='.repeat(72));
  console.log();

  const cartPassRate = cartPassed / cartResults.length;
  const productPassRate = productPassed / productResults.length;
  const overallPassRate = totalPassed / results.length;

  if (overallPassRate >= 0.85 && cartPassRate >= 0.7 && productPassRate >= 0.8) {
    console.log('  VERDICT: READY FOR BETA / SOFT LAUNCH');
    console.log();
    console.log('  The extension works well enough for a beta release:');
    console.log(`  - ${Math.round(cartPassRate*100)}% of cart pages trigger correctly`);
    console.log(`  - ${Math.round(productPassRate*100)}% of product pages behave correctly`);
    console.log('  - Core notification UI and detection logic are solid');
    console.log();
    console.log('  Recommended before public launch:');
    console.log('  - Increase passive notification auto-dismiss time (6s may be too short for testing)');
    console.log('  - Add more robust SPA detection for sites that redirect from /cart');
    console.log('  - Test actual coupon application flow with items in cart');
    console.log('  - Consider rate-limiting notifications to once per session per domain');
  } else if (overallPassRate >= 0.6) {
    console.log('  VERDICT: NEEDS WORK BEFORE SHIPPING');
    console.log();
    console.log('  The extension has a solid foundation but needs improvements:');
    console.log(`  - ${Math.round(cartPassRate*100)}% cart detection rate is ${cartPassRate >= 0.5 ? 'decent but' : 'too low and'} needs improvement`);
    console.log(`  - ${Math.round(productPassRate*100)}% product page accuracy ${productPassRate >= 0.8 ? 'is good' : 'needs tightening'}`);
    console.log();
    console.log('  Key issues to address:');
    if (cartPassRate < 0.7) {
      console.log('  - Cart page detection needs better handling of SPAs, redirects, and bot-blocking');
      console.log('  - Some sites redirect /cart to login or empty cart pages');
    }
    if (productPassRate < 0.8) {
      console.log('  - URL pattern matching is too broad (/store, /shop, /product match too many pages)');
      console.log('  - Tighten the isCheckoutPage() heuristics');
    }
    console.log('  - The 6s auto-dismiss on passive notifications makes testing unreliable');
    console.log('  - Consider only showing active notifications when coupon inputs are actually found');
  } else {
    console.log('  VERDICT: NOT READY FOR SHIPPING');
    console.log();
    console.log('  The extension needs significant work:');
    console.log(`  - ${Math.round(overallPassRate*100)}% overall pass rate is below minimum threshold`);
    console.log(`  - Cart detection: ${Math.round(cartPassRate*100)}%`);
    console.log(`  - Product page behavior: ${Math.round(productPassRate*100)}%`);
    console.log();
    console.log('  Fundamental issues:');
    console.log('  - URL pattern matching may be too broad or too narrow');
    console.log('  - Content script injection may be failing on some domains');
    console.log('  - Bot detection / anti-scraping is blocking on major retail sites');
    console.log('  - Timing issues with SPA rendering and auto-dismiss');
    console.log();
    console.log('  Recommendation: Test locally in a real Chrome browser with the extension');
    console.log('  loaded manually to isolate headless-specific vs. real-world issues.');
  }

  console.log();
  console.log('='.repeat(72));
  console.log(`  Screenshots saved to: ${SCREENSHOTS_DIR}`);
  console.log('='.repeat(72));
  console.log();
}

/* ── Execute ── */
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
