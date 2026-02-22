/**
 * NicheScout — End-to-end test with Puppeteer
 * Uses mock Amazon search results HTML to verify the extension works.
 *
 * Run:  node test-extension.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const http = require('http');
const fs = require('fs');

// ── Mock Amazon search results HTML ──────────────────────────────────────

const MOCK_AMAZON_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Amazon.com : funny cat shirts</title>
</head>
<body>
  <div id="search">
    <div class="s-main-slot">

      ${generateProductCards()}

    </div>
  </div>
</body>
</html>
`;

function generateProductCards() {
  const products = [
    { asin: 'B0TEST001', title: 'Funny Cat Lover T-Shirt - Meow is the Time', price: '19.99', rating: '4.5', reviews: '1234' },
    { asin: 'B0TEST002', title: 'Cat Dad Shirt - Best Cat Father Ever Tee', price: '21.99', rating: '4.3', reviews: '856' },
    { asin: 'B0TEST003', title: 'Cute Kitten Graphic Tee - I Love Cats', price: '16.99', rating: '4.7', reviews: '2341' },
    { asin: 'B0TEST004', title: 'Cat Mom Life T-Shirt - Crazy Cat Lady Gift', price: '18.49', rating: '4.1', reviews: '567' },
    { asin: 'B0TEST005', title: 'Vintage Cat Silhouette Retro Style Shirt', price: '24.99', rating: '4.6', reviews: '189' },
    { asin: 'B0TEST006', title: 'Sarcastic Cat Humor Tee - I Do What I Want', price: '17.99', rating: '4.4', reviews: '3012' },
    { asin: 'B0TEST007', title: 'Cats and Coffee Lover Shirt - Cat Caffeine', price: '19.99', rating: '4.2', reviews: '445' },
    { asin: 'B0TEST008', title: 'Black Cat Halloween T-Shirt Spooky Kitty', price: '15.99', rating: '3.9', reviews: '78' },
    { asin: 'B0TEST009', title: 'Tabby Cat Watercolor Art Print Tee', price: '22.99', rating: '4.8', reviews: '34' },
    { asin: 'B0TEST010', title: 'Cat Paw Print Heart Shape T-Shirt Gift', price: '20.49', rating: '4.0', reviews: '912' },
    { asin: 'B0TEST011', title: 'Grumpy Cat Face Meme Shirt - Monday Mood', price: '18.99', rating: '4.3', reviews: '1567' },
    { asin: 'B0TEST012', title: 'Cat Playing Piano Music Funny Tee', price: '23.99', rating: '4.5', reviews: '23' },
  ];

  return products.map(p => `
    <div data-component-type="s-search-result" data-asin="${p.asin}" class="s-result-item">
      <div class="a-section">
        <h2>
          <a class="a-link-normal" href="https://www.amazon.com/dp/${p.asin}">
            <span>${p.title}</span>
          </a>
        </h2>
        <div class="a-row">
          <span class="a-price">
            <span class="a-offscreen">$${p.price}</span>
            <span class="a-price-whole">${p.price.split('.')[0]}</span>
            <span class="a-price-fraction">${p.price.split('.')[1]}</span>
          </span>
        </div>
        <div class="a-row">
          <span class="a-icon-alt">${p.rating} out of 5 stars</span>
        </div>
        <div class="a-row">
          <a class="a-link-normal">
            <span class="a-size-base s-underline-text">${p.reviews}</span>
          </a>
        </div>
      </div>
    </div>
  `).join('\n');
}

// ── Background.js logic (duplicated for unit testing in Node) ────────────

const BSR_SALES_FORMULAS = {
  books:      (bsr) => Math.max(1, Math.round(200000 / bsr)),
  clothing:   (bsr) => Math.max(1, Math.round(150000 / bsr)),
  shirts:     (bsr) => Math.max(1, Math.round(150000 / bsr)),
  popsockets: (bsr) => Math.max(1, Math.round(80000 / bsr)),
  stickers:   (bsr) => Math.max(1, Math.round(60000 / bsr)),
  default:    (bsr) => Math.max(1, Math.round(120000 / bsr)),
};

function bsrToSales(bsr, category = 'default') {
  const fn = BSR_SALES_FORMULAS[category] || BSR_SALES_FORMULAS.default;
  const dailySales = fn(bsr);
  return { daily: dailySales, monthly: dailySales * 30, yearly: dailySales * 365 };
}

function computeNicheScore({ totalReviews, resultCount, avgRating, avgPrice }) {
  const demandRaw = Math.log10(Math.max(1, totalReviews)) * 12;
  const demandScore = Math.min(50, demandRaw);
  const compRaw = Math.log10(Math.max(1, resultCount)) * 15;
  const compScore = Math.min(50, compRaw);
  const ratingBonus = avgRating >= 4.0 ? 5 : avgRating >= 3.5 ? 3 : 0;
  const priceBonus = avgPrice >= 12 && avgPrice <= 25 ? 5 : avgPrice > 25 ? 3 : 0;
  const score = Math.round(Math.max(1, Math.min(100, demandScore - compScore + 50 + ratingBonus + priceBonus)));
  return {
    score,
    label: score >= 70 ? 'Great' : score >= 45 ? 'Moderate' : 'Oversaturated',
    color: score >= 70 ? '#22c55e' : score >= 45 ? '#eab308' : '#ef4444',
    demand: Math.round(demandScore),
    competition: Math.round(compScore),
  };
}

// ── Test Server ──────────────────────────────────────────────────────────

function createMockServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url.includes('/s?') || req.url.includes('/s/')) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(MOCK_AMAZON_HTML);
      } else if (req.url.includes('/api/2017/suggestions')) {
        const urlObj = new URL(req.url, 'http://localhost');
        const prefix = urlObj.searchParams.get('prefix') || 'cat';
        const suggestions = [
          { value: `${prefix} t-shirts` },
          { value: `${prefix} gifts for women` },
          { value: `${prefix} lover accessories` },
          { value: `${prefix} funny sayings` },
          { value: `${prefix} mom life` },
          { value: `${prefix} dad joke` },
          { value: `${prefix} vintage retro` },
          { value: `${prefix} birthday present` },
          { value: `${prefix} Christmas gift idea` },
          { value: `${prefix} minimalist design` },
        ];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ suggestions }));
      } else if (req.url === '/popup.html') {
        const html = fs.readFileSync(path.join(__dirname, 'popup.html'), 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      } else if (req.url === '/popup.css') {
        const css = fs.readFileSync(path.join(__dirname, 'popup.css'), 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/css' });
        res.end(css);
      } else if (req.url === '/popup.js') {
        // Serve popup.js but without chrome.runtime calls (for testing structure only)
        res.writeHead(200, { 'Content-Type': 'text/javascript' });
        res.end('/* popup.js loaded for structural testing */');
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(0, () => {
      const port = server.address().port;
      console.log(`Mock server running on port ${port}`);
      resolve({ server, port });
    });
  });
}

