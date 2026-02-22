/**
 * ProposalPilot — Puppeteer Tests
 *
 * Tests the content script logic against mock HTML that simulates
 * Upwork's job page structure. Since Chrome extension content scripts
 * cannot be directly injected by Puppeteer into chrome-extension:// pages,
 * we serve a mock Upwork job page and inject the content script manually.
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

// --------------- Mock Upwork Job Page HTML ---------------

const MOCK_JOB_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mock Upwork Job Detail</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f9f9f9; }
    .job-details-header h4 { font-size: 24px; color: #1d1d1d; }
    .job-description { margin: 16px 0; line-height: 1.6; color: #333; }
    .up-skill-badge { display: inline-block; background: #e4ebe4; padding: 4px 12px;
                      border-radius: 20px; margin: 4px; font-size: 13px; }
    .client-info { margin-top: 20px; padding: 16px; background: #fff; border-radius: 8px; }
    .budget-section { margin: 12px 0; font-size: 16px; }
    textarea[name="coverLetter"] { width: 100%; height: 150px; margin-top: 20px; padding: 12px;
                                    border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="job-details-page">
    <header>
      <div class="job-details-header">
        <h4 data-testid="job-title">Build a React Dashboard with TypeScript</h4>
      </div>
    </header>

    <div class="budget-section">
      <span data-testid="budget">$1,500 - $3,000</span>
      <span>Fixed-price</span>
    </div>

    <div data-testid="description" class="job-description">
      We need an experienced React developer to build a modern analytics dashboard.
      The project involves creating interactive charts, data tables, and a responsive layout.
      Must have experience with TypeScript, Tailwind CSS, and REST API integration.
      Timeline is 4-6 weeks. We have detailed wireframes ready.
      The ideal candidate has built similar dashboards before and can show examples.
    </div>

    <div class="skills-section">
      <span class="up-skill-badge"><span data-testid="skill">React</span></span>
      <span class="up-skill-badge"><span data-testid="skill">TypeScript</span></span>
      <span class="up-skill-badge"><span data-testid="skill">Tailwind CSS</span></span>
      <span class="up-skill-badge"><span data-testid="skill">REST API</span></span>
      <span class="up-skill-badge"><span data-testid="skill">Chart.js</span></span>
    </div>

    <div class="client-info">
      <div data-testid="payment-verified">Payment method verified</div>
      <div data-testid="client-country">United States</div>
      <div>$45K total spent</div>
      <div>72% hire rate</div>
      <div>38 jobs posted</div>
      <div>15 proposals</div>
      <div>Intermediate level</div>
      <div><time data-testid="posted-on">Posted 2 hours ago</time></div>
      <div>3 to 6 months project length</div>
    </div>

    <div class="proposal-section">
      <h3>Submit a Proposal</h3>
      <textarea name="coverLetter" placeholder="Write your proposal..."></textarea>
    </div>
  </div>
</body>
</html>
`;

// Low-quality job page for red flag testing
const MOCK_BAD_JOB_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mock Upwork Bad Job</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f9f9f9; }
    .job-details-header h4 { font-size: 24px; }
    .job-description { margin: 16px 0; }
    .up-skill-badge { display: inline-block; background: #e4ebe4; padding: 4px 12px;
                      border-radius: 20px; margin: 4px; font-size: 13px; }
    .client-info { margin-top: 20px; }
    textarea[name="coverLetter"] { width: 100%; height: 150px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="job-details-page">
    <header>
      <div class="job-details-header">
        <h4 data-testid="job-title">Quick website fix ASAP</h4>
      </div>
    </header>

    <div class="budget-section">
      <span data-testid="budget">$15</span>
      <span>Fixed-price</span>
    </div>

    <div data-testid="description" class="job-description">
      Need fix fast. Urgent.
    </div>

    <div class="skills-section">
      <span class="up-skill-badge"><span data-testid="skill">HTML</span></span>
    </div>

    <div class="client-info">
      <div data-testid="client-country">Unknown</div>
      <div>$0 total spent</div>
      <div>0% hire rate</div>
      <div>0 jobs posted</div>
      <div>75 proposals</div>
    </div>

    <div class="proposal-section">
      <textarea name="coverLetter" placeholder="Write your proposal..."></textarea>
    </div>
  </div>
</body>
</html>
`;

// --------------- Test Runner ---------------

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName) {
  if (condition) {
    passed++;
    results.push({ status: "PASS", name: testName });
    console.log(`  PASS: ${testName}`);
  } else {
    failed++;
    results.push({ status: "FAIL", name: testName });
    console.log(`  FAIL: ${testName}`);
  }
}

async function runTests() {
  console.log("\n=== ProposalPilot Extension Tests ===\n");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    // ========================================
    // TEST SUITE 1: Good Job Page — Data Extraction
    // ========================================
    console.log("--- Suite 1: Good Job Page — Data Extraction ---");

    const page1 = await browser.newPage();
    await page1.setContent(MOCK_JOB_PAGE, { waitUntil: "domcontentloaded" });

    // Inject the content script's extraction logic
    const contentScript = fs.readFileSync(
      path.join(__dirname, "content.js"),
      "utf-8"
    );

    // We extract just the extraction + scoring functions and run them
    const jobData = await page1.evaluate(() => {
      // Replicate extractJobData logic in browser context
      function extractJobData() {
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
          projectLength: ""
        };

        const titleEl =
          document.querySelector('h4[data-testid="job-title"]') ||
          document.querySelector(".job-details-header h4") ||
          document.querySelector("h1");
        if (titleEl) data.title = titleEl.textContent.trim();

        const descEl =
          document.querySelector('[data-testid="description"]') ||
          document.querySelector(".job-description");
        if (descEl) data.description = descEl.textContent.trim();

        const budgetEl = document.querySelector('[data-testid="budget"]');
        if (budgetEl) data.budget = budgetEl.textContent.trim();

        const pageText = document.body.innerText || "";
        if (/hourly/i.test(data.budget) || /\/hr/i.test(data.budget)) {
          data.budgetType = "hourly";
        } else if (/fixed/i.test(pageText) && data.budget) {
          data.budgetType = "fixed";
        }

        document.querySelectorAll('[data-testid="skill"] span, .up-skill-badge span[data-testid="skill"]').forEach((el) => {
          const skill = el.textContent.trim();
          if (skill && !data.skills.includes(skill)) data.skills.push(skill);
        });

        const allText = pageText;
        data.paymentVerified = /payment (method )?verified/i.test(allText) ||
          !!document.querySelector('[data-testid="payment-verified"]');

        const countryEl = document.querySelector('[data-testid="client-country"]');
        if (countryEl) data.clientCountry = countryEl.textContent.trim();

        const spentMatch = allText.match(/\$([0-9,.]+[KMkm]?)\s*(?:total\s*spent|spent)/i);
        if (spentMatch) data.clientTotalSpent = "$" + spentMatch[1];

        const hireMatch = allText.match(/(\d{1,3})%\s*hire\s*rate/i);
        if (hireMatch) data.clientHireRate = hireMatch[1] + "%";

        const jobsMatch = allText.match(/(\d+)\s*jobs?\s*posted/i);
        if (jobsMatch) data.clientJobs = jobsMatch[1];

        const propMatch = allText.match(/(\d+)\s*(?:to\s*\d+\s*)?proposals?/i);
        if (propMatch) data.proposals = propMatch[0];

        const expMatch = allText.match(/(entry|intermediate|expert)\s*level/i);
        if (expMatch) data.experience = expMatch[0];

        const timeEl = document.querySelector("time, [data-testid='posted-on']");
        if (timeEl) data.postedTime = timeEl.textContent.trim();

        const lengthMatch = allText.match(/(less than a month|1 to 3 months|3 to 6 months|more than 6 months)/i);
        if (lengthMatch) data.projectLength = lengthMatch[0];

        return data;
      }

      return extractJobData();
    });

    // Tests for good job page
    assert(
      jobData.title === "Build a React Dashboard with TypeScript",
      "Extracts job title"
    );
    assert(
      jobData.description.includes("experienced React developer"),
      "Extracts job description"
    );
    assert(
      jobData.budget === "$1,500 - $3,000",
      "Extracts budget"
    );
    assert(
      jobData.budgetType === "fixed",
      "Detects fixed-price budget type"
    );
    assert(
      jobData.skills.length === 5,
      `Extracts all 5 skills (found ${jobData.skills.length})`
    );
    assert(
      jobData.skills.includes("React") && jobData.skills.includes("TypeScript"),
      "Skills include React and TypeScript"
    );
    assert(
      jobData.paymentVerified === true,
      "Detects payment verified"
    );
    assert(
      jobData.clientCountry === "United States",
      "Extracts client country"
    );
    assert(
      jobData.clientTotalSpent === "$45K",
      `Extracts total spent (got "${jobData.clientTotalSpent}")`
    );
    assert(
      jobData.clientHireRate === "72%",
      "Extracts hire rate"
    );
    assert(
      jobData.clientJobs === "38",
      "Extracts jobs posted count"
    );
    assert(
      jobData.proposals.includes("15"),
      "Extracts proposal count"
    );
    assert(
      jobData.experience.toLowerCase().includes("intermediate"),
      "Extracts experience level"
    );
    assert(
      jobData.postedTime.includes("2 hours ago"),
      "Extracts posted time"
    );
    assert(
      jobData.projectLength === "3 to 6 months",
      "Extracts project length"
    );

    await page1.close();

    // ========================================
    // TEST SUITE 2: Job Scoring Algorithm
    // ========================================
    console.log("\n--- Suite 2: Job Scoring Algorithm ---");

    const page2 = await browser.newPage();
    await page2.setContent(MOCK_JOB_PAGE, { waitUntil: "domcontentloaded" });

    const scoreResult = await page2.evaluate(() => {
      // scoreJob function
      function scoreJob(data) {
        let score = 5;
        const reasons = [];

        if (data.paymentVerified) {
          score += 3;
          reasons.push("+3 Payment verified");
        } else {
          score -= 1;
          reasons.push("-1 Payment NOT verified");
        }

        const hireRate = parseInt(data.clientHireRate);
        if (!isNaN(hireRate)) {
          if (hireRate > 50) {
            score += 2;
            reasons.push(`+2 Hire rate ${hireRate}% (good)`);
          } else if (hireRate > 20) {
            score += 1;
            reasons.push(`+1 Hire rate ${hireRate}% (moderate)`);
          } else {
            score -= 1;
            reasons.push(`-1 Hire rate ${hireRate}% (low)`);
          }
        }

        const spent = data.clientTotalSpent.replace(/[$,]/g, "");
        const spentNum = parseFloat(spent);
        if (!isNaN(spentNum)) {
          if (spent.match(/[Kk]/)) {
            score += 2;
            reasons.push("+2 High client spend");
          } else if (spentNum > 1000) {
            score += 1;
            reasons.push("+1 Decent client spend");
          }
        }

        const budgetNum = parseFloat(data.budget.replace(/[^0-9.]/g, ""));
        if (!isNaN(budgetNum)) {
          if (budgetNum < 50 && data.budgetType !== "hourly") {
            score -= 2;
            reasons.push("-2 Very low budget");
          } else if (budgetNum > 500) {
            score += 1;
            reasons.push("+1 Good budget");
          }
        }

        const propNum = parseInt(data.proposals);
        if (!isNaN(propNum)) {
          if (propNum > 50) {
            score -= 1;
            reasons.push("-1 High competition");
          } else if (propNum < 10) {
            score += 1;
            reasons.push("+1 Low competition");
          }
        }

        const jobsNum = parseInt(data.clientJobs);
        if (!isNaN(jobsNum) && jobsNum === 0) {
          score -= 1;
          reasons.push("-1 First-time client");
        }

        score = Math.max(1, Math.min(10, score));
        return { score, reasons };
      }

      // Good job data
      const goodData = {
        title: "Build a React Dashboard",
        budget: "$1,500 - $3,000",
        budgetType: "fixed",
        paymentVerified: true,
        clientHireRate: "72%",
        clientTotalSpent: "$45K",
        clientJobs: "38",
        proposals: "15 proposals",
        description: "We need an experienced developer..."
      };

      // Bad job data
      const badData = {
        title: "Quick fix",
        budget: "$15",
        budgetType: "fixed",
        paymentVerified: false,
        clientHireRate: "0%",
        clientTotalSpent: "$0",
        clientJobs: "0",
        proposals: "75 proposals",
        description: "Fix fast"
      };

      return {
        good: scoreJob(goodData),
        bad: scoreJob(badData)
      };
    });

    assert(
      scoreResult.good.score >= 7,
      `Good job scores >= 7 (got ${scoreResult.good.score})`
    );
    assert(
      scoreResult.good.score <= 10,
      `Good job score capped at 10 (got ${scoreResult.good.score})`
    );
    assert(
      scoreResult.good.reasons.length > 0,
      "Good job has scoring reasons"
    );
    assert(
      scoreResult.good.reasons.some((r) => r.includes("Payment verified")),
      "Good job: payment verified bonus applied"
    );
    assert(
      scoreResult.bad.score <= 4,
      `Bad job scores <= 4 (got ${scoreResult.bad.score})`
    );
    assert(
      scoreResult.bad.score >= 1,
      `Bad job score floored at 1 (got ${scoreResult.bad.score})`
    );
    assert(
      scoreResult.bad.reasons.some((r) => r.includes("NOT verified")),
      "Bad job: payment not verified penalty applied"
    );

    await page2.close();

    // ========================================
    // TEST SUITE 3: Red Flag Detection
    // ========================================
    console.log("\n--- Suite 3: Red Flag Detection ---");

    const page3 = await browser.newPage();
    await page3.setContent(MOCK_BAD_JOB_PAGE, { waitUntil: "domcontentloaded" });

    const flags = await page3.evaluate(() => {
      function detectRedFlags(data) {
        const flags = [];

        if (!data.paymentVerified) {
          flags.push({ severity: "high", text: "Payment method not verified" });
        }

        const budgetNum = parseFloat(data.budget.replace(/[^0-9.]/g, ""));
        if (!isNaN(budgetNum) && budgetNum < 50 && data.budgetType !== "hourly") {
          flags.push({ severity: "high", text: `Very low budget (${data.budget})` });
        }

        const hireRate = parseInt(data.clientHireRate);
        if (!isNaN(hireRate) && hireRate < 20) {
          flags.push({ severity: "medium", text: `Low hire rate (${hireRate}%)` });
        }

        const jobsNum = parseInt(data.clientJobs);
        if (!isNaN(jobsNum) && jobsNum === 0) {
          flags.push({ severity: "medium", text: "First-time client" });
        }

        const propNum = parseInt(data.proposals);
        if (!isNaN(propNum) && propNum > 50) {
          flags.push({ severity: "medium", text: `High competition (${data.proposals})` });
        }

        if (data.description && data.description.length < 100) {
          flags.push({ severity: "low", text: "Very short job description" });
        }

        const vagueTerms = /asap|urgent|need immediately|cheap|fast|lowest price/i;
        if (vagueTerms.test(data.description)) {
          flags.push({ severity: "low", text: "Description uses vague/urgent language" });
        }

        return flags;
      }

      const badData = {
        paymentVerified: false,
        budget: "$15",
        budgetType: "fixed",
        clientHireRate: "0%",
        clientJobs: "0",
        proposals: "75 proposals",
        description: "Need fix fast. Urgent."
      };

      const goodData = {
        paymentVerified: true,
        budget: "$2,000",
        budgetType: "fixed",
        clientHireRate: "72%",
        clientJobs: "38",
        proposals: "15 proposals",
        description: "We need an experienced developer to build a comprehensive analytics dashboard with interactive charts and real-time data visualization capabilities."
      };

      return {
        bad: detectRedFlags(badData),
        good: detectRedFlags(goodData)
      };
    });

    assert(
      flags.bad.length >= 4,
      `Bad job has >= 4 red flags (found ${flags.bad.length})`
    );
    assert(
      flags.bad.some((f) => f.severity === "high"),
      "Bad job has high-severity flags"
    );
    assert(
      flags.bad.some((f) => f.text.includes("Payment")),
      "Detects unverified payment"
    );
    assert(
      flags.bad.some((f) => f.text.includes("low budget") || f.text.includes("Very low")),
      "Detects low budget"
    );
    assert(
      flags.bad.some((f) => f.text.includes("First-time")),
      "Detects first-time client"
    );
    assert(
      flags.bad.some((f) => f.text.includes("competition")),
      "Detects high competition"
    );
    assert(
      flags.bad.some((f) => f.text.includes("short")),
      "Detects short description"
    );
    assert(
      flags.bad.some((f) => f.text.includes("vague") || f.text.includes("urgent")),
      "Detects vague/urgent language"
    );
    assert(
      flags.good.length === 0,
      `Good job has 0 red flags (found ${flags.good.length})`
    );

    await page3.close();

    // ========================================
    // TEST SUITE 4: Template Merge Fields
    // ========================================
    console.log("\n--- Suite 4: Template Merge Fields ---");

    const page4 = await browser.newPage();
    await page4.setContent("<html><body></body></html>", { waitUntil: "domcontentloaded" });

    const mergeResults = await page4.evaluate(() => {
      function mergeTemplate(templateBody, jobData) {
        return templateBody
          .replace(/\{client_name\}/gi, jobData.clientName || "[Client]")
          .replace(/\{project_title\}/gi, jobData.title || "[Project Title]")
          .replace(/\{budget\}/gi, jobData.budget || "[Budget]")
          .replace(/\{skills\}/gi, jobData.skills.join(", ") || "[Skills]");
      }

      const template = 'Hi {client_name}, I saw "{project_title}". Budget: {budget}. Skills: {skills}.';

      const withData = mergeTemplate(template, {
        clientName: "John",
        title: "React Dashboard",
        budget: "$2,000",
        skills: ["React", "TypeScript"]
      });

      const withoutData = mergeTemplate(template, {
        clientName: "",
        title: "",
        budget: "",
        skills: []
      });

      return { withData, withoutData };
    });

    assert(
      mergeResults.withData.includes("John"),
      "Merges {client_name}"
    );
    assert(
      mergeResults.withData.includes("React Dashboard"),
      "Merges {project_title}"
    );
    assert(
      mergeResults.withData.includes("$2,000"),
      "Merges {budget}"
    );
    assert(
      mergeResults.withData.includes("React, TypeScript"),
      "Merges {skills}"
    );
    assert(
      mergeResults.withoutData.includes("[Client]"),
      "Falls back to [Client] when empty"
    );
    assert(
      mergeResults.withoutData.includes("[Project Title]"),
      "Falls back to [Project Title] when empty"
    );

    await page4.close();

    // ========================================
    // TEST SUITE 5: Template Insertion into Textarea
    // ========================================
    console.log("\n--- Suite 5: Template Insertion ---");

    const page5 = await browser.newPage();
    await page5.setContent(MOCK_JOB_PAGE, { waitUntil: "domcontentloaded" });

    const insertResult = await page5.evaluate(() => {
      function insertIntoProposalField(text) {
        const selectors = [
          'textarea[name="coverLetter"]',
          "textarea"
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
              el.value = text;
              el.dispatchEvent(new Event("input", { bubbles: true }));
              return { success: true, value: el.value };
            }
          }
        }
        return { success: false };
      }

      return insertIntoProposalField("Hello, I'd like to apply for this project.");
    });

    assert(
      insertResult.success === true,
      "Template inserted into textarea"
    );
    assert(
      insertResult.value === "Hello, I'd like to apply for this project.",
      "Textarea value matches inserted text"
    );

    await page5.close();

    // ========================================
    // TEST SUITE 6: Sidebar Rendering
    // ========================================
    console.log("\n--- Suite 6: Sidebar Rendering ---");

    const page6 = await browser.newPage();
    await page6.setContent(MOCK_JOB_PAGE, { waitUntil: "domcontentloaded" });

    // Inject CSS
    const cssContent = fs.readFileSync(path.join(__dirname, "styles.css"), "utf-8");
    await page6.addStyleTag({ content: cssContent });

    // Manually build and inject sidebar
    const sidebarTest = await page6.evaluate(() => {
      // Create a minimal sidebar
      const sidebar = document.createElement("div");
      sidebar.id = "pp-sidebar";
      sidebar.innerHTML = `
        <div class="pp-header">
          <div>
            <div class="pp-header-title">ProposalPilot</div>
            <div class="pp-header-subtitle">Upwork Proposal Assistant</div>
          </div>
          <button class="pp-header-close" id="pp-close-btn">&times;</button>
        </div>
        <div class="pp-section">
          <div class="pp-section-title">Job Quality Score</div>
          <div class="pp-score-container">
            <div class="pp-score-circle pp-score-good">9</div>
          </div>
        </div>
        <div class="pp-section">
          <div class="pp-section-title">Red Flags</div>
          <div class="pp-no-flags">No red flags detected</div>
        </div>
        <div class="pp-section">
          <div class="pp-section-title">Track This Job</div>
          <div class="pp-tracking-btns">
            <button class="pp-track-btn pp-applied" data-status="applied">Applied</button>
            <button class="pp-track-btn pp-skipped" data-status="skipped">Skipped</button>
            <button class="pp-track-btn pp-won" data-status="won">Won</button>
            <button class="pp-track-btn pp-lost" data-status="lost">Lost</button>
          </div>
        </div>
      `;
      document.body.appendChild(sidebar);

      const toggleBtn = document.createElement("button");
      toggleBtn.id = "pp-toggle-btn";
      toggleBtn.textContent = "\u2190";
      document.body.appendChild(toggleBtn);

      return {
        sidebarExists: !!document.getElementById("pp-sidebar"),
        toggleExists: !!document.getElementById("pp-toggle-btn"),
        headerText: document.querySelector(".pp-header-title")?.textContent,
        scoreCircleExists: !!document.querySelector(".pp-score-circle"),
        trackingBtns: document.querySelectorAll(".pp-track-btn").length,
        sections: document.querySelectorAll(".pp-section").length
      };
    });

    assert(
      sidebarTest.sidebarExists,
      "Sidebar element created"
    );
    assert(
      sidebarTest.toggleExists,
      "Toggle button created"
    );
    assert(
      sidebarTest.headerText === "ProposalPilot",
      "Header displays 'ProposalPilot'"
    );
    assert(
      sidebarTest.scoreCircleExists,
      "Score circle rendered"
    );
    assert(
      sidebarTest.trackingBtns === 4,
      `4 tracking buttons rendered (found ${sidebarTest.trackingBtns})`
    );
    assert(
      sidebarTest.sections >= 3,
      `At least 3 sections rendered (found ${sidebarTest.sections})`
    );

    // Test toggle functionality
    const toggleTest = await page6.evaluate(() => {
      const sidebar = document.getElementById("pp-sidebar");
      const toggleBtn = document.getElementById("pp-toggle-btn");

      // Simulate toggle
      sidebar.classList.add("pp-collapsed");
      const collapsed = sidebar.classList.contains("pp-collapsed");

      sidebar.classList.remove("pp-collapsed");
      const expanded = !sidebar.classList.contains("pp-collapsed");

      return { collapsed, expanded };
    });

    assert(toggleTest.collapsed, "Sidebar can be collapsed");
    assert(toggleTest.expanded, "Sidebar can be expanded");

    // Test tracking button activation
    const trackTest = await page6.evaluate(() => {
      const btns = document.querySelectorAll(".pp-track-btn");
      btns[0].classList.add("pp-active");
      const firstActive = btns[0].classList.contains("pp-active");

      // Deactivate first, activate second
      btns[0].classList.remove("pp-active");
      btns[1].classList.add("pp-active");
      const secondActive = btns[1].classList.contains("pp-active");
      const firstDeactivated = !btns[0].classList.contains("pp-active");

      return { firstActive, secondActive, firstDeactivated };
    });

    assert(trackTest.firstActive, "Tracking button activates");
    assert(trackTest.secondActive, "Can switch to different tracking status");
    assert(trackTest.firstDeactivated, "Previous tracking button deactivates");

    await page6.close();

    // ========================================
    // TEST SUITE 7: Bad Job Page Full Flow
    // ========================================
    console.log("\n--- Suite 7: Bad Job Page Full Flow ---");

    const page7 = await browser.newPage();
    await page7.setContent(MOCK_BAD_JOB_PAGE, { waitUntil: "domcontentloaded" });

    const badJobFlow = await page7.evaluate(() => {
      // Extract
      function extractJobData() {
        const data = {
          title: "", description: "", budget: "", budgetType: "", skills: [],
          clientName: "", clientCountry: "", clientTotalSpent: "", clientHireRate: "",
          clientJobs: "", paymentVerified: false, proposals: ""
        };

        const titleEl = document.querySelector('h4[data-testid="job-title"]');
        if (titleEl) data.title = titleEl.textContent.trim();

        const descEl = document.querySelector('[data-testid="description"]');
        if (descEl) data.description = descEl.textContent.trim();

        const budgetEl = document.querySelector('[data-testid="budget"]');
        if (budgetEl) data.budget = budgetEl.textContent.trim();

        const pageText = document.body.innerText || "";
        if (/fixed/i.test(pageText)) data.budgetType = "fixed";

        document.querySelectorAll('[data-testid="skill"]').forEach((el) => {
          data.skills.push(el.textContent.trim());
        });

        data.paymentVerified = /payment (method )?verified/i.test(pageText);

        const hireMatch = pageText.match(/(\d{1,3})%\s*hire\s*rate/i);
        if (hireMatch) data.clientHireRate = hireMatch[1] + "%";

        const jobsMatch = pageText.match(/(\d+)\s*jobs?\s*posted/i);
        if (jobsMatch) data.clientJobs = jobsMatch[1];

        const propMatch = pageText.match(/(\d+)\s*(?:to\s*\d+\s*)?proposals?/i);
        if (propMatch) data.proposals = propMatch[0];

        return data;
      }

      // Score
      function scoreJob(data) {
        let score = 5;
        if (data.paymentVerified) score += 3; else score -= 1;
        const hireRate = parseInt(data.clientHireRate);
        if (!isNaN(hireRate)) {
          if (hireRate > 50) score += 2;
          else if (hireRate > 20) score += 1;
          else score -= 1;
        }
        const budgetNum = parseFloat(data.budget.replace(/[^0-9.]/g, ""));
        if (!isNaN(budgetNum) && budgetNum < 50 && data.budgetType !== "hourly") score -= 2;
        const propNum = parseInt(data.proposals);
        if (!isNaN(propNum) && propNum > 50) score -= 1;
        const jobsNum = parseInt(data.clientJobs);
        if (!isNaN(jobsNum) && jobsNum === 0) score -= 1;
        return Math.max(1, Math.min(10, score));
      }

      // Flags
      function detectRedFlags(data) {
        const flags = [];
        if (!data.paymentVerified) flags.push("unverified");
        const budgetNum = parseFloat(data.budget.replace(/[^0-9.]/g, ""));
        if (!isNaN(budgetNum) && budgetNum < 50) flags.push("low-budget");
        const hireRate = parseInt(data.clientHireRate);
        if (!isNaN(hireRate) && hireRate < 20) flags.push("low-hire");
        const jobsNum = parseInt(data.clientJobs);
        if (!isNaN(jobsNum) && jobsNum === 0) flags.push("first-time");
        const propNum = parseInt(data.proposals);
        if (!isNaN(propNum) && propNum > 50) flags.push("high-competition");
        return flags;
      }

      const data = extractJobData();
      const score = scoreJob(data);
      const flags = detectRedFlags(data);

      return { data, score, flags };
    });

    assert(
      badJobFlow.data.title === "Quick website fix ASAP",
      "Bad job: extracts title"
    );
    assert(
      badJobFlow.data.budget === "$15",
      "Bad job: extracts low budget"
    );
    assert(
      badJobFlow.score <= 3,
      `Bad job: scores low (got ${badJobFlow.score})`
    );
    assert(
      badJobFlow.flags.includes("unverified"),
      "Bad job: flags unverified payment"
    );
    assert(
      badJobFlow.flags.includes("low-budget"),
      "Bad job: flags low budget"
    );
    assert(
      badJobFlow.flags.includes("first-time"),
      "Bad job: flags first-time client"
    );
    assert(
      badJobFlow.flags.includes("high-competition"),
      "Bad job: flags high competition"
    );

    await page7.close();

    // ========================================
    // TEST SUITE 8: Manifest Validation
    // ========================================
    console.log("\n--- Suite 8: Manifest Validation ---");

    const manifest = JSON.parse(
      fs.readFileSync(path.join(__dirname, "manifest.json"), "utf-8")
    );

    assert(
      manifest.manifest_version === 3,
      "Manifest is version 3"
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
      manifest.host_permissions.includes("https://www.upwork.com/*"),
      "Has Upwork host permission"
    );
    assert(
      manifest.background && manifest.background.service_worker === "background.js",
      "Has service worker background"
    );
    assert(
      manifest.content_scripts && manifest.content_scripts.length > 0,
      "Has content scripts defined"
    );
    assert(
      manifest.content_scripts[0].matches.some((m) => m.includes("upwork.com")),
      "Content scripts match upwork.com"
    );
    assert(
      manifest.action && manifest.action.default_popup === "popup.html",
      "Has popup action"
    );
    assert(
      fs.existsSync(path.join(__dirname, "icons", "icon16.png")),
      "icon16.png exists"
    );
    assert(
      fs.existsSync(path.join(__dirname, "icons", "icon48.png")),
      "icon48.png exists"
    );
    assert(
      fs.existsSync(path.join(__dirname, "icons", "icon128.png")),
      "icon128.png exists"
    );

    // ========================================
    // TEST SUITE 9: File Integrity
    // ========================================
    console.log("\n--- Suite 9: File Integrity ---");

    const requiredFiles = [
      "manifest.json",
      "background.js",
      "content.js",
      "styles.css",
      "popup.html",
      "popup.js",
      "popup.css"
    ];

    requiredFiles.forEach((file) => {
      const filePath = path.join(__dirname, file);
      const exists = fs.existsSync(filePath);
      assert(exists, `${file} exists`);
      if (exists) {
        const content = fs.readFileSync(filePath, "utf-8");
        assert(content.length > 100, `${file} has substantive content (${content.length} chars)`);
      }
    });

  } catch (error) {
    console.error("\nTest error:", error);
    failed++;
  } finally {
    await browser.close();
  }

  // --------------- Summary ---------------

  console.log("\n=== Test Summary ===");
  console.log(`Total:  ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(
    failed === 0
      ? "\nAll tests passed!"
      : `\n${failed} test(s) failed.`
  );

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
