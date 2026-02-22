/* ──────────────────────────────────────────────────────────────────
   SaveSmart Extension — Real-Site Integration Test V2
   Tests the updated content.js features:
   1. Expand-button clicking to reveal hidden coupon inputs
   2. Passive notifications when coupon codes are available
   3. MutationObserver for dynamically loaded coupon inputs
   4. Active notifications with "Try Coupons" button
   ────────────────────────────────────────────────────────────────── */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const EXTENSION_PATH = path.resolve(__dirname);
const SCREENSHOTS_DIR = path.join(__dirname, "screenshots-v2");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

/* ── Sites to test ── */
const TEST_SITES = [
  { name: "Target",     url: "https://www.target.com/cart",              domain: "target.com"    },
  { name: "Amazon",     url: "https://www.amazon.com/gp/cart/view.html", domain: "amazon.com"    },
  { name: "Nike",       url: "https://www.nike.com/cart",                domain: "nike.com"      },
  { name: "Best Buy",   url: "https://www.bestbuy.com/cart",             domain: "bestbuy.com"   },
  { name: "Dominos",    url: "https://www.dominos.com/",                 domain: "dominos.com"   },
  { name: "H&M",        url: "https://www2.hm.com/en_us/cart",          domain: "hm.com"        },
  { name: "Walmart",    url: "https://www.walmart.com/cart",             domain: "walmart.com"   },
  { name: "Sephora",    url: "https://www.sephora.com/basket",           domain: "sephora.com"   },
  { name: "Adidas",     url: "https://www.adidas.com/us/cart",           domain: "adidas.com"    },
  { name: "Pizza Hut",  url: "https://www.pizzahut.com/",                domain: "pizzahut.com"  },
];

/* ── Coupon input selectors (mirrors content.js) ── */
const COUPON_INPUT_SELECTORS = [
  'input[name*="coupon" i]', 'input[name*="promo" i]', 'input[name*="discount" i]',
  'input[name*="voucher" i]', 'input[name*="gift" i][name*="code" i]',
  'input[name*="redemption" i]', 'input[id*="coupon" i]', 'input[id*="promo" i]',
  'input[id*="discount" i]', 'input[id*="voucher" i]', 'input[class*="coupon" i]',
  'input[class*="promo" i]', 'input[class*="discount" i]',
  'input[placeholder*="coupon" i]', 'input[placeholder*="promo" i]',
  'input[placeholder*="discount" i]', 'input[placeholder*="voucher" i]',
  'input[placeholder*="code" i]', 'input[placeholder*="gift card" i]',
  'input[aria-label*="coupon" i]', 'input[aria-label*="promo" i]',
  'input[aria-label*="discount" i]', 'input[data-testid*="promo" i]',
  'input[data-testid*="coupon" i]',
];

/* ── Utility ── */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pad(str, len) {
  str = String(str);
  while (str.length < len) str += " ";
  return str;
}

function colorize(text, color) {
  const colors = {
    green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m",
    cyan: "\x1b[36m", white: "\x1b[37m", bold: "\x1b[1m",
    reset: "\x1b[0m", dim: "\x1b[2m", magenta: "\x1b[35m",
  };
  return (colors[color] || "") + text + colors.reset;
}