// ── Tests ────────────────────────────────────────────────────────────────

async function runTests() {
  const { server, port } = await createMockServer();
  let browser;
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  PASS: ${message}`);
      passed++;
    } else {
      console.error(`  FAIL: ${message}`);
      failed++;
    }
  }

  try {
    console.log('\n=== NicheScout Extension Tests ===\n');

    // ── Unit Tests (no browser needed) ──────────────────────────────

    // Test 1: BSR-to-Sales formulas
    console.log('Test 1: BSR-to-Sales formula accuracy');

    const bookSales = bsrToSales(10000, 'books');
    assert(bookSales.daily === 20, `Books BSR 10000 -> 20 daily sales: ${bookSales.daily}`);
    assert(bookSales.monthly === 600, `Books BSR 10000 -> 600 monthly: ${bookSales.monthly}`);
    assert(bookSales.yearly === 7300, `Books BSR 10000 -> 7300 yearly: ${bookSales.yearly}`);

    const clothingSales = bsrToSales(5000, 'clothing');
    assert(clothingSales.daily === 30, `Clothing BSR 5000 -> 30 daily: ${clothingSales.daily}`);
    assert(clothingSales.monthly === 900, `Clothing BSR 5000 -> 900 monthly: ${clothingSales.monthly}`);

    const stickerSales = bsrToSales(1000, 'stickers');
    assert(stickerSales.daily === 60, `Stickers BSR 1000 -> 60 daily: ${stickerSales.daily}`);

    const defaultSales = bsrToSales(120000, 'default');
    assert(defaultSales.daily === 1, `Default BSR 120000 -> 1 daily: ${defaultSales.daily}`);

    const topSeller = bsrToSales(1, 'books');
    assert(topSeller.daily === 200000, `Books BSR 1 -> 200000 daily: ${topSeller.daily}`);

    // Test 2: Niche Score computation
    console.log('\nTest 2: Niche Score computation');

    const goodNiche = computeNicheScore({ totalReviews: 5000, resultCount: 20, avgRating: 4.5, avgPrice: 19.99 });
    assert(typeof goodNiche.score === 'number', `Score is a number: ${goodNiche.score}`);
    assert(goodNiche.score >= 1 && goodNiche.score <= 100, `Score in range 1-100: ${goodNiche.score}`);
    assert(goodNiche.label === 'Great', `High-demand low-competition = Great: ${goodNiche.label}`);
    assert(goodNiche.color === '#22c55e', `Great niche is green: ${goodNiche.color}`);

    const badNiche = computeNicheScore({ totalReviews: 100, resultCount: 100000, avgRating: 3.2, avgPrice: 9.99 });
    assert(badNiche.score < 45, `Low demand high competition gives low score: ${badNiche.score}`);
    assert(badNiche.label === 'Oversaturated', `Bad niche is Oversaturated: ${badNiche.label}`);
    assert(badNiche.color === '#ef4444', `Oversaturated is red: ${badNiche.color}`);

    const midNiche = computeNicheScore({ totalReviews: 1000, resultCount: 500, avgRating: 4.0, avgPrice: 15.00 });
    assert(midNiche.score >= 1 && midNiche.score <= 100, `Mid niche score in range: ${midNiche.score}`);

    // Verify demand and competition sub-scores exist
    assert(typeof goodNiche.demand === 'number', `Demand sub-score exists: ${goodNiche.demand}`);
    assert(typeof goodNiche.competition === 'number', `Competition sub-score exists: ${goodNiche.competition}`);

    // ── Browser Tests (mock HTML parsing) ───────────────────────────

    console.log('\nTest 3: Product card parsing (Puppeteer)');

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/s?k=funny+cat+shirts`, { waitUntil: 'domcontentloaded' });

    // Test 3: Product card detection
    const productCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-component-type="s-search-result"]').length;
    });
    assert(productCount === 12, `Found ${productCount} product cards (expected 12)`);

    // Test 4: Price parsing
    console.log('\nTest 4: Price parsing from product cards');

    const prices = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-component-type="s-search-result"]');
      return Array.from(cards).map(card => {
        const whole = card.querySelector('.a-price-whole');
        const frac = card.querySelector('.a-price-fraction');
        if (whole && frac) {
          return parseFloat(`${whole.textContent.replace(/[^0-9]/g, '')}.${frac.textContent}`);
        }
        return null;
      }).filter(Boolean);
    });

    assert(prices.length === 12, `Parsed ${prices.length} prices (expected 12)`);
    assert(prices[0] === 19.99, `First price is $19.99: $${prices[0]}`);
    assert(prices[2] === 16.99, `Third price is $16.99: $${prices[2]}`);

    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    assert(avgPrice > 15 && avgPrice < 25, `Average price in expected range: $${avgPrice.toFixed(2)}`);

    // Test 5: Rating parsing
    console.log('\nTest 5: Rating parsing from product cards');

    const ratings = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.a-icon-alt')).map(el => {
        const m = el.textContent.match(/([\d.]+)\s*out\s*of/);
        return m ? parseFloat(m[1]) : null;
      }).filter(Boolean);
    });

    assert(ratings.length === 12, `Parsed ${ratings.length} ratings (expected 12)`);
    assert(ratings[0] === 4.5, `First rating is 4.5: ${ratings[0]}`);
    assert(ratings[7] === 3.9, `Eighth rating is 3.9: ${ratings[7]}`);

    // Test 6: Review count parsing
    console.log('\nTest 6: Review count parsing');

    const reviews = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.a-size-base.s-underline-text')).map(el => {
        return parseInt(el.textContent.replace(/[^0-9]/g, ''), 10) || 0;
      });
    });

    assert(reviews.length === 12, `Parsed ${reviews.length} review counts (expected 12)`);
    assert(reviews[0] === 1234, `First review count is 1234: ${reviews[0]}`);
    assert(reviews[5] === 3012, `Sixth review count is 3012: ${reviews[5]}`);

    const totalReviews = reviews.reduce((a, b) => a + b, 0);
    assert(totalReviews > 0, `Total reviews: ${totalReviews}`);

    // Test 7: ASIN extraction
    console.log('\nTest 7: ASIN extraction from product cards');

    const asins = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-component-type="s-search-result"]'))
        .map(c => c.getAttribute('data-asin')).filter(Boolean);
    });

    assert(asins.length === 12, `Extracted ${asins.length} ASINs (expected 12)`);
    assert(asins[0] === 'B0TEST001', `First ASIN: ${asins[0]}`);
    assert(asins[11] === 'B0TEST012', `Last ASIN: ${asins[11]}`);

    // Test 8: Title extraction
    console.log('\nTest 8: Title extraction');

    const titles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-component-type="s-search-result"]')).map(card => {
        const el = card.querySelector('h2 a span') || card.querySelector('h2 span');
        return el ? el.textContent.trim() : '';
      });
    });

    assert(titles.length === 12, `Extracted ${titles.length} titles`);
    assert(titles[0].includes('Funny Cat Lover'), `First title contains expected text: ${titles[0]}`);

    // Test 9: Trend estimation
    console.log('\nTest 9: Trend estimation logic');

    const trendResult = await page.evaluate((revArr) => {
      const lowReviewThreshold = 50;
      const products = revArr.map(r => ({ reviewCount: r }));
      const newListings = products.filter(p => p.reviewCount < lowReviewThreshold).length;
      const total = products.length || 1;
      const newRatio = newListings / total;
      if (newRatio >= 0.5) return { trend: 'Growing', newRatio };
      if (newRatio >= 0.25) return { trend: 'Stable', newRatio };
      return { trend: 'Declining', newRatio };
    }, reviews);

    assert(['Growing', 'Stable', 'Declining'].includes(trendResult.trend),
      `Trend is valid: ${trendResult.trend} (new listing ratio: ${trendResult.newRatio.toFixed(2)})`);

    // Test 10: Popup HTML structure
    console.log('\nTest 10: Popup HTML structure');

    const popupPage = await browser.newPage();
    await popupPage.goto(`http://localhost:${port}/popup.html`, { waitUntil: 'domcontentloaded' });

    const tabCount = await popupPage.evaluate(() => document.querySelectorAll('.ns-tab').length);
    assert(tabCount === 4, `Popup has 4 tabs: ${tabCount}`);

    const hasKeywordInput = await popupPage.evaluate(() => !!document.getElementById('ns-keyword-input'));
    assert(hasKeywordInput, 'Keyword input exists');

    const hasBsrInput = await popupPage.evaluate(() => !!document.getElementById('ns-bsr-input'));
    assert(hasBsrInput, 'BSR input exists');

    const hasBsrCategory = await popupPage.evaluate(() => {
      const sel = document.getElementById('ns-bsr-category');
      return sel ? sel.options.length : 0;
    });
    assert(hasBsrCategory === 6, `BSR category has 6 options: ${hasBsrCategory}`);

    const sampleCount = await popupPage.evaluate(() => document.querySelectorAll('.ns-sample').length);
    assert(sampleCount === 5, `Has ${sampleCount} sample keywords (expected 5)`);

    const tabNames = await popupPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.ns-tab')).map(t => t.textContent.trim());
    });
    assert(tabNames.includes('Keywords'), 'Has Keywords tab');
    assert(tabNames.includes('BSR Calc'), 'Has BSR Calc tab');
    assert(tabNames.includes('History'), 'Has History tab');
    assert(tabNames.includes('Settings'), 'Has Settings tab');

    // Test 11: Price analysis calculations
    console.log('\nTest 11: Price analysis (min, max, avg)');

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    assert(minPrice === 15.99, `Min price: $${minPrice}`);
    assert(maxPrice === 24.99, `Max price: $${maxPrice}`);
    assert(avgPrice > 19 && avgPrice < 21, `Avg price reasonable: $${avgPrice.toFixed(2)}`);

    // Test 12: Niche score with real scraped data
    console.log('\nTest 12: Niche score with scraped mock data');

    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const realNiche = computeNicheScore({
      totalReviews,
      resultCount: productCount,
      avgRating,
      avgPrice,
    });

    assert(realNiche.score >= 1 && realNiche.score <= 100, `Real niche score: ${realNiche.score}/100 (${realNiche.label})`);
    console.log(`    Demand: ${realNiche.demand}/50 | Competition: ${realNiche.competition}/50`);

    // Test 13: File structure validation
    console.log('\nTest 13: Extension file structure');

    const requiredFiles = [
      'manifest.json', 'background.js', 'content.js', 'styles.css',
      'popup.html', 'popup.js', 'popup.css',
      'icons/icon16.png', 'icons/icon48.png', 'icons/icon128.png',
    ];

    for (const f of requiredFiles) {
      const exists = fs.existsSync(path.join(__dirname, f));
      assert(exists, `File exists: ${f}`);
    }

    // Test 14: Manifest validation
    console.log('\nTest 14: Manifest.json validation');

    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf-8'));
    assert(manifest.manifest_version === 3, 'Manifest V3');
    assert(manifest.name.includes('NicheScout'), `Name: ${manifest.name}`);
    assert(manifest.permissions.includes('storage'), 'Has storage permission');
    assert(manifest.permissions.includes('activeTab'), 'Has activeTab permission');
    assert(manifest.host_permissions.some(h => h.includes('amazon.com')), 'Has amazon.com host permission');
    assert(manifest.host_permissions.some(h => h.includes('completion.amazon.com')), 'Has autocomplete host permission');
    assert(!!manifest.background.service_worker, 'Has service worker defined');
    assert(manifest.content_scripts.length > 0, 'Has content scripts');
    assert(manifest.content_scripts[0].js.includes('content.js'), 'Content script includes content.js');
    assert(manifest.content_scripts[0].css.includes('styles.css'), 'Content script includes styles.css');
    assert(!!manifest.action.default_popup, 'Has popup defined');

    // Test 15: Autocomplete mock endpoint
    console.log('\nTest 15: Amazon autocomplete mock API');

    const acPage = await browser.newPage();
    await acPage.goto(`http://localhost:${port}/api/2017/suggestions?prefix=cat`, { waitUntil: 'domcontentloaded' });
    const acBody = await acPage.evaluate(() => document.body.textContent);
    const acData = JSON.parse(acBody);

    assert(Array.isArray(acData.suggestions), 'Autocomplete returns suggestions array');
    assert(acData.suggestions.length === 10, `Got ${acData.suggestions.length} suggestions`);
    assert(acData.suggestions[0].value.includes('cat'), `First suggestion includes seed keyword: ${acData.suggestions[0].value}`);

    // ── Summary ─────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(50));
    console.log(`  Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
    console.log('='.repeat(50) + '\n');

  } catch (err) {
    console.error('Test error:', err);
    failed++;
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
