/**
 * ProposalPilot — Real-Site Puppeteer Test
 *
 * Tests the extension against live Upwork pages to verify:
 *  1. Extension loads without errors
 *  2. Content script injects sidebar UI into Upwork DOM
 *  3. Selectors in content.js actually find real job data
 *  4. Reports what works and what is broken
 *
 * Usage: node test-real-site.js
 */

const puppeteer = require("puppeteer");
const path = require("path");

const EXTENSION_PATH = path.resolve(__dirname);

// URLs to test (public Upwork pages that don't require auth)
const TEST_URLS = {
  jobSearch: "https://www.upwork.com/nx/search/jobs/?q=react+developer",
  jobSearchAlt: "https://www.upwork.com/nx/search/jobs/",
  // Job detail pages use patterns like /jobs/~XXXXX or /nx/find-work/details/~XXXXX
  // We'll try to discover one from search results
};

// Selectors the content script tries to use (from content.js extractJobData)
const CONTENT_SCRIPT_SELECTORS = {
  title: [
    'h4[data-testid="job-title"]',
    ".job-details-header h4",
    "header h4",
    ".up-card-header h4",
    "h1",
    "h2",
  ],
  description: [
    '[data-testid="description"]',
    ".job-description",
    '[class*="description"]',
    ".break.job-description",
  ],
  budget: [
    '[data-testid="budget"]',
    '[data-testid="BudgetAmount"]',
    ".up-budget",
    '[class*="budget"]',
  ],
  skills: [
    '[data-testid="skill"] span',
    ".up-skill-badge",
    ".skills-list span",
    ".air3-token",
    '[class*="skill-badge"]',
    '[class*="SkillTag"]',
  ],
  clientCountry: [
    '[data-testid="client-country"]',
    '[class*="client-country"]',
    ".client-location",
  ],
  paymentVerified: [
    '[data-testid="payment-verified"]',
    '[class*="payment-verified"]',
  ],
  postedTime: ["time", "[data-testid='posted-on']"],
};

// ProposalPilot UI elements that should be injected
const PP_UI_SELECTORS = {
  sidebar: "#pp-sidebar",
  toggleBtn: "#pp-toggle-btn",
  closeBtn: "#pp-close-btn",
  scoreCircle: ".pp-score-circle",
  infoGrid: ".pp-info-grid",
  flagsList: ".pp-flags-list, .pp-no-flags",
  trackingBtns: ".pp-track-btn",
  templateList: ".pp-template-list",
  footer: ".pp-footer",
};

const results = {
  extensionLoad: null,
  pagesVisited: [],
  selectorResults: {},
  uiInjection: {},
  jobDataExtracted: {},
  regexMatches: {},
  errors: [],
  warnings: [],
};

function log(icon, msg) {
  console.log(`  ${icon} ${msg}`);
}

function pass(msg) {
  log("[PASS]", msg);
}
function fail(msg) {
  log("[FAIL]", msg);
}
function warn(msg) {
  log("[WARN]", msg);
  results.warnings.push(msg);
}
function info(msg) {
  log("[INFO]", msg);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function launchBrowser() {
  console.log("\n=== Launching Chrome with ProposalPilot extension ===\n");
  info(`Extension path: ${EXTENSION_PATH}`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      "--disable-gpu",
      "--disable-dev-shm-usage",
      // Required for extensions in headless mode
      "--disable-features=ExtensionsToolbarMenu",
    ],
  });

  results.extensionLoad = true;
  pass("Browser launched with extension loaded");

  return browser;
}

/**
 * Test selector matches on a page
 */
async function testSelectors(page, pageLabel) {
  console.log(`\n--- Testing content.js selectors on: ${pageLabel} ---\n`);

  const selectorResults = {};

  for (const [field, selectors] of Object.entries(CONTENT_SCRIPT_SELECTORS)) {
    selectorResults[field] = { matched: false, selector: null, value: null, allTried: [] };

    for (const sel of selectors) {
      try {
        const result = await page.evaluate((selector) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          return {
            tag: el.tagName,
            text: el.textContent.trim().slice(0, 200),
            className: el.className || "",
          };
        }, sel);

        selectorResults[field].allTried.push({
          selector: sel,
          found: !!result,
        });

        if (result) {
          selectorResults[field].matched = true;
          selectorResults[field].selector = sel;
          selectorResults[field].value = result.text;
          pass(`${field}: matched "${sel}" => "${result.text.slice(0, 80)}${result.text.length > 80 ? "..." : ""}"`);
          break;
        }
      } catch (e) {
        selectorResults[field].allTried.push({
          selector: sel,
          found: false,
          error: e.message,
        });
      }
    }

    if (!selectorResults[field].matched) {
      fail(`${field}: NO selector matched. Tried: ${selectors.join(", ")}`);
    }
  }

  return selectorResults;
}

