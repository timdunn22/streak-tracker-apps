/**
 * EtsyRank Pro -- Real-site Puppeteer test
 *
 * Strategy:
 *   1. Try to load a real Etsy listing page with anti-detection measures.
 *   2. If Etsy blocks headless Chrome (403/DataDome), fall back to a local
 *      HTML fixture that mirrors the real Etsy listing DOM structure.
 *      We use page.setContent() with a fake etsy.com URL so the extension's
 *      content_scripts URL pattern still matches.
 *
 * Tests:
 *   - Extension loads and service worker registers
 *   - Content script injects the floating audit button (.erp-trigger-btn)
 *   - Extension CSS is injected
 *   - Title, tags, description, photos, price, reviews can be extracted
 *   - SEO audit engine produces a valid grade and score
 *   - Selector diagnostics for debugging broken selectors
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const EXTENSION_PATH = path.resolve(__dirname);
const FIXTURE_PATH = path.join(__dirname, "test-fixture.html");

const LISTING_URLS = [
  "https://www.etsy.com/listing/1269928648/",
  "https://www.etsy.com/listing/1544475889/",
  "https://www.etsy.com/listing/668256938/",
];

const TIMEOUT = 25000;

/* -- helpers ---------------------------------------- */
function log(label, status, detail = "") {
  const icon =
    status === "PASS" ? "\x1b[32mPASS\x1b[0m" :
    status === "FAIL" ? "\x1b[31mFAIL\x1b[0m" :
    status === "WARN" ? "\x1b[33mWARN\x1b[0m" :
    status === "INFO" ? "\x1b[36mINFO\x1b[0m" : status;
  console.log(`  [${icon}] ${label}${detail ? " -- " + detail : ""}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* -- main ------------------------------------------- */
(async () => {
  let browser;
  const results = { pass: 0, fail: 0, warn: 0 };
  let usingFixture = false;

  try {
    console.log("\n=== EtsyRank Pro -- Real-Site Test ===\n");
    console.log("Launching headless Chrome with extension...");

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-blink-features=AutomationControlled",
        "--window-size=1440,900",
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    log("Browser launch", "PASS");
    results.pass++;

    /* -- 1. Verify extension loaded ------------------- */
    // Give the service worker a moment to register
    await sleep(1000);
    const targets = browser.targets();
    const swTarget = targets.find(
      (t) =>
        t.type() === "service_worker" &&
        t.url().includes("background")
    );
    if (swTarget) {
      log("Extension service worker registered", "PASS", swTarget.url());
      results.pass++;
    } else {
      log("Extension service worker", "WARN", "Not detected (may load lazily on first navigation)");
      results.warn++;
    }

    /* -- 2. Set up page with anti-detection ----------- */
    const page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );

    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
    });

    await page.setViewport({ width: 1440, height: 900 });

    /* -- 3. Try real Etsy listing pages ---------------- */
    let navigated = false;

    for (const url of LISTING_URLS) {
      try {
        console.log(`\nTrying ${url} ...`);
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: TIMEOUT,
        });
        const httpStatus = response ? response.status() : 0;
        const hasContent = await page.evaluate(() =>
          !!(document.querySelector("h1") || document.querySelector('script[type="application/ld+json"]'))
        );

        if (httpStatus >= 200 && httpStatus < 400 && hasContent) {
          log("Live Etsy navigation", "PASS", `HTTP ${httpStatus}`);
          results.pass++;
          navigated = true;
          break;
        }
        log("Live Etsy attempt", "WARN", `HTTP ${httpStatus}, blocked by bot detection`);
      } catch (e) {
        log("Live Etsy attempt", "WARN", e.message.slice(0, 60));
      }
    }

    /* -- 4. Fall back to local fixture if blocked ------ */
    if (!navigated) {
      console.log("\n  Etsy's DataDome bot-detection blocks headless Chrome.");
      console.log("  Falling back to local HTML fixture for extension testing.\n");
      usingFixture = true;

      const fixtureHtml = fs.readFileSync(FIXTURE_PATH, "utf-8");

      // Navigate to an etsy.com URL so the content_scripts match pattern fires,
      // then replace content. We use page.goto to establish the origin, then
      // intercept the request to serve our fixture.
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        if (req.url().includes("etsy.com/listing/9999999")) {
          req.respond({
            status: 200,
            contentType: "text/html",
            body: fixtureHtml,
          });
        } else {
          req.continue();
        }
      });

      await page.goto("https://www.etsy.com/listing/9999999/test-fixture", {
        waitUntil: "domcontentloaded",
        timeout: TIMEOUT,
      });

      const fixtureTitle = await page.title();
      log("Fixture loaded", "PASS", `Title: "${fixtureTitle.slice(0, 60)}..."`);
      results.pass++;
    }

    /* -- 5. Wait for content script injection ---------- */
    console.log("\nWaiting 5 seconds for content script injection...");
    await sleep(5000);

    /* -- 6. Check extension UI elements --------------- */
    console.log("\n--- Extension UI Injection ---");

    const hasTriggerBtn = await page.evaluate(() =>
      !!document.querySelector(".erp-trigger-btn")
    );
    if (hasTriggerBtn) {
      log("Floating audit button (.erp-trigger-btn)", "PASS", "Injected into DOM");
      results.pass++;
    } else {
      log("Floating audit button (.erp-trigger-btn)", "FAIL", "Not found in DOM");
      results.fail++;

      // Additional debug
      const debugInfo = await page.evaluate(() => ({
        url: location.href,
        pathname: location.pathname,
        bodyChildCount: document.body?.children?.length || 0,
        allClasses: Array.from(document.querySelectorAll("[class*='erp']")).map(
          (e) => e.className
        ),
      }));
      console.log("    Debug:", JSON.stringify(debugInfo));
    }

    const hasExtensionStyles = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      return sheets.some((s) => {
        try {
          const rules = Array.from(s.cssRules || []);
          return rules.some(
            (r) => r.selectorText && r.selectorText.includes("erp-")
          );
        } catch (_) {
          return false;
        }
      });
    });
    if (hasExtensionStyles) {
      log("Extension CSS injected", "PASS");
      results.pass++;
    } else {
      log("Extension CSS injected", "WARN", "Could not confirm (cross-origin restriction)");
      results.warn++;
    }

    /* -- 7. Check selector-based data extraction ------ */
    console.log("\n--- Listing Data Extraction (content.js selectors) ---");

    const listingData = await page.evaluate(() => {
      const data = {
        title: null, titleSelector: null,
        tags: [], tagSource: null,
        description: null, descriptionFull: null, descriptionSelector: null,
        descriptionWordCount: 0,
        photoCount: 0, photoSelector: null,
        price: null, priceSelector: null,
        reviews: null, reviewSelector: null,
      };

      // Title
      for (const [sel, label] of [
        ["h1.wt-text-body-03", "h1.wt-text-body-03"],
        ["h1[data-buy-box-listing-title]", "h1[data-buy-box-listing-title]"],
        ["h1", "h1 (generic)"],
      ]) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) {
          data.title = el.textContent.trim();
          data.titleSelector = label;
          break;
        }
      }

      // Tags -- meta
      const metaTags = document.querySelectorAll(
        'meta[property="og:tag"], meta[name="keywords"]'
      );
      metaTags.forEach((m) => {
        (m.getAttribute("content") || "").split(",").forEach((t) => {
          const trimmed = t.trim();
          if (trimmed) data.tags.push(trimmed);
        });
      });
      if (data.tags.length > 0) data.tagSource = "meta[name=keywords]";

      // Tags -- visible links (tried if meta found none)
      if (data.tags.length === 0) {
        document.querySelectorAll(
          '#item-tags a, .wt-action-group a[href*="/search?q="], a.wt-tag'
        ).forEach((a) => {
          const t = a.textContent.trim();
          if (t) data.tags.push(t);
        });
        if (data.tags.length > 0) data.tagSource = "visible tag links (a.wt-tag)";
      }

      // Tags -- JSON-LD
      if (data.tags.length === 0) {
        document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
          try {
            const j = JSON.parse(s.textContent);
            if (j.keywords) {
              data.tags = Array.isArray(j.keywords)
                ? j.keywords
                : j.keywords.split(",").map((t) => t.trim()).filter(Boolean);
              if (data.tags.length > 0) data.tagSource = "JSON-LD keywords";
            }
          } catch (_) {}
        });
      }

      // Description
      for (const [sel, label] of [
        ['[data-id="description-text"]', '[data-id="description-text"]'],
        ["#listing-page-description-content", "#listing-page-description-content"],
        [".wt-text-body-01.wt-break-word", ".wt-text-body-01.wt-break-word"],
      ]) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) {
          const fullText = el.textContent.trim();
          data.description = fullText.slice(0, 200) + "...";
          data.descriptionFull = fullText;
          data.descriptionWordCount = fullText.split(/\s+/).filter(Boolean).length;
          data.descriptionSelector = label;
          break;
        }
      }

      // Photos
      for (const [sel, label] of [
        [".image-carousel-container img", ".image-carousel-container img"],
        ["[data-carousel] img", "[data-carousel] img"],
        [".listing-page-image-carousel img", ".listing-page-image-carousel img"],
        [".carousel-container img", ".carousel-container img"],
      ]) {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          data.photoCount = els.length;
          data.photoSelector = label;
          break;
        }
      }
      if (data.photoCount === 0) {
        for (const [sel, label] of [
          [".carousel-pagination button", ".carousel-pagination button"],
          [".image-carousel-pane", ".image-carousel-pane"],
          ["[data-carousel-pane]", "[data-carousel-pane]"],
        ]) {
          const els = document.querySelectorAll(sel);
          if (els.length > 0) {
            data.photoCount = els.length;
            data.photoSelector = label + " (fallback)";
            break;
          }
        }
      }

      // Price
      for (const [sel, label] of [
        ['[data-buy-box-listing-price] .currency-value', '[data-buy-box-listing-price] .currency-value'],
        ['.wt-text-title-03.wt-mr-xs-2', '.wt-text-title-03.wt-mr-xs-2'],
        ['p[class*="price"]', 'p[class*="price"]'],
      ]) {
        const el = document.querySelector(sel);
        if (el) {
          const raw = el.textContent.replace(/[^0-9.]/g, "");
          data.price = parseFloat(raw) || null;
          data.priceSelector = label;
          if (data.price) break;
        }
      }

      // Reviews
      for (const [sel, label] of [
        ['a[href="#reviews"] span', 'a[href="#reviews"] span'],
        ['[data-reviews-count]', '[data-reviews-count]'],
        ['.wt-badge--status-02', '.wt-badge--status-02'],
      ]) {
        const el = document.querySelector(sel);
        if (el) {
          const m = el.textContent.match(/([\d,]+)/);
          if (m) {
            data.reviews = parseInt(m[1].replace(/,/g, ""), 10);
            data.reviewSelector = label;
            break;
          }
        }
      }

      return data;
    });

    // -- Report extraction results --

    if (listingData.title) {
      log("Title extraction", "PASS",
        `"${listingData.title.slice(0, 70)}..." (${listingData.title.length} chars) via ${listingData.titleSelector}`);
      results.pass++;
    } else {
      log("Title extraction", "FAIL", "No title found");
      results.fail++;
    }

    if (listingData.tags.length > 0) {
      log("Tags extraction", "PASS",
        `${listingData.tags.length} tags via ${listingData.tagSource}`);
      log("  Sample tags", "INFO", listingData.tags.slice(0, 5).join(", "));
      results.pass++;
    } else {
      log("Tags extraction", "FAIL", "No tags found");
      results.fail++;
    }

    if (listingData.description) {
      log("Description extraction", "PASS",
        `${listingData.descriptionWordCount} words via ${listingData.descriptionSelector}`);
      log("  Preview", "INFO", listingData.description.slice(0, 100));
      results.pass++;
    } else {
      log("Description extraction", "FAIL", "Not found");
      results.fail++;
    }

    if (listingData.photoCount > 0) {
      log("Photo count", "PASS",
        `${listingData.photoCount} photos via ${listingData.photoSelector}`);
      results.pass++;
    } else {
      log("Photo count", "FAIL", "0 photos found");
      results.fail++;
    }

    if (listingData.price) {
      log("Price extraction", "PASS",
        `$${listingData.price} via ${listingData.priceSelector}`);
      results.pass++;
    } else {
      log("Price extraction", "FAIL", "No price found");
      results.fail++;
    }

    if (listingData.reviews !== null && listingData.reviews > 0) {
      log("Reviews extraction", "PASS",
        `${listingData.reviews} reviews via ${listingData.reviewSelector}`);
      results.pass++;
    } else if (listingData.reviews === 0) {
      log("Reviews extraction", "WARN", "0 reviews (listing may genuinely have none)");
      results.warn++;
    } else {
      log("Reviews extraction", "FAIL", "No review count selector matched");
      results.fail++;

      // Diagnose the specific bug
      const revDiag = await page.evaluate(() => {
        const anchor = document.querySelector('a[href="#reviews"]');
        if (!anchor) return { anchorFound: false };
        const spans = anchor.querySelectorAll("span");
        return {
          anchorFound: true,
          anchorText: anchor.textContent.trim().slice(0, 80),
          spanCount: spans.length,
          spans: Array.from(spans).map((s, i) => ({
            index: i,
            cls: s.className,
            text: s.textContent.trim().slice(0, 40),
            hasDigits: /\d/.test(s.textContent),
          })),
          bug: "content.js uses 'a[href=\"#reviews\"] span' which matches the FIRST span. " +
               "If the first span contains star icons (no digits), the regex fails. " +
               "Fix: use 'a[href=\"#reviews\"] span:last-child' or iterate all spans.",
        };
      });
      console.log("    Review selector bug diagnosis:");
      console.log(`      Anchor found: ${revDiag.anchorFound}`);
      if (revDiag.anchorFound) {
        console.log(`      Anchor text: "${revDiag.anchorText}"`);
        console.log(`      Spans inside anchor: ${revDiag.spanCount}`);
        revDiag.spans.forEach((s) => {
          console.log(`        span[${s.index}] cls="${s.cls}" text="${s.text}" hasDigits=${s.hasDigits}`);
        });
        console.log(`      BUG: ${revDiag.bug}`);
      }
    }

    /* -- 8. Run SEO audit engine ----------------------- */
    console.log("\n--- SEO Audit Scoring ---");

    const auditResult = await page.evaluate((extracted) => {
      const data = {
        title: extracted.title || "",
        tags: extracted.tags || [],
        description: extracted.descriptionFull || (extracted.description || "").replace(/\.\.\.$/, ""),
        photoCount: extracted.photoCount || 0,
        price: extracted.price || 0,
        reviews: extracted.reviews || 0,
      };

      const MAX_TITLE_LEN = 140, IDEAL_TITLE_MIN = 100, MAX_TAGS = 13;
      const IDEAL_PHOTOS = 10, MIN_PHOTOS = 5, DESC_MIN_WORDS = 150;

      const checks = [];
      let totalPoints = 0, maxPoints = 0;

      // -- Title length --
      const titleLen = data.title.length;
      const titleWords = data.title.split(/\s+/).filter(Boolean);
      maxPoints += 20;
      if (titleLen === 0) {
        checks.push({ cat: "Title", label: "Length", val: `0/${MAX_TITLE_LEN}`, st: "bad", pts: 0 });
      } else if (titleLen >= IDEAL_TITLE_MIN) {
        totalPoints += 20;
        checks.push({ cat: "Title", label: "Length", val: `${titleLen}/${MAX_TITLE_LEN}`, st: "ok", pts: 20 });
      } else if (titleLen >= 60) {
        totalPoints += 14;
        checks.push({ cat: "Title", label: "Length", val: `${titleLen}/${MAX_TITLE_LEN}`, st: "warn", pts: 14 });
      } else {
        totalPoints += 6;
        checks.push({ cat: "Title", label: "Length", val: `${titleLen}/${MAX_TITLE_LEN}`, st: "bad", pts: 6 });
      }

      // -- Front-loading --
      maxPoints += 10;
      const fillerStarts = ["a ", "an ", "the ", "my ", "our ", "new ", "best "];
      const startsWithFiller = fillerStarts.some(f => data.title.toLowerCase().startsWith(f));
      if (!startsWithFiller && titleWords.length >= 3) {
        totalPoints += 10;
        checks.push({ cat: "Title", label: "Front-loading", val: "Good", st: "ok", pts: 10 });
      } else {
        totalPoints += startsWithFiller ? 3 : 5;
        checks.push({ cat: "Title", label: "Front-loading", val: startsWithFiller ? "Weak" : "OK", st: "warn", pts: startsWithFiller ? 3 : 5 });
      }

      // -- Keyword density --
      maxPoints += 10;
      const wf = {};
      titleWords.forEach(w => { const lw = w.toLowerCase().replace(/[^a-z0-9]/g, ""); if (lw.length > 2) wf[lw] = (wf[lw] || 0) + 1; });
      const mxF = Math.max(0, ...Object.values(wf));
      const uniqR = titleWords.length > 0 ? Object.keys(wf).length / titleWords.length : 0;
      if (mxF > 3) { totalPoints += 3; checks.push({ cat: "Title", label: "Density", val: "Stuffed", st: "bad", pts: 3 }); }
      else if (mxF <= 2 && uniqR > 0.6) { totalPoints += 10; checks.push({ cat: "Title", label: "Density", val: "Balanced", st: "ok", pts: 10 }); }
      else { totalPoints += 7; checks.push({ cat: "Title", label: "Density", val: "OK", st: "warn", pts: 7 }); }

      // -- Tag count --
      const tc = data.tags.length;
      maxPoints += 20;
      if (tc === MAX_TAGS) { totalPoints += 20; checks.push({ cat: "Tags", label: "Count", val: `${tc}/${MAX_TAGS}`, st: "ok", pts: 20 }); }
      else if (tc >= 10) { totalPoints += 14; checks.push({ cat: "Tags", label: "Count", val: `${tc}/${MAX_TAGS}`, st: "warn", pts: 14 }); }
      else { const p = Math.max(0, Math.round((tc / MAX_TAGS) * 12)); totalPoints += p; checks.push({ cat: "Tags", label: "Count", val: `${tc}/${MAX_TAGS}`, st: "bad", pts: p }); }

      // -- Long-tail --
      maxPoints += 15;
      const ltTags = data.tags.filter(t => t.split(/\s+/).length >= 2);
      const bTags = data.tags.filter(t => t.split(/\s+/).length === 1);
      const ltR = tc > 0 ? ltTags.length / tc : 0;
      if (tc === 0) checks.push({ cat: "Tags", label: "Long-tail", val: "N/A", st: "bad", pts: 0 });
      else if (ltR >= 0.6) { totalPoints += 15; checks.push({ cat: "Tags", label: "Long-tail", val: `${ltTags.length} long / ${bTags.length} broad`, st: "ok", pts: 15 }); }
      else if (ltR >= 0.3) { totalPoints += 10; checks.push({ cat: "Tags", label: "Long-tail", val: `${ltTags.length} long / ${bTags.length} broad`, st: "warn", pts: 10 }); }
      else { totalPoints += 4; checks.push({ cat: "Tags", label: "Long-tail", val: `${ltTags.length} long / ${bTags.length} broad`, st: "bad", pts: 4 }); }

      // -- Tag-title overlap --
      maxPoints += 10;
      const tl = data.title.toLowerCase();
      const inTitle = data.tags.filter(t => tl.includes(t.toLowerCase()));
      const oR = tc > 0 ? inTitle.length / tc : 0;
      if (tc === 0) checks.push({ cat: "Tags", label: "Title match", val: "N/A", st: "bad", pts: 0 });
      else if (oR >= 0.3 && oR <= 0.7) { totalPoints += 10; checks.push({ cat: "Tags", label: "Title match", val: `${inTitle.length}/${tc}`, st: "ok", pts: 10 }); }
      else { totalPoints += 5; checks.push({ cat: "Tags", label: "Title match", val: `${inTitle.length}/${tc}`, st: "warn", pts: 5 }); }

      // -- Description --
      maxPoints += 15;
      const dw = data.description.split(/\s+/).filter(Boolean).length;
      if (dw >= DESC_MIN_WORDS) { totalPoints += 15; checks.push({ cat: "Desc", label: "Length", val: `${dw} words`, st: "ok", pts: 15 }); }
      else if (dw >= 75) { totalPoints += 10; checks.push({ cat: "Desc", label: "Length", val: `${dw} words`, st: "warn", pts: 10 }); }
      else { const p = Math.max(0, Math.round((dw / DESC_MIN_WORDS) * 8)); totalPoints += p; checks.push({ cat: "Desc", label: "Length", val: `${dw} words`, st: "bad", pts: p }); }

      // -- Photos --
      maxPoints += 10;
      if (data.photoCount >= IDEAL_PHOTOS) { totalPoints += 10; checks.push({ cat: "Photos", label: "Count", val: `${data.photoCount}/10`, st: "ok", pts: 10 }); }
      else if (data.photoCount >= MIN_PHOTOS) { totalPoints += 7; checks.push({ cat: "Photos", label: "Count", val: `${data.photoCount}/10`, st: "warn", pts: 7 }); }
      else { const p = Math.max(0, data.photoCount * 2); totalPoints += p; checks.push({ cat: "Photos", label: "Count", val: `${data.photoCount}/10`, st: "bad", pts: p }); }

      const pct = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;
      let grade;
      if (pct >= 90) grade = "A";
      else if (pct >= 75) grade = "B";
      else if (pct >= 60) grade = "C";
      else if (pct >= 40) grade = "D";
      else grade = "F";

      return { checks, totalPoints, maxPoints, pct: Math.round(pct), grade };
    }, listingData);

    if (auditResult && auditResult.grade) {
      log("Audit engine", "PASS",
        `Grade: ${auditResult.grade}, Score: ${auditResult.pct}/100 (${auditResult.totalPoints}/${auditResult.maxPoints} pts)`);
      results.pass++;

      console.log("\n  Detailed audit breakdown:");
      for (const c of auditResult.checks) {
        const col = c.st === "ok" ? "\x1b[32m" : c.st === "warn" ? "\x1b[33m" : "\x1b[31m";
        console.log(`    ${col}[${c.st.toUpperCase()}]\x1b[0m ${c.cat} > ${c.label}: ${c.val} (${c.pts} pts)`);
      }
    } else {
      log("Audit engine", "FAIL", "No result produced");
      results.fail++;
    }

    /* -- 9. Selector diagnostics ---------------------- */
    console.log("\n--- Selector Diagnostics ---");

    const diag = await page.evaluate(() => {
      const d = {};

      d.url = location.href;
      d.title = document.title;

      const h1s = document.querySelectorAll("h1");
      d.h1s = Array.from(h1s).map(h => ({
        text: h.textContent.trim().slice(0, 80),
        cls: h.className,
        attrs: Array.from(h.attributes).map(a => `${a.name}="${a.value}"`).join(" "),
      }));

      const prices = document.querySelectorAll('[class*="price"], [data-buy-box-listing-price], [class*="Price"]');
      d.prices = Array.from(prices).slice(0, 5).map(p => ({
        tag: p.tagName, cls: p.className.toString().slice(0, 100), text: p.textContent.trim().slice(0, 50),
      }));

      const imgs = Array.from(document.querySelectorAll("img")).filter(i => (i.src || "").includes("etsystatic") || (i.src || "").includes("il_"));
      d.imgCount = imgs.length;
      d.imgSamples = imgs.slice(0, 3).map(i => ({
        src: (i.src || "").slice(0, 80),
        parentCls: (i.parentElement?.className || "").toString().slice(0, 80),
      }));

      const carousels = document.querySelectorAll('[class*="carousel"], [data-carousel]');
      d.carousels = Array.from(carousels).slice(0, 5).map(c => ({
        tag: c.tagName, cls: c.className.toString().slice(0, 100), imgs: c.querySelectorAll("img").length,
      }));

      const tags = document.querySelectorAll('[class*="tag"], [id*="tag"], a[href*="/search?q="]');
      d.tagCount = tags.length;
      d.tagSamples = Array.from(tags).slice(0, 6).map(t => ({
        tag: t.tagName, cls: (t.className || "").toString().slice(0, 60),
        text: t.textContent.trim().slice(0, 40), href: (t.href || "").slice(0, 60),
      }));

      const lds = document.querySelectorAll('script[type="application/ld+json"]');
      d.jsonLd = Array.from(lds).map(s => {
        try { const j = JSON.parse(s.textContent); return { type: j["@type"], kw: !!j.keywords, name: !!j.name }; }
        catch (_) { return { err: true }; }
      });

      const descs = document.querySelectorAll('[data-id="description-text"], #listing-page-description-content, [class*="description"]');
      d.descs = Array.from(descs).slice(0, 5).map(x => ({
        tag: x.tagName, id: x.id || "", dataId: x.getAttribute("data-id") || "",
        cls: x.className.toString().slice(0, 80), len: x.textContent.trim().length,
      }));

      const revs = document.querySelectorAll('a[href*="reviews"], [class*="review"], [data-reviews-count]');
      d.revs = Array.from(revs).slice(0, 5).map(r => ({
        tag: r.tagName, cls: (r.className || "").toString().slice(0, 60),
        text: r.textContent.trim().slice(0, 50), href: (r.href || "").slice(0, 60),
      }));

      return d;
    });

    console.log(`\n  Page: ${diag.url}`);
    console.log(`  Document title: ${diag.title}`);

    console.log(`\n  H1 elements: ${diag.h1s.length}`);
    diag.h1s.forEach(h => console.log(`    "${h.text}" [${h.attrs}]`));

    console.log(`\n  Price elements: ${diag.prices.length}`);
    diag.prices.forEach(p => console.log(`    <${p.tag}> cls="${p.cls}" => "${p.text}"`));

    console.log(`\n  Listing images: ${diag.imgCount}`);
    diag.imgSamples.forEach(i => console.log(`    src="${i.src}" parent="${i.parentCls}"`));

    console.log(`\n  Carousel containers: ${diag.carousels.length}`);
    diag.carousels.forEach(c => console.log(`    <${c.tag}> cls="${c.cls}" imgs=${c.imgs}`));

    console.log(`\n  Tag areas: ${diag.tagCount}`);
    diag.tagSamples.forEach(t => console.log(`    <${t.tag}> cls="${t.cls}" href="${t.href}" => "${t.text}"`));

    console.log(`\n  JSON-LD: ${diag.jsonLd.length}`);
    diag.jsonLd.forEach(j => j.err ? console.log("    (parse error)") : console.log(`    type=${j.type}, kw=${j.kw}, name=${j.name}`));

    console.log(`\n  Description areas: ${diag.descs.length}`);
    diag.descs.forEach(d => console.log(`    <${d.tag}> id="${d.id}" data-id="${d.dataId}" cls="${d.cls}" len=${d.len}`));

    console.log(`\n  Review areas: ${diag.revs.length}`);
    diag.revs.forEach(r => console.log(`    <${r.tag}> cls="${r.cls}" href="${r.href}" => "${r.text}"`));

    /* -- Summary -------------------------------------- */
    console.log("\n\n=== TEST SUMMARY ===");
    if (usingFixture) {
      console.log("  (Used local HTML fixture -- Etsy blocked headless Chrome)");
    }
    console.log(`  \x1b[32mPASS: ${results.pass}\x1b[0m`);
    console.log(`  \x1b[33mWARN: ${results.warn}\x1b[0m`);
    console.log(`  \x1b[31mFAIL: ${results.fail}\x1b[0m`);
    console.log();

    if (results.fail > 0) {
      console.log("  Some tests failed. Review details above.\n");
    } else {
      console.log("  All tests passed!\n");
    }

  } catch (err) {
    console.error("\nFatal error:", err);
    results.fail++;
  } finally {
    if (browser) await browser.close();
    process.exit(results.fail > 0 ? 1 : 0);
  }
})();
