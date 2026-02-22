// Clean Copy — Isolated Content Script (Firefox version)
// Handles Chrome API communication, passes settings to MAIN world script.
// Also injects content-main.js into the page's MAIN world via <script> tag
// since Firefox < 128 does not support "world": "MAIN" in manifest.json.

(function () {
  'use strict';

  // Inject content-main.js into the MAIN world
  function injectMainWorldScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content-main.js');
    script.onload = function () {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  // Inject as early as possible
  if (document.head || document.documentElement) {
    injectMainWorldScript();
  } else {
    // If neither head nor documentElement exist yet, wait for them
    const observer = new MutationObserver(() => {
      if (document.head || document.documentElement) {
        observer.disconnect();
        injectMainWorldScript();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  }

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
