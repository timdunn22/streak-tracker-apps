/* ──────────────────────────────────────────────
   SaveSmart Popup Controller
   ────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await renderCurrentSite();
  await renderStats();
  await renderToggle();
  bindEvents();
}

/* ── Current Site ── */
async function renderCurrentSite() {
  const siteNameEl = document.getElementById("currentSite");
  const couponNumberEl = document.getElementById("couponNumber");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) {
      siteNameEl.textContent = "No active tab";
      couponNumberEl.textContent = "0";
      return;
    }

    const url = new URL(tab.url);
    const domain = url.hostname.replace(/^www\./, "");
    siteNameEl.textContent = domain;

    // Ask background for coupon count
    chrome.runtime.sendMessage(
      { type: "GET_COUPONS", domain },
      (response) => {
        if (chrome.runtime.lastError) {
          couponNumberEl.textContent = "0";
          return;
        }
        const count = response?.codes?.length || 0;
        couponNumberEl.textContent = String(count);
      }
    );
  } catch (e) {
    siteNameEl.textContent = "Unknown site";
    couponNumberEl.textContent = "0";
  }
}

/* ── Stats ── */
async function renderStats() {
  const data = await chrome.storage.local.get(["totalSaved", "couponsApplied"]);
  const totalSaved = data.totalSaved || 0;
  const couponsApplied = data.couponsApplied || 0;

  document.getElementById("totalSaved").textContent = "$" + totalSaved.toFixed(2);
  document.getElementById("couponsApplied").textContent = String(couponsApplied);
}

/* ── Toggle ── */
async function renderToggle() {
  const data = await chrome.storage.local.get(["autoSearch"]);
  const autoSearch = data.autoSearch !== false; // default true
  document.getElementById("autoSearchToggle").checked = autoSearch;
}

/* ── Events ── */
function bindEvents() {
  // Find Coupons button
  const btn = document.getElementById("findCouponsBtn");
  btn.addEventListener("click", async () => {
    btn.classList.add("loading");
    btn.textContent = "Searching...";
    btn.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "FIND_COUPONS" }, (response) => {
          btn.classList.remove("loading");
          btn.disabled = false;
          if (response?.found) {
            btn.innerHTML =
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
              response.count + " code" + (response.count !== 1 ? "s" : "") + " found!";
          } else {
            btn.innerHTML =
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>' +
              "No coupon field found";
          }

          // Reset button after 3s
          setTimeout(() => {
            btn.innerHTML =
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>' +
              "Find Coupons";
          }, 3000);
        });
      }
    } catch (e) {
      btn.classList.remove("loading");
      btn.disabled = false;
      btn.textContent = "Error — try again";
    }
  });

  // Auto-search toggle
  document.getElementById("autoSearchToggle").addEventListener("change", (e) => {
    chrome.storage.local.set({ autoSearch: e.target.checked });
    chrome.runtime.sendMessage({
      type: "TOGGLE_AUTO_SEARCH",
      enabled: e.target.checked,
    });
  });

  // Reset stats
  document.getElementById("resetStats").addEventListener("click", async (e) => {
    e.preventDefault();
    await chrome.storage.local.set({ totalSaved: 0, couponsApplied: 0 });
    document.getElementById("totalSaved").textContent = "$0.00";
    document.getElementById("couponsApplied").textContent = "0";
  });
}
