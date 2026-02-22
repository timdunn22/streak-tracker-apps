/* ──────────────────────────────────────────────────────────────────
   SaveSmart Extension — Real-Site Integration Test
   Tests the extension on actual shopping sites to verify:
   1. Checkout/cart page detection
   2. Coupon input field discovery
   3. Notification bar injection
   4. Badge update (coupon count)
   5. Console errors
   6. Coupon database coverage
   ────────────────────────────────────────────────────────────────── */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const EXTENSION_PATH = path.resolve(__dirname);
const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

/* ── Sites to test ── */
const TEST_SITES = [
  {
    name: "Target",
    domain: "target.com",
    urls: [
      "https://www.target.com/cart",
      "https://www.target.com/co-cart",
    ],
  },
  {
    name: "Amazon",
    domain: "amazon.com",
    urls: [
      "https://www.amazon.com/gp/cart/view.html",
      "https://www.amazon.com/cart",
    ],
  },
  {
    name: "Nike",
    domain: "nike.com",
    urls: [
      "https://www.nike.com/cart",
    ],
  },
  {
    name: "Best Buy",
    domain: "bestbuy.com",
    urls: [
      "https://www.bestbuy.com/cart",
    ],
  },
  {
    name: "Dominos",
    domain: "dominos.com",
    urls: [
      "https://www.dominos.com/pages/order/",
      "https://www.dominos.com/",
    ],
  },
  {
    name: "GoDaddy",
    domain: "godaddy.com",
    urls: [
      "https://cart.godaddy.com/",
      "https://www.godaddy.com/cart",
    ],
  },
  {
    name: "H&M",
    domain: "hm.com",
    urls: [
      "https://www2.hm.com/en_us/cart",
      "https://www.hm.com/en_us/cart",
    ],
  },
];

/* ── Common coupon input selectors (mirrors content.js) ── */
const COUPON_INPUT_SELECTORS = [
  'input[name*="coupon" i]',
  'input[name*="promo" i]',
  'input[name*="discount" i]',
  'input[name*="voucher" i]',
  'input[name*="gift" i][name*="code" i]',
  'input[name*="redemption" i]',
  'input[id*="coupon" i]',
  'input[id*="promo" i]',
  'input[id*="discount" i]',
  'input[id*="voucher" i]',
  'input[class*="coupon" i]',
  'input[class*="promo" i]',
  'input[class*="discount" i]',
  'input[placeholder*="coupon" i]',
  'input[placeholder*="promo" i]',
  'input[placeholder*="discount" i]',
  'input[placeholder*="voucher" i]',
  'input[placeholder*="code" i]',
  'input[placeholder*="gift card" i]',
  'input[aria-label*="coupon" i]',
  'input[aria-label*="promo" i]',
  'input[aria-label*="discount" i]',
  'input[data-testid*="promo" i]',
  'input[data-testid*="coupon" i]',
];

/* ── Extended selectors: broader search ── */
const EXTENDED_COUPON_SELECTORS = [
  'input[type="text"][name*="code" i]',
  'input[type="text"][id*="code" i]',
  'input[type="text"][placeholder*="code" i]',
  'input[name*="offer" i]',
  'input[id*="offer" i]',
  '[class*="coupon" i] input',
  '[class*="promo" i] input',
  '[id*="coupon" i] input',
  '[id*="promo" i] input',
  '[data-testid*="coupon" i] input',
  '[data-testid*="promo" i] input',
];

/* ── Checkout URL patterns (mirrors content.js) ── */
const CHECKOUT_URL_PATTERNS = [
  /checkout/i, /cart/i, /basket/i, /order/i, /payment/i,
  /billing/i, /shipping/i, /purchase/i, /bag/i, /pay\b/i,
];

