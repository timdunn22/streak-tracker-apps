// Clean Copy — Content Script
// Runs at document_start in all frames on all URLs.

(function () {
  'use strict';

  let config = {
    active: true,
    enableRightClick: true,
    enableCopy: true,
    enableSelection: true,
    enablePaste: true,
    cleanPaste: false
  };

  function getHostname() {
    try { return location.hostname; } catch (e) { return ''; }
  }

  // ---- Load settings ----
  function loadSettings() {
    try {
      chrome.runtime.sendMessage(
        { type: 'getSettings', hostname: getHostname() },
        (response) => {
          if (chrome.runtime.lastError) return;
          if (response && response.effective) {
            config = response.effective;
            applyAll();
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

  // ---- Override addEventListener ----
  const blockedEvents = ['contextmenu', 'copy', 'selectstart', 'paste', 'cut'];
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
  const wrappedListeners = new WeakMap();

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (blockedEvents.includes(type) && typeof listener === 'function') {
      const shouldBlock = () => {
        if (!config.active) return false;
        if (type === 'contextmenu' && config.enableRightClick) return true;
        if ((type === 'copy' || type === 'cut') && config.enableCopy) return true;
        if (type === 'selectstart' && config.enableSelection) return true;
        if (type === 'paste' && config.enablePaste) return true;
        return false;
      };

      const wrappedListener = function (e) {
        if (shouldBlock()) return;
        return listener.call(this, e);
      };

      if (!wrappedListeners.has(listener)) {
        wrappedListeners.set(listener, new Map());
      }
      wrappedListeners.get(listener).set(type, wrappedListener);
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    return originalAddEventListener.call(this, type, listener, options);
  };

  EventTarget.prototype.removeEventListener = function (type, listener, options) {
    if (blockedEvents.includes(type) && typeof listener === 'function') {
      const listenerMap = wrappedListeners.get(listener);
      if (listenerMap && listenerMap.has(type)) {
        const wrappedListener = listenerMap.get(type);
        listenerMap.delete(type);
        return originalRemoveEventListener.call(this, type, wrappedListener, options);
      }
    }
    return originalRemoveEventListener.call(this, type, listener, options);
  };

  // ---- Override Event.preventDefault for blocked events ----
  const originalPreventDefault = Event.prototype.preventDefault;
  Event.prototype.preventDefault = function () {
    if (config.active && blockedEvents.includes(this.type)) {
      if (this.type === 'contextmenu' && config.enableRightClick) return;
      if ((this.type === 'copy' || this.type === 'cut') && config.enableCopy) return;
      if (this.type === 'selectstart' && config.enableSelection) return;
      if (this.type === 'paste' && config.enablePaste && !config.cleanPaste) return;
    }
    return originalPreventDefault.call(this);
  };

  // ---- Clean paste handler ----
  function cleanPasteHandler(e) {
    if (!config.active || !config.cleanPaste) return;
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const plainText = clipboardData.getData('text/plain');
    if (plainText) {
      e.preventDefault();
      const target = e.target;
      if (target.isContentEditable || target.tagName === 'DIV') {
        document.execCommand('insertText', false, plainText);
      } else if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const value = target.value;
        target.value = value.slice(0, start) + plainText + value.slice(end);
        target.selectionStart = target.selectionEnd = start + plainText.length;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  // ---- CSS injection to re-enable selection ----
  let styleEl = null;

  function injectSelectionCSS() {
    if (styleEl) return;
    const inject = () => {
      if (document.head || document.documentElement) {
        styleEl = document.createElement('style');
        styleEl.id = '__clean_copy_style__';
        styleEl.textContent = [
          '*, *::before, *::after {',
          '  -webkit-user-select: text !important;',
          '  -moz-user-select: text !important;',
          '  -ms-user-select: text !important;',
          '  user-select: text !important;',
          '}'
        ].join('\n');
        (document.head || document.documentElement).appendChild(styleEl);
      }
    };
    inject();
    if (!styleEl) {
      document.addEventListener('DOMContentLoaded', inject, { once: true });
    }
  }

  function removeSelectionCSS() {
    if (styleEl) {
      styleEl.remove();
      styleEl = null;
    }
  }

  // ---- Inline handler removal ----
  function cleanInlineHandlers(root) {
    if (!root || !root.querySelectorAll) return;
    const elements = root.querySelectorAll('*');
    const allElements = [root, ...elements];

    allElements.forEach((el) => {
      if (!el || !el.removeAttribute) return;

      if (config.active && config.enableRightClick) {
        if (el.hasAttribute && el.hasAttribute('oncontextmenu')) el.removeAttribute('oncontextmenu');
        el.oncontextmenu = null;
      }
      if (config.active && config.enableCopy) {
        if (el.hasAttribute && el.hasAttribute('oncopy')) el.removeAttribute('oncopy');
        el.oncopy = null;
        if (el.hasAttribute && el.hasAttribute('oncut')) el.removeAttribute('oncut');
        el.oncut = null;
      }
      if (config.active && config.enableSelection) {
        if (el.hasAttribute && el.hasAttribute('onselectstart')) el.removeAttribute('onselectstart');
        el.onselectstart = null;
        if (el.hasAttribute && el.hasAttribute('ondragstart')) el.removeAttribute('ondragstart');
        if (el.style) {
          const us = el.style.userSelect || el.style.webkitUserSelect || el.style.getPropertyValue('user-select');
          if (us === 'none') {
            el.style.removeProperty('user-select');
            el.style.removeProperty('-webkit-user-select');
            el.style.removeProperty('-moz-user-select');
            el.style.removeProperty('-ms-user-select');
          }
        }
      }
      if (config.active && config.enablePaste) {
        if (el.hasAttribute && el.hasAttribute('onpaste')) el.removeAttribute('onpaste');
        el.onpaste = null;
      }
    });
  }

  // ---- MutationObserver ----
  let observer = null;

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) cleanInlineHandlers(node);
          });
        } else if (mutation.type === 'attributes') {
          const el = mutation.target;
          if (el.nodeType !== 1) return;
          const attr = mutation.attributeName;
          if (
            (attr === 'oncontextmenu' && config.enableRightClick) ||
            (attr === 'oncopy' && config.enableCopy) ||
            (attr === 'oncut' && config.enableCopy) ||
            (attr === 'onselectstart' && config.enableSelection) ||
            (attr === 'onpaste' && config.enablePaste)
          ) {
            if (el.hasAttribute(attr)) el.removeAttribute(attr);
          }
          if (attr === 'style' && config.enableSelection && el.style) {
            const us = el.style.userSelect || el.style.webkitUserSelect;
            if (us === 'none') {
              el.style.removeProperty('user-select');
              el.style.removeProperty('-webkit-user-select');
              el.style.removeProperty('-moz-user-select');
              el.style.removeProperty('-ms-user-select');
            }
          }
        }
      }
    });

    const target = document.documentElement || document.body;
    if (target) {
      observer.observe(target, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['oncontextmenu', 'oncopy', 'oncut', 'onselectstart', 'onpaste', 'style']
      });
    }
  }

  function stopObserver() {
    if (observer) { observer.disconnect(); observer = null; }
  }

  // ---- Apply all protections ----
  function applyAll() {
    if (config.active && config.enableSelection) {
      injectSelectionCSS();
    } else {
      removeSelectionCSS();
    }

    if (document.documentElement) {
      cleanInlineHandlers(document.documentElement);
    }

    stopObserver();
    if (config.active) startObserver();

    document.removeEventListener('paste', cleanPasteHandler, true);
    if (config.active && config.cleanPaste) {
      originalAddEventListener.call(document, 'paste', cleanPasteHandler, true);
    }
  }

  // ---- Initialize ----
  loadSettings();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyAll());
  } else {
    applyAll();
  }

  // Expose for testing
  window.__cleanCopyConfig = config;
  window.__cleanCopyApply = applyAll;
})();
