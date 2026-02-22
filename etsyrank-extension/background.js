/* ───────────────────────────────────────────────
   EtsyRank Pro — Background Service Worker
   ─────────────────────────────────────────────── */

const DAILY_FREE_LIMIT = 10;
const REVIEW_TO_SALES_LOW = 10;
const REVIEW_TO_SALES_HIGH = 20;

/* ---------- helpers ---------- */
function todayKey() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

async function getStorage(keys) {
  return chrome.storage.local.get(keys);
}

async function setStorage(obj) {
  return chrome.storage.local.set(obj);
}

/* ---------- usage tracking ---------- */
async function getUsageToday() {
  const key = `usage_${todayKey()}`;
  const data = await getStorage([key]);
  return data[key] || 0;
}

async function incrementUsage() {
  const key = `usage_${todayKey()}`;
  const current = await getUsageToday();
  await setStorage({ [key]: current + 1 });
  return current + 1;
}

async function isPremium() {
  const data = await getStorage(["licenseKey", "premiumActive"]);
  return !!(data.licenseKey && data.premiumActive);
}

async function canPerformAudit() {
  if (await isPremium()) return { allowed: true, remaining: Infinity };
  const used = await getUsageToday();
  const remaining = Math.max(0, DAILY_FREE_LIMIT - used);
  return { allowed: remaining > 0, remaining };
}

/* ---------- history ---------- */
async function saveAuditHistory(audit) {
  const data = await getStorage(["auditHistory"]);
  const history = data.auditHistory || [];
  history.unshift({
    ...audit,
    timestamp: Date.now(),
    date: todayKey(),
  });
  // Keep last 200 entries
  if (history.length > 200) history.length = 200;
  await setStorage({ auditHistory: history });
}

async function getAuditHistory() {
  const data = await getStorage(["auditHistory"]);
  return data.auditHistory || [];
}

/* ---------- keyword history ---------- */
async function saveKeywordSearch(keyword, resultCount) {
  const data = await getStorage(["keywordHistory"]);
  const history = data.keywordHistory || [];
  history.unshift({
    keyword,
    resultCount,
    timestamp: Date.now(),
    date: todayKey(),
  });
  if (history.length > 500) history.length = 500;
  await setStorage({ keywordHistory: history });
}

/* ---------- message handler ---------- */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case "CHECK_LIMIT": {
        const status = await canPerformAudit();
        sendResponse(status);
        break;
      }
      case "USE_AUDIT": {
        const status = await canPerformAudit();
        if (!status.allowed) {
          sendResponse({ allowed: false, remaining: 0 });
        } else {
          const newCount = await incrementUsage();
          const prem = await isPremium();
          sendResponse({
            allowed: true,
            remaining: prem ? Infinity : DAILY_FREE_LIMIT - newCount,
          });
        }
        break;
      }
      case "SAVE_AUDIT": {
        await saveAuditHistory(msg.audit);
        sendResponse({ ok: true });
        break;
      }
      case "GET_HISTORY": {
        const history = await getAuditHistory();
        sendResponse({ history });
        break;
      }
      case "SAVE_KEYWORD": {
        await saveKeywordSearch(msg.keyword, msg.resultCount);
        sendResponse({ ok: true });
        break;
      }
      case "GET_KEYWORD_HISTORY": {
        const data = await getStorage(["keywordHistory"]);
        sendResponse({ history: data.keywordHistory || [] });
        break;
      }
      case "ACTIVATE_PREMIUM": {
        // In a real extension this would validate the key with a server
        const key = msg.licenseKey || "";
        if (key.length >= 8) {
          await setStorage({ licenseKey: key, premiumActive: true });
          sendResponse({ ok: true });
        } else {
          sendResponse({ ok: false, error: "Invalid license key" });
        }
        break;
      }
      case "CHECK_PREMIUM": {
        const prem = await isPremium();
        sendResponse({ premium: prem });
        break;
      }
      case "GET_STATS": {
        const used = await getUsageToday();
        const prem = await isPremium();
        const hist = await getAuditHistory();
        sendResponse({
          usedToday: used,
          limit: prem ? Infinity : DAILY_FREE_LIMIT,
          premium: prem,
          totalAudits: hist.length,
        });
        break;
      }
      default:
        sendResponse({ error: "Unknown message type" });
    }
  })();
  return true; // keep the message channel open for async
});

/* ---------- install / update ---------- */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({
      auditHistory: [],
      keywordHistory: [],
      premiumActive: false,
      licenseKey: "",
    });
  }
});
