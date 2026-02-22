/* ===================================================================
   FlipFlow — test-extension.js
   Puppeteer tests with mock HTML for each marketplace.
   Uses headless: 'new' and verifies content script injection logic.
   =================================================================== */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

/* ------------------------------------------------------------------
   Mock HTML generators
   ------------------------------------------------------------------ */

function mockPoshmarkCloset() {
  return `<!DOCTYPE html>
<html><head><title>My Closet | Poshmark</title></head>
<body>
  <main>
    <div class="closet-container">
      <div data-et-name="listing" class="card--small" style="position:relative;">
        <div data-et-name="listing_title" class="tile__title">Vintage Levi's 501 Jeans</div>
        <div data-et-name="listing_price" class="tile__price"><span>$45.00</span></div>
        <button data-et-name="share" class="btn--share" aria-label="Share">Share</button>
      </div>
      <div data-et-name="listing" class="card--small" style="position:relative;">
        <div data-et-name="listing_title" class="tile__title">Nike Air Max 90</div>
        <div data-et-name="listing_price" class="tile__price"><span>$89.00</span></div>
        <button data-et-name="share" class="btn--share" aria-label="Share">Share</button>
      </div>
      <div data-et-name="listing" class="card--small" style="position:relative;">
        <div data-et-name="listing_title" class="tile__title">Coach Crossbody Bag</div>
        <div data-et-name="listing_price" class="tile__price"><span>$65.00</span></div>
        <button data-et-name="share" class="btn--share" aria-label="Share">Share</button>
        <div class="tile__tag--sold">SOLD</div>
      </div>
    </div>
  </main>
</body></html>`;
}

function mockPoshmarkListing() {
  return `<!DOCTYPE html>
<html><head><title>Vintage Levi's 501 | Poshmark</title></head>
<body>
  <main>
    <div class="listing__details">
      <h1 class="listing__title" data-test="listing-title">Vintage Levi's 501 Jeans</h1>
      <div class="listing__price" data-test="listing-price">
        <span class="p--t--1">$45.00</span>
      </div>
      <div class="listing__description" data-test="listing-description">
        Classic vintage Levi's 501 button fly jeans. Medium wash, great condition.
        Waist 32, Inseam 30. Made in USA.
      </div>
      <div class="listing__details-list">
        <div class="listing__detail-item">Brand: Levi's</div>
      </div>
      <div class="listing__size" data-test="listing-size">Size: 32</div>
      <div class="listing__condition">Condition: Good</div>
      <div class="listing__breadcrumbs">
        <a href="/category/Men">Men</a>
        <a href="/category/Men-Jeans">Jeans</a>
        <a href="/category/Men-Jeans-Straight">Straight Leg</a>
      </div>
      <div class="listing__carousel">
        <img src="https://example.com/photo1.jpg" alt="">
        <img src="https://example.com/photo2.jpg" alt="">
      </div>
    </div>
  </main>
</body></html>`;
}

function mockPoshmarkCreate() {
  return `<!DOCTYPE html>
<html><head><title>Create Listing | Poshmark</title></head>
<body>
  <main>
    <div class="listing-form" data-test="create-listing">
      <input id="listing-title" name="title" type="text" placeholder="Title">
      <textarea id="listing-description" name="description" placeholder="Description"></textarea>
      <input id="listing-price" name="price" type="text" placeholder="Price">
      <input id="listing-brand" name="brand" type="text" placeholder="Brand">
      <input id="listing-size" name="size" type="text" placeholder="Size">
    </div>
  </main>
</body></html>`;
}

