// Clean Copy — Background Service Worker (MV3)

const DEFAULT_SETTINGS = {
  globalEnabled: true,
  enableRightClick: true,
  enableCopy: true,
  enableSelection: true,
  enablePaste: true,
  cleanPaste: false,
  perSite: {}
};

// Initialize settings on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('settings', (result) => {
    if (!result.settings) {
      chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    }
  });
});

// Update badge color and text
function updateBadge(tabId, isActive) {
  const opts = tabId ? { tabId } : {};
  if (isActive) {
    chrome.action.setBadgeText({ text: 'ON', ...opts });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e', ...opts });
  } else {
    chrome.action.setBadgeText({ text: 'OFF', ...opts });
    chrome.action.setBadgeBackgroundColor({ color: '#6b7280', ...opts });
  }
}

// Get effective settings for a hostname
function getEffectiveSettings(settings, hostname) {
  if (!settings.globalEnabled) {
    return { active: false };
  }
  const siteSettings = settings.perSite[hostname];
  if (siteSettings && siteSettings.enabled === false) {
    return { active: false };
  }
  const effective = {
    active: true,
    enableRightClick: settings.enableRightClick,
    enableCopy: settings.enableCopy,
    enableSelection: settings.enableSelection,
    enablePaste: settings.enablePaste,
    cleanPaste: settings.cleanPaste
  };
  if (siteSettings) {
    Object.keys(siteSettings).forEach((key) => {
      if (key !== 'enabled' && siteSettings[key] !== undefined) {
        effective[key] = siteSettings[key];
      }
    });
  }
  return effective;
}

// Listen for tab updates to set badge
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const url = new URL(tab.url);
      chrome.storage.local.get('settings', (result) => {
        const settings = result.settings || DEFAULT_SETTINGS;
        const effective = getEffectiveSettings(settings, url.hostname);
        updateBadge(tabId, effective.active);
      });
    } catch (e) {
      updateBadge(tabId, false);
    }
  }
});

// Listen for tab activation to update badge
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab.url) return;
    try {
      const url = new URL(tab.url);
      chrome.storage.local.get('settings', (result) => {
        const settings = result.settings || DEFAULT_SETTINGS;
        const effective = getEffectiveSettings(settings, url.hostname);
        updateBadge(activeInfo.tabId, effective.active);
      });
    } catch (e) {
      updateBadge(activeInfo.tabId, false);
    }
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getSettings') {
    chrome.storage.local.get('settings', (result) => {
      const settings = result.settings || DEFAULT_SETTINGS;
      if (message.hostname) {
        const effective = getEffectiveSettings(settings, message.hostname);
        sendResponse({ settings, effective });
      } else {
        sendResponse({ settings });
      }
    });
    return true;
  }

  if (message.type === 'updateSettings') {
    chrome.storage.local.set({ settings: message.settings }, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            try {
              chrome.tabs.sendMessage(tab.id, { type: 'settingsUpdated' });
            } catch (e) { /* Tab might not have content script */ }
            if (tab.url) {
              try {
                const url = new URL(tab.url);
                const effective = getEffectiveSettings(message.settings, url.hostname);
                updateBadge(tab.id, effective.active);
              } catch (e) { /* ignore */ }
            }
          }
        });
      });
      sendResponse({ success: true });
    });
    return true;
  }
});
