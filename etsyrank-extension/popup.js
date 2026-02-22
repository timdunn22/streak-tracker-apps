/* ───────────────────────────────────────────────
   EtsyRank Pro — Popup Script
   ─────────────────────────────────────────────── */

(function () {
  "use strict";

  /* ---------- helpers ---------- */
  function sendMsg(msg) {
    return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
  }

  function $(sel) {
    return document.querySelector(sel);
  }

  function $$(sel) {
    return document.querySelectorAll(sel);
  }

  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "className") e.className = v;
      else if (k === "innerHTML") e.innerHTML = v;
      else if (k === "textContent") e.textContent = v;
      else if (k.startsWith("on"))
        e.addEventListener(k.slice(2).toLowerCase(), v);
      else e.setAttribute(k, v);
    }
    for (const c of children) {
      if (typeof c === "string") e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    }
    return e;
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    const days = Math.floor(hrs / 24);
    return days + "d ago";
  }

  /* ---------- tabs ---------- */
  $$(".erp-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".erp-tab").forEach((t) => t.classList.remove("active"));
      $$(".erp-tab-content").forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      $(`#tab-${tab.dataset.tab}`).classList.add("active");
    });
  });

  /* ---------- load dashboard stats ---------- */
  async function loadDashboard() {
    const stats = await sendMsg({ type: "GET_STATS" });

    $("#stat-today").textContent = stats.usedToday;
    $("#stat-remaining").textContent =
      stats.premium ? "\u221e" : Math.max(0, stats.limit - stats.usedToday);
    $("#stat-total").textContent = stats.totalAudits;

    if (stats.premium) {
      $("#premium-badge").classList.remove("hidden");
      $("#account-status").innerHTML =
        '<p style="color:#22a722;font-weight:600">Pro Plan — Unlimited</p>';
    }

    // Average grade
    const histResp = await sendMsg({ type: "GET_HISTORY" });
    const history = histResp.history || [];

    if (history.length > 0) {
      const gradeMap = { A: 4, B: 3, C: 2, D: 1, F: 0 };
      const reverseMap = ["F", "D", "C", "B", "A"];
      const avg =
        history.reduce((sum, a) => sum + (gradeMap[a.grade] || 0), 0) /
        history.length;
      $("#stat-avg-grade").textContent = reverseMap[Math.round(avg)] || "-";
    }

    // Recent audits (last 5)
    const recentContainer = $("#recent-audits");
    if (history.length > 0) {
      recentContainer.innerHTML = "";
      history.slice(0, 5).forEach((audit) => {
        recentContainer.appendChild(renderAuditItem(audit));
      });
    }

    // Full history tab
    const histContainer = $("#audit-history");
    if (history.length > 0) {
      histContainer.innerHTML = "";
      history.forEach((audit) => {
        histContainer.appendChild(renderAuditItem(audit));
      });
    }
  }

  function renderAuditItem(audit) {
    const item = el("div", { className: "erp-audit-item" }, [
      el("div", {
        className: `erp-audit-grade erp-audit-grade-${audit.grade}`,
        textContent: audit.grade,
      }),
      el("div", { className: "erp-audit-info" }, [
        el("div", {
          className: "erp-audit-title",
          textContent: audit.title || "Untitled listing",
        }),
        el("div", {
          className: "erp-audit-meta",
          textContent: timeAgo(audit.timestamp),
        }),
      ]),
      el("div", {
        className: "erp-audit-score",
        textContent: audit.pct + "/100",
      }),
    ]);
    return item;
  }

  /* ---------- keyword search ---------- */
  async function searchKeywords() {
    const q = $("#kw-input").value.trim();
    if (!q) return;

    const results = $("#kw-results");
    results.innerHTML =
      '<p class="erp-empty" style="color:#888">Searching Etsy autocomplete...</p>';

    try {
      const resp = await fetch(
        `https://www.etsy.com/search/suggest?q=${encodeURIComponent(q)}`
      );
      const text = await resp.text();

      let suggestions = [];
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          suggestions = json.map((s) =>
            typeof s === "string" ? s : s.query || s.text || s.label || String(s)
          );
        } else if (json.results) {
          suggestions = json.results.map(
            (r) => r.query || r.text || r.label || String(r)
          );
        } else if (json.suggestions) {
          suggestions = json.suggestions.map((r) =>
            typeof r === "string" ? r : r.query || r.text || String(r)
          );
        }
      } catch (_) {}

      // Fallback
      if (suggestions.length === 0) {
        suggestions = [
          q,
          q + " gift",
          q + " personalized",
          q + " custom",
          q + " handmade",
          q + " for women",
          q + " for men",
          q + " vintage",
          q + " set",
          q + " wedding",
        ];
      }

      results.innerHTML = "";
      suggestions.slice(0, 15).forEach((term) => {
        const wordCount = term.split(/\s+/).length;
        let compLevel, compClass;
        if (wordCount >= 4) {
          compLevel = "Low";
          compClass = "erp-kw-comp--low";
        } else if (wordCount >= 2) {
          compLevel = "Med";
          compClass = "erp-kw-comp--med";
        } else {
          compLevel = "High";
          compClass = "erp-kw-comp--high";
        }

        const trendIcons = ["\u2197\ufe0f", "\u2192", "\u2198\ufe0f"];
        const trendIdx =
          Math.abs(term.length * 7 + wordCount * 3) % 3;

        const item = el("div", { className: "erp-kw-item" }, [
          el("span", { className: "erp-kw-term", textContent: term }),
          el("div", { className: "erp-kw-meta" }, [
            el("span", {
              className: `erp-kw-comp ${compClass}`,
              textContent: compLevel,
            }),
            el("span", {
              className: "erp-kw-trend",
              textContent: trendIcons[trendIdx],
            }),
          ]),
        ]);
        results.appendChild(item);
      });

      // Save search
      sendMsg({ type: "SAVE_KEYWORD", keyword: q, resultCount: suggestions.length });
      loadKeywordHistory();
    } catch (err) {
      results.innerHTML =
        '<p class="erp-empty" style="color:#d42020">Failed to fetch suggestions. Check your connection.</p>';
    }
  }

  $("#kw-search-btn").addEventListener("click", searchKeywords);
  $("#kw-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchKeywords();
  });

  /* ---------- keyword history ---------- */
  async function loadKeywordHistory() {
    const resp = await sendMsg({ type: "GET_KEYWORD_HISTORY" });
    const history = resp.history || [];
    const container = $("#kw-history");

    if (history.length === 0) {
      container.innerHTML = '<p class="erp-empty">No keyword searches yet.</p>';
      return;
    }

    container.innerHTML = "";

    // Deduplicate by keyword, show most recent
    const seen = new Set();
    history.forEach((item) => {
      if (seen.has(item.keyword)) return;
      seen.add(item.keyword);
      if (seen.size > 20) return;

      const row = el("div", { className: "erp-kw-item" }, [
        el("span", {
          className: "erp-kw-term",
          textContent: item.keyword,
          style: "cursor:pointer;color:#f57224",
          onClick: () => {
            $("#kw-input").value = item.keyword;
            searchKeywords();
          },
        }),
        el("span", {
          style: "font-size:11px;color:#888",
          textContent: timeAgo(item.timestamp),
        }),
      ]);
      container.appendChild(row);
    });
  }

  /* ---------- license activation ---------- */
  $("#activate-btn").addEventListener("click", async () => {
    const key = $("#license-input").value.trim();
    const msg = $("#activate-msg");

    if (!key) {
      msg.textContent = "Please enter a license key.";
      msg.className = "erp-msg erp-msg--err";
      msg.classList.remove("hidden");
      return;
    }

    const result = await sendMsg({ type: "ACTIVATE_PREMIUM", licenseKey: key });
    if (result.ok) {
      msg.textContent = "Pro activated! Enjoy unlimited audits.";
      msg.className = "erp-msg erp-msg--ok";
      msg.classList.remove("hidden");
      loadDashboard();
    } else {
      msg.textContent = result.error || "Invalid license key.";
      msg.className = "erp-msg erp-msg--err";
      msg.classList.remove("hidden");
    }
  });

  /* ---------- export ---------- */
  $("#export-btn").addEventListener("click", async () => {
    const resp = await sendMsg({ type: "GET_HISTORY" });
    const history = resp.history || [];

    if (history.length === 0) {
      alert("No audit history to export.");
      return;
    }

    const premium = await sendMsg({ type: "CHECK_PREMIUM" });
    if (!premium.premium) {
      alert("Export is a Pro feature. Activate your license to export.");
      return;
    }

    const headers = ["Date", "Title", "Grade", "Score", "URL"];
    const rows = history.map((a) => [
      a.date || "",
      `"${(a.title || "").replace(/"/g, '""')}"`,
      a.grade || "",
      a.pct || 0,
      a.url || "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `etsyrank-audit-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  /* ---------- init ---------- */
  loadDashboard();
  loadKeywordHistory();
})();