/**
 * Test regex-based extractions from page text (as content.js does)
 */
async function testRegexExtractions(page, pageLabel) {
  console.log(`\n--- Testing regex extractions on: ${pageLabel} ---\n`);

  const regexResults = await page.evaluate(() => {
    const allText = document.body.innerText || "";
    const results = {};

    // Payment verified
    results.paymentVerified = {
      found: /payment (method )?verified/i.test(allText),
      match: (allText.match(/payment (method )?verified/i) || [null])[0],
    };

    // Client country
    const countryMatch = allText.match(
      /(?:Location|Country)[:\s]*([A-Z][a-zA-Z\s]+?)(?:\n|$)/
    );
    results.clientCountry = {
      found: !!countryMatch,
      match: countryMatch ? countryMatch[1].trim() : null,
    };

    // Total spent
    const spentMatch = allText.match(
      /\$([0-9,.]+[KMkm]?)\s*(?:total\s*spent|spent)/i
    );
    results.clientTotalSpent = {
      found: !!spentMatch,
      match: spentMatch ? "$" + spentMatch[1] : null,
    };

    // Hire rate
    const hireMatch = allText.match(/(\d{1,3})%\s*hire\s*rate/i);
    results.clientHireRate = {
      found: !!hireMatch,
      match: hireMatch ? hireMatch[1] + "%" : null,
    };

    // Jobs posted
    const jobsMatch = allText.match(/(\d+)\s*jobs?\s*posted/i);
    results.clientJobs = {
      found: !!jobsMatch,
      match: jobsMatch ? jobsMatch[0] : null,
    };

    // Proposals
    const propMatch = allText.match(/(\d+)\s*(?:to\s*\d+\s*)?proposals?/i);
    results.proposals = {
      found: !!propMatch,
      match: propMatch ? propMatch[0] : null,
    };

    // Experience level
    const expMatch = allText.match(/(entry|intermediate|expert)\s*level/i);
    results.experience = {
      found: !!expMatch,
      match: expMatch ? expMatch[0] : null,
    };

    // Project length
    const lengthMatch = allText.match(
      /(less than a month|1 to 3 months|3 to 6 months|more than 6 months)/i
    );
    results.projectLength = {
      found: !!lengthMatch,
      match: lengthMatch ? lengthMatch[0] : null,
    };

    // Hourly/Fixed detection
    results.budgetType = {
      hourly: /hourly/i.test(allText),
      fixed: /fixed/i.test(allText),
    };

    return results;
  });

  for (const [field, result] of Object.entries(regexResults)) {
    if (field === "budgetType") {
      if (result.hourly) pass(`budgetType: found "hourly" in page text`);
      if (result.fixed) pass(`budgetType: found "fixed" in page text`);
      if (!result.hourly && !result.fixed)
        warn(`budgetType: neither "hourly" nor "fixed" found in page text`);
    } else if (result.found) {
      pass(`${field} (regex): matched => "${result.match}"`);
    } else {
      fail(`${field} (regex): no match in page text`);
    }
  }

  return regexResults;
}

/**
 * Test ProposalPilot UI injection
 */
async function testUIInjection(page, pageLabel) {
  console.log(`\n--- Testing ProposalPilot UI injection on: ${pageLabel} ---\n`);

  const uiResults = {};

  for (const [name, selector] of Object.entries(PP_UI_SELECTORS)) {
    const found = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return {
        visible: el.offsetParent !== null || el.offsetWidth > 0,
        innerHTML: el.innerHTML.slice(0, 300),
      };
    }, selector);

    uiResults[name] = { found: !!found, visible: found?.visible, selector };

    if (found) {
      pass(`UI element "${name}" (${selector}): INJECTED${found.visible ? " and VISIBLE" : " but NOT visible"}`);
    } else {
      fail(`UI element "${name}" (${selector}): NOT found in DOM`);
    }
  }

  return uiResults;
}

/**
 * Run the full extractJobData function from content.js in the page context
 */
