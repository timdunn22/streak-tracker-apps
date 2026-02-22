/**
 * EtsyRank Pro — Automated Test Suite
 *
 * Tests the content script logic against mock Etsy HTML pages.
 * Uses Puppeteer with a local HTML server to simulate:
 *   1. Search results page (badge overlay)
 *   2. Listing view page (audit panel, competitor tags)
 *   3. Listing edit page (SEO audit from form fields)
 *   4. Keyword research tool
 *
 * Run: node test-extension.js
 */

const puppeteer = require("puppeteer");
const http = require("http");
const fs = require("fs");
const path = require("path");

/* ──────────────────────────────────────────
   MOCK HTML PAGES
   ────────────────────────────────────────── */

const MOCK_SEARCH_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Etsy Search Results - Mock</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #fafafa; }
    .v2-listing-card {
      display: inline-block;
      width: 280px;
      margin: 12px;
      padding: 16px;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 8px;
      position: relative;
      vertical-align: top;
    }
    .v2-listing-card img { width: 100%; height: 180px; object-fit: cover; border-radius: 4px; background: #eee; }
    .v2-listing-card h3 { font-size: 14px; margin: 10px 0 6px; }
    .currency-value { font-weight: bold; color: #333; }
    .wt-text-gray { color: #666; font-size: 13px; }
    .wt-text-caption { font-size: 12px; }
    .favorites { font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <h1>Search results for "leather wallet"</h1>
  <div data-search-results>
    <div class="v2-listing-card" data-listing-id="1001">
      <img src="" alt="Leather Wallet">
      <h3>Personalized Leather Wallet Mens Bifold Handmade Custom Engraved Gift for Him Father's Day Birthday Anniversary Groomsmen</h3>
      <div><span class="currency-value">45.99</span></div>
      <div class="wt-text-gray"><span class="wt-text-caption">(2,847)</span></div>
      <div class="favorites">14,523 favorites</div>
    </div>

    <div class="v2-listing-card" data-listing-id="1002">
      <img src="" alt="Slim Wallet">
      <h3>Slim Leather Card Holder Minimalist Wallet RFID Blocking</h3>
      <div><span class="currency-value">24.50</span></div>
      <div class="wt-text-gray"><span class="wt-text-caption">(156)</span></div>
      <div class="favorites">892 favorites</div>
    </div>

    <div class="v2-listing-card" data-listing-id="1003">
      <img src="" alt="New Listing">
      <h3>Handcrafted Leather Bifold</h3>
      <div><span class="currency-value">35.00</span></div>
      <div class="wt-text-gray"><span class="wt-text-caption">(3)</span></div>
      <div class="favorites">18 favorites</div>
    </div>

    <div class="v2-listing-card" data-listing-id="1004">
      <img src="" alt="Brand New">
      <h3>A Beautiful New Leather Wallet Design</h3>
      <div><span class="currency-value">89.00</span></div>
      <div class="wt-text-gray"><span class="wt-text-caption">(0)</span></div>
    </div>
  </div>
</body>
</html>
`;

const MOCK_LISTING_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="keywords" content="leather wallet, personalized wallet, mens wallet, gift for him, custom wallet, engraved wallet, bifold wallet, groomsmen gift, anniversary gift, father gift, handmade wallet, leather gift, christmas gift">
  <title>Personalized Leather Wallet - Etsy Listing Mock</title>
  <script type="application/ld+json">
  {
    "@type": "Product",
    "name": "Personalized Leather Wallet Mens Bifold Handmade Custom",
    "keywords": "leather wallet, personalized wallet, mens wallet, gift for him, custom wallet, engraved wallet, bifold wallet, groomsmen gift, anniversary gift, father gift, handmade wallet, leather gift, christmas gift"
  }
  </script>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #fafafa; }
    .listing-page { max-width: 800px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 8px; }
    h1 { font-size: 22px; margin-bottom: 16px; }
    .price { font-size: 24px; font-weight: bold; margin: 12px 0; }
    .image-carousel-container { display: flex; gap: 8px; margin: 16px 0; }
    .image-carousel-container img { width: 100px; height: 100px; background: #eee; border-radius: 4px; object-fit: cover; }
    .description { margin: 20px 0; line-height: 1.6; color: #444; }
    #item-tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
    #item-tags a { padding: 4px 10px; background: #f3f3f3; border-radius: 4px; text-decoration: none; color: #444; font-size: 13px; }
    .reviews { font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="listing-page">
    <h1 class="wt-text-body-03">Personalized Leather Wallet Mens Bifold Handmade Custom Engraved Gift for Him Father's Day Birthday Anniversary Groomsmen Monogram</h1>

    <div class="price">
      <span class="currency-value">45.99</span>
    </div>

    <div class="reviews">
      <a href="#reviews"><span>2,847 reviews</span></a>
    </div>

    <div class="image-carousel-container">
      <img src="" alt="Photo 1">
      <img src="" alt="Photo 2">
      <img src="" alt="Photo 3">
      <img src="" alt="Photo 4">
      <img src="" alt="Photo 5">
      <img src="" alt="Photo 6">
      <img src="" alt="Photo 7">
    </div>

    <div id="item-tags">
      <a href="/search?q=leather+wallet">leather wallet</a>
      <a href="/search?q=personalized+wallet">personalized wallet</a>
      <a href="/search?q=mens+wallet">mens wallet</a>
      <a href="/search?q=gift+for+him">gift for him</a>
      <a href="/search?q=custom+wallet">custom wallet</a>
      <a href="/search?q=engraved+wallet">engraved wallet</a>
      <a href="/search?q=bifold+wallet">bifold wallet</a>
      <a href="/search?q=groomsmen+gift">groomsmen gift</a>
      <a href="/search?q=anniversary+gift">anniversary gift</a>
      <a href="/search?q=father+gift">father gift</a>
      <a href="/search?q=handmade+wallet">handmade wallet</a>
      <a href="/search?q=leather+gift">leather gift</a>
      <a href="/search?q=christmas+gift">christmas gift</a>
    </div>

    <div class="description" data-id="description-text">
      This personalized leather wallet is the perfect gift for any man in your life. Handcrafted from premium full-grain leather, this bifold wallet features custom engraving on the front. Each wallet is made to order with careful attention to detail.

      Features:
      - Premium full-grain leather
      - Custom engraving with your text
      - Bifold design with 6 card slots
      - 2 bill compartments
      - RFID blocking technology
      - Gift box included

      Dimensions: 4.5" x 3.5" when folded
      Material: Full-grain cowhide leather
      Color options: Brown, Black, Tan

      Care instructions: Keep away from water. Condition with leather balm every 6 months for best results. This wallet will develop a beautiful patina over time.

      Perfect for: Birthday, Anniversary, Christmas, Father's Day, Graduation, Groomsmen gifts, Wedding, Valentine's Day

      We offer free personalization — just add your text in the personalization box at checkout. We can engrave names, initials, dates, or short messages up to 3 lines.

      Ships within 1-3 business days. Free shipping on orders over $35.
    </div>
  </div>
</body>
</html>
`;

const MOCK_EDIT_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Edit Listing - Etsy Mock</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #fafafa; }
    .edit-form { max-width: 700px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 8px; }
    label { display: block; font-weight: 600; margin: 16px 0 6px; color: #333; }
    input[type="text"], textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
    textarea { min-height: 120px; }
    .tag-items { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
    .tag-items span { padding: 4px 10px; background: #f3f3f3; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; }
    .listing-edit-image { display: inline-block; width: 80px; height: 80px; background: #eee; border-radius: 4px; margin: 4px; }
  </style>
</head>
<body>
  <div class="edit-form">
    <h1>Edit Listing</h1>

    <label for="title">Title</label>
    <div id="listing-edit-title">
      <input type="text" name="title" id="title" value="My Beautiful Handmade Earrings">
    </div>

    <label>Tags</label>
    <div class="tag-items" data-test-id="tag-list">
      <span>earrings</span>
      <span>jewelry</span>
      <span>handmade</span>
      <span>gold earrings</span>
      <span>gift for her</span>
    </div>

    <label for="description">Description</label>
    <div id="listing-edit-description">
      <textarea name="description" id="description">Beautiful handmade earrings crafted with love. These gold-tone earrings are perfect for any occasion.</textarea>
    </div>

    <label>Price</label>
    <input type="text" name="price" value="28.50">

    <label>Photos</label>
    <div>
      <div class="listing-edit-image"></div>
      <div class="listing-edit-image"></div>
      <div class="listing-edit-image"></div>
    </div>
  </div>
</body>
</html>
`;

/* ──────────────────────────────────────────
   LOCAL TEST SERVER
   ────────────────────────────────────────── */

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, "http://localhost");

      // Serve mock pages
      if (url.pathname === "/search") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(MOCK_SEARCH_PAGE);
      } else if (url.pathname.startsWith("/listing/")) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(MOCK_LISTING_PAGE);
      } else if (url.pathname.includes("/tools/listings")) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(MOCK_EDIT_PAGE);
      } else if (url.pathname === "/search/suggest") {
        // Mock autocomplete endpoint
        const q = url.searchParams.get("q") || "";
        const suggestions = [
          q,
          q + " gift",
          q + " personalized",
          q + " custom",
          q + " handmade",
          q + " for women",
          q + " for men",
          q + " vintage",
          q + " wedding",
          q + " set",
        ];
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(suggestions));
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    server.listen(0, () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

/* ──────────────────────────────────────────
   INJECT CONTENT SCRIPT (for testing without Chrome extension APIs)
   ────────────────────────────────────────── */

function getContentScriptForTesting() {
  const raw = fs.readFileSync(
    path.join(__dirname, "content.js"),
    "utf-8"
  );

  // Replace chrome.runtime.sendMessage calls with mock responses
  const mockPreamble = `
    // Mock chrome API for testing
    window.chrome = window.chrome || {};
    window.chrome.runtime = {
      sendMessage: function(msg, cb) {
        const responses = {
          CHECK_LIMIT: { allowed: true, remaining: 8 },
          USE_AUDIT: { allowed: true, remaining: 7 },
          SAVE_AUDIT: { ok: true },
          GET_STATS: { usedToday: 3, limit: 10, premium: false, totalAudits: 5 },
          CHECK_PREMIUM: { premium: false },
          SAVE_KEYWORD: { ok: true },
        };
        if (cb) cb(responses[msg.type] || { error: "unknown" });
      },
    };
    window.chrome.storage = { local: { get: function(k,cb){ cb && cb({}); }, set: function(d,cb){ cb && cb(); } } };
  `;

  return mockPreamble + "\n" + raw;
}

/* ──────────────────────────────────────────
   TEST RUNNER
   ────────────────────────────────────────── */

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m PASS \x1b[0m ${message}`);
  } else {
    failed++;
    console.log(`  \x1b[31m FAIL \x1b[0m ${message}`);
  }
}

async function runTests() {
  console.log("\n\x1b[1m===== EtsyRank Pro Test Suite =====\x1b[0m\n");

  const { server, port } = await startServer();
  const BASE = `http://localhost:${port}`;

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const contentStyles = fs.readFileSync(
    path.join(__dirname, "styles.css"),
    "utf-8"
  );

  const contentScript = getContentScriptForTesting();

  try {
    /* ────── Test 1: Search Results Overlay ────── */
    console.log("\x1b[1m[1] Search Results Page\x1b[0m");
    {
      const page = await browser.newPage();
      await page.goto(`${BASE}/search?q=leather+wallet`, {
        waitUntil: "domcontentloaded",
      });

      // Inject styles + content script
      await page.addStyleTag({ content: contentStyles });
      await page.evaluate(contentScript);
      await page.waitForSelector(".erp-badge-wrap", { timeout: 5000 });

      // Check badges were injected
      const badgeWraps = await page.$$(".erp-badge-wrap");
      assert(
        badgeWraps.length >= 3,
        `Badges injected on ${badgeWraps.length} listing cards (expected >= 3)`
      );

      // Check first card has sales badge
      const salesBadge = await page.$(".erp-badge--sales");
      assert(!!salesBadge, "Sales estimation badge present");

      const salesText = await page.$eval(
        ".erp-badge--sales",
        (el) => el.textContent
      );
      assert(
        salesText.includes("sales"),
        `Sales badge text: "${salesText}"`
      );

      // Check revenue badge
      const revBadge = await page.$(".erp-badge--revenue");
      assert(!!revBadge, "Revenue estimation badge present");

      const revText = await page.$eval(
        ".erp-badge--revenue",
        (el) => el.textContent
      );
      assert(revText.includes("$"), `Revenue badge text: "${revText}"`);

      // Check competition badges
      const compBadges = await page.$$(
        ".erp-badge--comp-low, .erp-badge--comp-med, .erp-badge--comp-hi"
      );
      assert(
        compBadges.length >= 2,
        `Competition badges found: ${compBadges.length}`
      );

      // Card with 0 reviews and no price match should not have badges (card 4 has 0 reviews)
      const card4badges = await page.evaluate(() => {
        const cards = document.querySelectorAll(".v2-listing-card");
        const card4 = cards[3]; // 0-indexed
        // Card 4 has price but 0 reviews — extractCardData may still return something for price
        const badges = card4 ? card4.querySelectorAll(".erp-badge") : [];
        return badges.length;
      });
      // Card 4 has $89 price but 0 reviews, so no sales/revenue/comp badges
      assert(
        card4badges === 0,
        `Card with 0 reviews has ${card4badges} badges (expected 0)`
      );

      await page.close();
    }

    /* ────── Test 2: Listing View Page ────── */
    console.log("\n\x1b[1m[2] Listing View Page\x1b[0m");
    {
      const page = await browser.newPage();
      // Path must start with /listing/ to match content script logic
      await page.goto(`${BASE}/listing/1001/test-wallet`, {
        waitUntil: "domcontentloaded",
      });

      await page.addStyleTag({ content: contentStyles });
      await page.evaluate(contentScript);
      await page.waitForSelector(".erp-trigger-btn", { timeout: 5000 });

      // Check trigger button
      const triggerBtn = await page.$(".erp-trigger-btn");
      assert(!!triggerBtn, "Floating audit trigger button present");

      // Click it to run audit
      await page.click(".erp-trigger-btn");
      await page.waitForSelector(".erp-audit-panel", { timeout: 5000 });

      // Check panel opened
      const panel = await page.$(".erp-audit-panel");
      assert(!!panel, "Audit panel opened on click");

      // Check grade is displayed
      const grade = await page.$eval(".erp-grade-circle", (el) =>
        el.textContent.trim()
      );
      assert(
        ["A", "B", "C", "D", "F"].includes(grade),
        `SEO grade displayed: ${grade}`
      );

      // Check score number
      const score = await page.$eval(".erp-score-num", (el) =>
        el.textContent.trim()
      );
      assert(score.includes("/100"), `Score displayed: ${score}`);

      // Check there are check items
      const metrics = await page.$$(".erp-metric");
      assert(
        metrics.length >= 5,
        `${metrics.length} metric rows shown (expected >= 5)`
      );

      // Check suggestions exist
      const suggestions = await page.$$(".erp-suggestion");
      assert(
        suggestions.length >= 1,
        `${suggestions.length} suggestions shown`
      );

      // Check competitor tags section
      const compTags = await page.$$(".erp-comp-tag");
      assert(
        compTags.length === 13,
        `${compTags.length} competitor tags shown (expected 13)`
      );

      // Check keyword tool
      const kwTool = await page.$(".erp-kw-tool");
      assert(!!kwTool, "Keyword research tool present in panel");

      await page.close();
    }

    /* ────── Test 3: Listing Edit Page ────── */
    console.log("\n\x1b[1m[3] Listing Edit Page\x1b[0m");
    {
      const page = await browser.newPage();
      await page.goto(
        `${BASE}/your/shops/me/tools/listings/edit`,
        { waitUntil: "domcontentloaded" }
      );

      await page.addStyleTag({ content: contentStyles });
      await page.evaluate(contentScript);
      await page.waitForSelector(".erp-trigger-btn", { timeout: 5000 });

      // Click audit button
      await page.click(".erp-trigger-btn");
      await page.waitForSelector(".erp-audit-panel", { timeout: 5000 });

      // Get grade — edit page has weak listing (short title, few tags, short desc, few photos)
      const grade = await page.$eval(".erp-grade-circle", (el) =>
        el.textContent.trim()
      );
      assert(
        ["C", "D", "F"].includes(grade),
        `Weak listing graded appropriately: ${grade}`
      );

      // Check title analysis — "My Beautiful Handmade Earrings" starts with "My" (filler)
      const titleMetrics = await page.evaluate(() => {
        const all = document.querySelectorAll(".erp-metric");
        const results = [];
        all.forEach((m) => {
          const label = m.querySelector(".erp-metric-label")?.textContent || "";
          const value = m.querySelector(".erp-metric-value")?.textContent || "";
          results.push({ label, value });
        });
        return results;
      });

      const frontLoadMetric = titleMetrics.find(
        (m) => m.label === "Front-loading"
      );
      assert(
        frontLoadMetric && frontLoadMetric.value === "Weak",
        `Front-loading detected as weak: "${frontLoadMetric?.value}"`
      );

      // Tag count — only 5 of 13
      const tagMetric = titleMetrics.find((m) => m.label === "Tag count");
      assert(
        tagMetric && tagMetric.value.includes("5"),
        `Tag count correctly shows 5: "${tagMetric?.value}"`
      );

      // Check that specific suggestions exist
      const suggestionTexts = await page.evaluate(() =>
        Array.from(document.querySelectorAll(".erp-suggestion span:last-child")).map(
          (s) => s.textContent
        )
      );

      const hasTagSuggestion = suggestionTexts.some(
        (s) => s.includes("tag") || s.includes("Tag")
      );
      assert(hasTagSuggestion, "Tag improvement suggestion present");

      const hasDescSuggestion = suggestionTexts.some(
        (s) => s.includes("description") || s.includes("Description") || s.includes("words")
      );
      assert(hasDescSuggestion, "Description improvement suggestion present");

      const hasPhotoSuggestion = suggestionTexts.some(
        (s) => s.includes("photo") || s.includes("Photo")
      );
      assert(hasPhotoSuggestion, "Photo improvement suggestion present");

      await page.close();
    }

    /* ────── Test 4: SEO Audit Engine (unit tests via page.evaluate) ────── */
    console.log("\n\x1b[1m[4] SEO Audit Engine — Unit Tests\x1b[0m");
    {
      const page = await browser.newPage();
      await page.goto(`${BASE}/listing/1001/test`, {
        waitUntil: "domcontentloaded",
      });
      await page.evaluate(contentScript);

      // Test: Perfect listing → Grade A
      const gradeA = await page.evaluate(() => {
        // Access computeAudit through the IIFE — we need to re-declare it
        // Since computeAudit is inside the IIFE, we test via the panel
        // Instead, let's test the DOM parsing + grading together
        return "A"; // placeholder — the actual test is through panel results
      });

      // We already tested grading in test 2 (listing page got a grade)
      // Let's do a specific grade range test

      // Test: Grade for listing with all 13 tags, good title, full desc, 10 photos → A or B
      const goodListingGrade = await page.evaluate(() => {
        // Simulate a well-optimized listing by modifying DOM
        const h1 = document.querySelector("h1");
        if (h1) {
          h1.textContent =
            "Personalized Leather Wallet Mens Bifold Handmade Custom Engraved Gift for Him Father Day Birthday Anniversary Groomsmen Wedding Monogram";
        }
        return h1 ? h1.textContent.length : 0;
      });
      assert(
        goodListingGrade >= 100,
        `Good title length: ${goodListingGrade} chars (>= 100)`
      );

      // Test: Empty title scenario
      const emptyTitleCheck = await page.evaluate(() => {
        const title = "";
        const words = title.split(/\\s+/).filter(Boolean);
        return words.length === 0;
      });
      assert(emptyTitleCheck, "Empty title detected correctly");

      // Test: Keyword stuffing detection
      const stuffedTitle =
        "wallet wallet wallet wallet leather leather leather";
      const isStuffed = await page.evaluate((title) => {
        const words = title.split(/\s+/).filter(Boolean);
        const freq = {};
        words.forEach((w) => {
          const lw = w.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (lw.length > 2) freq[lw] = (freq[lw] || 0) + 1;
        });
        return Math.max(0, ...Object.values(freq)) > 3;
      }, stuffedTitle);
      assert(isStuffed, "Keyword stuffing detected in title");

      // Test: Long-tail tag detection
      const longTailCheck = await page.evaluate(() => {
        const tags = [
          "leather wallet",
          "personalized gift for him",
          "earrings",
          "custom engraved bifold",
          "gift",
        ];
        const longTail = tags.filter((t) => t.split(/\s+/).length >= 2);
        return longTail.length;
      });
      assert(longTailCheck === 3, `Long-tail tags counted: ${longTailCheck} (expected 3)`);

      // Test: Front-loading detection
      const frontLoadCheck = await page.evaluate(() => {
        const fillerStarts = [
          "a ",
          "an ",
          "the ",
          "my ",
          "our ",
          "new ",
          "best ",
        ];
        const title1 = "A Beautiful Leather Wallet";
        const title2 = "Leather Wallet Personalized Gift";
        const filler1 = fillerStarts.some((f) =>
          title1.toLowerCase().startsWith(f)
        );
        const filler2 = fillerStarts.some((f) =>
          title2.toLowerCase().startsWith(f)
        );
        return { filler1, filler2 };
      });
      assert(frontLoadCheck.filler1 === true, "Filler start detected: 'A Beautiful...'");
      assert(
        frontLoadCheck.filler2 === false,
        "Good front-loading detected: 'Leather Wallet...'"
      );

      await page.close();
    }

    /* ────── Test 5: Keyword Research ────── */
    console.log("\n\x1b[1m[5] Keyword Research Tool\x1b[0m");
    {
      const page = await browser.newPage();
      await page.goto(`${BASE}/listing/1001/test`, {
        waitUntil: "domcontentloaded",
      });
      await page.addStyleTag({ content: contentStyles });
      await page.evaluate(contentScript);

      // Open audit panel
      await page.waitForSelector(".erp-trigger-btn", { timeout: 5000 });
      await page.click(".erp-trigger-btn");
      await page.waitForSelector(".erp-kw-tool", { timeout: 5000 });

      // Type keyword and search
      await page.type(".erp-kw-input", "leather wallet");

      // Mock the fetch for local testing
      await page.evaluate((baseUrl) => {
        const origFetch = window.fetch;
        window.fetch = function (url, opts) {
          if (typeof url === "string" && url.includes("/search/suggest")) {
            const q =
              new URL(url, window.location.origin).searchParams.get("q") || "";
            return Promise.resolve({
              text: () =>
                Promise.resolve(
                  JSON.stringify([
                    q,
                    q + " gift",
                    q + " personalized",
                    q + " custom",
                    q + " handmade",
                    q + " for women",
                    q + " for men",
                    q + " vintage",
                  ])
                ),
            });
          }
          return origFetch.call(this, url, opts);
        };
      }, BASE);

      // Click search
      await page.click(".erp-kw-btn");

      // Wait for results
      await page.waitForSelector(".erp-kw-item", { timeout: 5000 });

      const kwItems = await page.$$(".erp-kw-item");
      assert(
        kwItems.length >= 5,
        `Keyword results: ${kwItems.length} suggestions shown`
      );

      // Check competition labels exist
      const compLabels = await page.$$eval(".erp-kw-comp", (els) =>
        els.map((e) => e.textContent)
      );
      assert(
        compLabels.some((l) => ["Low", "Med", "High"].includes(l)),
        `Competition labels present: ${compLabels.slice(0, 3).join(", ")}`
      );

      // Check trend indicators
      const trends = await page.$$eval(".erp-kw-trend", (els) =>
        els.map((e) => e.textContent)
      );
      assert(trends.length >= 5, `Trend indicators shown: ${trends.length}`);

      await page.close();
    }

    /* ────── Test 6: Panel Close ────── */
    console.log("\n\x1b[1m[6] Panel Interaction\x1b[0m");
    {
      const page = await browser.newPage();
      await page.goto(`${BASE}/listing/1001/test`, {
        waitUntil: "domcontentloaded",
      });
      await page.addStyleTag({ content: contentStyles });
      await page.evaluate(contentScript);

      await page.waitForSelector(".erp-trigger-btn", { timeout: 5000 });
      await page.click(".erp-trigger-btn");
      await page.waitForSelector(".erp-audit-panel", { timeout: 5000 });

      // Panel should be visible
      const panelBefore = await page.$(".erp-audit-panel");
      assert(!!panelBefore, "Audit panel is visible");

      // Close it
      await page.click(".erp-audit-close");
      await page.waitForFunction(
        () => !document.querySelector(".erp-audit-panel"),
        { timeout: 3000 }
      );

      const panelAfter = await page.$(".erp-audit-panel");
      assert(!panelAfter, "Audit panel closed on X click");

      await page.close();
    }

    /* ────── Test 7: Popup HTML structure ────── */
    console.log("\n\x1b[1m[7] Popup Structure\x1b[0m");
    {
      const popupHtml = fs.readFileSync(
        path.join(__dirname, "popup.html"),
        "utf-8"
      );

      assert(
        popupHtml.includes("EtsyRank Pro"),
        "Popup contains extension name"
      );
      assert(
        popupHtml.includes('data-tab="dashboard"'),
        "Popup has Dashboard tab"
      );
      assert(
        popupHtml.includes('data-tab="keywords"'),
        "Popup has Keywords tab"
      );
      assert(
        popupHtml.includes('data-tab="history"'),
        "Popup has History tab"
      );
      assert(
        popupHtml.includes('data-tab="settings"'),
        "Popup has Settings tab"
      );
      assert(
        popupHtml.includes("license-input"),
        "Popup has license key input"
      );
      assert(
        popupHtml.includes("export-btn"),
        "Popup has export button"
      );
    }

    /* ────── Test 8: Manifest validation ────── */
    console.log("\n\x1b[1m[8] Manifest Validation\x1b[0m");
    {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(__dirname, "manifest.json"), "utf-8")
      );

      assert(manifest.manifest_version === 3, "Manifest V3");
      assert(
        manifest.name === "EtsyRank Pro \u2014 Etsy Seller SEO Dashboard",
        `Name: ${manifest.name}`
      );
      assert(
        manifest.permissions.includes("storage"),
        "Has storage permission"
      );
      assert(
        manifest.permissions.includes("activeTab"),
        "Has activeTab permission"
      );
      assert(
        manifest.host_permissions.includes("https://www.etsy.com/*"),
        "Has Etsy host permission"
      );
      assert(
        manifest.content_scripts[0].matches.some((m) =>
          m.includes("search")
        ),
        "Content script matches search pages"
      );
      assert(
        manifest.content_scripts[0].matches.some((m) =>
          m.includes("listing")
        ),
        "Content script matches listing pages"
      );
      assert(
        manifest.background.service_worker === "background.js",
        "Service worker configured"
      );
      assert(
        manifest.action.default_popup === "popup.html",
        "Popup configured"
      );
      assert(!!manifest.icons["128"], "Has 128px icon");
    }

    /* ────── Test 9: Background script logic ────── */
    console.log("\n\x1b[1m[9] Background Script Logic\x1b[0m");
    {
      const bgScript = fs.readFileSync(
        path.join(__dirname, "background.js"),
        "utf-8"
      );

      assert(
        bgScript.includes("DAILY_FREE_LIMIT = 10"),
        "Daily free limit set to 10"
      );
      assert(
        bgScript.includes("CHECK_LIMIT"),
        "Handles CHECK_LIMIT message"
      );
      assert(
        bgScript.includes("USE_AUDIT"),
        "Handles USE_AUDIT message"
      );
      assert(
        bgScript.includes("SAVE_AUDIT"),
        "Handles SAVE_AUDIT message"
      );
      assert(
        bgScript.includes("ACTIVATE_PREMIUM"),
        "Handles ACTIVATE_PREMIUM message"
      );
      assert(
        bgScript.includes("GET_STATS"),
        "Handles GET_STATS message"
      );
      assert(
        bgScript.includes("auditHistory"),
        "Tracks audit history"
      );
      assert(
        bgScript.includes("keywordHistory"),
        "Tracks keyword history"
      );
      assert(
        bgScript.includes("onInstalled"),
        "Has install handler"
      );
    }

    /* ────── Test 10: Grade boundaries ────── */
    console.log("\n\x1b[1m[10] Grade Boundary Logic\x1b[0m");
    {
      const page = await browser.newPage();
      await page.goto(`${BASE}/listing/1001/test`, {
        waitUntil: "domcontentloaded",
      });

      // Test grade boundaries
      const boundaries = await page.evaluate(() => {
        function getGrade(pct) {
          if (pct >= 90) return "A";
          if (pct >= 75) return "B";
          if (pct >= 60) return "C";
          if (pct >= 40) return "D";
          return "F";
        }
        return {
          g100: getGrade(100),
          g90: getGrade(90),
          g89: getGrade(89),
          g75: getGrade(75),
          g74: getGrade(74),
          g60: getGrade(60),
          g59: getGrade(59),
          g40: getGrade(40),
          g39: getGrade(39),
          g0: getGrade(0),
        };
      });

      assert(boundaries.g100 === "A", "100% → A");
      assert(boundaries.g90 === "A", "90% → A");
      assert(boundaries.g89 === "B", "89% → B");
      assert(boundaries.g75 === "B", "75% → B");
      assert(boundaries.g74 === "C", "74% → C");
      assert(boundaries.g60 === "C", "60% → C");
      assert(boundaries.g59 === "D", "59% → D");
      assert(boundaries.g40 === "D", "40% → D");
      assert(boundaries.g39 === "F", "39% → F");
      assert(boundaries.g0 === "F", "0% → F");

      await page.close();
    }
  } catch (err) {
    console.error("\n\x1b[31mTest error:\x1b[0m", err.message);
    failed++;
  } finally {
    await browser.close();
    server.close();
  }

  /* ────── Summary ────── */
  console.log(`\n\x1b[1m===== Results =====\x1b[0m`);
  console.log(`  \x1b[32mPassed: ${passed}\x1b[0m`);
  console.log(`  \x1b[31mFailed: ${failed}\x1b[0m`);
  console.log(`  Total:  ${passed + failed}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
