// Clean Copy — Isolated Content Script
// Handles Chrome API communication, passes settings to MAIN world script.

(function () {
  'use strict';

  function getHostname() {
    try { return location.hostname; } catch (e) { return ''; }
  }

  function loadSettings() {
    try {
      chrome.runtime.sendMessage(
        { type: 'getSettings', hostname: getHostname() },
        (response) => {
          if (chrome.runtime.lastError) return;
          if (response && response.effective) {
            window.postMessage({ type: '__cleanCopy_settings', config: response.effective }, '*');
          }
        }
      );
    } catch (e) { /* Extension context invalidated */ }
  }

  try {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'settingsUpdated') {
        loadSettings();
      }
    });
  } catch (e) { /* Extension context might be invalidated */ }

  loadSettings();
})();