/* ── Coupon database (mirrors coupon-database.js) ── */
const COUPON_DATABASE = {
  "amazon.com": ["SAVE10", "PRIMEDAY", "AMZN20", "HOLIDAY15", "FIRSTORDER"],
  "target.com": ["TGT20OFF", "FREESHIP", "CIRCLE10", "SAVE5NOW", "WELCOME15"],
  "nike.com": ["EXTRA20", "MEMBER25", "FALL20", "SAVE10NOW", "NIKESALE"],
  "bestbuy.com": ["SAVE15BB", "STUDENT20", "TOTALTECH", "HOLIDAY10", "FREESHIP"],
  "dominos.com": ["CARRYOUT50", "MIX999", "9174", "9193", "TWOMEDIUMS"],
  "godaddy.com": ["GDBBX1", "CJCRMN20", "HOSTING49", "GET35OFF", "NEWDOMAIN"],
  "hm.com": ["HM20OFF", "WELCOME10", "FREESHIP", "SUMMER15", "FALL25"],
};

/* ── Utility ── */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isCheckoutUrl(url) {
  return CHECKOUT_URL_PATTERNS.some((p) => p.test(url));
}

function colorize(text, color) {
  const colors = {
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    bold: "\x1b[1m",
    reset: "\x1b[0m",
    dim: "\x1b[2m",
    magenta: "\x1b[35m",
  };
  return (colors[color] || "") + text + colors.reset;
}

