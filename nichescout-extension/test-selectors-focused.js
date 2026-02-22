/**
 * Focused selector test: extracts product data from Amazon search results
 * using multiple selector strategies and reports which ones work.
 */
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    console.log('Navigating to Amazon search: wireless earbuds...');
    await page.goto('https://www.amazon.com/s?k=wireless+earbuds', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for search results
    await page.waitForSelector('div[data-component-type="s-search-result"]', { timeout: 15000 });
    console.log('Search results loaded.\n');

    const results = await page.evaluate(() => {
      const cards = document.querySelectorAll('div[data-component-type="s-search-result"]');
      const output = [];

      // Test first 5 cards, report on at least 3
      for (let i = 0; i < Math.min(5, cards.length); i++) {
        const card = cards[i];
        const asin = card.dataset.asin;
        const product = { asin, selectors: {} };

        // --- TITLE ---
        const titleTests = {
          'h2 a span (OLD - broken)':     card.querySelector('h2 a span'),
          'h2 span (fallback)':           card.querySelector('h2 span'),
          'a h2 span (new DOM: a wraps h2)': card.querySelector('a h2 span'),
        };
        product.selectors.title = {};
        for (const [name, el] of Object.entries(titleTests)) {
          product.selectors.title[name] = el ? el.textContent.trim().substring(0, 80) : null;
        }

        // --- LINK ---
        const h2El = card.querySelector('h2');
        const linkTests = {
          'h2 a (OLD - broken)':           card.querySelector('h2 a'),
          'a that wraps h2 (h2.closest("a"))': h2El ? h2El.closest('a') : null,
          'a.s-line-clamp-2':              card.querySelector('a.s-line-clamp-2'),
          'a[href*="/dp/"]':               card.querySelector('a[href*="/dp/"]'),
        };
        product.selectors.link = {};
        for (const [name, el] of Object.entries(linkTests)) {
          product.selectors.link[name] = el ? el.href.substring(0, 100) : null;
        }

        // --- PRICE ---
        const priceTests = {
          'span.a-price span.a-offscreen': card.querySelector('span.a-price span.a-offscreen'),
          '.a-price-whole + .a-price-fraction': (() => {
            const w = card.querySelector('.a-price-whole');
            const f = card.querySelector('.a-price-fraction');
            return (w && f) ? { text: '$' + w.textContent.replace(/[^0-9]/g,'') + '.' + f.textContent.trim() } : null;
          })(),
        };
        product.selectors.price = {};
        for (const [name, el] of Object.entries(priceTests)) {
          product.selectors.price[name] = el ? (el.textContent || el.text || '').trim() : null;
        }

        // --- RATING ---
        const ratingTests = {
          'span.a-icon-alt':                    card.querySelector('span.a-icon-alt'),
          'i.a-star-small span.a-icon-alt':     card.querySelector('i.a-star-small span.a-icon-alt'),
          '[aria-label*="stars"]':               card.querySelector('[aria-label*="stars"]'),
        };
        product.selectors.rating = {};
        for (const [name, el] of Object.entries(ratingTests)) {
          if (el) {
            product.selectors.rating[name] = el.textContent.trim() || el.getAttribute('aria-label');
          } else {
            product.selectors.rating[name] = null;
          }
        }

        // --- REVIEW COUNT ---
        const reviewTests = {
          '.a-size-base.s-underline-text (OLD)':        card.querySelector('.a-size-base.s-underline-text'),
          'a[aria-label*="ratings"]':                    card.querySelector('a[aria-label*="ratings"]'),
          'span.s-underline-text':                       card.querySelector('span.s-underline-text'),
          'a[aria-label*="ratings"] span.s-underline-text': card.querySelector('a[aria-label*="ratings"] span.s-underline-text'),
          'span.a-size-mini':                            card.querySelector('span.a-size-mini'),
        };
        product.selectors.reviewCount = {};
        for (const [name, el] of Object.entries(reviewTests)) {
          if (el) {
            const ariaLabel = el.getAttribute('aria-label');
            const text = el.textContent.trim();
            product.selectors.reviewCount[name] = {
              text: text.substring(0, 60),
              ariaLabel: ariaLabel ? ariaLabel.substring(0, 60) : null
            };
          } else {
            product.selectors.reviewCount[name] = null;
          }
        }

        output.push(product);
      }

      return { totalCards: cards.length, products: output };
    });

    console.log(`Total search result cards found: ${results.totalCards}\n`);
    console.log('='.repeat(80));

    for (const p of results.products) {
      console.log(`\nProduct ASIN: ${p.asin}`);
      console.log('-'.repeat(60));

      console.log('  TITLE selectors:');
      for (const [sel, val] of Object.entries(p.selectors.title)) {
        const status = val ? 'WORKS' : 'MISS';
        console.log(`    [${status}] ${sel} => ${val || '(null)'}`);
      }

      console.log('  LINK selectors:');
      for (const [sel, val] of Object.entries(p.selectors.link)) {
        const status = val ? 'WORKS' : 'MISS';
        console.log(`    [${status}] ${sel} => ${val || '(null)'}`);
      }

      console.log('  PRICE selectors:');
      for (const [sel, val] of Object.entries(p.selectors.price)) {
        const status = val ? 'WORKS' : 'MISS';
        console.log(`    [${status}] ${sel} => ${val || '(null)'}`);
      }

      console.log('  RATING selectors:');
      for (const [sel, val] of Object.entries(p.selectors.rating)) {
        const status = val ? 'WORKS' : 'MISS';
        console.log(`    [${status}] ${sel} => ${val || '(null)'}`);
      }

      console.log('  REVIEW COUNT selectors:');
      for (const [sel, val] of Object.entries(p.selectors.reviewCount)) {
        if (val) {
          console.log(`    [WORKS] ${sel} => text="${val.text}", aria-label="${val.ariaLabel}"`);
        } else {
          console.log(`    [MISS]  ${sel} => (null)`);
        }
      }
    }

    // Summary table
    console.log('\n' + '='.repeat(80));
    console.log('SELECTOR SUMMARY (hit rate across all tested products):');
    console.log('='.repeat(80));

    const fields = ['title', 'link', 'price', 'rating', 'reviewCount'];
    for (const field of fields) {
      console.log(`\n  ${field.toUpperCase()}:`);
      const selectorNames = Object.keys(results.products[0].selectors[field]);
      for (const sel of selectorNames) {
        let hits = 0;
        for (const p of results.products) {
          const val = p.selectors[field][sel];
          if (val && val !== null) hits++;
        }
        const pct = Math.round((hits / results.products.length) * 100);
        const bar = hits === results.products.length ? 'ALL' : `${hits}/${results.products.length}`;
        console.log(`    ${bar} (${pct}%) ${sel}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDED SELECTORS (best hit rate per field):');
    console.log('='.repeat(80));
    console.log('  Title:        h2 span');
    console.log('  Link:         h2.closest("a") || a[href*="/dp/"]');
    console.log('  Price:        span.a-price span.a-offscreen');
    console.log('  Rating:       span.a-icon-alt');
    console.log('  Review Count: a[aria-label*="ratings"] (parse number from aria-label)');

  } catch (err) {
    console.error('Test failed:', err.message);
  } finally {
    await browser.close();
    console.log('\nDone.');
  }
})();
