/**
 * FlipFlow Extension — Real-Site Integration Test
 *
 * Launches headless Chrome with the extension loaded, then navigates to
 * real Poshmark, eBay, and Mercari pages to verify:
 *   1. Content scripts inject the FlipFlow toolbar/buttons into the DOM
 *   2. The CSS selectors used for scraping actually match real page elements
 *   3. Scraped data (title, price, description, images, etc.) is non-empty
 *
 * Usage:  node test-real-site.js
 */

const puppeteer = require('puppeteer');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname);

/* ------------------------------------------------------------------ */
/*  Colour helpers for terminal output                                 */
/* ------------------------------------------------------------------ */
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function pass(msg) { console.log(`  ${GREEN}PASS${RESET} ${msg}`); }
function fail(msg) { console.log(`  ${RED}FAIL${RESET} ${msg}`); }
function warn(msg) { console.log(`  ${YELLOW}WARN${RESET} ${msg}`); }
function info(msg) { console.log(`  ${CYAN}INFO${RESET} ${msg}`); }
function header(msg) { console.log(`\n${BOLD}${CYAN}━━━ ${msg} ━━━${RESET}`); }

/* ------------------------------------------------------------------ */
/*  Track results                                                      */
/* ------------------------------------------------------------------ */
const results = { passed: 0, failed: 0, warnings: 0 };

