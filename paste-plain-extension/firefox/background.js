/**
 * PastePure — Background Service Worker
 * Manages per-site enable/disable and badge state.
 */

// Set badge on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['globalEnabled'], (result) => {
    const isEnabled = result.globalEnabled !== false;
    updateBadge(isEnabled);
  });
});

// Update badge when storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.globalEnabled) {
    updateBadge(changes.globalEnabled.newValue);
  }
});

function updateBadge(isEnabled) {
  if (isEnabled) {
    chrome.action.setBadgeText({ text: 'P' });
    chrome.action.setBadgeBackgroundColor({ color: '#48c774' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// On startup, set badge
chrome.storage.sync.get(['globalEnabled'], (result) => {
  const isEnabled = result.globalEnabled !== false;
  updateBadge(isEnabled);
});
