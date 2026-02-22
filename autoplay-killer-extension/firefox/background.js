const COLOR_BLOCKING = "#22c55e";
const COLOR_WHITELISTED = "#9ca3af";

function todayKey() {
  return "blocked_" + new Date().toISOString().slice(0, 10);
}

async function incrementBlocked(count) {
  const key = todayKey();
  const data = await chrome.storage.local.get([key]);
  const current = data[key] || 0;
  await chrome.storage.local.set({ [key]: current + count });
}

async function getTodayBlocked() {
  const key = todayKey();
  const data = await chrome.storage.local.get([key]);
  return data[key] || 0;
}

async function updateBadge(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) return;
    const url = new URL(tab.url);
    const hostname = url.hostname;
    const data = await chrome.storage.local.get(["globalBlock", "whitelist"]);
    const globalBlock = data.globalBlock !== undefined ? data.globalBlock : true;
    const whitelist = data.whitelist || [];
    const isWhitelisted = !globalBlock || whitelist.includes(hostname);
    await chrome.action.setBadgeBackgroundColor({
      tabId,
      color: isWhitelisted ? COLOR_WHITELISTED : COLOR_BLOCKING,
    });
    await chrome.action.setBadgeText({
      tabId,
      text: isWhitelisted ? "OFF" : "ON",
    });
  } catch (_) {}
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "blocked") {
    incrementBlocked(msg.count);
    return;
  }
  if (msg.type === "getTodayBlocked") {
    getTodayBlocked().then((count) => sendResponse({ count }));
    return true;
  }
  if (msg.type === "getWhitelist") {
    chrome.storage.local.get(["whitelist"], (data) => {
      sendResponse({ whitelist: data.whitelist || [] });
    });
    return true;
  }
  if (msg.type === "setWhitelist") {
    chrome.storage.local.set({ whitelist: msg.whitelist }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg.type === "getGlobalBlock") {
    chrome.storage.local.get(["globalBlock"], (data) => {
      const val = data.globalBlock !== undefined ? data.globalBlock : true;
      sendResponse({ globalBlock: val });
    });
    return true;
  }
  if (msg.type === "setGlobalBlock") {
    chrome.storage.local.set({ globalBlock: msg.value }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg.type === "updateBadge") {
    if (sender.tab) {
      updateBadge(sender.tab.id);
    }
    return;
  }
});

chrome.tabs.onActivated.addListener((info) => {
  updateBadge(info.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    updateBadge(tabId);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["globalBlock", "whitelist"], (data) => {
    if (data.globalBlock === undefined) {
      chrome.storage.local.set({ globalBlock: true });
    }
    if (!data.whitelist) {
      chrome.storage.local.set({ whitelist: [] });
    }
  });
});
