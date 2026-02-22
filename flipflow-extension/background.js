/* ===================================================================
   FlipFlow — background.js (service worker)
   Handles alarms for scheduled sharing, stats tracking, badge updates.
   =================================================================== */

const STORAGE_KEYS = {
  SAVED_LISTINGS: 'flipflow_saved_listings',
  CROSS_POSTS: 'flipflow_cross_posts',
  SHARE_STATS: 'flipflow_share_stats',
  PREMIUM: 'flipflow_premium',
  DAILY_USAGE: 'flipflow_daily_usage',
  SCHEDULED_SHARES: 'flipflow_scheduled_shares',
};

/* ------------------------------------------------------------------
   Install / startup
   ------------------------------------------------------------------ */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    /* set default storage values */
    chrome.storage.local.set({
      [STORAGE_KEYS.SAVED_LISTINGS]: [],
      [STORAGE_KEYS.CROSS_POSTS]: {},
      [STORAGE_KEYS.SHARE_STATS]: {},
      [STORAGE_KEYS.DAILY_USAGE]: {},
      [STORAGE_KEYS.PREMIUM]: false,
      [STORAGE_KEYS.SCHEDULED_SHARES]: [],
    });
  }

  /* create daily reset alarm */
  chrome.alarms.create('daily-reset', {
    when: getNextMidnight(),
    periodInMinutes: 24 * 60,
  });
});

/* ------------------------------------------------------------------
   Alarms
   ------------------------------------------------------------------ */

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'daily-reset') {
    /* badge resets each day */
    chrome.action.setBadgeText({ text: '' });
  }

  if (alarm.name.startsWith('scheduled-share-')) {
    /* trigger a share session on poshmark */
    const tabs = await chrome.tabs.query({ url: '*://poshmark.com/*' });
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'TRIGGER_SHARE_ALL' });
    } else {
      /* open Poshmark closet then trigger */
      const tab = await chrome.tabs.create({
        url: 'https://poshmark.com/closet',
        active: false,
      });
      /* give it time to load */
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_SHARE_ALL' });
      }, 8000);
    }
  }
});

/* ------------------------------------------------------------------
   Message handling
   ------------------------------------------------------------------ */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SHARES_COMPLETED':
      updateBadge(message.count);
      break;

    case 'GET_STATS':
      handleGetStats().then(sendResponse);
      return true; /* async sendResponse */

    case 'GET_LISTINGS':
      chrome.storage.local.get(STORAGE_KEYS.SAVED_LISTINGS, (result) => {
        sendResponse(result[STORAGE_KEYS.SAVED_LISTINGS] || []);
      });
      return true;

    case 'DELETE_LISTING':
      handleDeleteListing(message.id).then(sendResponse);
      return true;

    case 'GET_CROSS_POSTS':
      chrome.storage.local.get(STORAGE_KEYS.CROSS_POSTS, (result) => {
        sendResponse(result[STORAGE_KEYS.CROSS_POSTS] || {});
      });
      return true;

    case 'SCHEDULE_SHARES':
      handleScheduleShares(message.times).then(sendResponse);
      return true;

    case 'GET_PREMIUM':
      chrome.storage.local.get(STORAGE_KEYS.PREMIUM, (result) => {
        sendResponse(result[STORAGE_KEYS.PREMIUM] || false);
      });
      return true;

    case 'SET_PREMIUM':
      chrome.storage.local.set({ [STORAGE_KEYS.PREMIUM]: message.value }, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'GET_DAILY_USAGE':
      handleGetDailyUsage().then(sendResponse);
      return true;

    case 'MARK_SOLD':
      handleMarkSold(message.id, message.soldOn).then(sendResponse);
      return true;

    case 'GET_DELIST_TARGETS':
      handleGetDelistTargets(message.id).then(sendResponse);
      return true;
  }
});

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function updateBadge(shareCount) {
  const stats = await getFromStorage(STORAGE_KEYS.SHARE_STATS);
  const today = todayKey();
  const todayTotal = (stats?.[today] || 0);
  chrome.action.setBadgeText({ text: String(todayTotal) });
  chrome.action.setBadgeBackgroundColor({ color: '#4F46E5' });
}

async function getFromStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => resolve(result[key]));
  });
}

async function handleGetStats() {
  const stats = (await getFromStorage(STORAGE_KEYS.SHARE_STATS)) || {};
  const listings = (await getFromStorage(STORAGE_KEYS.SAVED_LISTINGS)) || [];
  const crossPosts = (await getFromStorage(STORAGE_KEYS.CROSS_POSTS)) || {};
  const usage = (await getFromStorage(STORAGE_KEYS.DAILY_USAGE)) || {};
  const today = todayKey();

  /* last 7 days share history */
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    last7.push({ date: key, shares: stats[key] || 0 });
  }

  return {
    todayShares: stats[today] || 0,
    totalListings: listings.length,
    crossPostCount: Object.keys(crossPosts).length,
    last7,
    todayUsage: usage[today] || { shares: 0, copies: 0 },
  };
}

async function handleDeleteListing(id) {
  let listings = (await getFromStorage(STORAGE_KEYS.SAVED_LISTINGS)) || [];
  listings = listings.filter((l) => l.id !== id);
  await new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.SAVED_LISTINGS]: listings }, resolve);
  });
  return { success: true };
}

async function handleGetDailyUsage() {
  const usage = (await getFromStorage(STORAGE_KEYS.DAILY_USAGE)) || {};
  const today = todayKey();
  return usage[today] || { shares: 0, copies: 0 };
}

async function handleMarkSold(listingId, soldOnPlatform) {
  const listings = (await getFromStorage(STORAGE_KEYS.SAVED_LISTINGS)) || [];
  const listing = listings.find((l) => l.id === listingId);
  if (!listing) return { success: false, error: 'Listing not found' };

  listing.sold = true;
  listing.soldOn = soldOnPlatform;
  listing.soldAt = new Date().toISOString();

  await new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.SAVED_LISTINGS]: listings }, resolve);
  });

  return { success: true, listing };
}

async function handleGetDelistTargets(listingId) {
  const crossPosts = (await getFromStorage(STORAGE_KEYS.CROSS_POSTS)) || {};
  const platforms = crossPosts[listingId] || [];
  const listings = (await getFromStorage(STORAGE_KEYS.SAVED_LISTINGS)) || [];
  const listing = listings.find((l) => l.id === listingId);

  if (!listing) return { targets: [], listing: null };

  /* return platforms where this item is still listed (excluding where it sold) */
  const targets = platforms.filter((p) => p !== listing.soldOn);
  return { targets, listing };
}

async function handleScheduleShares(times) {
  /* clear existing share alarms */
  const alarms = await chrome.alarms.getAll();
  for (const alarm of alarms) {
    if (alarm.name.startsWith('scheduled-share-')) {
      await chrome.alarms.clear(alarm.name);
    }
  }

  /* create new alarms */
  for (const time of times) {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    chrome.alarms.create(`scheduled-share-${time}`, {
      when: target.getTime(),
      periodInMinutes: 24 * 60,
    });
  }

  await new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.SCHEDULED_SHARES]: times }, resolve);
  });

  return { success: true, scheduled: times.length };
}