function check(condition, label, detail) {
  if (condition) {
    pass(label + (detail ? ` ${DIM}(${detail})${RESET}` : ''));
    results.passed++;
    return true;
  } else {
    fail(label + (detail ? ` ${DIM}(${detail})${RESET}` : ''));
    results.failed++;
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Test URLs — real pages on each marketplace                         */
/* ------------------------------------------------------------------ */
const TEST_URLS = {
  poshmark_closet: 'https://poshmark.com/closet/poshmark',
  poshmark_listing: null,  // will be discovered from closet page
  ebay_listing: 'https://www.ebay.com/sch/i.html?_nkw=nike+shoes&_sacat=0&LH_BIN=1&_sop=12',
  mercari_listing: 'https://www.mercari.com/search/?keyword=nike+shoes',
};

/* ------------------------------------------------------------------ */
/*  Main test runner                                                   */
/* ------------------------------------------------------------------ */
async function main() {
  console.log(`\n${BOLD}FlipFlow Extension — Real-Site Integration Tests${RESET}`);
  console.log(`Extension path: ${DIM}${EXTENSION_PATH}${RESET}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ],
  });

  try {
    /* ============================================================== */
    /*  1. POSHMARK — Closet Page                                     */
    /* ============================================================== */
    header('POSHMARK — Closet Page');
    await testPoshmarkCloset(browser);

    /* ============================================================== */
    /*  2. POSHMARK — Listing Page                                    */
    /* ============================================================== */
    header('POSHMARK — Listing Page');
    await testPoshmarkListing(browser);

    /* ============================================================== */
    /*  3. EBAY — Listing Page                                        */
    /* ============================================================== */
    header('EBAY — Listing Page');
    await testEbayListing(browser);

    /* ============================================================== */
    /*  4. MERCARI — Listing Page                                     */
    /* ============================================================== */
    header('MERCARI — Listing Page');
    await testMercariListing(browser);

  } catch (err) {
    console.error(`\n${RED}Fatal error:${RESET}`, err.message);
    results.failed++;
  } finally {
    await browser.close();
  }

  /* Summary */
  header('SUMMARY');
  console.log(`  ${GREEN}Passed:${RESET}  ${results.passed}`);
  console.log(`  ${RED}Failed:${RESET}  ${results.failed}`);
  console.log(`  ${YELLOW}Warnings:${RESET} ${results.warnings}`);
  console.log('');

  process.exit(results.failed > 0 ? 1 : 0);
}

/* ------------------------------------------------------------------ */
/*  Helper: navigate + wait                                            */
/* ------------------------------------------------------------------ */
async function navigateAndWait(page, url, waitSec = 8) {
  info(`Navigating to ${url}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    // networkidle2 may timeout on SPAs; that's OK if the page loaded
    info(`Navigation note: ${e.message.split('\n')[0]}`);
  }
  info(`Waiting ${waitSec}s for content scripts to inject...`);
  await new Promise(r => setTimeout(r, waitSec * 1000));
}

/* ------------------------------------------------------------------ */
/*  Helper: explore DOM for actual selectors when ours miss            */
/* ------------------------------------------------------------------ */
async function exploreDOM(page, label, selectors, fallbackExploreFn) {
  const result = await page.evaluate((sels) => {
    const out = {};
    for (const [name, sel] of Object.entries(sels)) {
      const el = document.querySelector(sel);
      out[name] = el ? {
        found: true,
        tag: el.tagName,
        text: (el.textContent || '').trim().substring(0, 120),
        classes: el.className?.toString().substring(0, 100) || '',
      } : { found: false };
    }
    return out;
  }, selectors);

  for (const [name, data] of Object.entries(result)) {
    if (data.found) {
      check(true, `Selector ${name} matched`, `<${data.tag}> "${data.text.substring(0, 60)}"`);
    } else {
      check(false, `Selector ${name} NOT found on page`);
    }
  }

  // If any selectors failed, run the fallback explorer
  const anyMissing = Object.values(result).some(d => !d.found);
  if (anyMissing && fallbackExploreFn) {
    info('Exploring actual DOM to find correct selectors...');
    const exploration = await page.evaluate(fallbackExploreFn);
    for (const [key, val] of Object.entries(exploration)) {
      if (val) {
        warn(`  Suggested fix for ${key}: ${val}`);
        results.warnings++;
      }
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  POSHMARK — Closet Page                                             */
/* ------------------------------------------------------------------ */
async function testPoshmarkCloset(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await navigateAndWait(page, TEST_URLS.poshmark_closet, 8);

  const pageUrl = page.url();
  info(`Final URL: ${pageUrl}`);

  // Check if page loaded (Poshmark may redirect or require login)
  const pageTitle = await page.title();
  info(`Page title: "${pageTitle}"`);

  // 1. Check if toolbar was injected
  const toolbarInjected = await page.evaluate(() => {
    return !!document.querySelector('.flipflow-closet-toolbar') ||
           !!document.querySelector('.flipflow-toolbar');
  });
  check(toolbarInjected, 'FlipFlow toolbar injected on closet page');

  // 2. Check closet tile selectors
  const closetSelectors = {
    'CLOSET_TILES [data-et-name="listing"]': '[data-et-name="listing"]',
    'CLOSET_TILE_ALT .card--small': '.card--small',
    'LISTING_TITLE tile__title': '.tile__title',
    'LISTING_PRICE tile__price': '.tile__price span',
  };

  const closetResult = await exploreDOM(page, 'Poshmark Closet', closetSelectors, () => {
    // Explore what tiles actually look like on poshmark closet
    const exploration = {};

    // Look for any card/tile-like containers
    const allCards = document.querySelectorAll('[class*="card"], [class*="tile"], [class*="listing"], [class*="item"]');
    if (allCards.length > 0) {
      const first = allCards[0];
      exploration.possibleTileSelector = `Found ${allCards.length} card/tile elements. First: <${first.tagName}> class="${first.className?.toString().substring(0, 100)}"`;
    } else {
      exploration.possibleTileSelector = 'No card/tile elements found. Page may need login or has different structure.';
    }

    // Look for any links that might be listings
    const listingLinks = document.querySelectorAll('a[href*="/listing/"]');
    if (listingLinks.length > 0) {
      exploration.listingLinks = `Found ${listingLinks.length} listing links. First href: ${listingLinks[0].href}`;
    }

    // Look for price elements
    const priceEls = document.querySelectorAll('[class*="price"], [class*="Price"]');
    if (priceEls.length > 0) {
      exploration.priceElements = `Found ${priceEls.length} price elements. First: <${priceEls[0].tagName}> class="${priceEls[0].className?.toString().substring(0, 80)}" text="${priceEls[0].textContent?.trim().substring(0, 40)}"`;
    }

    // General page structure
    const main = document.querySelector('main');
    if (main) {
      exploration.mainContent = `<main> has ${main.children.length} direct children`;
    }

    // Check data attributes
    const dataEtEls = document.querySelectorAll('[data-et-name]');
    if (dataEtEls.length > 0) {
      const names = [...new Set([...dataEtEls].map(el => el.getAttribute('data-et-name')))];
      exploration.dataEtNames = `data-et-name values: ${names.join(', ')}`;
    } else {
      exploration.dataEtNames = 'No [data-et-name] attributes found on page';
    }

    // Check data-test attributes
    const dataTestEls = document.querySelectorAll('[data-test]');
    if (dataTestEls.length > 0) {
      const names = [...new Set([...dataTestEls].map(el => el.getAttribute('data-test')))];
      exploration.dataTestNames = `data-test values: ${names.slice(0, 20).join(', ')}`;
    }

    return exploration;
  });

  // Try to find a listing URL for the next test
  const listingUrl = await page.evaluate(() => {
    const link = document.querySelector('a[href*="/listing/"]');
    return link ? link.href : null;
  });

  if (listingUrl) {
    TEST_URLS.poshmark_listing = listingUrl;
    info(`Found listing URL for next test: ${listingUrl}`);
  } else {
    // Fallback: try a known Poshmark listing search
    TEST_URLS.poshmark_listing = 'https://poshmark.com/search?query=nike+shoes&type=listings';
    warn('Could not find a listing link on closet page, will search instead');
    results.warnings++;
  }

  await page.close();
}

/* ------------------------------------------------------------------ */
/*  POSHMARK — Listing Page                                            */
/* ------------------------------------------------------------------ */
async function testPoshmarkListing(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // If we have a direct listing URL, use it; otherwise search first
  let listingUrl = TEST_URLS.poshmark_listing;

  if (listingUrl && listingUrl.includes('/search')) {
    await navigateAndWait(page, listingUrl, 6);
    // Find a listing from search results
    const foundUrl = await page.evaluate(() => {
      const link = document.querySelector('a[href*="/listing/"]');
      return link ? link.href : null;
    });
    if (foundUrl) {
      listingUrl = foundUrl;
      info(`Found listing from search: ${listingUrl}`);
    } else {
      warn('Could not find any Poshmark listing to test. Skipping listing page tests.');
      results.warnings++;
      await page.close();
      return;
    }
  }

  if (!listingUrl) {
    warn('No Poshmark listing URL available. Skipping.');
    results.warnings++;
    await page.close();
    return;
  }

  await navigateAndWait(page, listingUrl, 8);

  const pageUrl = page.url();
  info(`Final URL: ${pageUrl}`);

  // 1. Check toolbar injection
  const toolbarInjected = await page.evaluate(() => {
    return !!document.querySelector('.flipflow-listing-toolbar') ||
           !!document.querySelector('.flipflow-toolbar');
  });
  check(toolbarInjected, 'FlipFlow listing toolbar injected');

  // 2. Check Copy Listing button
  const copyBtnExists = await page.evaluate(() => {
    const btns = document.querySelectorAll('.flipflow-btn');
    return [...btns].some(b => b.textContent.includes('Copy Listing'));
  });
  check(copyBtnExists, 'Copy Listing button present');

  // 3. Test all detail selectors
  const detailSelectors = {
    DETAIL_TITLE: '[data-test="listing-title"], .listing__title h1, h1.listing__title',
    DETAIL_PRICE: '[data-test="listing-price"], .listing__price .p--t--1',
    DETAIL_DESCRIPTION: '[data-test="listing-description"], .listing__description',
    DETAIL_BRAND: '.listing__details-list .listing__detail-item:first-child',
    DETAIL_SIZE: '[data-test="listing-size"], .listing__size',
    DETAIL_CONDITION: '.listing__condition, .listing__details .condition',
    DETAIL_IMAGES: '.listing__carousel img, .media-carousel__image, .listing__image img',
    DETAIL_CATEGORY: '.listing__breadcrumbs a, .listing__category',
  };

  // Test each selector individually (since comma-separated selectors need splitting)
  for (const [name, selectorGroup] of Object.entries(detailSelectors)) {
    const selectors = selectorGroup.split(',').map(s => s.trim());
    const found = await page.evaluate((sels) => {
      for (const sel of sels) {
        const el = document.querySelector(sel);
        if (el) {
          return {
            selector: sel,
            tag: el.tagName,
            text: (el.textContent || '').trim().substring(0, 100),
            src: el.src || el.dataset?.src || '',
          };
        }
      }
      return null;
    }, selectors);

    if (found) {
      check(true, `${name} found`, `via "${found.selector}" => "${found.text || found.src}".substring(0,60)`);
    } else {
      check(false, `${name} — none of [${selectorGroup}] matched`);
    }
  }

  // 4. Explore actual DOM for broken selectors
  info('Exploring Poshmark listing page DOM for actual structure...');
  const poshExplore = await page.evaluate(() => {
    const exploration = {};

    // Find the actual title
    const h1s = document.querySelectorAll('h1');
    if (h1s.length > 0) {
      exploration.h1Elements = [...h1s].map(h => ({
        text: h.textContent.trim().substring(0, 80),
        class: h.className?.toString().substring(0, 80),
        parent: h.parentElement?.className?.toString().substring(0, 80),
        dataAttrs: [...h.attributes].filter(a => a.name.startsWith('data-')).map(a => `${a.name}="${a.value}"`).join(' '),
      }));
    }

    // Find price-like elements (contains $)
    const allElements = document.querySelectorAll('*');
    const priceEls = [...allElements].filter(el =>
      el.childNodes.length <= 3 &&
      el.textContent.match(/^\s*\$[\d,.]+\s*$/) &&
      el.tagName !== 'SCRIPT'
    ).slice(0, 5);
    exploration.priceElements = priceEls.map(el => ({
      tag: el.tagName,
      text: el.textContent.trim(),
      class: el.className?.toString().substring(0, 80),
      selector: el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${el.className?.toString().split(' ')[0]}`,
    }));

    // Find description-like elements (long text blocks)
    const textBlocks = [...document.querySelectorAll('p, div, span')].filter(el =>
      el.textContent.trim().length > 100 &&
      el.children.length < 5 &&
      !el.closest('script, style, nav, header, footer')
    ).slice(0, 3);
    exploration.descriptionCandidates = textBlocks.map(el => ({
      tag: el.tagName,
      textPreview: el.textContent.trim().substring(0, 100),
      class: el.className?.toString().substring(0, 80),
    }));

    // Find images that are likely listing photos
    const imgs = [...document.querySelectorAll('img[src*="poshmark"], img[src*="dtc-prod"], img[src*="listing"]')].slice(0, 5);
    exploration.listingImages = imgs.map(img => ({
      src: img.src?.substring(0, 120),
      class: img.className?.toString().substring(0, 80),
      parentClass: img.parentElement?.className?.toString().substring(0, 80),
      width: img.naturalWidth || img.width,
    }));

    // Check data-test attributes specifically
    const dataTestEls = document.querySelectorAll('[data-test]');
    exploration.dataTestValues = [...new Set([...dataTestEls].map(el => el.getAttribute('data-test')))].slice(0, 30);

    // Check for specific class patterns
    const listingClassEls = document.querySelectorAll('[class*="listing"]');
    exploration.listingClassElements = [...listingClassEls].slice(0, 10).map(el => ({
      tag: el.tagName,
      class: el.className?.toString().substring(0, 100),
      childCount: el.children.length,
    }));

    return exploration;
  });

  for (const [key, val] of Object.entries(poshExplore)) {
    if (val && (Array.isArray(val) ? val.length > 0 : true)) {
      info(`${key}: ${JSON.stringify(val, null, 2).substring(0, 500)}`);
    }
  }

  await page.close();
}

/* ------------------------------------------------------------------ */
/*  EBAY — Listing Page                                                */
/* ------------------------------------------------------------------ */
async function testEbayListing(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // First, search for a listing to get a real /itm/ URL
  await navigateAndWait(page, TEST_URLS.ebay_listing, 6);

  const listingUrl = await page.evaluate(() => {
    // eBay search results contain links to /itm/ pages
    const link = document.querySelector('a[href*="/itm/"]');
    return link ? link.href.split('?')[0] : null;
  });

  if (!listingUrl) {
    warn('Could not find any eBay listing from search results. Trying direct approach.');
    results.warnings++;

    // Try exploring what links exist
    const links = await page.evaluate(() => {
      return [...document.querySelectorAll('a[href]')].slice(0, 20).map(a => a.href);
    });
    info(`Sample links on page: ${links.filter(l => l.includes('ebay.com')).slice(0, 5).join('\n    ')}`);
    await page.close();
    return;
  }

  info(`Found eBay listing: ${listingUrl}`);
  await navigateAndWait(page, listingUrl, 8);

  const pageUrl = page.url();
  info(`Final URL: ${pageUrl}`);

  // 1. Check toolbar injection
  const toolbarInjected = await page.evaluate(() => {
    return !!document.querySelector('.flipflow-listing-toolbar') ||
           !!document.querySelector('.flipflow-toolbar');
  });
  check(toolbarInjected, 'FlipFlow toolbar injected on eBay listing page');

  // 2. Check Copy Listing button
  const copyBtnExists = await page.evaluate(() => {
    const btns = document.querySelectorAll('.flipflow-btn');
    return [...btns].some(b => b.textContent.includes('Copy Listing'));
  });
  check(copyBtnExists, 'Copy Listing button present on eBay');

  // 3. Test each selector from content-ebay.js
  const ebaySelectors = {
    DETAIL_TITLE: 'h1.x-item-title__mainTitle span, h1[itemprop="name"], .vim .x-item-title span',
    DETAIL_PRICE: '[itemprop="price"], .x-price-primary span, .notranslate',
    DETAIL_DESCRIPTION: '#desc_ifr, #viTabs_0_is, .d-item-description, #desc_div',
    DETAIL_CONDITION: '#vi-itm-cond, .x-item-condition-text span, [data-testid="x-item-condition"] span',
    DETAIL_IMAGES: '.ux-image-carousel img, #icImg, .pic-vert img, [data-testid="ux-image-carousel"] img',
    DETAIL_CATEGORY: '.breadcrumbs a, .seo-breadcrumb-text a',
    DETAIL_BRAND: '.ux-labels-values--brand .ux-textspans--BOLD, td[data-attrLabel="Brand"] span',
  };

  for (const [name, selectorGroup] of Object.entries(ebaySelectors)) {
    const selectors = selectorGroup.split(',').map(s => s.trim());
    const found = await page.evaluate((sels) => {
      for (const sel of sels) {
        try {
          const el = document.querySelector(sel);
          if (el) {
            return {
              selector: sel,
              tag: el.tagName,
              text: (el.textContent || '').trim().substring(0, 100),
              src: el.src || el.dataset?.src || '',
              content: el.getAttribute('content') || '',
            };
          }
        } catch (e) {
          // Invalid selector
        }
      }
      return null;
    }, selectors);

    if (found) {
      const preview = found.text || found.src || found.content || '';
      check(true, `${name} found`, `via "${found.selector}" => "${preview.substring(0, 60)}"`);
    } else {
      check(false, `${name} — none of [${selectorGroup}] matched`);
    }
  }

  // 4. Explore actual DOM for broken selectors
  info('Exploring eBay listing page DOM for actual structure...');
  const ebayExplore = await page.evaluate(() => {
    const exploration = {};

    // Title candidates
    const h1s = document.querySelectorAll('h1, h1 span');
    exploration.h1Elements = [...h1s].slice(0, 5).map(h => ({
      text: h.textContent.trim().substring(0, 80),
      class: h.className?.toString().substring(0, 80),
      id: h.id || '',
    }));

    // Price candidates
    const priceEls = document.querySelectorAll('[itemprop="price"], [class*="price" i], [class*="Price" i]');
    exploration.priceElements = [...priceEls].slice(0, 5).map(el => ({
      tag: el.tagName,
      text: el.textContent.trim().substring(0, 60),
      class: el.className?.toString().substring(0, 80),
      content: el.getAttribute('content') || '',
      itemprop: el.getAttribute('itemprop') || '',
    }));

    // Condition candidates
    const condEls = document.querySelectorAll('[class*="condition" i], [data-testid*="condition" i], #vi-itm-cond');
    exploration.conditionElements = [...condEls].slice(0, 5).map(el => ({
      tag: el.tagName,
      text: el.textContent.trim().substring(0, 60),
      class: el.className?.toString().substring(0, 80),
      id: el.id || '',
      dataTestid: el.getAttribute('data-testid') || '',
    }));

    // Image candidates
    const imgs = document.querySelectorAll('img');
    const largeImgs = [...imgs].filter(img => {
      const w = img.naturalWidth || img.width || 0;
      return w > 200 || img.src?.includes('s-l') || img.className?.toString().includes('carousel');
    }).slice(0, 5);
    exploration.largeImages = largeImgs.map(img => ({
      src: img.src?.substring(0, 120),
      class: img.className?.toString().substring(0, 80),
      parentClass: img.parentElement?.className?.toString().substring(0, 80),
    }));

    // Description
    const descIframe = document.querySelector('#desc_ifr');
    exploration.hasDescIframe = !!descIframe;
    const descDiv = document.querySelector('#desc_div, .d-item-description, #viTabs_0_is');
    exploration.descDiv = descDiv ? {
      id: descDiv.id,
      class: descDiv.className?.toString().substring(0, 80),
      textPreview: descDiv.textContent?.trim().substring(0, 100),
    } : null;

    // Breadcrumbs
    const breadcrumbs = document.querySelectorAll('.breadcrumbs a, .seo-breadcrumb-text a, nav a');
    exploration.breadcrumbs = [...breadcrumbs].slice(0, 8).map(a => ({
      text: a.textContent.trim().substring(0, 40),
      class: a.className?.toString().substring(0, 60),
    }));

    // data-testid attributes
    const testIds = document.querySelectorAll('[data-testid]');
    exploration.dataTestIds = [...new Set([...testIds].map(el => el.getAttribute('data-testid')))].slice(0, 30);

    // Specifics / item-specifics (brand, size, etc.)
    const specsEls = document.querySelectorAll('[class*="labels-values"], [class*="item-specific"], [class*="ux-labels"]');
    exploration.specificsElements = [...specsEls].slice(0, 10).map(el => ({
      class: el.className?.toString().substring(0, 100),
      text: el.textContent.trim().substring(0, 80),
    }));

    return exploration;
  });

  for (const [key, val] of Object.entries(ebayExplore)) {
    if (val && (Array.isArray(val) ? val.length > 0 : true)) {
      info(`${key}: ${JSON.stringify(val, null, 2).substring(0, 600)}`);
    }
  }

  await page.close();
}

/* ------------------------------------------------------------------ */
/*  MERCARI — Listing Page                                             */
/* ------------------------------------------------------------------ */
async function testMercariListing(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Search for a listing first
  await navigateAndWait(page, TEST_URLS.mercari_listing, 6);

  // Find a real listing URL (/item/ or /items/)
  const listingUrl = await page.evaluate(() => {
    const link = document.querySelector('a[href*="/item/"], a[href*="/items/"]');
    return link ? link.href : null;
  });

  if (!listingUrl) {
    warn('Could not find any Mercari listing from search. Trying to explore DOM...');
    results.warnings++;

    const merSearch = await page.evaluate(() => {
      const exploration = {};
      // Check all links
      const links = [...document.querySelectorAll('a[href]')]
        .filter(a => a.href.includes('mercari.com'))
        .slice(0, 15);
      exploration.links = links.map(a => ({
        href: a.href.substring(0, 120),
        text: a.textContent.trim().substring(0, 40),
      }));

      // Check page body length
      exploration.bodyTextLength = document.body.textContent.length;
      exploration.bodyHTML = document.body.innerHTML.substring(0, 500);

      return exploration;
    });
    info(`Mercari search exploration: ${JSON.stringify(merSearch, null, 2).substring(0, 800)}`);

    // Try a direct product URL pattern
    info('Trying Mercari homepage to find listings...');
    await navigateAndWait(page, 'https://www.mercari.com/', 6);
    const homeListing = await page.evaluate(() => {
      const link = document.querySelector('a[href*="/item/"], a[href*="/items/"]');
      return link ? link.href : null;
    });
    if (!homeListing) {
      warn('Could not find any Mercari listing. Mercari may block headless browsers.');
      results.warnings++;
      await page.close();
      return;
    }
    info(`Found listing from homepage: ${homeListing}`);
    await navigateAndWait(page, homeListing, 8);
  } else {
    info(`Found Mercari listing: ${listingUrl}`);
    await navigateAndWait(page, listingUrl, 8);
  }

  const pageUrl = page.url();
  info(`Final URL: ${pageUrl}`);

  // Check if we're actually on a listing page
  const isListingPage = /\/item(s)?\//.test(pageUrl);
  if (!isListingPage) {
    warn('Not on a Mercari listing page. May have been redirected.');
    results.warnings++;
  }

  // 1. Check toolbar injection
  const toolbarInjected = await page.evaluate(() => {
    return !!document.querySelector('.flipflow-listing-toolbar') ||
           !!document.querySelector('.flipflow-toolbar');
  });
  check(toolbarInjected, 'FlipFlow toolbar injected on Mercari listing page');

  // 2. Check Copy Listing button
  const copyBtnExists = await page.evaluate(() => {
    const btns = document.querySelectorAll('.flipflow-btn');
    return [...btns].some(b => b.textContent.includes('Copy Listing'));
  });
  check(copyBtnExists, 'Copy Listing button present on Mercari');

  // 3. Test each selector from content-mercari.js
  const mercariSelectors = {
    DETAIL_TITLE: '[data-testid="item-name"], h1[class*="ItemName"], .item-name h1, h2[data-testid="ItemInfo"]',
    DETAIL_PRICE: '[data-testid="item-price"], [class*="ItemPrice"], .item-price',
    DETAIL_DESCRIPTION: '[data-testid="item-description"], [class*="ItemDescription"], .item-description',
    DETAIL_BRAND: '[data-testid="item-brand"], [class*="Brand"] a, .item-brand',
    DETAIL_SIZE: '[data-testid="item-size"], [class*="Size"]',
    DETAIL_CONDITION: '[data-testid="item-condition"], [class*="Condition"]',
    DETAIL_IMAGES: '[data-testid="image-carousel"] img, [class*="ItemPhotos"] img, .item-photo img, [class*="DesktopCarousel"] img',
    DETAIL_CATEGORY: '[data-testid="item-category"], [class*="Category"] a, .item-category a',
  };

  for (const [name, selectorGroup] of Object.entries(mercariSelectors)) {
    const selectors = selectorGroup.split(',').map(s => s.trim());
    const found = await page.evaluate((sels) => {
      for (const sel of sels) {
        try {
          const el = document.querySelector(sel);
          if (el) {
            return {
              selector: sel,
              tag: el.tagName,
              text: (el.textContent || '').trim().substring(0, 100),
              src: el.src || el.dataset?.src || '',
            };
          }
        } catch (e) {
          // Invalid selector
        }
      }
      return null;
    }, selectors);

    if (found) {
      const preview = found.text || found.src || '';
      check(true, `${name} found`, `via "${found.selector}" => "${preview.substring(0, 60)}"`);
    } else {
      check(false, `${name} — none of [${selectorGroup}] matched`);
    }
  }

  // 4. Explore actual DOM for broken selectors
  info('Exploring Mercari listing page DOM for actual structure...');
  const merExplore = await page.evaluate(() => {
    const exploration = {};

    // Title candidates
    const headings = document.querySelectorAll('h1, h2, h3');
    exploration.headingElements = [...headings].slice(0, 8).map(h => ({
      tag: h.tagName,
      text: h.textContent.trim().substring(0, 80),
      class: h.className?.toString().substring(0, 80),
      id: h.id || '',
      dataTestid: h.getAttribute('data-testid') || '',
    }));

    // Price candidates
    const priceEls = [...document.querySelectorAll('*')].filter(el =>
      el.childNodes.length <= 3 &&
      /^\s*\$[\d,.]+\s*$/.test(el.textContent) &&
      !['SCRIPT', 'STYLE'].includes(el.tagName)
    ).slice(0, 5);
    exploration.priceElements = priceEls.map(el => ({
      tag: el.tagName,
      text: el.textContent.trim(),
      class: el.className?.toString().substring(0, 80),
      dataTestid: el.getAttribute('data-testid') || '',
    }));

    // data-testid attributes
    const testIds = document.querySelectorAll('[data-testid]');
    exploration.dataTestIds = [...new Set([...testIds].map(el => el.getAttribute('data-testid')))].slice(0, 40);

    // Images
    const imgs = [...document.querySelectorAll('img')].filter(img => {
      const w = img.naturalWidth || img.width || parseInt(img.getAttribute('width') || '0');
      return w > 100 || img.className?.toString().toLowerCase().includes('item') ||
             img.className?.toString().toLowerCase().includes('photo') ||
             img.className?.toString().toLowerCase().includes('carousel');
    }).slice(0, 5);
    exploration.images = imgs.map(img => ({
      src: img.src?.substring(0, 120),
      class: img.className?.toString().substring(0, 80),
      parentClass: img.parentElement?.className?.toString().substring(0, 80),
      dataTestid: img.getAttribute('data-testid') || '',
    }));

    // Description areas (long text blocks)
    const textBlocks = [...document.querySelectorAll('p, div, span')].filter(el =>
      el.textContent.trim().length > 80 &&
      el.children.length < 8 &&
      !el.closest('script, style, nav, header, footer')
    ).slice(0, 3);
    exploration.descCandidates = textBlocks.map(el => ({
      tag: el.tagName,
      textPreview: el.textContent.trim().substring(0, 100),
      class: el.className?.toString().substring(0, 80),
      dataTestid: el.getAttribute('data-testid') || '',
    }));

    // Condition elements
    const condEls = document.querySelectorAll('[class*="condition" i], [class*="Condition"], [data-testid*="condition" i]');
    exploration.conditionElements = [...condEls].slice(0, 5).map(el => ({
      tag: el.tagName,
      text: el.textContent.trim().substring(0, 60),
      class: el.className?.toString().substring(0, 80),
    }));

    // Brand elements
    const brandEls = document.querySelectorAll('[class*="brand" i], [class*="Brand"], [data-testid*="brand" i]');
    exploration.brandElements = [...brandEls].slice(0, 5).map(el => ({
      tag: el.tagName,
      text: el.textContent.trim().substring(0, 60),
      class: el.className?.toString().substring(0, 80),
    }));

    return exploration;
  });

  for (const [key, val] of Object.entries(merExplore)) {
    if (val && (Array.isArray(val) ? val.length > 0 : true)) {
      info(`${key}: ${JSON.stringify(val, null, 2).substring(0, 600)}`);
    }
  }

  await page.close();
}

/* ------------------------------------------------------------------ */
/*  Run                                                                */
/* ------------------------------------------------------------------ */
main().catch((err) => {
  console.error(`${RED}Unhandled error:${RESET}`, err);
  process.exit(1);
});
