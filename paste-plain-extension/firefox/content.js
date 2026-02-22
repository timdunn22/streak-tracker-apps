/**
 * PastePure — Content Script
 * Intercepts all paste events and strips formatting.
 */
(function () {
  'use strict';

  let enabled = true;
  let globalEnabled = true;
  let smartMode = false;
  let pastesCleanedToday = 0;

  // Load settings from storage
  function loadSettings() {
    const hostname = location.hostname;
    chrome.storage.sync.get(
      ['globalEnabled', 'siteSettings', 'smartMode', 'pastesCleanedToday', 'pastesDate'],
      (result) => {
        globalEnabled = result.globalEnabled !== false; // default true
        smartMode = result.smartMode === true;

        const today = new Date().toISOString().slice(0, 10);
        if (result.pastesDate === today) {
          pastesCleanedToday = result.pastesCleanedToday || 0;
        } else {
          pastesCleanedToday = 0;
        }

        const siteSettings = result.siteSettings || {};
        enabled = siteSettings[hostname] !== false; // default true
      }
    );
  }

  loadSettings();

  // Listen for setting changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.globalEnabled) {
      globalEnabled = changes.globalEnabled.newValue;
    }
    if (changes.smartMode) {
      smartMode = changes.smartMode.newValue;
    }
    if (changes.siteSettings) {
      const hostname = location.hostname;
      const siteSettings = changes.siteSettings.newValue || {};
      enabled = siteSettings[hostname] !== false;
    }
    if (changes.pastesCleanedToday) {
      pastesCleanedToday = changes.pastesCleanedToday.newValue || 0;
    }
  });

  /**
   * Convert HTML to smart-paste text: preserves line breaks and links,
   * strips fonts/colors/sizes.
   */
  function htmlToSmartText(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    function walk(node) {
      let text = '';
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          text += child.textContent;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const tag = child.tagName.toLowerCase();

          // Block-level elements get line breaks
          const blockTags = [
            'p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'li', 'tr', 'blockquote', 'pre', 'hr', 'section', 'article'
          ];

          if (tag === 'br') {
            text += '\n';
            continue;
          }

          if (tag === 'a' && child.href) {
            const linkText = walk(child);
            const href = child.getAttribute('href') || '';
            if (href && href !== linkText && !href.startsWith('javascript:')) {
              text += linkText + ' (' + href + ')';
            } else {
              text += linkText;
            }
            continue;
          }

          // Table cells get tab separation
          if (tag === 'td' || tag === 'th') {
            text += walk(child) + '\t';
            continue;
          }

          const childText = walk(child);

          if (blockTags.includes(tag)) {
            text += '\n' + childText + '\n';
          } else {
            text += childText;
          }
        }
      }
      return text;
    }

    let result = walk(doc.body);
    // Clean up multiple consecutive newlines
    result = result.replace(/\n{3,}/g, '\n\n').trim();
    // Clean up tabs at end of table rows
    result = result.replace(/\t\n/g, '\n');
    return result;
  }

  /**
   * Convert HTML table to tab-separated text
   */
  function htmlTableToText(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tables = doc.querySelectorAll('table');

    if (tables.length === 0) return null;

    let result = '';
    tables.forEach((table) => {
      const rows = table.querySelectorAll('tr');
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td, th');
        const cellTexts = [];
        cells.forEach((cell) => {
          cellTexts.push(cell.textContent.trim());
        });
        result += cellTexts.join('\t') + '\n';
      });
    });

    return result.trim();
  }

  /**
   * Show a brief green flash on the target element
   */
  function showVisualFeedback(element) {
    const origTransition = element.style.transition;
    const origBoxShadow = element.style.boxShadow;
    const origOutline = element.style.outline;

    element.style.transition = 'box-shadow 0.15s ease, outline 0.15s ease';
    element.style.boxShadow = '0 0 0 3px rgba(72, 199, 116, 0.6)';
    element.style.outline = '2px solid rgba(72, 199, 116, 0.8)';

    setTimeout(() => {
      element.style.transition = 'box-shadow 0.4s ease, outline 0.4s ease';
      element.style.boxShadow = origBoxShadow;
      element.style.outline = origOutline;
      setTimeout(() => {
        element.style.transition = origTransition;
      }, 400);
    }, 300);
  }

  /**
   * Increment paste counter
   */
  function incrementPasteCount() {
    pastesCleanedToday++;
    const today = new Date().toISOString().slice(0, 10);
    chrome.storage.sync.set({
      pastesCleanedToday: pastesCleanedToday,
      pastesDate: today
    });
  }

  /**
   * Main paste handler
   */
  function handlePaste(e) {
    if (!enabled || !globalEnabled) return;

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const htmlData = clipboardData.getData('text/html');
    const plainData = clipboardData.getData('text/plain');

    // If there is no HTML data, let normal paste happen (it is already plain)
    if (!htmlData) return;

    e.preventDefault();
    e.stopPropagation();

    let textToInsert;

    if (smartMode) {
      // Smart mode: check for tables first
      const tableText = htmlTableToText(htmlData);
      if (tableText) {
        textToInsert = tableText;
      } else {
        textToInsert = htmlToSmartText(htmlData);
      }
    } else {
      // Pure plain text mode
      textToInsert = plainData || '';
    }

    const target = e.target;

    // Handle textarea and input elements
    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      target.value = value.substring(0, start) + textToInsert + value.substring(end);
      const newPos = start + textToInsert.length;
      target.selectionStart = newPos;
      target.selectionEnd = newPos;
      // Fire input event so frameworks detect the change
      target.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // For contenteditable elements (Gmail, Docs, Notion, Slack, etc.)
      // Use execCommand insertText which respects undo stack
      const success = document.execCommand('insertText', false, textToInsert);
      if (!success) {
        // Fallback: use InputEvent
        const inputEvent = new InputEvent('beforeinput', {
          inputType: 'insertText',
          data: textToInsert,
          bubbles: true,
          cancelable: true
        });
        target.dispatchEvent(inputEvent);
      }
    }

    showVisualFeedback(target);
    incrementPasteCount();
  }

  // Attach paste handler on the document at capture phase to intercept early
  document.addEventListener('paste', handlePaste, true);
})();