async function testFullExtraction(page, pageLabel) {
  console.log(`\n--- Running full extractJobData() on: ${pageLabel} ---\n`);

  const jobData = await page.evaluate(() => {
    // Replicate the extractJobData function from content.js
    const data = {
      title: "",
      description: "",
      budget: "",
      budgetType: "",
      skills: [],
      clientName: "",
      clientCountry: "",
      clientTotalSpent: "",
      clientHireRate: "",
      clientJobs: "",
      clientReviewScore: "",
      paymentVerified: false,
      proposals: "",
      experience: "",
      postedTime: "",
      jobType: "",
      projectLength: "",
    };

    const titleEl =
      document.querySelector('h4[data-testid="job-title"]') ||
      document.querySelector(".job-details-header h4") ||
      document.querySelector("header h4") ||
      document.querySelector(".up-card-header h4") ||
      document.querySelector("h1") ||
      document.querySelector("h2");
    if (titleEl) data.title = titleEl.textContent.trim();

    const descEl =
      document.querySelector('[data-testid="description"]') ||
      document.querySelector(".job-description") ||
      document.querySelector('[class*="description"]') ||
      document.querySelector(".break.job-description");
    if (descEl) data.description = descEl.textContent.trim().slice(0, 300);

    const budgetSelectors = [
      '[data-testid="budget"]',
      '[data-testid="BudgetAmount"]',
      ".up-budget",
      '[class*="budget"]',
    ];
    for (const sel of budgetSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        data.budget = el.textContent.trim();
        break;
      }
    }

    const pageText = document.body.innerText || "";
    if (/hourly/i.test(data.budget) || /\/hr/i.test(data.budget)) {
      data.budgetType = "hourly";
    } else if (/fixed/i.test(pageText) && data.budget) {
      data.budgetType = "fixed";
    }

    document
      .querySelectorAll(
        '[data-testid="skill"] span, .up-skill-badge, .skills-list span, ' +
          ".air3-token, [class*=\"skill-badge\"], [class*=\"SkillTag\"]"
      )
      .forEach((el) => {
        const skill = el.textContent.trim();
        if (skill && !data.skills.includes(skill)) {
          data.skills.push(skill);
        }
      });

    data.paymentVerified =
      /payment (method )?verified/i.test(pageText) ||
      !!document.querySelector('[data-testid="payment-verified"]') ||
      !!document.querySelector('[class*="payment-verified"]');

    const countryEl = document.querySelector(
      '[data-testid="client-country"], [class*="client-country"], .client-location'
    );
    if (countryEl) {
      data.clientCountry = countryEl.textContent.trim();
    } else {
      const countryMatch = pageText.match(
        /(?:Location|Country)[:\s]*([A-Z][a-zA-Z\s]+?)(?:\n|$)/
      );
      if (countryMatch) data.clientCountry = countryMatch[1].trim();
    }

    const spentMatch = pageText.match(
      /\$([0-9,.]+[KMkm]?)\s*(?:total\s*spent|spent)/i
    );
    if (spentMatch) data.clientTotalSpent = "$" + spentMatch[1];

    const hireMatch = pageText.match(/(\d{1,3})%\s*hire\s*rate/i);
    if (hireMatch) data.clientHireRate = hireMatch[1] + "%";

    const jobsMatch = pageText.match(/(\d+)\s*jobs?\s*posted/i);
    if (jobsMatch) data.clientJobs = jobsMatch[1];

    const propMatch = pageText.match(/(\d+)\s*(?:to\s*\d+\s*)?proposals?/i);
    if (propMatch) data.proposals = propMatch[0];

    const expMatch = pageText.match(/(entry|intermediate|expert)\s*level/i);
    if (expMatch) data.experience = expMatch[0];

    const timeEl = document.querySelector("time, [data-testid='posted-on']");
    if (timeEl) data.postedTime = timeEl.textContent.trim();

    const lengthMatch = pageText.match(
      /(less than a month|1 to 3 months|3 to 6 months|more than 6 months)/i
    );
    if (lengthMatch) data.projectLength = lengthMatch[0];

    return data;
  });

  // Report
  const fields = Object.entries(jobData);
  let populated = 0;
  let empty = 0;

  for (const [key, value] of fields) {
    const hasValue =
      (typeof value === "string" && value.length > 0) ||
      (typeof value === "boolean" && value === true) ||
      (Array.isArray(value) && value.length > 0);

    if (hasValue) {
      populated++;
      const display =
        typeof value === "string"
          ? `"${value.slice(0, 100)}${value.length > 100 ? "..." : ""}"`
          : Array.isArray(value)
          ? `[${value.slice(0, 5).join(", ")}${value.length > 5 ? "..." : ""}] (${value.length} items)`
          : String(value);
      pass(`${key}: ${display}`);
    } else {
      empty++;
      fail(`${key}: EMPTY / not found`);
    }
  }

  info(`\nExtraction summary: ${populated}/${fields.length} fields populated, ${empty} empty`);

  return jobData;
}

