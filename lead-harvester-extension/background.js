/* ============================================
   LeadHarvest — Background Service Worker
   Manifest V3
   ============================================ */

// ---- Constants ----
const STORAGE_KEYS = {
  leads: 'lh_leads',
  dailyCount: 'lh_daily_count',
  dailyDate: 'lh_daily_date',
  totalLifetime: 'lh_total_lifetime',
  isPremium: 'lh_is_premium',
  licenseKey: 'lh_license_key',
};

// ---- Message Handler ----
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_PAGE') {
    // Fetch a web page to scan for emails (avoids CORS in content script)
    fetchPage(message.url)
      .then((text) => sendResponse({ success: true, text }))
      .catch((err) =>
        sendResponse({ success: false, error: err.message })
      );
    return true; // Keep the message channel open for async response
  }

  if (message.type === 'LEADS_SCRAPED') {
    // Update badge with lead count
    updateBadge();
    return false;
  }

  if (message.type === 'GET_STATS') {
    getStats()
      .then((stats) => sendResponse(stats))
      .catch(() => sendResponse(null));
    return true;
  }

  if (message.type === 'EXPORT_LEADS') {
    chrome.storage.local.get([STORAGE_KEYS.leads], (data) => {
      sendResponse({ leads: data[STORAGE_KEYS.leads] || [] });
    });
    return true;
  }

  if (message.type === 'CLEAR_LEADS') {
    chrome.storage.local.set(
      { [STORAGE_KEYS.leads]: [] },
      () => {
        updateBadge();
        sendResponse({ success: true });
      }
    );
    return true;
  }
});

// ---- Fetch page for email scanning ----
async function fetchPage(url) {
  try {
    // Normalize URL
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    // Only return first 500KB to avoid memory issues
    return text.slice(0, 500000);
  } catch (err) {
    throw new Error(`Fetch failed: ${err.message}`);
  }
}

// ---- Badge ----
async function updateBadge() {
  try {
    const data = await chrome.storage.local.get([STORAGE_KEYS.leads]);
    const leads = data[STORAGE_KEYS.leads] || [];
    const count = leads.length;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#7b2ff7' });
  } catch (err) {
    // Service worker may be inactive
  }
}

// ---- Stats ----
async function getStats() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.leads,
    STORAGE_KEYS.dailyCount,
    STORAGE_KEYS.dailyDate,
    STORAGE_KEYS.totalLifetime,
    STORAGE_KEYS.isPremium,
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const dailyCount =
    data[STORAGE_KEYS.dailyDate] === today
      ? data[STORAGE_KEYS.dailyCount] || 0
      : 0;

  const leads = data[STORAGE_KEYS.leads] || [];
  const emailCount = leads.filter((l) => l.email).length;
  const phoneCount = leads.filter((l) => l.phone).length;

  return {
    totalLeads: leads.length,
    dailyCount,
    lifetime: data[STORAGE_KEYS.totalLifetime] || 0,
    emailCount,
    phoneCount,
    isPremium: !!data[STORAGE_KEYS.isPremium],
  };
}

// ---- Installation ----
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      [STORAGE_KEYS.leads]: [],
      [STORAGE_KEYS.dailyCount]: 0,
      [STORAGE_KEYS.dailyDate]: new Date().toISOString().slice(0, 10),
      [STORAGE_KEYS.totalLifetime]: 0,
      [STORAGE_KEYS.isPremium]: false,
      [STORAGE_KEYS.licenseKey]: '',
    });
  }
});

// ---- Startup badge update ----
updateBadge();