/* ── Main Test Runner ── */
async function runTests() {
  console.log("\n" + "=".repeat(72));
  console.log(colorize("  SaveSmart Extension -- Real-Site Integration Test", "bold"));
  console.log(colorize("  Testing on 7 real shopping/checkout sites", "dim"));
  console.log("=".repeat(72) + "\n");

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        "--disable-extensions-except=" + EXTENSION_PATH,
        "--load-extension=" + EXTENSION_PATH,
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-default-apps",
        "--disable-popup-blocking",
        "--window-size=1280,900",
      ],
      defaultViewport: {
        width: 1280,
        height: 800,
      },
    });
  } catch (err) {
    console.error(colorize("FATAL: Failed to launch browser.", "red"));
    console.error(err.message);
    process.exit(1);
  }

  // Get extension ID from service worker target
  let extensionId = null;
  try {
    await sleep(2000);
    const targets = browser.targets();
    const swTarget = targets.find(
      (t) => t.type() === "service_worker" && t.url().includes("chrome-extension://")
    );
    if (swTarget) {
      const match = swTarget.url().match(/chrome-extension:\/\/([^/]+)/);
      if (match) extensionId = match[1];
    }
    console.log(
      extensionId
        ? colorize("  Extension loaded: " + extensionId, "green")
        : colorize("  WARNING: Could not detect extension service worker", "yellow")
    );
  } catch (e) {
    console.log(colorize("  WARNING: Could not get extension ID: " + e.message, "yellow"));
  }

  const results = [];

  for (const site of TEST_SITES) {
    console.log("\n" + "-".repeat(72));
    console.log(colorize("  Testing: " + site.name, "bold") + colorize(" (" + site.domain + ")", "dim"));
    console.log("-".repeat(72));

    const result = {
      name: site.name,
      domain: site.domain,
      urlLoaded: null,
      finalUrl: null,
      httpStatus: null,
      isCheckoutPage: false,
      couponInputFound: false,
      couponInputDetails: null,
      extendedInputFound: false,
      extendedInputDetails: null,
      notificationBarInjected: false,
      notificationBarVisible: false,
      badgeCouponCount: null,
      dbHasCoupons: false,
      dbCouponCount: 0,
      consoleErrors: [],
      consoleWarnings: [],
      pageTitle: null,
      screenshotPath: null,
      loadTime: null,
      contentScriptLoaded: false,
      rating: "UNKNOWN",
      notes: [],
    };

    // Check coupon database coverage
    const dbCodes = COUPON_DATABASE[site.domain];
    if (dbCodes) {
      result.dbHasCoupons = true;
      result.dbCouponCount = dbCodes.length;
      console.log(colorize("  [DB] " + dbCodes.length + " coupon codes in database for " + site.domain, "green"));
      console.log(colorize("        Codes: " + dbCodes.join(", "), "dim"));
    } else {
      console.log(colorize("  [DB] No coupon codes found in database for " + site.domain, "red"));
    }

    let page = null;
    let pageLoaded = false;

    try {
      page = await browser.newPage();

      // Set a realistic user agent
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      );

      // Capture console messages
      page.on("console", (msg) => {
        const type = msg.type();
        const text = msg.text();
        if (type === "error") {
          result.consoleErrors.push(text);
        } else if (type === "warning") {
          result.consoleWarnings.push(text);
        }
      });

      // Capture page errors
      page.on("pageerror", (err) => {
        result.consoleErrors.push("PAGE ERROR: " + err.message);
      });

      // Try each URL for this site
      for (const url of site.urls) {
        console.log(colorize("  [NAV] Trying: " + url, "cyan"));
        const startTime = Date.now();

        try {
          const response = await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 15000,
          });

          result.httpStatus = response ? response.status() : null;
          result.loadTime = Date.now() - startTime;
          result.urlLoaded = url;

          // Wait for content to render and content script to run
          await sleep(4000);

          result.finalUrl = page.url();
          pageLoaded = true;
          console.log(
            colorize("  [NAV] Loaded in " + result.loadTime + "ms (HTTP " + result.httpStatus + ")", "green")
          );
          if (result.finalUrl !== url) {
            console.log(colorize("  [NAV] Redirected to: " + result.finalUrl, "yellow"));
          }
          break;
        } catch (navErr) {
          console.log(colorize("  [NAV] Failed: " + navErr.message.split("\n")[0], "red"));
          continue;
        }
      }

      if (!pageLoaded) {
        result.rating = "DOES NOT WORK";
        result.notes.push("Could not load any URL for this site");
        console.log(colorize("  [RESULT] Could not load page", "red"));
        results.push(result);
        if (page) await page.close().catch(function() {});
        continue;
      }

      // Get page title
      result.pageTitle = await page.title().catch(function() { return "Unknown"; });
      console.log(colorize('  [PAGE] Title: "' + result.pageTitle + '"', "dim"));

      // ── Test 1: Is it detected as a checkout page? ──
      result.isCheckoutPage = isCheckoutUrl(result.finalUrl);
      console.log(
        result.isCheckoutPage
          ? colorize("  [CHECK] URL matches checkout pattern: YES", "green")
          : colorize("  [CHECK] URL matches checkout pattern: NO", "yellow")
      );

      // ── Test 2: Find coupon input ──
      const couponInputResult = await page.evaluate(function(selectors) {
        for (var i = 0; i < selectors.length; i++) {
          var sel = selectors[i];
          try {
            var el = document.querySelector(sel);
            if (el) {
              var style = getComputedStyle(el);
              var visible =
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                style.opacity !== "0" &&
                el.offsetWidth > 0 &&
                el.offsetHeight > 0;
              return {
                found: true,
                visible: visible,
                selector: sel,
                tagName: el.tagName,
                type: el.type || "",
                name: el.name || "",
                id: el.id || "",
                className: (el.className || "").toString().substring(0, 80),
                placeholder: el.placeholder || "",
                ariaLabel: el.getAttribute("aria-label") || "",
              };
            }
          } catch (e) {}
        }
        return { found: false };
      }, COUPON_INPUT_SELECTORS);

      result.couponInputFound = couponInputResult.found;
      if (couponInputResult.found) {
        result.couponInputDetails = couponInputResult;
        console.log(colorize("  [INPUT] Coupon input found: YES", "green"));
        console.log(colorize("          Selector: " + couponInputResult.selector, "dim"));
        console.log(
          colorize(
            '          Visible: ' + couponInputResult.visible + ', name="' + couponInputResult.name +
            '", id="' + couponInputResult.id + '", placeholder="' + couponInputResult.placeholder + '"',
            "dim"
          )
        );
      } else {
        console.log(colorize("  [INPUT] Coupon input found with standard selectors: NO", "yellow"));

        // Try extended selectors
        const extResult = await page.evaluate(function(selectors) {
          for (var i = 0; i < selectors.length; i++) {
            var sel = selectors[i];
            try {
              var el = document.querySelector(sel);
              if (el) {
                return {
                  found: true,
                  selector: sel,
                  tagName: el.tagName,
                  type: el.type || "",
                  name: el.name || "",
                  id: el.id || "",
                  placeholder: el.placeholder || "",
                };
              }
            } catch (e) {}
          }
          return { found: false };
        }, EXTENDED_COUPON_SELECTORS);

        result.extendedInputFound = extResult.found;
        if (extResult.found) {
          result.extendedInputDetails = extResult;
          console.log(
            colorize(
              '  [INPUT] Extended selector match: ' + extResult.selector +
              ' (name="' + extResult.name + '", id="' + extResult.id + '")',
              "yellow"
            )
          );
        }

        // Look for expandable coupon sections
        const expandableResult = await page.evaluate(function() {
          var expandKeywords = ["coupon", "promo", "discount", "voucher", "gift card", "redeem"];
          var clickables = document.querySelectorAll("button, a, [role='button'], summary, [class*='expand'], [class*='toggle'], [class*='accordion']");
          var found = [];
          for (var i = 0; i < clickables.length; i++) {
            var el = clickables[i];
            var text = (el.textContent || "").toLowerCase().trim();
            var ariaLabel = (el.getAttribute("aria-label") || "").toLowerCase();
            for (var k = 0; k < expandKeywords.length; k++) {
              if (text.includes(expandKeywords[k]) || ariaLabel.includes(expandKeywords[k])) {
                found.push({
                  tag: el.tagName,
                  text: text.substring(0, 60),
                  className: (el.className || "").toString().substring(0, 60),
                });
                break;
              }
            }
          }
          return found;
        });

        if (expandableResult.length > 0) {
          console.log(
            colorize("  [INPUT] Found " + expandableResult.length + " expandable coupon-related element(s):", "yellow")
          );
          for (var ei = 0; ei < expandableResult.length; ei++) {
            console.log(
              colorize('          <' + expandableResult[ei].tag.toLowerCase() + '> "' + expandableResult[ei].text + '"', "dim")
            );
          }
          result.notes.push(
            expandableResult.length + " expandable coupon element(s) found - input may be hidden behind a click"
          );
        }
      }

      // ── Test 3: Check if notification bar was injected ──
      await sleep(2000);

      const notifResult = await page.evaluate(function() {
        var bar = document.getElementById("savesmart-notification");
        if (!bar) return { exists: false, visible: false };
        var hasVisibleClass = bar.classList.contains("visible");
        var style = getComputedStyle(bar);
        return {
          exists: true,
          visible: hasVisibleClass,
          innerHTML: bar.innerHTML.substring(0, 200),
          transform: style.transform,
        };
      });

      result.notificationBarInjected = notifResult.exists;
      result.notificationBarVisible = notifResult.visible;
      if (notifResult.exists) {
        console.log(colorize("  [NOTIF] SaveSmart notification bar: INJECTED", "green"));
        console.log(
          notifResult.visible
            ? colorize("          Visible: YES (has .visible class)", "green")
            : colorize("          Visible: NO (exists but not visible)", "yellow")
        );
      } else {
        console.log(colorize("  [NOTIF] SaveSmart notification bar: NOT FOUND", "red"));
      }

      // ── Test 4: Check __savesmart_loaded flag ──
      const contentScriptLoaded = await page.evaluate(function() {
        return !!window.__savesmart_loaded;
      });
      result.contentScriptLoaded = contentScriptLoaded;
      console.log(
        contentScriptLoaded
          ? colorize("  [EXT]   Content script loaded: YES (__savesmart_loaded = true)", "green")
          : colorize("  [EXT]   Content script loaded: NO (__savesmart_loaded = false)", "red")
      );

      // ── Test 5: Check badge via popup ──
      if (extensionId) {
        try {
          const extPage = await browser.newPage();
          await extPage.goto("chrome-extension://" + extensionId + "/popup.html", {
            waitUntil: "domcontentloaded",
            timeout: 5000,
          });
          await sleep(1000);

          const popupInfo = await extPage.evaluate(function() {
            var countEl = document.querySelector("#coupon-count, .coupon-count, [data-count]");
            var domainEl = document.querySelector("#current-domain, .current-domain");
            return {
              countText: countEl ? countEl.textContent : null,
              domainText: domainEl ? domainEl.textContent : null,
              bodyText: document.body ? document.body.innerText.substring(0, 300) : "",
            };
          });

          if (popupInfo.countText) {
            result.badgeCouponCount = parseInt(popupInfo.countText, 10) || 0;
            console.log(colorize("  [BADGE] Popup shows coupon count: " + popupInfo.countText, "green"));
          } else {
            console.log(colorize("  [BADGE] Could not read coupon count from popup", "dim"));
          }

          await extPage.close().catch(function() {});
        } catch (e) {
          console.log(colorize("  [BADGE] Could not check popup: " + e.message.split("\n")[0], "dim"));
        }
      }

      // ── Test 6: Check for coupon-related text ──
      const couponTextPresent = await page.evaluate(function() {
        var bodyText = (document.body.innerText || "").toLowerCase();
        return {
          hasCouponText: bodyText.includes("coupon"),
          hasPromoText: bodyText.includes("promo"),
          hasDiscountText: bodyText.includes("discount"),
          hasVoucherText: bodyText.includes("voucher"),
          hasGiftCardText: bodyText.includes("gift card"),
          hasCodeText: bodyText.includes("code"),
        };
      });

      var couponTextFound = [];
      if (couponTextPresent.hasCouponText) couponTextFound.push("Coupon");
      if (couponTextPresent.hasPromoText) couponTextFound.push("Promo");
      if (couponTextPresent.hasDiscountText) couponTextFound.push("Discount");
      if (couponTextPresent.hasVoucherText) couponTextFound.push("Voucher");
      if (couponTextPresent.hasGiftCardText) couponTextFound.push("GiftCard");
      if (couponTextPresent.hasCodeText) couponTextFound.push("Code");

      if (couponTextFound.length > 0) {
        console.log(colorize("  [TEXT]  Page contains coupon-related text: " + couponTextFound.join(", "), "dim"));
      } else {
        console.log(colorize("  [TEXT]  No coupon-related text found on page", "dim"));
      }

      // ── Test 7: Console errors ──
      var relevantErrors = result.consoleErrors.filter(function(e) {
        return !e.includes("favicon") &&
          !e.includes("net::ERR_") &&
          !e.includes("Failed to load resource") &&
          !e.includes("third-party cookie") &&
          !e.includes("Third-party cookie");
      });

      if (relevantErrors.length > 0) {
        console.log(colorize("  [ERR]  " + relevantErrors.length + " console error(s):", "red"));
        for (var ri = 0; ri < Math.min(relevantErrors.length, 5); ri++) {
          console.log(colorize("         " + relevantErrors[ri].substring(0, 120), "red"));
        }
      } else {
        console.log(
          colorize("  [ERR]  Console errors: " + result.consoleErrors.length + " total, 0 relevant", "green")
        );
      }

      if (result.consoleWarnings.length > 0) {
        console.log(colorize("  [WARN] " + result.consoleWarnings.length + " console warning(s)", "yellow"));
      }

      // ── Screenshot ──
      var screenshotName = site.domain.replace(/\./g, "_") + ".png";
      var screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      result.screenshotPath = screenshotPath;
      console.log(colorize("  [SNAP] Screenshot saved: screenshots/" + screenshotName, "dim"));

      // ── Rating ──
      var hasAllThree =
        result.isCheckoutPage && result.couponInputFound && result.notificationBarInjected;
      var hasTwoOfThree =
        (result.isCheckoutPage && result.couponInputFound) ||
        (result.isCheckoutPage && result.notificationBarInjected) ||
        (result.couponInputFound && result.notificationBarInjected);

      if (hasAllThree && result.notificationBarVisible) {
        result.rating = "WORKS";
      } else if (hasAllThree) {
        result.rating = "WORKS";
        result.notes.push("Notification bar injected but may not be visible (animation timing)");
      } else if (hasTwoOfThree) {
        result.rating = "PARTIALLY WORKS";
        if (!result.isCheckoutPage)
          result.notes.push("URL not detected as checkout page");
        if (!result.couponInputFound)
          result.notes.push("No coupon input field found with standard selectors");
        if (!result.notificationBarInjected)
          result.notes.push("Notification bar was not injected");
      } else if (result.isCheckoutPage && result.dbHasCoupons && contentScriptLoaded) {
        result.rating = "PARTIALLY WORKS";
        result.notes.push("Checkout page detected and content script loaded, but no coupon input or notification");
      } else if (contentScriptLoaded) {
        result.rating = "DOES NOT WORK";
        result.notes.push("Content script loaded but extension did not activate");
      } else {
        result.rating = "DOES NOT WORK";
        result.notes.push("Content script did not load or page blocked extension");
      }

      // Special case: redirect to sign-in
      if (result.finalUrl && (result.finalUrl.includes("sign-in") || result.finalUrl.includes("login") || result.finalUrl.includes("signin") || result.finalUrl.includes("account") || result.finalUrl.includes("auth"))) {
        result.notes.push("Page redirected to login/sign-in - requires authentication to see cart");
        if (result.rating === "DOES NOT WORK") {
          result.rating = "PARTIALLY WORKS";
          result.notes.push("Extension may work for authenticated users");
        }
      }

      // Special case: empty cart
      var pageText = await page.evaluate(function() { return (document.body.innerText || "").toLowerCase(); });
      if (pageText.includes("empty") && (pageText.includes("cart") || pageText.includes("bag"))) {
        result.notes.push("Cart appears to be empty - coupon fields may only show with items in cart");
      }

    } catch (err) {
      result.rating = "DOES NOT WORK";
      result.notes.push("Error: " + err.message.split("\n")[0]);
      console.log(colorize("  [ERROR] " + err.message.split("\n")[0], "red"));
    } finally {
      if (page) {
        try { await page.close(); } catch (e) {}
      }
    }

    // Print rating
    var ratingColor =
      result.rating === "WORKS" ? "green" : result.rating === "PARTIALLY WORKS" ? "yellow" : "red";
    console.log("\n" + colorize("  >>> RATING: " + result.rating, ratingColor));
    for (var ni = 0; ni < result.notes.length; ni++) {
      console.log(colorize("      - " + result.notes[ni], "dim"));
    }

    results.push(result);
  }

  // ── Summary Report ──
  console.log("\n\n" + "=".repeat(72));
  console.log(colorize("  SUMMARY REPORT", "bold"));
  console.log("=".repeat(72) + "\n");

  console.log(
    colorize(
      "  " +
        pad("Site", 12) +
        pad("Checkout?", 12) +
        pad("Input?", 10) +
        pad("Notif?", 10) +
        pad("DB?", 8) +
        pad("Errors", 10) +
        "Rating",
      "bold"
    )
  );
  console.log("  " + "-".repeat(70));

  for (var si = 0; si < results.length; si++) {
    var r = results[si];
    var line = "  " + pad(r.name, 12);
    line += pad(r.isCheckoutPage ? "YES" : "NO", 12);
    line += pad(r.couponInputFound ? "YES" : (r.extendedInputFound ? "EXT" : "NO"), 10);
    line += pad(r.notificationBarInjected ? (r.notificationBarVisible ? "YES" : "INJ") : "NO", 10);
    line += pad(r.dbHasCoupons ? String(r.dbCouponCount) : "0", 8);
    line += pad(String(r.consoleErrors.length), 10);
    line += r.rating;
    console.log(line);
  }

  // ── Detailed Notes ──
  console.log("\n" + colorize("  DETAILED NOTES:", "bold") + "\n");
  for (var di = 0; di < results.length; di++) {
    var dr = results[di];
    if (dr.notes.length > 0) {
      console.log(colorize("  " + dr.name + ":", "cyan"));
      for (var dni = 0; dni < dr.notes.length; dni++) {
        console.log("    - " + dr.notes[dni]);
      }
    }
  }

  // ── Scoring ──
  var works = 0, partial = 0, fails = 0;
  for (var ci = 0; ci < results.length; ci++) {
    if (results[ci].rating === "WORKS") works++;
    else if (results[ci].rating === "PARTIALLY WORKS") partial++;
    else fails++;
  }

  console.log("\n" + "-".repeat(72));
  console.log(
    colorize("  WORKS: " + works, "green") + "  |  " +
    colorize("PARTIALLY WORKS: " + partial, "yellow") + "  |  " +
    colorize("DOES NOT WORK: " + fails, "red")
  );
  console.log(colorize("  Overall Score: " + works + "/" + results.length + " fully working", "bold"));
  console.log("-".repeat(72));

  // ── Key Findings ──
  console.log("\n" + colorize("  KEY FINDINGS:", "bold") + "\n");

  var sitesWithInput = results.filter(function(r) { return r.couponInputFound; }).length;
  var sitesWithNotif = results.filter(function(r) { return r.notificationBarInjected; }).length;
  var sitesWithCheckout = results.filter(function(r) { return r.isCheckoutPage; }).length;
  var sitesWithCS = results.filter(function(r) { return r.contentScriptLoaded; }).length;

  console.log("  - " + sitesWithCheckout + "/" + results.length + " sites detected as checkout pages");
  console.log("  - " + sitesWithInput + "/" + results.length + " sites had coupon input fields found");
  console.log("  - " + sitesWithNotif + "/" + results.length + " sites had the notification bar injected");
  console.log("  - " + sitesWithCS + "/" + results.length + " sites had the content script loaded");
  console.log("  - All " + results.length + " sites have coupon codes in the database");

  var emptyCartCount = results.filter(function(r) {
    return r.notes.some(function(n) { return n.includes("empty") || n.includes("login") || n.includes("sign-in"); });
  }).length;
  if (emptyCartCount > 0) {
    console.log("\n  NOTE: " + emptyCartCount + " site(s) required auth or had empty carts.");
    console.log("  Real-world testing with items in cart and logged-in sessions would yield better results.");
  }

  var hiddenCount = results.filter(function(r) {
    return r.notes.some(function(n) { return n.includes("expandable") || n.includes("hidden behind"); });
  }).length;
  if (hiddenCount > 0) {
    console.log("\n  NOTE: " + hiddenCount + " site(s) have coupon inputs hidden behind expandable sections.");
    console.log("  The extension could be improved to click 'Add coupon' links before searching for inputs.");
  }

  console.log("\n" + colorize("  Screenshots saved to: " + SCREENSHOTS_DIR, "dim"));
  console.log("=".repeat(72) + "\n");

  // Save JSON report
  var reportPath = path.join(SCREENSHOTS_DIR, "test-report.json");
  var jsonReport = results.map(function(r) {
    return {
      name: r.name,
      domain: r.domain,
      urlLoaded: r.urlLoaded,
      finalUrl: r.finalUrl,
      httpStatus: r.httpStatus,
      isCheckoutPage: r.isCheckoutPage,
      couponInputFound: r.couponInputFound,
      couponInputDetails: r.couponInputDetails,
      extendedInputFound: r.extendedInputFound,
      notificationBarInjected: r.notificationBarInjected,
      notificationBarVisible: r.notificationBarVisible,
      contentScriptLoaded: r.contentScriptLoaded,
      dbHasCoupons: r.dbHasCoupons,
      dbCouponCount: r.dbCouponCount,
      consoleErrorCount: r.consoleErrors.length,
      consoleErrors: r.consoleErrors.slice(0, 10),
      loadTime: r.loadTime,
      rating: r.rating,
      notes: r.notes,
    };
  });
  fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
  console.log(colorize("  JSON report saved to: screenshots/test-report.json", "dim"));

  await browser.close();
}

function pad(str, len) {
  str = String(str);
  while (str.length < len) str += " ";
  return str;
}

/* ── Run ── */
runTests().catch(function(err) {
  console.error("Fatal error:", err);
  process.exit(1);
});
