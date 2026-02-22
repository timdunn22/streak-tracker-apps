/**
 * LeadHarvest — Puppeteer Tests
 *
 * Tests the scraping logic using mock HTML that simulates the
 * Google Maps DOM structure. These are headless browser tests
 * that validate the content script's extraction functions.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// ---- Mock HTML: Simulated Google Maps search results ----
const MOCK_GOOGLE_MAPS_HTML = `
<!DOCTYPE html>
<html>
<head><title>Google Maps Mock</title></head>
<body>
  <!-- Simulate the Google Maps results feed -->
  <div id="QA0Szd">
    <div role="feed">

      <!-- Result Card 1 -->
      <div>
        <div>
          <a href="https://www.google.com/maps/place/Acme+Plumbing" class="hfpxzc" aria-label="Acme Plumbing">
          </a>
          <div class="qBF1Pd fontHeadlineSmall">Acme Plumbing</div>
          <span class="MW4etd" role="img" aria-label="4.5 stars">4.5</span>
          <span class="UY7F9">(234)</span>
          <div class="W4Efsd">
            <span class="fontBodyMedium">Plumber</span>
          </div>
          <div class="W4Efsd">
            <span style="color: rgb(112, 117, 122);">123 Main St, Springfield, IL</span>
          </div>
          <div class="W4Efsd">
            <span style="color: rgb(112, 117, 122);">(555) 123-4567</span>
          </div>
        </div>
      </div>

      <!-- Result Card 2 -->
      <div>
        <div>
          <a href="https://www.google.com/maps/place/Best+Pizza+Place" class="hfpxzc" aria-label="Best Pizza Place">
          </a>
          <div class="qBF1Pd fontHeadlineSmall">Best Pizza Place</div>
          <span class="MW4etd" role="img" aria-label="4.8 stars">4.8</span>
          <span class="UY7F9">(1,892)</span>
          <div class="W4Efsd">
            <span class="fontBodyMedium">Pizza restaurant</span>
          </div>
          <div class="W4Efsd">
            <span style="color: rgb(112, 117, 122);">456 Oak Ave, Springfield, IL</span>
          </div>
          <div class="W4Efsd">
            <span style="color: rgb(112, 117, 122);">(555) 987-6543</span>
          </div>
        </div>
      </div>

      <!-- Result Card 3 -->
      <div>
        <div>
          <a href="https://www.google.com/maps/place/City+Dental+Care" class="hfpxzc" aria-label="City Dental Care">
          </a>
          <div class="qBF1Pd fontHeadlineSmall">City Dental Care</div>
          <span class="MW4etd" role="img" aria-label="3.9 stars">3.9</span>
          <span class="UY7F9">(67)</span>
          <div class="W4Efsd">
            <span class="fontBodyMedium">Dentist</span>
          </div>
          <div class="W4Efsd">
            <span style="color: rgb(112, 117, 122);">789 Elm Blvd, Springfield, IL</span>
          </div>
          <div class="W4Efsd">
            <span style="color: rgb(112, 117, 122);">+1 555-222-3333</span>
          </div>
        </div>
      </div>

      <!-- Result Card 4: No phone -->
      <div>
        <div>
          <a href="https://www.google.com/maps/place/Green+Gardens+Nursery" class="hfpxzc" aria-label="Green Gardens Nursery">
          </a>
          <div class="qBF1Pd fontHeadlineSmall">Green Gardens Nursery</div>
          <span class="MW4etd" role="img" aria-label="4.2 stars">4.2</span>
          <span class="UY7F9">(45)</span>
          <div class="W4Efsd">
            <span class="fontBodyMedium">Garden center</span>
          </div>
          <div class="W4Efsd">
            <span style="color: rgb(112, 117, 122);">321 Pine Rd, Springfield, IL</span>
          </div>
        </div>
      </div>

      <!-- Result Card 5 -->
      <div>
        <div>
          <a href="https://www.google.com/maps/place/Tech+Solutions+Inc" class="hfpxzc" aria-label="Tech Solutions Inc">
          </a>
          <div class="qBF1Pd fontHeadlineSmall">Tech Solutions Inc</div>
          <span class="MW4etd" role="img" aria-label="5.0 stars">5.0</span>
          <span class="UY7F9">(12)</span>
          <div class="W4Efsd">
            <span class="fontBodyMedium">IT services</span>
          </div>
          <div class="W4Efsd">
            <span style="color: rgb(112, 117, 122);">100 Tech Dr, Springfield, IL</span>
          </div>
          <div class="W4Efsd">
            <span style="color: rgb(112, 117, 122);">(555) 000-1111</span>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- Detail panel mock (as if a business was clicked) -->
  <div role="main" id="detail-panel" style="display:none;">
    <h1 class="DUwDvf fontHeadlineLarge">Acme Plumbing</h1>
    <span class="MW4etd" role="img" aria-label="4.5 stars">4.5</span>
    <span class="UY7F9">(234)</span>
    <button jsaction="category" class="DkEaL"><span>Plumber</span></button>
    <button data-item-id="address" aria-label="Address: 123 Main St, Springfield, IL 62701">
      <div class="fontBodyMedium">123 Main St, Springfield, IL 62701</div>
    </button>
    <button data-item-id="phone:tel:+15551234567" aria-label="Phone: (555) 123-4567">
      <div class="fontBodyMedium">(555) 123-4567</div>
    </button>
    <a data-item-id="authority" href="https://www.acmeplumbing.com" aria-label="Website: acmeplumbing.com">
      acmeplumbing.com
    </a>
    <div>Contact us at info@acmeplumbing.com or visit our Facebook page</div>
    <a href="https://facebook.com/acmeplumbing">Facebook</a>
    <a href="https://instagram.com/acmeplumbing">Instagram</a>
  </div>
</body>
</html>
`;

// ---- Mock HTML: Website with emails ----
const MOCK_WEBSITE_HTML = `
<!DOCTYPE html>
<html>
<head><title>Acme Plumbing - Contact</title></head>
<body>
  <h1>Contact Acme Plumbing</h1>
  <p>Email us at info@acmeplumbing.com for general inquiries.</p>
  <p>For support, reach us at support@acmeplumbing.com</p>
  <p>Sales: sales@acmeplumbing.com</p>
  <p>Personal: john.smith@acmeplumbing.com</p>
  <footer>Copyright 2024 Acme Plumbing</footer>
</body>
</html>
`;

// ---- Extraction functions (mirrored from content.js for testing) ----

function extractPhone(text) {
  if (!text) return '';
  const phoneRegex =
    /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
  const matches = text.match(phoneRegex);
  return matches ? matches[0] : '';
}

function extractEmails(text) {
  if (!text) return [];
  const emailRegex =
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  return matches ? [...new Set(matches)] : [];
}

function extractRating(ariaLabel) {
  if (!ariaLabel) return '';
  const ratingMatch = ariaLabel.match(/([\d.]+)\s*star/i);
  return ratingMatch ? ratingMatch[1] : '';
}

function extractReviewCount(text) {
  if (!text) return '';
  const match = text.match(/\(?([\d,]+)\)?/);
  return match ? match[1].replace(/,/g, '') : '';
}

function escapeCSV(val) {
  if (!val) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// ---- Test runner ----

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${testName}`);
  } else {
    failed++;
    errors.push(testName);
    console.log(`  FAIL: ${testName}`);
  }
}

function assertEqual(actual, expected, testName) {
  if (actual === expected) {
    passed++;
    console.log(`  PASS: ${testName}`);
  } else {
    failed++;
    errors.push(`${testName} (expected "${expected}", got "${actual}")`);
    console.log(
      `  FAIL: ${testName} — expected "${expected}", got "${actual}"`
    );
  }
}

function assertIncludes(arr, item, testName) {
  if (arr.includes(item)) {
    passed++;
    console.log(`  PASS: ${testName}`);
  } else {
    failed++;
    errors.push(`${testName} (array does not include "${item}")`);
    console.log(`  FAIL: ${testName} — array does not include "${item}"`);
  }
}

// ---- Unit Tests ----

function runUnitTests() {
  console.log('\n=== Unit Tests: Extraction Functions ===\n');

  // Phone extraction
  console.log('-- Phone Extraction --');
  assertEqual(
    extractPhone('Call us at (555) 123-4567 today'),
    '(555) 123-4567',
    'Extract US phone with parens'
  );
  assertEqual(
    extractPhone('Phone: 555-987-6543'),
    '555-987-6543',
    'Extract US phone with dashes'
  );
  assertEqual(
    extractPhone('+1 555-222-3333'),
    '+1 555-222-3333',
    'Extract phone with country code'
  );
  assertEqual(
    extractPhone('No phone here'),
    '',
    'Return empty for no phone'
  );
  assertEqual(extractPhone(''), '', 'Return empty for empty string');
  assertEqual(extractPhone(null), '', 'Return empty for null');

  // Email extraction
  console.log('\n-- Email Extraction --');
  const emails1 = extractEmails(
    'Contact info@example.com or support@example.com'
  );
  assert(emails1.length === 2, 'Extract 2 emails from text');
  assertIncludes(emails1, 'info@example.com', 'Includes info@');
  assertIncludes(emails1, 'support@example.com', 'Includes support@');

  const emails2 = extractEmails('No emails in this text');
  assert(emails2.length === 0, 'No emails returns empty array');

  const emails3 = extractEmails(null);
  assert(emails3.length === 0, 'Null returns empty array');

  const emails4 = extractEmails(
    'Duplicate test@test.com and test@test.com'
  );
  assert(emails4.length === 1, 'Deduplicates emails');

  const emails5 = extractEmails('user.name+tag@domain.co.uk');
  assert(emails5.length === 1, 'Handles complex email format');

  // Rating extraction
  console.log('\n-- Rating Extraction --');
  assertEqual(
    extractRating('4.5 stars'),
    '4.5',
    'Extract rating from aria-label'
  );
  assertEqual(
    extractRating('3.9 star rating'),
    '3.9',
    'Extract rating with "star rating"'
  );
  assertEqual(extractRating('No rating'), '', 'No rating returns empty');
  assertEqual(extractRating(null), '', 'Null returns empty');

  // Review count extraction
  console.log('\n-- Review Count Extraction --');
  assertEqual(
    extractReviewCount('(234)'),
    '234',
    'Extract review count with parens'
  );
  assertEqual(
    extractReviewCount('(1,892)'),
    '1892',
    'Extract review count with comma'
  );
  assertEqual(
    extractReviewCount('67'),
    '67',
    'Extract plain review count'
  );
  assertEqual(
    extractReviewCount('No reviews'),
    '',
    'No number returns empty'
  );

  // CSV escaping
  console.log('\n-- CSV Escaping --');
  assertEqual(escapeCSV('simple'), 'simple', 'Simple string unchanged');
  assertEqual(
    escapeCSV('has, comma'),
    '"has, comma"',
    'Comma gets quoted'
  );
  assertEqual(
    escapeCSV('has "quotes"'),
    '"has ""quotes"""',
    'Quotes get escaped'
  );
  assertEqual(escapeCSV(''), '', 'Empty string');
  assertEqual(escapeCSV(null), '', 'Null returns empty');
  assertEqual(
    escapeCSV('line\nbreak'),
    '"line\nbreak"',
    'Newline gets quoted'
  );
}

// ---- Integration Tests with Puppeteer ----

async function runBrowserTests() {
  console.log('\n=== Browser Integration Tests ===\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // Test 1: Parse mock Google Maps results
    console.log('-- Parsing Google Maps Mock Results --');
    const page = await browser.newPage();
    await page.setContent(MOCK_GOOGLE_MAPS_HTML);

    // Extract business names from the feed
    const businessNames = await page.evaluate(() => {
      const names = [];
      document
        .querySelectorAll('.qBF1Pd.fontHeadlineSmall')
        .forEach((el) => {
          names.push(el.textContent.trim());
        });
      return names;
    });

    assertEqual(businessNames.length, 5, 'Found 5 business cards in feed');
    assertIncludes(
      businessNames,
      'Acme Plumbing',
      'Found "Acme Plumbing"'
    );
    assertIncludes(
      businessNames,
      'Best Pizza Place',
      'Found "Best Pizza Place"'
    );
    assertIncludes(
      businessNames,
      'City Dental Care',
      'Found "City Dental Care"'
    );
    assertIncludes(
      businessNames,
      'Green Gardens Nursery',
      'Found "Green Gardens Nursery"'
    );
    assertIncludes(
      businessNames,
      'Tech Solutions Inc',
      'Found "Tech Solutions Inc"'
    );

    // Test 2: Extract ratings from result cards
    console.log('\n-- Extracting Ratings --');
    const ratings = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('.MW4etd').forEach((el) => {
        const ariaLabel = el.getAttribute('aria-label') || '';
        const ratingMatch = ariaLabel.match(/([\d.]+)\s*star/i);
        results.push({
          text: el.textContent.trim(),
          fromAria: ratingMatch ? ratingMatch[1] : el.textContent.trim(),
        });
      });
      return results;
    });

    // 5 in feed + 1 in detail panel = 6, but detail is hidden
    // The querySelectorAll still finds elements regardless of display
    assert(ratings.length >= 5, 'Found ratings for result cards');
    assertEqual(
      ratings[0].fromAria,
      '4.5',
      'First card rating is 4.5'
    );
    assertEqual(
      ratings[1].fromAria,
      '4.8',
      'Second card rating is 4.8'
    );

    // Test 3: Extract review counts
    console.log('\n-- Extracting Review Counts --');
    const reviewCounts = await page.evaluate(() => {
      const counts = [];
      document.querySelectorAll('.UY7F9').forEach((el) => {
        const text = el.textContent.trim();
        const match = text.match(/\(?([\d,]+)\)?/);
        counts.push(match ? match[1].replace(/,/g, '') : '');
      });
      return counts;
    });

    assert(reviewCounts.length >= 5, 'Found review counts');
    assertEqual(reviewCounts[0], '234', 'First review count: 234');
    assertEqual(reviewCounts[1], '1892', 'Second review count: 1892');

    // Test 4: Extract phone numbers from result cards
    console.log('\n-- Extracting Phones from Cards --');
    const phones = await page.evaluate(() => {
      const results = [];
      const phoneRegex =
        /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
      document.querySelectorAll('div[role="feed"] > div').forEach((card) => {
        const spans = card.querySelectorAll('span[style*="color"]');
        let phone = '';
        spans.forEach((s) => {
          const matches = s.textContent.match(phoneRegex);
          if (matches && !phone) phone = matches[0];
        });
        const name = card.querySelector('.qBF1Pd');
        if (name) {
          results.push({ name: name.textContent.trim(), phone });
        }
      });
      return results;
    });

    const acmePhone = phones.find((p) => p.name === 'Acme Plumbing');
    assert(!!acmePhone, 'Found Acme Plumbing phone entry');
    assertEqual(
      acmePhone?.phone,
      '(555) 123-4567',
      'Acme phone: (555) 123-4567'
    );

    const greenGardens = phones.find(
      (p) => p.name === 'Green Gardens Nursery'
    );
    assert(!!greenGardens, 'Found Green Gardens entry');
    assertEqual(
      greenGardens?.phone,
      '',
      'Green Gardens has no phone'
    );

    // Test 5: Extract address-like text
    console.log('\n-- Extracting Addresses --');
    const addresses = await page.evaluate(() => {
      const results = [];
      const addrRegex =
        /\d+\s+\w+\s+(st|ave|blvd|rd|dr|ln|way|ct|pl|hwy|pike|pkwy|cir)/i;
      document.querySelectorAll('div[role="feed"] > div').forEach((card) => {
        const name = card.querySelector('.qBF1Pd');
        let address = '';
        card.querySelectorAll('span[style*="color"]').forEach((s) => {
          const text = s.textContent.trim();
          if (addrRegex.test(text) && !address) address = text;
        });
        if (name) {
          results.push({ name: name.textContent.trim(), address });
        }
      });
      return results;
    });

    const acmeAddr = addresses.find((a) => a.name === 'Acme Plumbing');
    assertEqual(
      acmeAddr?.address,
      '123 Main St, Springfield, IL',
      'Acme address extracted'
    );

    // Test 6: Parse detail panel
    console.log('\n-- Parsing Detail Panel --');
    // Show the detail panel
    await page.evaluate(() => {
      document.getElementById('detail-panel').style.display = 'block';
    });

    const detailData = await page.evaluate(() => {
      const panel = document.querySelector('div[role="main"]');
      if (!panel) return null;

      const name =
        panel.querySelector('h1.DUwDvf')?.textContent.trim() || '';
      const phoneBtn = panel.querySelector(
        'button[data-item-id*="phone"]'
      );
      const phone = phoneBtn
        ? phoneBtn.querySelector('.fontBodyMedium')?.textContent.trim()
        : '';
      const addressBtn = panel.querySelector(
        'button[data-item-id="address"]'
      );
      const address = addressBtn
        ? addressBtn
            .querySelector('.fontBodyMedium')
            ?.textContent.trim()
        : '';
      const websiteLink = panel.querySelector(
        'a[data-item-id="authority"]'
      );
      const website = websiteLink
        ? websiteLink.getAttribute('href')
        : '';
      const category = panel.querySelector(
        'button[jsaction*="category"] span'
      );
      const cat = category ? category.textContent.trim() : '';

      // Extract emails from page text
      const pageText = panel.textContent || '';
      const emailRegex =
        /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
      const emails = [...new Set(pageText.match(emailRegex) || [])];

      // Social links
      const socialPatterns = [
        'facebook.com',
        'instagram.com',
        'twitter.com',
      ];
      const socialLinks = [];
      panel.querySelectorAll('a[href]').forEach((a) => {
        const href = a.getAttribute('href') || '';
        socialPatterns.forEach((p) => {
          if (href.includes(p)) socialLinks.push(href);
        });
      });

      return {
        name,
        phone,
        address,
        website,
        category: cat,
        emails,
        socialLinks,
      };
    });

    assert(detailData !== null, 'Detail panel parsed successfully');
    assertEqual(
      detailData?.name,
      'Acme Plumbing',
      'Detail name: Acme Plumbing'
    );
    assertEqual(
      detailData?.phone,
      '(555) 123-4567',
      'Detail phone extracted'
    );
    assertEqual(
      detailData?.address,
      '123 Main St, Springfield, IL 62701',
      'Detail address extracted'
    );
    assertEqual(
      detailData?.website,
      'https://www.acmeplumbing.com',
      'Detail website extracted'
    );
    assertEqual(
      detailData?.category,
      'Plumber',
      'Detail category: Plumber'
    );
    assert(
      detailData?.emails?.includes('info@acmeplumbing.com'),
      'Detail email found: info@acmeplumbing.com'
    );
    assert(
      detailData?.socialLinks?.length === 2,
      'Found 2 social links'
    );
    assertIncludes(
      detailData?.socialLinks || [],
      'https://facebook.com/acmeplumbing',
      'Facebook link found'
    );
    assertIncludes(
      detailData?.socialLinks || [],
      'https://instagram.com/acmeplumbing',
      'Instagram link found'
    );

    // Test 7: Email scraping from website
    console.log('\n-- Email Scraping from Website --');
    const page2 = await browser.newPage();
    await page2.setContent(MOCK_WEBSITE_HTML);

    const websiteEmails = await page2.evaluate(() => {
      const text = document.body.textContent;
      const emailRegex =
        /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
      return [...new Set(text.match(emailRegex) || [])];
    });

    assert(websiteEmails.length === 4, 'Found 4 emails on website');
    assertIncludes(
      websiteEmails,
      'info@acmeplumbing.com',
      'Found info@ email'
    );
    assertIncludes(
      websiteEmails,
      'support@acmeplumbing.com',
      'Found support@ email'
    );
    assertIncludes(
      websiteEmails,
      'sales@acmeplumbing.com',
      'Found sales@ email'
    );

    // Filter for contact emails
    const contactEmails = websiteEmails.filter((e) => {
      const lower = e.toLowerCase();
      return (
        lower.startsWith('info@') ||
        lower.startsWith('contact@') ||
        lower.startsWith('hello@') ||
        lower.startsWith('support@') ||
        lower.startsWith('sales@')
      );
    });
    assert(
      contactEmails.length === 3,
      'Filtered to 3 contact emails (info@, support@, sales@)'
    );

    await page2.close();

    // Test 8: MutationObserver simulation (new results loading)
    console.log('\n-- MutationObserver: New Results --');
    const mutationDetected = await page.evaluate(() => {
      return new Promise((resolve) => {
        let detected = false;
        const observer = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.addedNodes.length > 0) {
              for (const node of m.addedNodes) {
                if (
                  node.nodeType === 1 &&
                  node.querySelector &&
                  node.querySelector('.qBF1Pd')
                ) {
                  detected = true;
                }
              }
            }
          }
        });

        const feed = document.querySelector('div[role="feed"]');
        observer.observe(feed, { childList: true, subtree: true });

        // Simulate a new result being added (lazy load)
        const newCard = document.createElement('div');
        newCard.innerHTML = `
          <div>
            <div class="qBF1Pd fontHeadlineSmall">New Lazy-Loaded Business</div>
            <span class="MW4etd" role="img" aria-label="4.0 stars">4.0</span>
            <span class="UY7F9">(100)</span>
          </div>
        `;
        feed.appendChild(newCard);

        // Give observer time to fire
        setTimeout(() => {
          observer.disconnect();
          resolve(detected);
        }, 100);
      });
    });

    assert(
      mutationDetected,
      'MutationObserver detected new result card'
    );

    // Check updated count
    const updatedCount = await page.evaluate(() => {
      return document.querySelectorAll('.qBF1Pd.fontHeadlineSmall')
        .length;
    });
    assertEqual(
      updatedCount,
      6,
      'Feed now has 6 business cards after lazy load'
    );

    // Test 9: Category extraction
    console.log('\n-- Category Extraction --');
    const categories = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('div[role="feed"] > div').forEach((card) => {
        const name = card.querySelector('.qBF1Pd');
        const catSpans = card.querySelectorAll(
          'span.fontBodyMedium'
        );
        let category = '';
        catSpans.forEach((s) => {
          const t = s.textContent.trim();
          if (
            t &&
            !category &&
            t.length < 50 &&
            !/\d/.test(t) &&
            !t.includes('$')
          ) {
            category = t;
          }
        });
        if (name) {
          results.push({ name: name.textContent.trim(), category });
        }
      });
      return results;
    });

    const acmeCat = categories.find((c) => c.name === 'Acme Plumbing');
    assertEqual(acmeCat?.category, 'Plumber', 'Acme category: Plumber');
    const pizzaCat = categories.find(
      (c) => c.name === 'Best Pizza Place'
    );
    assertEqual(
      pizzaCat?.category,
      'Pizza restaurant',
      'Pizza category: Pizza restaurant'
    );

    // Test 10: CSV generation
    console.log('\n-- CSV Generation --');
    const mockLeads = [
      {
        name: 'Test Business',
        address: '123 Main St',
        phone: '555-1234',
        website: 'https://test.com',
        email: 'info@test.com',
        rating: '4.5',
        reviewCount: '100',
        category: 'Restaurant',
        hours: 'Mon-Fri 9-5',
        socialLinks: ['https://facebook.com/test'],
        scrapedAt: '2024-01-15T10:30:00.000Z',
      },
      {
        name: 'Business, With "Quotes"',
        address: '',
        phone: '',
        website: '',
        email: '',
        rating: '',
        reviewCount: '',
        category: '',
        hours: '',
        socialLinks: [],
        scrapedAt: '2024-01-15T11:00:00.000Z',
      },
    ];

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

    const csvRows = mockLeads.map((l) =>
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

    const csv = [headers.join(','), ...csvRows].join('\n');

    assert(csv.includes('Business Name,Address'), 'CSV has headers');
    assert(
      csv.includes('Test Business,123 Main St,555-1234'),
      'CSV has first row data'
    );
    assert(
      csv.includes('"Business, With ""Quotes"""'),
      'CSV properly escapes commas and quotes'
    );
    assert(csv.split('\n').length === 3, 'CSV has 3 lines (header + 2 rows)');

    await page.close();
  } finally {
    await browser.close();
  }
}

// ---- Main ----

async function main() {
  console.log('============================================');
  console.log('  LeadHarvest — Extension Test Suite');
  console.log('============================================');

  // Run unit tests
  runUnitTests();

  // Run browser tests
  await runBrowserTests();

  // Summary
  console.log('\n============================================');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('============================================');

  if (errors.length > 0) {
    console.log('\nFailed tests:');
    errors.forEach((e) => console.log(`  - ${e}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