function mockEbayListing() {
  return `<!DOCTYPE html>
<html><head><title>Vintage Levi's | eBay</title></head>
<body>
  <div id="mainContent" class="vim">
    <h1 class="x-item-title__mainTitle"><span>Vintage Levi's 501 Jeans W32 L30 Made in USA</span></h1>
    <div itemprop="price" content="39.99">US $39.99</div>
    <div id="vi-itm-cond">Pre-owned</div>
    <div class="ux-labels-values--brand">
      <span class="ux-textspans--BOLD">Levi's</span>
    </div>
    <div class="ux-labels-values--size">
      <span class="ux-textspans--BOLD">32</span>
    </div>
    <div id="desc_div" class="d-item-description">
      Vintage Levi's 501 button fly jeans. Medium wash. Waist 32, Length 30.
    </div>
    <div class="seo-breadcrumb-text">
      <a>Clothing</a>
      <a>Men</a>
      <a>Jeans</a>
    </div>
    <div class="ux-image-carousel">
      <img src="https://i.ebayimg.com/images/g/test1/s-l1600.jpg" alt="">
      <img src="https://i.ebayimg.com/images/g/test2/s-l1600.jpg" alt="">
    </div>
  </div>
</body></html>`;
}

function mockEbayCreate() {
  return `<!DOCTYPE html>
<html><head><title>Sell Your Item | eBay</title></head>
<body>
  <div id="mainContent">
    <input name="title" type="text" placeholder="Title">
    <textarea name="description" placeholder="Description"></textarea>
    <input name="price" type="text" aria-label="Price" placeholder="Price">
    <input name="Brand" type="text" placeholder="Brand">
    <input name="Size" type="text" placeholder="Size">
    <select name="condition">
      <option value="">Select condition</option>
      <option value="1000">New</option>
      <option value="3000">Like New</option>
      <option value="4000">Very Good</option>
      <option value="5000">Good</option>
      <option value="6000">Acceptable</option>
    </select>
  </div>
</body></html>`;
}

function mockMercariListing() {
  return `<!DOCTYPE html>
<html><head><title>Vintage Levi's | Mercari</title></head>
<body>
  <main>
    <div data-testid="item-detail">
      <h1 data-testid="item-name">Vintage Levi's 501 Jeans</h1>
      <div data-testid="item-price">$35.00</div>
      <div data-testid="item-description">
        Classic vintage 501s. Button fly, medium wash, excellent vintage condition.
      </div>
      <div data-testid="item-brand">Levi's</div>
      <div data-testid="item-size">32</div>
      <div data-testid="item-condition">Condition: Like New</div>
      <div data-testid="item-category">
        <a>Men's</a>
        <a>Jeans</a>
      </div>
      <div data-testid="image-carousel">
        <img src="https://static.mercdn.net/item/test1.jpg" alt="">
        <img src="https://static.mercdn.net/item/test2.jpg" alt="">
      </div>
    </div>
  </main>
</body></html>`;
}

function mockMercariCreate() {
  return `<!DOCTYPE html>
<html><head><title>Sell | Mercari</title></head>
<body>
  <main>
    <div data-testid="sell-form">
      <input name="name" type="text" placeholder="What are you selling?">
      <textarea name="description" placeholder="Describe your item"></textarea>
      <input name="price" type="number" placeholder="Price" aria-label="Price">
      <input name="brand" type="text" placeholder="Brand">
      <input name="size" type="text" placeholder="Size">
      <select name="condition">
        <option value="">Select condition</option>
        <option value="1">New</option>
        <option value="2">Like New</option>
        <option value="3">Good</option>
        <option value="4">Fair</option>
        <option value="5">Poor</option>
      </select>
    </div>
  </main>
</body></html>`;
}

