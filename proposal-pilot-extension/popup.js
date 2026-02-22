/* ============================================================
   ProposalPilot — Popup Script
   Stats dashboard, template management, proposal history
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // --------------- Tab Navigation ---------------

  const tabs = document.querySelectorAll(".popup-tab");
  const panels = document.querySelectorAll(".popup-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");

      // Refresh data when switching tabs
      const tabName = tab.dataset.tab;
      if (tabName === "dashboard") loadDashboard();
      if (tabName === "templates") loadTemplates();
      if (tabName === "history") loadHistory();
      if (tabName === "settings") loadSettings();
    });
  });

  // --------------- Dashboard ---------------

  async function loadDashboard() {
    try {
      const statsRes = await chrome.runtime.sendMessage({ action: "getStats" });
      const stats = statsRes.stats;

      document.getElementById("stat-applied").textContent = stats.totalApplied || 0;
      document.getElementById("stat-won").textContent = stats.totalWon || 0;
      document.getElementById("stat-lost").textContent = stats.totalLost || 0;
      document.getElementById("stat-skipped").textContent = stats.totalSkipped || 0;
      document.getElementById("stat-winrate").textContent = stats.winRate + "%";

      // Daily remaining
      const limitRes = await chrome.runtime.sendMessage({ action: "checkDailyLimit" });
      const remainingEl = document.getElementById("stat-daily-remaining");
      if (limitRes.remaining === Infinity) {
        remainingEl.textContent = "Unlimited";
      } else {
        remainingEl.textContent = limitRes.remaining + " left";
      }

      // Top templates
      const tplRes = await chrome.runtime.sendMessage({ action: "getTemplates" });
      const templates = tplRes.templates || [];
      const usage = stats.templateUsage || {};

      const topContainer = document.getElementById("top-templates");
      const sortedUsage = Object.entries(usage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      if (sortedUsage.length === 0) {
        topContainer.innerHTML = '<p class="empty-state">No template usage data yet</p>';
      } else {
        topContainer.innerHTML = sortedUsage
          .map(([id, count]) => {
            const tpl = templates.find((t) => t.id === id);
            const name = tpl ? tpl.name : id;
            return `
              <div class="top-tpl-item">
                <span class="top-tpl-name">${name}</span>
                <span class="top-tpl-count">${count} uses</span>
              </div>`;
          })
          .join("");
      }
    } catch (e) {
      console.error("Dashboard load error:", e);
    }
  }

  // --------------- Templates ---------------

  let editingTemplateId = null;

  async function loadTemplates() {
    try {
      const res = await chrome.runtime.sendMessage({ action: "getTemplates" });
      const templates = res.templates || [];
      const container = document.getElementById("template-list");

      if (templates.length === 0) {
        container.innerHTML = '<p class="empty-state">No templates yet</p>';
        return;
      }

      container.innerHTML = templates
        .map((t) => {
          const preview = t.body.slice(0, 120).replace(/</g, "&lt;") + "...";
          const defaultBadge = t.isDefault
            ? '<span style="background:#e6f9e0;color:#14a800;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:600;">DEFAULT</span>'
            : "";
          return `
            <div class="tpl-item" data-id="${t.id}">
              <div class="tpl-item-header">
                <span class="tpl-item-name">${t.name}</span>
                ${defaultBadge}
              </div>
              <div class="tpl-item-category">${t.category}</div>
              <div class="tpl-item-preview">${preview}</div>
              <div class="tpl-item-actions">
                <button class="popup-btn popup-btn-secondary popup-btn-sm edit-tpl-btn" data-id="${t.id}">Edit</button>
                <button class="popup-btn popup-btn-danger popup-btn-sm delete-tpl-btn" data-id="${t.id}">Delete</button>
              </div>
            </div>`;
        })
        .join("");

      // Edit buttons
      container.querySelectorAll(".edit-tpl-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          const tpl = templates.find((t) => t.id === id);
          if (!tpl) return;

          editingTemplateId = id;
          document.getElementById("tpl-name").value = tpl.name;
          document.getElementById("tpl-category").value = tpl.category;
          document.getElementById("tpl-body").value = tpl.body;
          document.getElementById("template-form-title").textContent = "Edit Template";
          document.getElementById("cancel-tpl-btn").style.display = "inline-flex";
        });
      });

      // Delete buttons
      container.querySelectorAll(".delete-tpl-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm("Delete this template?")) return;
          await chrome.runtime.sendMessage({ action: "deleteTemplate", templateId: btn.dataset.id });
          loadTemplates();
        });
      });
    } catch (e) {
      console.error("Templates load error:", e);
    }
  }

  // Save template
  document.getElementById("save-tpl-btn").addEventListener("click", async () => {
    const name = document.getElementById("tpl-name").value.trim();
    const category = document.getElementById("tpl-category").value.trim();
    const body = document.getElementById("tpl-body").value.trim();

    if (!name || !body) {
      alert("Please fill in the template name and body.");
      return;
    }

    const template = {
      id: editingTemplateId || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      category: category || "General",
      body,
      isDefault: false
    };

    const res = await chrome.runtime.sendMessage({ action: "saveTemplate", template });
    if (res.error) {
      alert(res.error);
      return;
    }

    // Reset form
    resetTemplateForm();
    loadTemplates();
  });

  // Cancel edit
  document.getElementById("cancel-tpl-btn").addEventListener("click", () => {
    resetTemplateForm();
  });

  function resetTemplateForm() {
    editingTemplateId = null;
    document.getElementById("tpl-name").value = "";
    document.getElementById("tpl-category").value = "";
    document.getElementById("tpl-body").value = "";
    document.getElementById("template-form-title").textContent = "New Template";
    document.getElementById("cancel-tpl-btn").style.display = "none";
  }

  // --------------- History ---------------

  let allProposals = [];

  async function loadHistory(filter = "all") {
    try {
      const res = await chrome.runtime.sendMessage({ action: "getProposals" });
      allProposals = res.proposals || [];

      const filtered =
        filter === "all"
          ? allProposals
          : allProposals.filter((p) => p.status === filter);

      const container = document.getElementById("history-list");

      if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">No proposals found</p>';
        return;
      }

      container.innerHTML = filtered
        .slice(0, 50) // limit display
        .map((p) => {
          const date = p.trackedAt
            ? new Date(p.trackedAt).toLocaleDateString()
            : "N/A";
          return `
            <div class="history-item" data-id="${p.id}">
              <div class="history-item-title">${(p.title || "Untitled").replace(/</g, "&lt;")}</div>
              <div class="history-item-meta">
                <span>${date} &middot; ${p.budget || "N/A"} &middot; Score: ${p.score || "?"}</span>
                <span class="history-status status-${p.status}">${p.status}</span>
              </div>
              <div class="history-item-actions">
                ${p.url ? `<a href="${p.url}" target="_blank" class="popup-btn popup-btn-secondary popup-btn-sm">View Job</a>` : ""}
                <select class="status-select" data-id="${p.id}" style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:11px;">
                  <option value="applied" ${p.status === "applied" ? "selected" : ""}>Applied</option>
                  <option value="skipped" ${p.status === "skipped" ? "selected" : ""}>Skipped</option>
                  <option value="won" ${p.status === "won" ? "selected" : ""}>Won</option>
                  <option value="lost" ${p.status === "lost" ? "selected" : ""}>Lost</option>
                </select>
              </div>
            </div>`;
        })
        .join("");

      // Status change handlers
      container.querySelectorAll(".status-select").forEach((select) => {
        select.addEventListener("change", async () => {
          await chrome.runtime.sendMessage({
            action: "updateProposalStatus",
            proposalId: select.dataset.id,
            status: select.value
          });
          loadHistory(filter);
          loadDashboard();
        });
      });
    } catch (e) {
      console.error("History load error:", e);
    }
  }

  // Filter buttons
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      loadHistory(btn.dataset.filter);
    });
  });

  // --------------- Settings ---------------

  async function loadSettings() {
    try {
      const res = await chrome.runtime.sendMessage({ action: "getSettings" });
      const settings = res.settings;

      const planBadge = document.getElementById("settings-plan");
      if (settings.isPremium) {
        planBadge.textContent = "Premium";
        planBadge.className = "settings-plan-badge plan-premium";
        document.getElementById("settings-limit").textContent = "Unlimited";
        document.getElementById("settings-tpl-limit").textContent = "Unlimited";
      } else {
        planBadge.textContent = "Free";
        planBadge.className = "settings-plan-badge plan-free";
        document.getElementById("settings-limit").textContent = "5 proposals/day";
        document.getElementById("settings-tpl-limit").textContent = "3 custom templates";
      }
    } catch (e) {
      console.error("Settings load error:", e);
    }
  }

  // Activate premium
  document.getElementById("activate-premium-btn").addEventListener("click", async () => {
    const key = document.getElementById("premium-key-input").value.trim();
    const msg = document.getElementById("premium-status-msg");

    if (!key) {
      msg.textContent = "Please enter a license key.";
      msg.className = "settings-note error";
      return;
    }

    const res = await chrome.runtime.sendMessage({ action: "activatePremium", key });
    if (res.success) {
      msg.textContent = "Premium activated successfully!";
      msg.className = "settings-note success";
      loadSettings();
    } else {
      msg.textContent = res.error || "Invalid key.";
      msg.className = "settings-note error";
    }
  });

  // Clear history
  document.getElementById("clear-history-btn").addEventListener("click", async () => {
    if (!confirm("Are you sure? This will delete all proposal history and stats.")) return;

    await chrome.storage.local.set({
      proposals: [],
      stats: {
        totalApplied: 0,
        totalSkipped: 0,
        totalWon: 0,
        totalLost: 0,
        proposalsByDate: {},
        templateUsage: {}
      }
    });

    loadDashboard();
    loadHistory();
    alert("History cleared.");
  });

  // --------------- Export Analytics ---------------

  document.getElementById("export-btn").addEventListener("click", async () => {
    try {
      const res = await chrome.runtime.sendMessage({ action: "getSettings" });
      if (!res.settings.isPremium) {
        alert("Analytics export is a Premium feature. Upgrade to unlock it.");
        return;
      }

      const data = await chrome.runtime.sendMessage({ action: "exportAnalytics" });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposalpilot-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export error:", e);
      alert("Export failed. See console for details.");
    }
  });

  // --------------- Initial Load ---------------

  loadDashboard();
});