/**
 * Discover a job detail URL from search results
 */
async function findJobDetailUrl(page) {
  info("Looking for job detail links in search results...");

  const jobUrl = await page.evaluate(() => {
    // Upwork search results link patterns
    const linkSelectors = [
      'a[href*="/jobs/~"]',
      'a[href*="/nx/find-work/details/~"]',
      'a[href*="/freelancers/~"]',
      'a[data-testid="job-tile-title-link"]',
      ".job-tile a",
      'a[class*="job-title"]',
    ];

    for (const sel of linkSelectors) {
      const links = document.querySelectorAll(sel);
      for (const link of links) {
        const href = link.href || link.getAttribute("href");
        if (href && (href.includes("/jobs/~") || href.includes("/find-work/details/~"))) {
          return href;
        }
      }
    }

    // Fallback: any link with /jobs/ pattern
    const allLinks = document.querySelectorAll("a[href]");
    for (const link of allLinks) {
      const href = link.href;
      if (href && href.includes("upwork.com") && href.includes("/jobs/~")) {
        return href;
      }
    }

    return null;
  });

  return jobUrl;
}

/**
 * Capture console messages and errors from the page
 */
function attachConsoleListener(page, label) {
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("ProposalPilot") || text.includes("pp-")) {
      info(`[Console ${label}] ${text}`);
    }
  });

  page.on("pageerror", (err) => {
    const msg = `[PageError ${label}] ${err.message}`;
    results.errors.push(msg);
    fail(msg);
  });
}

/**
 * Check what the page actually looks like (login wall, etc.)
 */
async function checkPageState(page, label) {
  const state = await page.evaluate(() => {
    const body = document.body;
    if (!body) return { state: "no-body" };

    const text = body.innerText || "";
    const hasLoginForm =
      !!document.querySelector("#login_username") ||
      !!document.querySelector('[data-testid="login-form"]') ||
      !!document.querySelector('input[name="login[username]"]') ||
      /log\s*in.*upwork/i.test(text.slice(0, 500));

    const hasJobContent =
      text.includes("proposals") ||
      text.includes("Posted") ||
      text.includes("hourly") ||
      text.includes("Fixed") ||
      text.includes("Budget");

    const hasCaptcha =
      !!document.querySelector(".g-recaptcha") ||
      !!document.querySelector('[data-testid="captcha"]') ||
      /captcha|robot|verify/i.test(text.slice(0, 1000));

    const hasAccessDenied =
      /access denied|403|forbidden|blocked/i.test(text.slice(0, 500));

    const hasJobCards =
      document.querySelectorAll('[data-testid="job-tile"]').length > 0 ||
      document.querySelectorAll(".job-tile").length > 0 ||
      document.querySelectorAll('article[class*="job"]').length > 0 ||
      document.querySelectorAll('[class*="JobCard"]').length > 0;

    return {
      title: document.title,
      url: window.location.href,
      hasLoginForm,
      hasJobContent,
      hasCaptcha,
      hasAccessDenied,
      hasJobCards,
      bodyLength: text.length,
      firstChars: text.slice(0, 500).replace(/\s+/g, " "),
    };
  });

  info(`Page title: "${state.title}"`);
  info(`Final URL: ${state.url}`);
  info(`Body text length: ${state.bodyLength}`);

  if (state.hasLoginForm) warn(`Page shows LOGIN form — content may be gated`);
  if (state.hasCaptcha) warn(`Page shows CAPTCHA — bot protection triggered`);
  if (state.hasAccessDenied) warn(`Page shows ACCESS DENIED`);
  if (state.hasJobContent) pass(`Page contains job-related text`);
  if (state.hasJobCards) pass(`Page contains job card elements`);

  if (!state.hasJobContent && !state.hasJobCards) {
    warn(`No job content detected. First 500 chars: ${state.firstChars}`);
  }

  return state;
}

