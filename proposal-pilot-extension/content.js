/* ============================================================
   ProposalPilot — Content Script
   Runs on Upwork job pages. Injects sidebar with:
     - Job quality score
     - Key info extraction
     - Red flag detection
     - Template insertion
     - Proposal tracking
   ============================================================ */

(function () {
  "use strict";

  // Prevent double-injection
  if (document.getElementById("pp-sidebar")) return;

  // --------------- DOM Parsing: Extract Job Data ---------------

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

    // Title
    const titleEl =
      document.querySelector('h4[data-testid="job-title"]') ||
      document.querySelector(".job-details-header h4") ||
      document.querySelector("header h4") ||
      document.querySelector(".up-card-header h4") ||
      document.querySelector("h1") ||
      document.querySelector("h2");
    if (titleEl) data.title = titleEl.textContent.trim();

    // Description
    const descEl =
      document.querySelector('[data-testid="description"]') ||
      document.querySelector(".job-description") ||
      document.querySelector('[class*="description"]') ||
      document.querySelector(".break.job-description");
    if (descEl) data.description = descEl.textContent.trim();

    // Budget
    const budgetSelectors = [
      '[data-testid="budget"]',
      '[data-testid="BudgetAmount"]',
      ".up-budget",
      '[class*="budget"]'
    ];
    for (const sel of budgetSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        data.budget = el.textContent.trim();
        break;
      }
    }

    // Hourly vs fixed
    const pageText = document.body.innerText || "";
    if (/hourly/i.test(data.budget) || /\/hr/i.test(data.budget)) {
      data.budgetType = "hourly";
    } else if (/fixed/i.test(pageText) && data.budget) {
      data.budgetType = "fixed";
    }

    // Skills
    document
      .querySelectorAll(
        '[data-testid="skill"] span, .up-skill-badge, .skills-list span, ' +
        '.air3-token, [class*="skill-badge"], [class*="SkillTag"]'
      )
      .forEach((el) => {
        const skill = el.textContent.trim();
        if (skill && !data.skills.includes(skill)) {
          data.skills.push(skill);
        }
      });

    // Client info — iterate visible text blocks
    const allText = pageText;

    // Payment verified
    data.paymentVerified =
      /payment (method )?verified/i.test(allText) ||
      !!document.querySelector('[data-testid="payment-verified"]') ||
      !!document.querySelector('[class*="payment-verified"]');

    // Client country
    const countryEl = document.querySelector(
      '[data-testid="client-country"], [class*="client-country"], .client-location'
    );
    if (countryEl) {
      data.clientCountry = countryEl.textContent.trim();
    } else {
      const countryMatch = allText.match(
        /(?:Location|Country)[:\s]*([A-Z][a-zA-Z\s]+?)(?:\n|$)/
      );
      if (countryMatch) data.clientCountry = countryMatch[1].trim();
    }

    // Total spent
    const spentMatch = allText.match(
      /\$([0-9,.]+[KMkm]?)\s*(?:total\s*spent|spent)/i
    );
    if (spentMatch) data.clientTotalSpent = "$" + spentMatch[1];

    // Hire rate
    const hireMatch = allText.match(/(\d{1,3})%\s*hire\s*rate/i);
    if (hireMatch) data.clientHireRate = hireMatch[1] + "%";

    // Number of client jobs
    const jobsMatch = allText.match(/(\d+)\s*jobs?\s*posted/i);
    if (jobsMatch) data.clientJobs = jobsMatch[1];

    // Proposals count
    const propMatch = allText.match(
      /(\d+)\s*(?:to\s*\d+\s*)?proposals?/i
    );
    if (propMatch) data.proposals = propMatch[0];

    // Experience level
    const expMatch = allText.match(/(entry|intermediate|expert)\s*level/i);
    if (expMatch) data.experience = expMatch[0];

    // Posted time
    const timeEl = document.querySelector("time, [data-testid='posted-on']");
    if (timeEl) data.postedTime = timeEl.textContent.trim();

    // Project length
    const lengthMatch = allText.match(
      /(less than a month|1 to 3 months|3 to 6 months|more than 6 months)/i
    );
    if (lengthMatch) data.projectLength = lengthMatch[0];

    return data;
  }

  // --------------- Job Scoring Algorithm ---------------

  function scoreJob(data) {
    let score = 5; // baseline
    const reasons = [];

    // Payment verified: +3
    if (data.paymentVerified) {
      score += 3;
      reasons.push("+3 Payment verified");
    } else {
      score -= 1;
      reasons.push("-1 Payment NOT verified");
    }

    // Hire rate
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

    // Total spent
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

    // Budget
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

    // Proposal competition
    const propNum = parseInt(data.proposals);
    if (!isNaN(propNum)) {
      if (propNum > 50) {
        score -= 1;
        reasons.push("-1 High competition (50+ proposals)");
      } else if (propNum < 10) {
        score += 1;
        reasons.push("+1 Low competition (<10 proposals)");
      }
    }

    // Client jobs
    const jobsNum = parseInt(data.clientJobs);
    if (!isNaN(jobsNum) && jobsNum === 0) {
      score -= 1;
      reasons.push("-1 First-time client");
    }

    // Clamp 1-10
    score = Math.max(1, Math.min(10, score));

    return { score, reasons };
  }

  // --------------- Red Flag Detection ---------------

  function detectRedFlags(data) {
    const flags = [];

    if (!data.paymentVerified) {
      flags.push({
        severity: "high",
        text: "Payment method not verified"
      });
    }

    const budgetNum = parseFloat(data.budget.replace(/[^0-9.]/g, ""));
    if (!isNaN(budgetNum) && budgetNum < 50 && data.budgetType !== "hourly") {
      flags.push({
        severity: "high",
        text: `Very low budget (${data.budget})`
      });
    }

    const hireRate = parseInt(data.clientHireRate);
    if (!isNaN(hireRate) && hireRate < 20) {
      flags.push({
        severity: "medium",
        text: `Low hire rate (${hireRate}%)`
      });
    }

    const jobsNum = parseInt(data.clientJobs);
    if (!isNaN(jobsNum) && jobsNum === 0) {
      flags.push({
        severity: "medium",
        text: "First-time client (no prior jobs)"
      });
    }

    const propNum = parseInt(data.proposals);
    if (!isNaN(propNum) && propNum > 50) {
      flags.push({
        severity: "medium",
        text: `High competition (${data.proposals})`
      });
    }

    if (data.description && data.description.length < 100) {
      flags.push({
        severity: "low",
        text: "Very short job description"
      });
    }

    // Vague language check
    const vagueTerms = /asap|urgent|need immediately|cheap|fast|lowest price/i;
    if (vagueTerms.test(data.description)) {
      flags.push({
        severity: "low",
        text: "Description uses vague/urgent language"
      });
    }

    return flags;
  }

  // --------------- Build Sidebar HTML ---------------

  function buildSidebar(jobData, scoreResult, flags, templates, settings) {
    const { score, reasons } = scoreResult;
    const scoreClass =
      score >= 7 ? "pp-score-good" : score >= 4 ? "pp-score-caution" : "pp-score-bad";
    const scoreLabel =
      score >= 7 ? "Good Opportunity" : score >= 4 ? "Proceed with Caution" : "Consider Skipping";

    let flagsHTML = "";
    if (flags.length === 0) {
      flagsHTML = '<div class="pp-no-flags">No red flags detected</div>';
    } else {
      flagsHTML = '<div class="pp-flags-list">';
      const icons = { high: "\u26A0\uFE0F", medium: "\u26A1", low: "\u2139\uFE0F" };
      flags.forEach((f) => {
        flagsHTML += `
          <div class="pp-flag pp-flag-${f.severity}">
            <span class="pp-flag-icon">${icons[f.severity] || ""}</span>
            <span>${f.text}</span>
          </div>`;
      });
      flagsHTML += "</div>";
    }

    const infoItems = [
      { label: "Budget", value: jobData.budget || "Not listed" },
      { label: "Type", value: jobData.budgetType || "N/A" },
      { label: "Hire Rate", value: jobData.clientHireRate || "N/A" },
      { label: "Total Spent", value: jobData.clientTotalSpent || "N/A" },
      { label: "Country", value: jobData.clientCountry || "N/A" },
      { label: "Proposals", value: jobData.proposals || "N/A" }
    ];

    let infoHTML = '<div class="pp-info-grid">';
    infoItems.forEach((item) => {
      infoHTML += `
        <div class="pp-info-item">
          <div class="pp-info-label">${item.label}</div>
          <div class="pp-info-value">${item.value}</div>
        </div>`;
    });
    infoHTML += "</div>";

    // Skills
    let skillsHTML = "";
    if (jobData.skills.length > 0) {
      skillsHTML = `
        <div class="pp-section">
          <div class="pp-section-title">Skills Required</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${jobData.skills
              .map(
                (s) =>
                  `<span style="background:#e6f9e0;color:#14a800;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:500;">${s}</span>`
              )
              .join("")}
          </div>
        </div>`;
    }

    // Templates
    let templatesHTML = '<div class="pp-template-list">';
    templates.forEach((t) => {
      const preview = t.body.slice(0, 100).replace(/</g, "&lt;") + "...";
      templatesHTML += `
        <div class="pp-template-card" data-template-id="${t.id}">
          <div class="pp-template-name">${t.name}</div>
          <div class="pp-template-category">${t.category}</div>
          <div class="pp-template-preview">${preview}</div>
          <div class="pp-template-actions">
            <button class="pp-btn pp-btn-primary pp-btn-sm pp-insert-template" data-id="${t.id}">Insert</button>
            <button class="pp-btn pp-btn-secondary pp-btn-sm pp-preview-template" data-id="${t.id}">Preview</button>
          </div>
        </div>`;
    });
    templatesHTML += "</div>";

    // Daily limit banner
    const isPremium = settings.isPremium;
    let limitHTML = "";
    if (!isPremium) {
      limitHTML = `
        <div class="pp-premium-banner" id="pp-premium-banner">
          <h4>Upgrade to Premium</h4>
          <p>Unlimited proposals, templates, and analytics export</p>
          <button class="pp-btn pp-btn-primary" id="pp-upgrade-btn" style="background:#fff;color:#1a237e;">
            Enter License Key
          </button>
        </div>`;
    }

    const sidebarHTML = `
      <div class="pp-header">
        <div>
          <div class="pp-header-title">ProposalPilot</div>
          <div class="pp-header-subtitle">Upwork Proposal Assistant</div>
        </div>
        <button class="pp-header-close" id="pp-close-btn" aria-label="Close sidebar">&times;</button>
      </div>

      <!-- Job Score -->
      <div class="pp-section">
        <div class="pp-section-title">Job Quality Score</div>
        <div class="pp-score-container">
          <div class="pp-score-circle ${scoreClass}">${score}</div>
          <div class="pp-score-details">
            <div class="pp-score-label">${scoreLabel}</div>
            <div class="pp-score-breakdown">${reasons.slice(0, 4).join("<br>")}</div>
          </div>
        </div>
      </div>

      <!-- Key Info -->
      <div class="pp-section">
        <div class="pp-section-title">Key Information</div>
        ${infoHTML}
      </div>

      ${skillsHTML}

      <!-- Red Flags -->
      <div class="pp-section">
        <div class="pp-section-title">Red Flags</div>
        ${flagsHTML}
      </div>

      <!-- Tracking -->
      <div class="pp-section">
        <div class="pp-section-title">Track This Job</div>
        <div class="pp-tracking-btns">
          <button class="pp-track-btn pp-applied" data-status="applied">Applied</button>
          <button class="pp-track-btn pp-skipped" data-status="skipped">Skipped</button>
          <button class="pp-track-btn pp-won" data-status="won">Won</button>
          <button class="pp-track-btn pp-lost" data-status="lost">Lost</button>
        </div>
      </div>

      <!-- Templates -->
      <div class="pp-section">
        <div class="pp-section-title">Proposal Templates</div>
        ${templatesHTML}
      </div>

      ${limitHTML}

      <div class="pp-footer">
        ProposalPilot v1.0 &middot; Built for freelancers
      </div>
    `;

    return sidebarHTML;
  }

  // --------------- Template Merge Fields ---------------

  function mergeTemplate(templateBody, jobData) {
    return templateBody
      .replace(/\{client_name\}/gi, jobData.clientName || "[Client]")
      .replace(/\{project_title\}/gi, jobData.title || "[Project Title]")
      .replace(/\{budget\}/gi, jobData.budget || "[Budget]")
      .replace(/\{skills\}/gi, jobData.skills.join(", ") || "[Skills]");
  }

  // --------------- Toast Notification ---------------

  function showToast(message) {
    let toast = document.getElementById("pp-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "pp-toast";
      toast.className = "pp-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("pp-toast-visible");
    setTimeout(() => toast.classList.remove("pp-toast-visible"), 2500);
  }

  // --------------- Insert Text into Proposal Field ---------------

  function insertIntoProposalField(text) {
    // Upwork uses various textarea / contenteditable elements
    const selectors = [
      'textarea[name="coverLetter"]',
      'textarea[data-testid="cover-letter"]',
      "textarea.up-textarea",
      "#cover_letter",
      ".cover-letter textarea",
      'div[contenteditable="true"]',
      "textarea"
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
          el.value = text;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          el.innerText = text;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
        el.focus();
        showToast("Template inserted into proposal field");
        return true;
      }
    }

    // Fallback: copy to clipboard
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("Copied to clipboard (no proposal field found)"))
      .catch(() => showToast("Could not insert template"));
    return false;
  }

  // --------------- Initialize ---------------

  async function init() {
    const jobData = extractJobData();
    const scoreResult = scoreJob(jobData);
    const flags = detectRedFlags(jobData);

    // Get templates and settings from background
    let templates = [];
    let settings = {};
    try {
      const tRes = await chrome.runtime.sendMessage({ action: "getTemplates" });
      templates = tRes.templates || [];
      const sRes = await chrome.runtime.sendMessage({ action: "getSettings" });
      settings = sRes.settings || {};
    } catch (e) {
      console.warn("ProposalPilot: could not load data from background", e);
    }

    // Create sidebar
    const sidebar = document.createElement("div");
    sidebar.id = "pp-sidebar";
    sidebar.innerHTML = buildSidebar(jobData, scoreResult, flags, templates, settings);
    document.body.appendChild(sidebar);

    // Toggle button
    const toggleBtn = document.createElement("button");
    toggleBtn.id = "pp-toggle-btn";
    toggleBtn.innerHTML = "\u2190";
    toggleBtn.title = "Toggle ProposalPilot";
    document.body.appendChild(toggleBtn);

    // Event: toggle sidebar
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("pp-collapsed");
      toggleBtn.innerHTML = sidebar.classList.contains("pp-collapsed")
        ? "\u2192"
        : "\u2190";
    });

    // Event: close button
    document.getElementById("pp-close-btn").addEventListener("click", () => {
      sidebar.classList.add("pp-collapsed");
      toggleBtn.innerHTML = "\u2192";
    });

    // Event: tracking buttons
    sidebar.querySelectorAll(".pp-track-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const status = btn.dataset.status;

        // Check daily limit for "applied"
        if (status === "applied") {
          const limitRes = await chrome.runtime.sendMessage({ action: "checkDailyLimit" });
          if (!limitRes.allowed) {
            showToast("Daily proposal limit reached. Upgrade to Premium for unlimited.");
            return;
          }
        }

        // Deactivate all, activate clicked
        sidebar.querySelectorAll(".pp-track-btn").forEach((b) => b.classList.remove("pp-active"));
        btn.classList.add("pp-active");

        // Track
        await chrome.runtime.sendMessage({
          action: "trackProposal",
          proposal: {
            title: jobData.title,
            url: window.location.href,
            budget: jobData.budget,
            status: status,
            score: scoreResult.score,
            skills: jobData.skills
          }
        });

        if (status === "applied") {
          await chrome.runtime.sendMessage({ action: "incrementDailyCount" });
        }

        showToast(`Job marked as "${status}"`);
      });
    });

    // Event: insert template
    sidebar.querySelectorAll(".pp-insert-template").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const template = templates.find((t) => t.id === id);
        if (!template) return;

        const limitRes = await chrome.runtime.sendMessage({ action: "checkDailyLimit" });
        if (!limitRes.allowed) {
          showToast("Daily proposal limit reached. Upgrade to Premium.");
          return;
        }

        const mergedText = mergeTemplate(template.body, jobData);
        insertIntoProposalField(mergedText);
      });
    });

    // Event: preview template
    sidebar.querySelectorAll(".pp-preview-template").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const template = templates.find((t) => t.id === id);
        if (!template) return;

        const mergedText = mergeTemplate(template.body, jobData);
        showPreviewModal(template.name, mergedText);
      });
    });

    // Event: upgrade button
    const upgradeBtn = document.getElementById("pp-upgrade-btn");
    if (upgradeBtn) {
      upgradeBtn.addEventListener("click", () => {
        const key = prompt("Enter your ProposalPilot Premium license key:");
        if (key) {
          chrome.runtime.sendMessage({ action: "activatePremium", key }).then((res) => {
            if (res.success) {
              showToast("Premium activated! Reload to apply.");
              const banner = document.getElementById("pp-premium-banner");
              if (banner) banner.remove();
            } else {
              showToast(res.error || "Invalid key");
            }
          });
        }
      });
    }

    // Check if we already tracked this URL
    try {
      const propRes = await chrome.runtime.sendMessage({ action: "getProposals" });
      const existing = (propRes.proposals || []).find((p) => p.url === window.location.href);
      if (existing) {
        const btn = sidebar.querySelector(`.pp-track-btn[data-status="${existing.status}"]`);
        if (btn) btn.classList.add("pp-active");
      }
    } catch (e) {
      // ignore
    }
  }

  // --------------- Preview Modal ---------------

  function showPreviewModal(title, body) {
    const existingModal = document.getElementById("pp-preview-modal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "pp-preview-modal";
    modal.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);
      z-index:1000001;display:flex;align-items:center;justify-content:center;
    `;
    modal.innerHTML = `
      <div style="background:#fff;border-radius:12px;padding:24px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="margin:0;font-size:18px;color:#1d1d1d;">${title}</h3>
          <button id="pp-modal-close" style="background:none;border:none;font-size:24px;cursor:pointer;color:#888;">&times;</button>
        </div>
        <pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.6;color:#333;background:#f7f7f7;padding:16px;border-radius:8px;">${body.replace(/</g, "&lt;")}</pre>
        <div style="margin-top:16px;text-align:right;">
          <button class="pp-btn pp-btn-primary" id="pp-modal-insert">Insert into Proposal</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("pp-modal-close").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
    document.getElementById("pp-modal-insert").addEventListener("click", () => {
      insertIntoProposalField(body);
      modal.remove();
    });
  }

  // --------------- Start ---------------

  // Wait for page content to settle
  if (document.readyState === "complete") {
    setTimeout(init, 1000);
  } else {
    window.addEventListener("load", () => setTimeout(init, 1000));
  }
})();
