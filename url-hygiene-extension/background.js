// All tracking params we strip, grouped by category
const TRACKING_PARAMS = {
  utm: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id'],
  facebook: ['fbclid', 'fb_action_ids', 'fb_action_types', 'fb_ref', 'fb_source'],
  google: ['gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid'],
  microsoft: ['msclkid'],
  hubspot: ['hsa_cam', 'hsa_grp', 'hsa_mt', 'hsa_src', 'hsa_ad', 'hsa_acc', 'hsa_net', 'hsa_ver', 'hsa_la', 'hsa_ol', 'hsa_kw', '_hsenc', '_hsmi', '__hstc', '__hsfp', '__hssc'],
  mailchimp: ['mc_cid', 'mc_eid'],
  adobe: ['s_cid'],
  generic: ['ref', 'referrer', '_ga', '_gl', 'igshid', 'si', 'feature', 'app']
};

const ALL_PARAMS = new Set(Object.values(TRACKING_PARAMS).flat());

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    enabled: true,
    paramsRemovedToday: 0,
    urlsCleanedSession: 0,
    todayKey: getTodayKey(),
    recentUrls: [],
    categoryToggles: {
      utm: true,
      facebook: true,
      google: true,
      microsoft: true,
      hubspot: true,
      mailchimp: true,
      adobe: true,
      generic: true
    }
  });
  chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
  chrome.action.setBadgeText({ text: '0' });
});

// Listen for matched rules (declarativeNetRequestFeedback)
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async (info) => {
  const { request } = info;
  const url = request.url;

  // Count how many tracking params were in the original URL
  let paramsStripped = 0;
  try {
    const urlObj = new URL(url);
    for (const [key] of urlObj.searchParams) {
      if (ALL_PARAMS.has(key)) {
        paramsStripped++;
      }
    }
  } catch {
    paramsStripped = 1;
  }

  if (paramsStripped === 0) return;

  const data = await chrome.storage.local.get(['paramsRemovedToday', 'urlsCleanedSession', 'todayKey', 'recentUrls', 'enabled']);

  if (!data.enabled) return;

  const today = getTodayKey();
  let paramsToday = data.paramsRemovedToday || 0;
  let urlsSession = data.urlsCleanedSession || 0;
  let recentUrls = data.recentUrls || [];

  // Reset daily count if new day
  if (data.todayKey !== today) {
    paramsToday = 0;
  }

  paramsToday += paramsStripped;
  urlsSession += 1;

  // Add to recent URLs (keep last 20)
  let cleanUrl = url;
  try {
    const urlObj = new URL(url);
    const cleanParams = new URLSearchParams();
    for (const [key, value] of urlObj.searchParams) {
      if (!ALL_PARAMS.has(key)) {
        cleanParams.set(key, value);
      }
    }
    urlObj.search = cleanParams.toString();
    cleanUrl = urlObj.toString();
  } catch {
    // keep original
  }

  recentUrls.unshift({
    original: url,
    cleaned: cleanUrl,
    paramsRemoved: paramsStripped,
    timestamp: Date.now()
  });
  recentUrls = recentUrls.slice(0, 20);

  await chrome.storage.local.set({
    paramsRemovedToday: paramsToday,
    urlsCleanedSession: urlsSession,
    todayKey: today,
    recentUrls
  });

  // Update badge
  chrome.action.setBadgeText({ text: String(paramsToday) });
});

// Also listen for navigation events as a fallback counter
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // main frame only

  const url = details.url;
  let paramsStripped = 0;
  try {
    const urlObj = new URL(url);
    for (const [key] of urlObj.searchParams) {
      if (ALL_PARAMS.has(key)) {
        paramsStripped++;
      }
    }
  } catch {
    return;
  }

  if (paramsStripped === 0) return;

  const data = await chrome.storage.local.get(['paramsRemovedToday', 'urlsCleanedSession', 'todayKey', 'recentUrls', 'enabled']);

  if (!data.enabled) return;

  const today = getTodayKey();
  let paramsToday = data.paramsRemovedToday || 0;
  let urlsSession = data.urlsCleanedSession || 0;
  let recentUrls = data.recentUrls || [];

  if (data.todayKey !== today) {
    paramsToday = 0;
  }

  paramsToday += paramsStripped;
  urlsSession += 1;

  let cleanUrl = url;
  try {
    const urlObj = new URL(url);
    const cleanParams = new URLSearchParams();
    for (const [key, value] of urlObj.searchParams) {
      if (!ALL_PARAMS.has(key)) {
        cleanParams.set(key, value);
      }
    }
    urlObj.search = cleanParams.toString();
    cleanUrl = urlObj.toString();
  } catch {
    // keep original
  }

  recentUrls.unshift({
    original: url,
    cleaned: cleanUrl,
    paramsRemoved: paramsStripped,
    timestamp: Date.now()
  });
  recentUrls = recentUrls.slice(0, 20);

  await chrome.storage.local.set({
    paramsRemovedToday: paramsToday,
    urlsCleanedSession: urlsSession,
    todayKey: today,
    recentUrls
  });

  chrome.action.setBadgeText({ text: String(paramsToday) });
}, { url: [{ schemes: ['http', 'https'] }] });

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getStats') {
    chrome.storage.local.get(['paramsRemovedToday', 'urlsCleanedSession', 'recentUrls', 'enabled', 'categoryToggles'], (data) => {
      sendResponse(data);
    });
    return true;
  }

  if (message.type === 'toggleEnabled') {
    chrome.storage.local.set({ enabled: message.enabled }, async () => {
      if (message.enabled) {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          enableRulesetIds: ['tracking_rules']
        });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
      } else {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          disableRulesetIds: ['tracking_rules']
        });
        chrome.action.setBadgeBackgroundColor({ color: '#6b7280' });
        chrome.action.setBadgeText({ text: 'OFF' });
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'updateCategoryToggles') {
    chrome.storage.local.set({ categoryToggles: message.categoryToggles }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'cleanUrl') {
    const cleaned = cleanUrlManually(message.url);
    sendResponse({ cleaned });
    return true;
  }

  if (message.type === 'resetStats') {
    chrome.storage.local.set({
      paramsRemovedToday: 0,
      urlsCleanedSession: 0,
      recentUrls: []
    }, () => {
      chrome.action.setBadgeText({ text: '0' });
      sendResponse({ success: true });
    });
    return true;
  }
});

function cleanUrlManually(urlString) {
  try {
    const urlObj = new URL(urlString);
    const cleanParams = new URLSearchParams();
    for (const [key, value] of urlObj.searchParams) {
      if (!ALL_PARAMS.has(key)) {
        cleanParams.set(key, value);
      }
    }
    urlObj.search = cleanParams.toString();
    return urlObj.toString();
  } catch {
    return urlString;
  }
}