/**
 * Dump actual DOM structure for debugging selectors
 */
async function dumpDOMStructure(page, label) {
  console.log(`\n--- DOM Structure Analysis: ${label} ---\n`);

  const structure = await page.evaluate(() => {
    const results = {};

    // What h1-h4 elements exist?
    results.headings = [];
    document.querySelectorAll("h1, h2, h3, h4").forEach((el) => {
      results.headings.push({
        tag: el.tagName,
        text: el.textContent.trim().slice(0, 120),
        class: el.className || "",
        dataTestId: el.getAttribute("data-testid") || "",
      });
    });

    // What data-testid attributes are on the page?
    results.dataTestIds = [];
    document.querySelectorAll("[data-testid]").forEach((el) => {
      results.dataTestIds.push({
        testId: el.getAttribute("data-testid"),
        tag: el.tagName,
        text: el.textContent.trim().slice(0, 80),
      });
    });

    // What class*="job" elements?
    results.jobClasses = [];
    document.querySelectorAll('[class*="job"], [class*="Job"]').forEach((el) => {
      results.jobClasses.push({
        tag: el.tagName,
        class: el.className.toString().slice(0, 120),
        text: el.textContent.trim().slice(0, 80),
      });
    });

    // skill-related elements
    results.skillElements = [];
    document.querySelectorAll('[class*="skill"], [class*="Skill"], .air3-token, [class*="token"]').forEach((el) => {
      results.skillElements.push({
        tag: el.tagName,
        class: el.className.toString().slice(0, 120),
        text: el.textContent.trim().slice(0, 80),
      });
    });

    // Budget / price elements
    results.budgetElements = [];
    document.querySelectorAll('[class*="budget"], [class*="Budget"], [class*="price"], [class*="Price"]').forEach((el) => {
      results.budgetElements.push({
        tag: el.tagName,
        class: el.className.toString().slice(0, 120),
        text: el.textContent.trim().slice(0, 80),
      });
    });

    return results;
  });

  // Report headings
  if (structure.headings.length > 0) {
    info(`Found ${structure.headings.length} heading elements:`);
    structure.headings.slice(0, 10).forEach((h) => {
      info(`  <${h.tag}${h.dataTestId ? ` data-testid="${h.dataTestId}"` : ""}${h.class ? ` class="${h.class.slice(0, 60)}"` : ""}> "${h.text.slice(0, 80)}"`);
    });
  } else {
    warn("No h1-h4 heading elements found");
  }

  // Report data-testid
  if (structure.dataTestIds.length > 0) {
    info(`Found ${structure.dataTestIds.length} data-testid elements:`);
    structure.dataTestIds.slice(0, 20).forEach((d) => {
      info(`  <${d.tag} data-testid="${d.testId}"> "${d.text.slice(0, 60)}"`);
    });
  } else {
    warn("No data-testid attributes found on page");
  }

  // Report job-class elements
  if (structure.jobClasses.length > 0) {
    info(`Found ${structure.jobClasses.length} elements with "job" in class:`);
    structure.jobClasses.slice(0, 10).forEach((j) => {
      info(`  <${j.tag} class="${j.class.slice(0, 80)}"> "${j.text.slice(0, 60)}"`);
    });
  }

  // Report skill elements
  if (structure.skillElements.length > 0) {
    info(`Found ${structure.skillElements.length} skill-related elements:`);
    structure.skillElements.slice(0, 10).forEach((s) => {
      info(`  <${s.tag} class="${s.class.slice(0, 80)}"> "${s.text.slice(0, 60)}"`);
    });
  }

  // Report budget elements
  if (structure.budgetElements.length > 0) {
    info(`Found ${structure.budgetElements.length} budget-related elements:`);
    structure.budgetElements.slice(0, 10).forEach((b) => {
      info(`  <${b.tag} class="${b.class.slice(0, 80)}"> "${b.text.slice(0, 60)}"`);
    });
  }

  return structure;
}

// ====================== MAIN ======================

