/**
 * PastePure — Popup Script
 */
document.addEventListener('DOMContentLoaded', () => {
  const globalToggle = document.getElementById('globalToggle');
  const siteToggle = document.getElementById('siteToggle');
  const siteLabel = document.getElementById('siteLabel');
  const modePure = document.getElementById('modePure');
  const modeSmart = document.getElementById('modeSmart');
  const pasteCount = document.getElementById('pasteCount');

  let currentHostname = '';

  // Get current tab hostname
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        currentHostname = url.hostname;
        siteLabel.textContent = currentHostname || 'This site';
      } catch {
        siteLabel.textContent = 'This site';
      }
    }

    // Load settings
    chrome.storage.sync.get(
      ['globalEnabled', 'siteSettings', 'smartMode', 'pastesCleanedToday', 'pastesDate'],
      (result) => {
        // Global toggle
        const isGlobalEnabled = result.globalEnabled !== false;
        globalToggle.checked = isGlobalEnabled;

        // Site toggle
        const siteSettings = result.siteSettings || {};
        const isSiteEnabled = siteSettings[currentHostname] !== false;
        siteToggle.checked = isSiteEnabled;

        // Mode
        if (result.smartMode) {
          modeSmart.checked = true;
        } else {
          modePure.checked = true;
        }

        // Stats
        const today = new Date().toISOString().slice(0, 10);
        if (result.pastesDate === today) {
          pasteCount.textContent = result.pastesCleanedToday || 0;
        } else {
          pasteCount.textContent = '0';
        }
      }
    );
  });

  // Global toggle handler
  globalToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ globalEnabled: globalToggle.checked });
  });

  // Site toggle handler
  siteToggle.addEventListener('change', () => {
    chrome.storage.sync.get(['siteSettings'], (result) => {
      const siteSettings = result.siteSettings || {};
      siteSettings[currentHostname] = siteToggle.checked;
      chrome.storage.sync.set({ siteSettings });
    });
  });

  // Mode handlers
  modePure.addEventListener('change', () => {
    if (modePure.checked) {
      chrome.storage.sync.set({ smartMode: false });
    }
  });

  modeSmart.addEventListener('change', () => {
    if (modeSmart.checked) {
      chrome.storage.sync.set({ smartMode: true });
    }
  });
});