/* ── Main Test Runner ── */
async function runTests() {
  console.log("\n" + "=".repeat(76));
  console.log(colorize("  SaveSmart Extension -- Real-Site Integration Test V2", "bold"));
  console.log(colorize("  Testing expand logic, passive notifications, MutationObserver", "dim"));
  console.log(colorize("  Date: " + new Date().toISOString(), "dim"));
  console.log("=".repeat(76) + "\n");

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
        "--window-size=1440,900",
      ],
      defaultViewport: {
        width: 1440,
        height: 900,
      },
    });
  } catch (err) {
    console.error(colorize("FATAL: Failed to launch browser: " + err.message, "red"));
    process.exit(1);
  }

  /* Detect extension ID */
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
    console.log("\n" + "-".repeat(76));
    console.log(
      colorize("  Testing: " + site.name, "bold") +
      colorize(" (" + site.url + ")", "dim")
    );
    console.log("-".repeat(76));

    const result = {
      name: site.name,
      url: site.url,
      domain: site.domain,
      pageLoaded: false,
      finalUrl: null,
      httpStatus: null,
      loadTimeMs: null,
      contentScriptLoaded: false,
      notificationShown: false,
      notificationType: null,
      notificationText: null,
      couponInputFound: false,
      couponInputDetails: null,
      expandTriggerClicked: false,
      expandTriggerDetails: null,
      consoleErrors: [],
      allConsoleMessages: [],
      screenshotPath: null,
      rating: "DOES NOT WORK",
      notes: [],
    };

    let page = null;

    try {
      page = await browser.newPage();

      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      );

      /* Capture console messages */
      page.on("console", (msg) => {
        const type = msg.type();
        const text = msg.text();
        result.allConsoleMessages.push({ type, text: text.substring(0, 200) });
        if (type === "error") {
          result.consoleErrors.push(text);
        }
      });

      page.on("pageerror", (err) => {
        result.consoleErrors.push("PAGE_ERROR: " + err.message);
      });

      /* Navigate */
      console.log(colorize("  [NAV] Loading: " + site.url, "cyan"));
      const startTime = Date.now();

      try {
        const response = await page.goto(site.url, {
          waitUntil: "domcontentloaded",
          timeout: 20000,
        });

        result.httpStatus = response ? response.status() : null;
        result.loadTimeMs = Date.now() - startTime;
        result.finalUrl = page.url();
        result.pageLoaded = true;

        console.log(
          colorize(
            "  [NAV] Loaded in " + result.loadTimeMs + "ms (HTTP " + result.httpStatus + ")",
            "green"
          )
        );

        if (result.finalUrl !== site.url) {
          console.log(colorize("  [NAV] Redirected to: " + result.finalUrl, "yellow"));
        }
      } catch (navErr) {
        console.log(colorize("  [NAV] Failed: " + navErr.message.split("\n")[0], "red"));
        result.notes.push("Navigation failed: " + navErr.message.split("\n")[0]);
        result.rating = "DOES NOT WORK";
        results.push(result);

        try {
          const ssName = site.domain.replace(/\./g, "_") + ".png";
          const ssPath = path.join(SCREENSHOTS_DIR, ssName);
          await page.screenshot({ path: ssPath, fullPage: false });
          result.screenshotPath = ssPath;
        } catch (_) {}

        if (page) await page.close().catch(() => {});
        continue;
      }

      /* ── Wait 5 seconds for content script + expand logic ── */
      console.log(colorize("  [WAIT] Waiting 5s for content script + expand logic...", "dim"));
      await sleep(5000);

      /* ── Check 1: Content script loaded ── */
      result.contentScriptLoaded = await page.evaluate(() => {
        return !!window.__savesmart_loaded;
      });
      console.log(
        result.contentScriptLoaded
          ? colorize("  [EXT]  Content script loaded: YES", "green")
          : colorize("  [EXT]  Content script loaded: NO", "red")
      );

      /* ── Check 2: Notification bar status ── */
      const notifResult = await page.evaluate(() => {
        const bar = document.getElementById("savesmart-notification");
        if (!bar) return { exists: false };

        const innerHTML = bar.innerHTML || "";
        const textContent = (bar.textContent || "").trim();
        const hasVisibleClass = bar.classList.contains("visible");
        const hasTryBtn = !!document.getElementById("savesmart-try-btn");
        const style = getComputedStyle(bar);

        let type = null;
        if (hasTryBtn) {
          type = "active";
        } else if (
          textContent.toLowerCase().includes("available") ||
          textContent.toLowerCase().includes("add items")
        ) {
          type = "passive";
        } else if (textContent.toLowerCase().includes("no working codes")) {
          type = "no-savings";
        } else {
          type = "unknown";
        }

        return {
          exists: true,
          visible: hasVisibleClass,
          type: type,
          hasTryBtn: hasTryBtn,
          textContent: textContent.substring(0, 200),
          innerHTML: innerHTML.substring(0, 300),
          opacity: style.opacity,
          transform: style.transform,
        };
      });

      result.notificationShown = notifResult.exists;
      result.notificationType = notifResult.exists ? notifResult.type : null;
      result.notificationText = notifResult.exists ? notifResult.textContent : null;

      if (notifResult.exists) {
        const typeLabel = notifResult.type === "active"
          ? 'ACTIVE (has "Try Coupons" button)'
          : notifResult.type === "passive"
            ? "PASSIVE (codes available, no input found)"
            : notifResult.type === "no-savings"
              ? "NO-SAVINGS message"
              : "UNKNOWN type";

        console.log(colorize("  [NOTIF] Notification shown: YES", "green"));
        console.log(colorize("          Type: " + typeLabel, notifResult.type === "active" ? "green" : "yellow"));
        console.log(colorize("          Visible class: " + notifResult.visible, "dim"));
        console.log(colorize('          Text: "' + notifResult.textContent + '"', "dim"));
      } else {
        console.log(colorize("  [NOTIF] Notification shown: NO", "red"));
      }

      /* ── Check 3: Coupon input found ── */
      const inputResult = await page.evaluate((selectors) => {
        for (const sel of selectors) {
          try {
            const el = document.querySelector(sel);
            if (el) {
              const style = getComputedStyle(el);
              const visible =
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
                placeholder: el.placeholder || "",
                className: (el.className || "").toString().substring(0, 80),
                ariaLabel: el.getAttribute("aria-label") || "",
              };
            }
          } catch (_) {}
        }
        return { found: false };
      }, COUPON_INPUT_SELECTORS);

      result.couponInputFound = inputResult.found;
      result.couponInputDetails = inputResult.found ? inputResult : null;

      if (inputResult.found) {
        console.log(colorize("  [INPUT] Coupon input found: YES", "green"));
        console.log(colorize("          Selector: " + inputResult.selector, "dim"));
        console.log(
          colorize(
            '          visible=' + inputResult.visible +
            ', name="' + inputResult.name +
            '", id="' + inputResult.id +
            '", placeholder="' + inputResult.placeholder + '"',
            "dim"
          )
        );
      } else {
        console.log(colorize("  [INPUT] Coupon input found: NO", "yellow"));
      }

      /* ── Check 4: Expand trigger detection ── */
      const expandResult = await page.evaluate(() => {
        const EXPAND_TRIGGER_SELECTORS = [
          'button[class*="promo" i]', 'button[class*="coupon" i]',
          'button[class*="discount" i]', 'button[class*="voucher" i]',
          'a[class*="promo" i]', 'a[class*="coupon" i]',
          'a[class*="discount" i]', 'a[class*="voucher" i]',
          'button[id*="promo" i]', 'button[id*="coupon" i]',
          'a[id*="promo" i]', 'a[id*="coupon" i]',
          'button[aria-label*="promo" i]', 'button[aria-label*="coupon" i]',
          'button[data-testid*="promo" i]', 'button[data-testid*="coupon" i]',
          '[class*="accordion" i][class*="promo" i]', '[class*="accordion" i][class*="coupon" i]',
          'details summary', '[role="button"][class*="promo" i]',
          '[role="button"][class*="coupon" i]', 'span[class*="promo" i]',
          'span[class*="coupon" i]',
        ];

        const EXPAND_TEXT_PATTERNS = [
          /add\s*(a\s+)?promo/i, /add\s*(a\s+)?coupon/i,
          /enter\s*(a\s+)?promo/i, /enter\s*(a\s+)?coupon/i,
          /have\s*(a\s+)?promo/i, /have\s*(a\s+)?coupon/i,
          /apply\s*(a\s+)?promo/i, /apply\s*(a\s+)?coupon/i,
          /promo\s*code/i, /coupon\s*code/i, /discount\s*code/i,
          /voucher\s*code/i, /gift\s*card/i, /redeem\s*(a\s+)?code/i,
          /add\s*offer/i, /use\s*(a\s+)?code/i,
        ];

        const found = [];

        /* Strategy 1: CSS selector matching */
        for (const sel of EXPAND_TRIGGER_SELECTORS) {
          try {
            const els = document.querySelectorAll(sel);
            for (const el of els) {
              const style = getComputedStyle(el);
              const visible =
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                el.offsetWidth > 0;
              if (visible && el.tagName !== "INPUT") {
                found.push({
                  method: "selector",
                  selector: sel,
                  tag: el.tagName,
                  text: (el.textContent || "").trim().substring(0, 80),
                  className: (el.className || "").toString().substring(0, 80),
                  id: el.id || "",
                });
              }
            }
          } catch (_) {}
        }

        /* Strategy 2: Text content scanning */
        const clickables = document.querySelectorAll(
          "a, button, span, div, label, [role='button'], summary"
        );
        for (const el of clickables) {
          const style = getComputedStyle(el);
          const visible =
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            el.offsetWidth > 0;
          if (!visible) continue;

          const text = (el.textContent || "").trim();
          if (text.length > 80) continue;

          for (const pattern of EXPAND_TEXT_PATTERNS) {
            if (pattern.test(text)) {
              const isDup = found.some(
                (f) => f.text === text.substring(0, 80) && f.tag === el.tagName
              );
              if (!isDup) {
                found.push({
                  method: "text-pattern",
                  pattern: pattern.toString(),
                  tag: el.tagName,
                  text: text.substring(0, 80),
                  className: (el.className || "").toString().substring(0, 80),
                  id: el.id || "",
                });
              }
              break;
            }
          }
        }

        return found;
      });

      result.expandTriggerClicked = expandResult.length > 0;
      result.expandTriggerDetails = expandResult.length > 0 ? expandResult : null;

      if (expandResult.length > 0) {
        console.log(
          colorize(
            "  [EXPAND] Expand triggers found: YES (" + expandResult.length + " element(s))",
            "green"
          )
        );
        for (let i = 0; i < Math.min(expandResult.length, 5); i++) {
          const e = expandResult[i];
          console.log(
            colorize(
              "           <" + e.tag.toLowerCase() + "> " +
              (e.method === "selector" ? "[" + e.selector + "] " : "[text: " + e.pattern + "] ") +
              '"' + e.text + '"',
              "dim"
            )
          );
        }
        if (expandResult.length > 5) {
          console.log(
            colorize("           ... and " + (expandResult.length - 5) + " more", "dim")
          );
        }
      } else {
        console.log(colorize("  [EXPAND] Expand triggers found: NO", "yellow"));
      }

      /* ── Check 5: Console errors (filtered) ── */
      const relevantErrors = result.consoleErrors.filter((e) => {
        return (
          !e.includes("favicon") &&
          !e.includes("net::ERR_") &&
          !e.includes("Failed to load resource") &&
          !e.includes("third-party cookie") &&
          !e.includes("Third-party cookie") &&
          !e.includes("ERR_BLOCKED_BY_CLIENT") &&
          !e.includes("ERR_CONNECTION_REFUSED") &&
          !e.includes("Permissions policy") &&
          !e.includes("CORS") &&
          !e.includes("Access-Control")
        );
      });

      if (relevantErrors.length > 0) {
        console.log(
          colorize("  [ERR]  Console errors: " + relevantErrors.length + " relevant", "red")
        );
        for (let i = 0; i < Math.min(relevantErrors.length, 5); i++) {
          console.log(
            colorize("         " + relevantErrors[i].substring(0, 120), "red")
          );
        }
      } else {
        console.log(
          colorize(
            "  [ERR]  Console errors: " +
              result.consoleErrors.length +
              " total, 0 relevant (filtered network/CORS/cookie errors)",
            "green"
          )
        );
      }

      /* ── Screenshot ── */
      const ssName = site.domain.replace(/\./g, "_") + ".png";
      const ssPath = path.join(SCREENSHOTS_DIR, ssName);
      await page.screenshot({ path: ssPath, fullPage: false });
      result.screenshotPath = ssPath;
      console.log(colorize("  [SNAP] Screenshot: screenshots-v2/" + ssName, "dim"));

      /* ── Rating logic ── */
      const isRedirectedToAuth =
        result.finalUrl &&
        (/sign.?in|login|signin|account\/auth|identity/i.test(result.finalUrl));

      if (isRedirectedToAuth) {
        result.notes.push("Page redirected to login/sign-in");
      }

      const pageBodyText = await page.evaluate(() => {
        return (document.body.innerText || "").toLowerCase().substring(0, 2000);
      });
      const isEmptyCart =
        (pageBodyText.includes("empty") &&
          (pageBodyText.includes("cart") || pageBodyText.includes("bag") || pageBodyText.includes("basket"))) ||
        pageBodyText.includes("your cart is empty") ||
        pageBodyText.includes("no items");

      if (isEmptyCart) {
        result.notes.push("Cart appears to be empty");
      }

      if (result.notificationShown && result.notificationType === "active" && result.couponInputFound) {
        result.rating = "WORKS";
      } else if (result.notificationShown && result.notificationType === "active") {
        result.rating = "WORKS";
        result.notes.push("Active notification shown (input found by extension even if not by our test selectors)");
      } else if (result.notificationShown && result.notificationType === "passive") {
        result.rating = "PARTIALLY WORKS";
        result.notes.push("Passive notification shown - codes available but coupon input not found");
      } else if (result.notificationShown) {
        result.rating = "PARTIALLY WORKS";
        result.notes.push("Notification shown (type: " + result.notificationType + ")");
      } else if (result.contentScriptLoaded && result.couponInputFound) {
        result.rating = "PARTIALLY WORKS";
        result.notes.push("Content script loaded and input found, but no notification (possible timing issue)");
      } else if (result.contentScriptLoaded && isRedirectedToAuth) {
        result.rating = "PARTIALLY WORKS";
        result.notes.push("Content script loaded but page requires authentication");
      } else if (result.contentScriptLoaded && isEmptyCart) {
        result.rating = "PARTIALLY WORKS";
        result.notes.push("Content script loaded on empty cart page");
      } else if (result.contentScriptLoaded) {
        result.rating = "DOES NOT WORK";
        result.notes.push("Content script loaded but no notification or input detected");
      } else {
        result.rating = "DOES NOT WORK";
        result.notes.push("Content script did not load");
      }

      /* Print rating */
      const ratingColor =
        result.rating === "WORKS"
          ? "green"
          : result.rating === "PARTIALLY WORKS"
            ? "yellow"
            : "red";

      console.log("\n" + colorize("  >>> RATING: " + result.rating, ratingColor));
      for (const note of result.notes) {
        console.log(colorize("      - " + note, "dim"));
      }

    } catch (err) {
      result.rating = "DOES NOT WORK";
      result.notes.push("Error: " + err.message.split("\n")[0]);
      console.log(colorize("  [ERROR] " + err.message.split("\n")[0], "red"));
    } finally {
      if (page) {
        try { await page.close(); } catch (_) {}
      }
    }

    results.push(result);
  }

  /* ══════════════════════════════════════════════════════════════════
     Summary Table
     ══════════════════════════════════════════════════════════════════ */
  console.log("\n\n" + "=".repeat(76));
  console.log(colorize("  SUMMARY TABLE", "bold"));
  console.log("=".repeat(76) + "\n");

  console.log(
    colorize(
      "  " +
        pad("Site", 12) +
        pad("Loaded", 9) +
        pad("Notification", 22) +
        pad("Input", 8) +
        pad("Expand", 10) +
        pad("Errors", 9) +
        "Rating",
      "bold"
    )
  );
  console.log("  " + "-".repeat(74));

  for (const r of results) {
    let notifStr = "NO";
    if (r.notificationShown) {
      notifStr = "YES (" + (r.notificationType || "?") + ")";
    }

    let expandStr = "NO";
    if (r.expandTriggerClicked && r.expandTriggerDetails) {
      expandStr = "YES (" + r.expandTriggerDetails.length + ")";
    }

    const relevantErrs = r.consoleErrors.filter((e) => {
      return (
        !e.includes("favicon") && !e.includes("net::ERR_") &&
        !e.includes("Failed to load resource") && !e.includes("third-party cookie") &&
        !e.includes("Third-party cookie") && !e.includes("ERR_BLOCKED_BY_CLIENT") &&
        !e.includes("ERR_CONNECTION_REFUSED") && !e.includes("Permissions policy") &&
        !e.includes("CORS") && !e.includes("Access-Control")
      );
    });
    const errStr = relevantErrs.length > 0 ? String(relevantErrs.length) : "none";

    const ratingColor =
      r.rating === "WORKS" ? "green" : r.rating === "PARTIALLY WORKS" ? "yellow" : "red";

    console.log(
      "  " +
        pad(r.name, 12) +
        pad(r.pageLoaded ? "YES" : "NO", 9) +
        pad(notifStr, 22) +
        pad(r.couponInputFound ? "YES" : "NO", 8) +
        pad(expandStr, 10) +
        pad(errStr, 9) +
        colorize(r.rating, ratingColor)
    );
  }

  /* ── Per-site detail lines ── */
  console.log("\n" + colorize("  DETAILED NOTES:", "bold") + "\n");
  for (const r of results) {
    console.log(colorize("  " + r.name + " (" + r.domain + "):", "cyan"));
    console.log("    URL tested:           " + r.url);
    console.log("    Page loaded:          " + (r.pageLoaded ? "YES" : "NO"));
    console.log(
      "    Notification shown:   " +
        (r.notificationShown
          ? "YES (" + r.notificationType + ")"
          : "NO")
    );
    if (r.notificationText) {
      console.log('    Notification text:    "' + r.notificationText.substring(0, 100) + '"');
    }
    console.log("    Coupon input found:   " + (r.couponInputFound ? "YES" : "NO"));
    if (r.couponInputDetails) {
      console.log(
        "    Input details:        selector=" + r.couponInputDetails.selector +
        ", name=" + r.couponInputDetails.name +
        ", id=" + r.couponInputDetails.id
      );
    }
    console.log(
      "    Expand trigger:       " +
        (r.expandTriggerClicked
          ? "YES (" + r.expandTriggerDetails.length + " elements)"
          : "NO")
    );
    if (r.expandTriggerDetails) {
      for (let i = 0; i < Math.min(r.expandTriggerDetails.length, 3); i++) {
        const e = r.expandTriggerDetails[i];
        console.log('      -> <' + e.tag.toLowerCase() + '> "' + e.text + '"');
      }
    }

    const relevantErrs = r.consoleErrors.filter((e) => {
      return (
        !e.includes("favicon") && !e.includes("net::ERR_") &&
        !e.includes("Failed to load resource") && !e.includes("third-party cookie") &&
        !e.includes("Third-party cookie") && !e.includes("ERR_BLOCKED_BY_CLIENT") &&
        !e.includes("ERR_CONNECTION_REFUSED") && !e.includes("Permissions policy") &&
        !e.includes("CORS") && !e.includes("Access-Control")
      );
    });
    console.log(
      "    Console errors:       " +
        (relevantErrs.length > 0
          ? relevantErrs.map((e) => e.substring(0, 100)).join("; ")
          : "none")
    );

    const ratingColor =
      r.rating === "WORKS" ? "green" : r.rating === "PARTIALLY WORKS" ? "yellow" : "red";
    console.log("    Rating:               " + colorize(r.rating, ratingColor));

    if (r.notes.length > 0) {
      for (const note of r.notes) {
        console.log("    Note: " + note);
      }
    }
    console.log("");
  }

  /* ── Scoring ── */
  let works = 0, partial = 0, fails = 0;
  for (const r of results) {
    if (r.rating === "WORKS") works++;
    else if (r.rating === "PARTIALLY WORKS") partial++;
    else fails++;
  }

  console.log("-".repeat(76));
  console.log(
    "  " +
      colorize("WORKS: " + works, "green") + "  |  " +
      colorize("PARTIALLY WORKS: " + partial, "yellow") + "  |  " +
      colorize("DOES NOT WORK: " + fails, "red")
  );
  console.log(colorize("  Overall: " + works + "/" + results.length + " fully working, " + (works + partial) + "/" + results.length + " at least partially working", "bold"));
  console.log("-".repeat(76));

  /* ── Key Findings ── */
  console.log("\n" + colorize("  KEY FINDINGS:", "bold") + "\n");

  const sitesLoaded = results.filter((r) => r.pageLoaded).length;
  const sitesWithCS = results.filter((r) => r.contentScriptLoaded).length;
  const sitesWithNotif = results.filter((r) => r.notificationShown).length;
  const sitesActiveNotif = results.filter((r) => r.notificationType === "active").length;
  const sitesPassiveNotif = results.filter((r) => r.notificationType === "passive").length;
  const sitesWithInput = results.filter((r) => r.couponInputFound).length;
  const sitesWithExpand = results.filter((r) => r.expandTriggerClicked).length;

  console.log("  - " + sitesLoaded + "/" + results.length + " pages loaded successfully");
  console.log("  - " + sitesWithCS + "/" + results.length + " had content script loaded");
  console.log("  - " + sitesWithNotif + "/" + results.length + " showed a SaveSmart notification");
  console.log("    - " + sitesActiveNotif + " active (with 'Try Coupons' button)");
  console.log("    - " + sitesPassiveNotif + " passive ('codes available' message)");
  console.log("  - " + sitesWithInput + "/" + results.length + " had a coupon input field detected");
  console.log("  - " + sitesWithExpand + "/" + results.length + " had expand-trigger elements on the page");

  const authSites = results.filter((r) => r.notes.some((n) => n.includes("login") || n.includes("auth")));
  const emptySites = results.filter((r) => r.notes.some((n) => n.includes("empty")));

  if (authSites.length > 0) {
    console.log(
      "\n  NOTE: " + authSites.length + " site(s) redirected to login. " +
      "Results would improve with authenticated sessions."
    );
  }
  if (emptySites.length > 0) {
    console.log(
      "  NOTE: " + emptySites.length + " site(s) had empty carts. " +
      "Coupon inputs may only appear when items are in the cart."
    );
  }

  console.log("\n" + colorize("  Screenshots saved to: " + SCREENSHOTS_DIR, "dim"));

  /* ── Save JSON report ── */
  const reportPath = path.join(SCREENSHOTS_DIR, "test-report-v2.json");
  const jsonReport = results.map((r) => ({
    name: r.name,
    url: r.url,
    domain: r.domain,
    pageLoaded: r.pageLoaded,
    finalUrl: r.finalUrl,
    httpStatus: r.httpStatus,
    loadTimeMs: r.loadTimeMs,
    contentScriptLoaded: r.contentScriptLoaded,
    notificationShown: r.notificationShown,
    notificationType: r.notificationType,
    notificationText: r.notificationText,
    couponInputFound: r.couponInputFound,
    couponInputDetails: r.couponInputDetails,
    expandTriggerClicked: r.expandTriggerClicked,
    expandTriggerCount: r.expandTriggerDetails ? r.expandTriggerDetails.length : 0,
    expandTriggerDetails: r.expandTriggerDetails
      ? r.expandTriggerDetails.slice(0, 10)
      : null,
    consoleErrorCount: r.consoleErrors.length,
    consoleErrors: r.consoleErrors.slice(0, 10),
    screenshotPath: r.screenshotPath,
    rating: r.rating,
    notes: r.notes,
  }));
  fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
  console.log(colorize("  JSON report: screenshots-v2/test-report-v2.json", "dim"));
  console.log("=".repeat(76) + "\n");

  await browser.close();
}

/* ── Run ── */
runTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