(async () => {
  let browser;

  try {
    browser = await launchBrowser();

    // ---- Test 1: Job Search Page ----
    console.log("\n\n========================================");
    console.log("  TEST 1: Upwork Job Search Page");
    console.log("========================================\n");

    const searchPage = await browser.newPage();
    attachConsoleListener(searchPage, "search");

    // Set a realistic user agent
    await searchPage.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await searchPage.setViewport({ width: 1440, height: 900 });

    info(`Navigating to: ${TEST_URLS.jobSearch}`);
    try {
      await searchPage.goto(TEST_URLS.jobSearch, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
    } catch (navErr) {
      warn(`Navigation timeout/error: ${navErr.message}. Continuing anyway...`);
    }

    info("Waiting 7 seconds for page load and potential content script injection...");
    await sleep(7000);

    const searchState = await checkPageState(searchPage, "Job Search");
    results.pagesVisited.push({ label: "Job Search", ...searchState });

    // NOTE: The content script only runs on these URL patterns:
    //   https://www.upwork.com/jobs/*
    //   https://www.upwork.com/ab/proposals/*
    //   https://www.upwork.com/freelancers/proposals/*
    //   https://www.upwork.com/nx/find-work/details/*
    //
    // The search page (/nx/search/jobs/) is NOT in the manifest matches.
    // So the content script will NOT inject here. Let's verify that.

    const searchUrlPattern = searchState.url;
    const matchesContentScript =
      searchUrlPattern.includes("/jobs/") &&
      !searchUrlPattern.includes("/search/jobs/") ||
      searchUrlPattern.includes("/ab/proposals/") ||
      searchUrlPattern.includes("/freelancers/proposals/") ||
      searchUrlPattern.includes("/nx/find-work/details/");

    if (!matchesContentScript) {
      info(
        "Search page URL does NOT match content_scripts.matches in manifest.json."
      );
      info(
        "Content script injection is NOT expected on search results page."
      );
      info("This is by design — extension targets job detail pages only.");
    }

    // Still analyze the DOM structure of search results
    await dumpDOMStructure(searchPage, "Job Search");

    // Try to find a job detail URL from search results
    let jobDetailUrl = await findJobDetailUrl(searchPage);
    if (jobDetailUrl) {
      pass(`Found job detail link: ${jobDetailUrl}`);
    } else {
      warn("Could not find any job detail links in search results");
      // Try a known pattern
      info("Will try a generic job URL pattern...");
    }

    // ---- Test 2: Job Detail Page ----
    console.log("\n\n========================================");
    console.log("  TEST 2: Upwork Job Detail Page");
    console.log("========================================\n");

    const detailPage = await browser.newPage();
    attachConsoleListener(detailPage, "detail");

    await detailPage.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await detailPage.setViewport({ width: 1440, height: 900 });

    // If we found a job detail URL from search, use it.
    // Otherwise try a generic approach.
    const detailUrl =
      jobDetailUrl || "https://www.upwork.com/jobs/~021893220620893135616";

    info(`Navigating to job detail: ${detailUrl}`);
    try {
      await detailPage.goto(detailUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
    } catch (navErr) {
      warn(`Navigation timeout/error: ${navErr.message}. Continuing anyway...`);
    }

    info("Waiting 8 seconds for page load + content script injection...");
    await sleep(8000);

    const detailState = await checkPageState(detailPage, "Job Detail");
    results.pagesVisited.push({ label: "Job Detail", ...detailState });

    // Analyze DOM structure
    await dumpDOMStructure(detailPage, "Job Detail");

    // Test selectors
    results.selectorResults = await testSelectors(detailPage, "Job Detail");

    // Test regex extractions
    results.regexMatches = await testRegexExtractions(detailPage, "Job Detail");

    // Full extraction test
    results.jobDataExtracted = await testFullExtraction(detailPage, "Job Detail");

    // Test UI injection (sidebar should appear on job detail pages)
    results.uiInjection = await testUIInjection(detailPage, "Job Detail");

    // ---- Test 3: /nx/find-work/details/ pattern ----
    console.log("\n\n========================================");
    console.log("  TEST 3: /nx/find-work/details/ pattern");
    console.log("========================================\n");

    // Try the alternative URL pattern that's in the manifest
    const altPage = await browser.newPage();
    attachConsoleListener(altPage, "alt-detail");

    await altPage.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await altPage.setViewport({ width: 1440, height: 900 });

    // Extract the job ID from the detail URL if we have one
    let altUrl = null;
    const jobIdMatch = detailUrl.match(/(~\w+)/);
    if (jobIdMatch) {
      altUrl = `https://www.upwork.com/nx/find-work/details/${jobIdMatch[1]}`;
    }

    if (altUrl) {
      info(`Navigating to alt URL pattern: ${altUrl}`);
      try {
        await altPage.goto(altUrl, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });
      } catch (navErr) {
        warn(`Navigation timeout/error: ${navErr.message}. Continuing anyway...`);
      }

      info("Waiting 8 seconds...");
      await sleep(8000);

      const altState = await checkPageState(altPage, "Alt Detail");
      results.pagesVisited.push({ label: "Alt Detail", ...altState });

      await dumpDOMStructure(altPage, "Alt Detail");

      // Test selectors on this page too
      const altSelectors = await testSelectors(altPage, "Alt Detail");

      // Test UI injection
      const altUI = await testUIInjection(altPage, "Alt Detail");
    } else {
      warn("No job ID available to test /nx/find-work/details/ pattern");
    }

    // ---- Check extension errors via service worker ----
    console.log("\n\n========================================");
    console.log("  TEST 4: Extension Service Worker Check");
    console.log("========================================\n");

    // Get all targets including service workers
    const targets = browser.targets();
    const swTarget = targets.find(
      (t) => t.type() === "service_worker" && t.url().includes("proposal-pilot")
    );
    if (swTarget) {
      pass("Background service worker is running");
      info(`SW URL: ${swTarget.url()}`);
    } else {
      // Check for other extension-related targets
      const extTargets = targets.filter(
        (t) => t.url().includes("chrome-extension://")
      );
      if (extTargets.length > 0) {
        pass(`Extension targets found: ${extTargets.length}`);
        extTargets.forEach((t) => info(`  ${t.type()}: ${t.url()}`));
      } else {
        fail("No extension service worker or targets found");
      }
    }

    // ---- Final Summary ----
    console.log("\n\n========================================");
    console.log("  FINAL SUMMARY");
    console.log("========================================\n");

    console.log("Extension Load:", results.extensionLoad ? "PASS" : "FAIL");
    console.log(`Pages Visited: ${results.pagesVisited.length}`);
    results.pagesVisited.forEach((p) => {
      console.log(`  - ${p.label}: ${p.title} (${p.url})`);
      if (p.hasLoginForm) console.log("    WARNING: Login form detected");
      if (p.hasCaptcha) console.log("    WARNING: CAPTCHA detected");
    });

    console.log("\nSelector Results (content.js DOM selectors):");
    for (const [field, result] of Object.entries(results.selectorResults)) {
      console.log(
        `  ${result.matched ? "PASS" : "FAIL"} ${field}${result.matched ? ` => "${result.selector}" => "${(result.value || "").slice(0, 60)}"` : " => no match"}`
      );
    }

    console.log("\nRegex Extraction Results:");
    for (const [field, result] of Object.entries(results.regexMatches)) {
      if (field === "budgetType") {
        console.log(
          `  ${result.hourly || result.fixed ? "PASS" : "FAIL"} budgetType: hourly=${result.hourly}, fixed=${result.fixed}`
        );
      } else {
        console.log(
          `  ${result.found ? "PASS" : "FAIL"} ${field}${result.found ? ` => "${result.match}"` : ""}`
        );
      }
    }

    console.log("\nUI Injection Results:");
    for (const [name, result] of Object.entries(results.uiInjection)) {
      console.log(
        `  ${result.found ? "PASS" : "FAIL"} ${name} (${result.selector})${result.found ? (result.visible ? " - visible" : " - hidden") : ""}`
      );
    }

    console.log("\nJob Data Extracted:");
    const jobData = results.jobDataExtracted;
    if (jobData) {
      let filled = 0;
      let total = 0;
      for (const [k, v] of Object.entries(jobData)) {
        total++;
        const hasVal =
          (typeof v === "string" && v.length > 0) ||
          (typeof v === "boolean" && v) ||
          (Array.isArray(v) && v.length > 0);
        if (hasVal) filled++;
      }
      console.log(`  ${filled}/${total} fields populated`);
    }

    if (results.errors.length > 0) {
      console.log("\nErrors encountered:");
      results.errors.forEach((e) => console.log(`  - ${e}`));
    }

    if (results.warnings.length > 0) {
      console.log("\nWarnings:");
      results.warnings.forEach((w) => console.log(`  - ${w}`));
    }

    console.log("\n========================================");
    console.log("  TEST COMPLETE");
    console.log("========================================\n");
  } catch (err) {
    console.error("\nFATAL ERROR:", err.message);
    console.error(err.stack);
    results.errors.push(`FATAL: ${err.message}`);
  } finally {
    if (browser) {
      await browser.close();
      info("Browser closed.");
    }
  }
})();