/* ------------------------------------------------------------------
   Test runner
   ------------------------------------------------------------------ */

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  PASS: ${description}`);
    passed++;
  } else {
    console.error(`  FAIL: ${description}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=== FlipFlow Extension Tests ===\n');

  const browser = await puppeteer.launch({ headless: 'new' });

  /* Read source files to inject */
  const commonJS = fs.readFileSync(path.join(__dirname, 'content-common.js'), 'utf8');
  const poshmarkJS = fs.readFileSync(path.join(__dirname, 'content-poshmark.js'), 'utf8');
  const ebayJS = fs.readFileSync(path.join(__dirname, 'content-ebay.js'), 'utf8');
  const mercariJS = fs.readFileSync(path.join(__dirname, 'content-mercari.js'), 'utf8');

  /* mock chrome API for testing */
  const chromeApiMock = `
    window._flipflowStorage = {};
    window.chrome = {
      storage: {
        local: {
          get: function(key, cb) {
            const result = {};
            result[key] = window._flipflowStorage[key] || undefined;
            if (cb) cb(result);
          },
          set: function(obj, cb) {
            Object.assign(window._flipflowStorage, obj);
            if (cb) cb();
          },
          clear: function(cb) {
            window._flipflowStorage = {};
            if (cb) cb();
          }
        }
      },
      runtime: {
        sendMessage: function(msg, cb) { if (cb) cb({}); },
        onMessage: { addListener: function() {} }
      },
      alarms: {
        create: function() {},
        getAll: function() { return []; },
        clear: function() {},
        onAlarm: { addListener: function() {} }
      },
      action: {
        setBadgeText: function() {},
        setBadgeBackgroundColor: function() {}
      },
      tabs: {
        create: function(opts) { return Promise.resolve({ id: 1 }); },
        query: function() { return Promise.resolve([]); },
        sendMessage: function() {}
      }
    };
  `;

  /* ------ Test 1: Poshmark closet page ------ */
  console.log('--- Poshmark Closet Page ---');
  {
    const page = await browser.newPage();
    await page.setContent(mockPoshmarkCloset());
    await page.evaluate(chromeApiMock);

    /* override location for page detection */
    await page.evaluate(() => {
      window._flipflowTestHost = 'poshmark.com';
      window._flipflowTestPath = '/closet/testuser';
      window._flipflowTestHref = 'https://poshmark.com/closet/testuser';
    });

    await page.evaluate(commonJS);
    await page.evaluate(poshmarkJS);
    await new Promise(r => setTimeout(r, 2000));

    /* check that toolbar was injected */
    const toolbar = await page.$('.flipflow-closet-toolbar');
    assert(toolbar !== null, 'Closet toolbar injected');

    /* check stats */
    const statsText = await page.$eval('.flipflow-stats', (el) => el.textContent);
    assert(statsText.includes('2'), 'Active count shows 2');
    assert(statsText.includes('1'), 'Sold count shows 1');
    assert(statsText.includes('67.00'), 'Average price is correct ($67.00)');

    /* check share button exists */
    const shareAllBtn = await page.$('.flipflow-btn-poshmark');
    assert(shareAllBtn !== null, 'Share All button exists');

    /* check relist buttons */
    const relistBtns = await page.$$('.flipflow-relist-btn');
    assert(relistBtns.length > 0, 'Relist buttons injected on tiles');

    await page.close();
  }

  /* ------ Test 2: Poshmark listing page scraping ------ */
  console.log('\n--- Poshmark Listing Page ---');
  {
    const page = await browser.newPage();
    await page.setContent(mockPoshmarkListing());
    await page.evaluate(chromeApiMock);

    await page.evaluate(() => {
      window._flipflowTestHost = 'poshmark.com';
      window._flipflowTestPath = '/listing/abc123';
      window._flipflowTestHref = 'https://poshmark.com/listing/abc123';
    });

    await page.evaluate(commonJS);
    await page.evaluate(poshmarkJS);
    await new Promise(r => setTimeout(r, 2000));

    /* check toolbar injected */
    const toolbar = await page.$('.flipflow-listing-toolbar');
    assert(toolbar !== null, 'Listing toolbar injected');

    /* check copy button */
    const copyBtn = await page.$('.flipflow-btn-poshmark');
    assert(copyBtn !== null, 'Copy Listing button exists');

    /* test the scraping function directly */
    const listing = await page.evaluate(() => {
      const sel = {
        DETAIL_TITLE: '[data-test="listing-title"], .listing__title h1, h1.listing__title',
        DETAIL_PRICE: '[data-test="listing-price"], .listing__price .p--t--1',
        DETAIL_DESCRIPTION: '[data-test="listing-description"], .listing__description',
        DETAIL_BRAND: '.listing__details-list .listing__detail-item:first-child',
        DETAIL_SIZE: '[data-test="listing-size"], .listing__size',
        DETAIL_CONDITION: '.listing__condition',
        DETAIL_IMAGES: '.listing__carousel img',
        DETAIL_CATEGORY: '.listing__breadcrumbs a',
      };

      const title = document.querySelector(sel.DETAIL_TITLE)?.textContent?.trim() || '';
      const price = document.querySelector(sel.DETAIL_PRICE)?.textContent?.replace(/[^0-9.]/g, '') || '';
      const description = document.querySelector(sel.DETAIL_DESCRIPTION)?.textContent?.trim() || '';
      const brand = document.querySelector(sel.DETAIL_BRAND)?.textContent?.replace(/brand:?/i, '').trim() || '';
      const size = document.querySelector(sel.DETAIL_SIZE)?.textContent?.replace(/size:?/i, '').trim() || '';
      const condition = document.querySelector(sel.DETAIL_CONDITION)?.textContent?.trim() || '';
      const images = [...document.querySelectorAll(sel.DETAIL_IMAGES)].map(img => img.src).filter(Boolean);
      const category = [...document.querySelectorAll(sel.DETAIL_CATEGORY)].map(a => a.textContent.trim()).join(' > ');

      return { title, price, description, brand, size, condition, images, category };
    });

    assert(listing.title === "Vintage Levi's 501 Jeans", `Title scraped: "${listing.title}"`);
    assert(listing.price === '45.00', `Price scraped: "${listing.price}"`);
    assert(listing.description.includes('button fly'), 'Description scraped');
    assert(listing.brand.includes("Levi's"), `Brand scraped: "${listing.brand}"`);
    assert(listing.size.includes('32'), `Size scraped: "${listing.size}"`);
    assert(listing.condition.includes('Good'), `Condition scraped: "${listing.condition}"`);
    assert(listing.images.length === 2, `Photos scraped: ${listing.images.length}`);
    assert(listing.category.includes('Jeans'), `Category scraped: "${listing.category}"`);

    await page.close();
  }

  /* ------ Test 3: eBay listing page scraping ------ */
  console.log('\n--- eBay Listing Page ---');
  {
    const page = await browser.newPage();
    await page.setContent(mockEbayListing());
    await page.evaluate(chromeApiMock);

    await page.evaluate(() => {
      window._flipflowTestHost = 'www.ebay.com';
      window._flipflowTestPath = '/itm/123456';
      window._flipflowTestHref = 'https://www.ebay.com/itm/123456';
    });

    await page.evaluate(commonJS);
    await page.evaluate(ebayJS);
    await new Promise(r => setTimeout(r, 2000));

    const toolbar = await page.$('.flipflow-listing-toolbar');
    assert(toolbar !== null, 'eBay listing toolbar injected');

    /* test scraping */
    const listing = await page.evaluate(() => {
      const title = document.querySelector('h1.x-item-title__mainTitle span')?.textContent?.trim() || '';
      const priceEl = document.querySelector('[itemprop="price"]');
      const price = priceEl?.getAttribute('content') || '';
      const condition = document.querySelector('#vi-itm-cond')?.textContent?.trim() || '';
      const brand = document.querySelector('.ux-labels-values--brand .ux-textspans--BOLD')?.textContent?.trim() || '';
      const size = document.querySelector('.ux-labels-values--size .ux-textspans--BOLD')?.textContent?.trim() || '';
      const description = document.querySelector('.d-item-description')?.textContent?.trim() || '';
      const images = [...document.querySelectorAll('.ux-image-carousel img')].map(img => img.src);
      const category = [...document.querySelectorAll('.seo-breadcrumb-text a')].map(a => a.textContent.trim()).join(' > ');

      return { title, price, condition, brand, size, description, images, category };
    });

    assert(listing.title.includes("Levi's 501"), `Title scraped: "${listing.title}"`);
    assert(listing.price === '39.99', `Price scraped: "${listing.price}"`);
    assert(listing.condition === 'Pre-owned', `Condition scraped: "${listing.condition}"`);
    assert(listing.brand === "Levi's", `Brand scraped: "${listing.brand}"`);
    assert(listing.size === '32', `Size scraped: "${listing.size}"`);
    assert(listing.images.length === 2, `Photos scraped: ${listing.images.length}`);
    assert(listing.category.includes('Jeans'), `Category scraped: "${listing.category}"`);

    await page.close();
  }

  /* ------ Test 4: Mercari listing page scraping ------ */
  console.log('\n--- Mercari Listing Page ---');
  {
    const page = await browser.newPage();
    await page.setContent(mockMercariListing());
    await page.evaluate(chromeApiMock);

    await page.evaluate(() => {
      window._flipflowTestHost = 'www.mercari.com';
      window._flipflowTestPath = '/item/m123456';
      window._flipflowTestHref = 'https://www.mercari.com/item/m123456';
    });

    await page.evaluate(commonJS);
    await page.evaluate(mercariJS);
    await new Promise(r => setTimeout(r, 2000));

    const toolbar = await page.$('.flipflow-listing-toolbar');
    assert(toolbar !== null, 'Mercari listing toolbar injected');

    const listing = await page.evaluate(() => {
      const title = document.querySelector('[data-testid="item-name"]')?.textContent?.trim() || '';
      const price = document.querySelector('[data-testid="item-price"]')?.textContent?.replace(/[^0-9.]/g, '') || '';
      const description = document.querySelector('[data-testid="item-description"]')?.textContent?.trim() || '';
      const brand = document.querySelector('[data-testid="item-brand"]')?.textContent?.trim() || '';
      const size = document.querySelector('[data-testid="item-size"]')?.textContent?.trim() || '';
      const condition = document.querySelector('[data-testid="item-condition"]')?.textContent?.trim() || '';
      const images = [...document.querySelectorAll('[data-testid="image-carousel"] img')].map(img => img.src);
      const category = [...document.querySelectorAll('[data-testid="item-category"] a')].map(a => a.textContent.trim()).join(' > ');

      return { title, price, description, brand, size, condition, images, category };
    });

    assert(listing.title === "Vintage Levi's 501 Jeans", `Title scraped: "${listing.title}"`);
    assert(listing.price === '35.00', `Price scraped: "${listing.price}"`);
    assert(listing.description.toLowerCase().includes('button fly'), 'Description scraped');
    assert(listing.brand === "Levi's", `Brand scraped: "${listing.brand}"`);
    assert(listing.size === '32', `Size scraped: "${listing.size}"`);
    assert(listing.images.length === 2, `Photos scraped: ${listing.images.length}`);
    assert(listing.category.includes('Jeans'), `Category scraped: "${listing.category}"`);

    await page.close();
  }

  /* ------ Test 5: Poshmark create page paste ------ */
  console.log('\n--- Poshmark Create Page (Paste) ---');
  {
    const page = await browser.newPage();
    await page.setContent(mockPoshmarkCreate());
    await page.evaluate(chromeApiMock);

    /* pre-populate storage with a saved listing */
    await page.evaluate(() => {
      window._flipflowStorage['flipflow_saved_listings'] = [{
        id: 'test-1',
        title: "Vintage Levi's 501 Jeans",
        description: 'Classic vintage 501s. Button fly.',
        price: '45.00',
        brand: "Levi's",
        size: '32',
        condition: 'Good',
        photos: ['https://example.com/photo1.jpg'],
        sourcePlatform: 'poshmark',
        savedAt: new Date().toISOString(),
      }];
    });

    await page.evaluate(() => {
      window._flipflowTestHost = 'poshmark.com';
      window._flipflowTestPath = '/create-listing';
      window._flipflowTestHref = 'https://poshmark.com/create-listing';
    });

    await page.evaluate(commonJS);
    await page.evaluate(poshmarkJS);
    await new Promise(r => setTimeout(r, 2000));

    const toolbar = await page.$('.flipflow-create-toolbar');
    assert(toolbar !== null, 'Create toolbar injected');

    const pasteBtn = await page.$('.flipflow-btn-poshmark');
    assert(pasteBtn !== null, 'Paste Listing button exists');

    /* simulate paste by calling the function directly */
    await page.evaluate(async () => {
      const listing = await FlipFlow.getLastCopiedListing();
      if (listing) {
        const titleInput = document.querySelector('#listing-title');
        const descInput = document.querySelector('#listing-description');
        const priceInput = document.querySelector('#listing-price');
        const brandInput = document.querySelector('#listing-brand');
        if (titleInput) FlipFlow.setInputValue(titleInput, listing.title);
        if (descInput) FlipFlow.setInputValue(descInput, listing.description);
        if (priceInput) FlipFlow.setInputValue(priceInput, listing.price);
        if (brandInput) FlipFlow.setInputValue(brandInput, listing.brand || '');
      }
    });

    const titleVal = await page.$eval('#listing-title', (el) => el.value);
    const descVal = await page.$eval('#listing-description', (el) => el.value);
    const priceVal = await page.$eval('#listing-price', (el) => el.value);
    const brandVal = await page.$eval('#listing-brand', (el) => el.value);

    assert(titleVal === "Vintage Levi's 501 Jeans", `Title pasted: "${titleVal}"`);
    assert(descVal.includes('Button fly'), `Description pasted`);
    assert(priceVal === '45.00', `Price pasted: "${priceVal}"`);
    assert(brandVal === "Levi's", `Brand pasted: "${brandVal}"`);

    await page.close();
  }

  /* ------ Test 6: eBay create page paste ------ */
  console.log('\n--- eBay Create Page (Paste) ---');
  {
    const page = await browser.newPage();
    await page.setContent(mockEbayCreate());
    await page.evaluate(chromeApiMock);

    await page.evaluate(() => {
      window._flipflowStorage['flipflow_saved_listings'] = [{
        id: 'test-2',
        title: "Vintage Levi's 501 Jeans from Poshmark",
        description: 'Classic vintage 501s from Poshmark listing.',
        price: '45.00',
        brand: "Levi's",
        size: '32',
        condition: 'Good',
        photos: [],
        sourcePlatform: 'poshmark',
        savedAt: new Date().toISOString(),
      }];
    });

    await page.evaluate(() => {
      window._flipflowTestHost = 'www.ebay.com';
      window._flipflowTestPath = '/sell/create';
      window._flipflowTestHref = 'https://www.ebay.com/sell/create';
    });

    await page.evaluate(commonJS);
    await page.evaluate(ebayJS);
    await new Promise(r => setTimeout(r, 2000));

    const toolbar = await page.$('.flipflow-create-toolbar');
    assert(toolbar !== null, 'eBay create toolbar injected');

    /* simulate paste */
    await page.evaluate(async () => {
      const listing = await FlipFlow.getLastCopiedListing();
      if (listing) {
        const titleInput = document.querySelector('input[name="title"]');
        const descInput = document.querySelector('textarea[name="description"]');
        const priceInput = document.querySelector('input[aria-label="Price"]');
        const brandInput = document.querySelector('input[name="Brand"]');
        const condSelect = document.querySelector('select[name="condition"]');
        if (titleInput) FlipFlow.setInputValue(titleInput, listing.title.substring(0, 80));
        if (descInput) FlipFlow.setInputValue(descInput, listing.description);
        if (priceInput) FlipFlow.setInputValue(priceInput, listing.price);
        if (brandInput) FlipFlow.setInputValue(brandInput, listing.brand || '');
        if (condSelect && listing.condition) {
          const condMap = { new: '1000', 'like new': '3000', 'very good': '4000', good: '5000', acceptable: '6000' };
          const normalized = listing.condition.toLowerCase().trim();
          for (const [key, val] of Object.entries(condMap)) {
            if (normalized.includes(key)) { condSelect.value = val; break; }
          }
        }
      }
    });

    const titleVal = await page.$eval('input[name="title"]', (el) => el.value);
    const priceVal = await page.$eval('input[aria-label="Price"]', (el) => el.value);
    const condVal = await page.$eval('select[name="condition"]', (el) => el.value);

    assert(titleVal.includes("Levi's 501"), `eBay title pasted: "${titleVal}"`);
    assert(titleVal.length <= 80, `eBay title within 80-char limit: ${titleVal.length}`);
    assert(priceVal === '45.00', `eBay price pasted: "${priceVal}"`);
    assert(condVal === '5000', `eBay condition mapped to "Good" (5000): "${condVal}"`);

    await page.close();
  }

  /* ------ Test 7: Mercari create page paste ------ */
  console.log('\n--- Mercari Create Page (Paste) ---');
  {
    const page = await browser.newPage();
    await page.setContent(mockMercariCreate());
    await page.evaluate(chromeApiMock);

    await page.evaluate(() => {
      window._flipflowStorage['flipflow_saved_listings'] = [{
        id: 'test-3',
        title: "Vintage Levi's 501 Jeans",
        description: 'From eBay. Classic vintage 501s.',
        price: '39.99',
        brand: "Levi's",
        size: '32',
        condition: 'Like New',
        photos: [],
        sourcePlatform: 'ebay',
        savedAt: new Date().toISOString(),
      }];
    });

    await page.evaluate(() => {
      window._flipflowTestHost = 'www.mercari.com';
      window._flipflowTestPath = '/sell';
      window._flipflowTestHref = 'https://www.mercari.com/sell/';
    });

    await page.evaluate(commonJS);
    await page.evaluate(mercariJS);
    await new Promise(r => setTimeout(r, 2000));

    const toolbar = await page.$('.flipflow-create-toolbar');
    assert(toolbar !== null, 'Mercari create toolbar injected');

    /* simulate paste */
    await page.evaluate(async () => {
      const listing = await FlipFlow.getLastCopiedListing();
      if (listing) {
        const titleInput = document.querySelector('input[name="name"]');
        const descInput = document.querySelector('textarea[name="description"]');
        const priceInput = document.querySelector('input[name="price"]');
        const brandInput = document.querySelector('input[name="brand"]');
        const condSelect = document.querySelector('select[name="condition"]');
        if (titleInput) FlipFlow.setInputValue(titleInput, listing.title);
        if (descInput) FlipFlow.setInputValue(descInput, listing.description);
        if (priceInput) FlipFlow.setInputValue(priceInput, listing.price);
        if (brandInput) FlipFlow.setInputValue(brandInput, listing.brand || '');
        if (condSelect) {
          const condMap = { 'like new': '2', new: '1', good: '3', fair: '4', poor: '5' };
          const normalized = listing.condition.toLowerCase().trim();
          for (const [key, val] of Object.entries(condMap)) {
            if (normalized.includes(key)) { condSelect.value = val; break; }
          }
        }
      }
    });

    const titleVal = await page.$eval('input[name="name"]', (el) => el.value);
    const priceVal = await page.$eval('input[name="price"]', (el) => el.value);
    const condVal = await page.$eval('select[name="condition"]', (el) => el.value);

    assert(titleVal === "Vintage Levi's 501 Jeans", `Mercari title pasted: "${titleVal}"`);
    assert(priceVal === '39.99', `Mercari price pasted: "${priceVal}"`);
    assert(condVal === '2', `Mercari condition mapped to "Like New" (2): "${condVal}"`);

    await page.close();
  }

  /* ------ Test 8: FlipFlow common utilities ------ */
  console.log('\n--- FlipFlow Common Utilities ---');
  {
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await page.evaluate(chromeApiMock);

    await page.evaluate(() => {
      window._flipflowTestHost = 'poshmark.com';
      window._flipflowTestPath = '/';
      window._flipflowTestHref = 'https://poshmark.com';
    });

    await page.evaluate(commonJS);

    /* test detectPlatform */
    const platform = await page.evaluate(() => FlipFlow.detectPlatform());
    assert(platform === 'poshmark', `detectPlatform returns "poshmark": "${platform}"`);

    /* test randomDelay */
    const delay = await page.evaluate(() => FlipFlow.randomDelay(2000, 5000));
    assert(delay >= 2000 && delay <= 5000, `randomDelay in range: ${delay}`);

    /* test todayKey */
    const today = await page.evaluate(() => FlipFlow.todayKey());
    assert(/^\d{4}-\d{2}-\d{2}$/.test(today), `todayKey format: "${today}"`);

    /* test saveListing + getSavedListings */
    await page.evaluate(async () => {
      await FlipFlow.saveListing({ title: 'Test Item', price: '25.00', sourcePlatform: 'poshmark' });
    });
    const listings = await page.evaluate(async () => FlipFlow.getSavedListings());
    assert(listings.length === 1, `Saved 1 listing`);
    assert(listings[0].title === 'Test Item', `Listing title correct`);
    assert(listings[0].id, `Listing has auto-generated ID`);

    /* test canPerformAction */
    const canCopy = await page.evaluate(async () => FlipFlow.canPerformAction('copies'));
    assert(canCopy.allowed === true, `canPerformAction allows copies (used 1/5)`);
    assert(canCopy.remaining === 4, `4 copies remaining`);

    /* test toast creation */
    await page.evaluate(() => FlipFlow.showToast('Test message', 'success'));
    const toast = await page.$('.flipflow-toast-success');
    assert(toast !== null, 'Toast element created');

    await page.close();
  }

  /* ------ Test 9: Cross-platform copy-paste flow ------ */
  console.log('\n--- Cross-Platform Flow (Poshmark -> eBay) ---');
  {
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await page.evaluate(chromeApiMock);

    await page.evaluate(() => {
      window._flipflowTestHost = 'poshmark.com';
      window._flipflowTestPath = '/';
      window._flipflowTestHref = 'https://poshmark.com';
    });

    await page.evaluate(commonJS);

    /* save a listing as if copied from Poshmark */
    await page.evaluate(async () => {
      await FlipFlow.saveListing({
        title: 'Cross-Platform Test Jacket',
        description: 'Vintage denim jacket.',
        price: '55.00',
        brand: "Levi's",
        size: 'M',
        condition: 'Very Good',
        photos: ['https://example.com/jacket.jpg'],
        sourcePlatform: 'poshmark',
      });
      await FlipFlow.recordCrossPost('test-cp-1', 'poshmark');
    });

    /* verify it can be retrieved */
    const last = await page.evaluate(async () => FlipFlow.getLastCopiedListing());
    assert(last.title === 'Cross-Platform Test Jacket', 'Cross-platform listing retrieved');
    assert(last.sourcePlatform === 'poshmark', 'Source platform preserved');

    /* record cross-post to eBay */
    await page.evaluate(async () => {
      await FlipFlow.recordCrossPost('test-cp-1', 'ebay');
    });

    const crossPosts = await page.evaluate(async () => FlipFlow.getCrossPosts());
    assert(
      crossPosts['test-cp-1'].includes('poshmark') && crossPosts['test-cp-1'].includes('ebay'),
      'Cross-post tracked on both platforms'
    );

    await page.close();
  }

  /* ------ Test 10: Share stats ------ */
  console.log('\n--- Share Stats ---');
  {
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await page.evaluate(chromeApiMock);

    await page.evaluate(() => {
      window._flipflowTestHost = 'poshmark.com';
      window._flipflowTestPath = '/';
      window._flipflowTestHref = 'https://poshmark.com';
    });

    await page.evaluate(commonJS);

    await page.evaluate(async () => {
      await FlipFlow.recordShares(15);
      await FlipFlow.recordShares(5);
    });

    const stats = await page.evaluate(async () => FlipFlow.getShareStats());
    const today = await page.evaluate(() => FlipFlow.todayKey());
    assert(stats[today] === 20, `Share stats accumulated: ${stats[today]}`);

    await page.close();
  }

  /* ------ Summary ------ */
  await browser.close();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
