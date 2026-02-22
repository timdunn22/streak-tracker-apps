/* ==========================================================
   content.js  —  ColdFlow Gmail Content Script
   Injects template picker into compose windows, handles
   merge field highlighting, and sequence email sending.
   ========================================================== */

'use strict';

(() => {
  /* ---- State ---- */
  let templates = [];
  let dropdown  = null;
  const injectedComposeWindows = new WeakSet();

  /* ---- Init ---- */
  init();

  async function init() {
    templates = await _msg('get-templates') || [];
    _observeCompose();
    _listenForMessages();
  }

  /* ==========================================================
     Compose Window Observer
     Gmail dynamically creates compose windows. We use a
     MutationObserver to detect them and inject our button.
     ========================================================== */

  function _observeCompose() {
    const observer = new MutationObserver(_onMutation);
    observer.observe(document.body, { childList: true, subtree: true });
    // Also check immediately for any already-open compose windows
    _scanForCompose();
  }

  function _onMutation(mutations) {
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        _scanForCompose();
      }
    }
  }

  function _scanForCompose() {
    // Gmail compose: look for contenteditable with role="textbox"
    // and aria-label containing "Message Body"
    const editors = document.querySelectorAll(
      'div[role="textbox"][aria-label*="Message Body"], ' +
      'div[role="textbox"][aria-label*="message body"], ' +
      'div[contenteditable="true"][aria-label*="Message Body"]'
    );

    editors.forEach(editor => {
      const composeRoot = _findComposeRoot(editor);
      if (!composeRoot || injectedComposeWindows.has(composeRoot)) return;
      injectedComposeWindows.add(composeRoot);
      _injectTemplateButton(composeRoot, editor);
    });
  }

  /**
   * Walk up to find the compose container. Gmail wraps compose
   * in a div with data-message-id or a table-based layout.
   * We look for a common ancestor pattern.
   */
  function _findComposeRoot(editor) {
    let el = editor;
    for (let i = 0; i < 20; i++) {
      if (!el.parentElement) return el;
      el = el.parentElement;
      // Gmail compose containers often have these attributes
      if (el.getAttribute('data-message-id') ||
          el.classList.contains('M9') ||
          el.classList.contains('AD') ||
          (el.tagName === 'DIV' && el.querySelector('[role="textbox"]') === editor && el.querySelector('[data-tooltip]'))) {
        return el;
      }
    }
    return editor.parentElement;
  }

  /* ==========================================================
     Template Button Injection
     ========================================================== */

  function _injectTemplateButton(composeRoot, editor) {
    // Find the toolbar area  —  Gmail's send button row
    const sendButton = composeRoot.querySelector(
      'div[data-tooltip*="Send"], ' +
      'div[aria-label*="Send"], ' +
      '[data-tooltip="Send"]'
    );

    const toolbar = sendButton
      ? sendButton.parentElement
      : composeRoot.querySelector('tr.btC td.gU, .btC, .IZ');

    if (!toolbar) {
      // Fallback: insert just above the editor
      const btn = _createTemplateButton(editor);
      editor.parentElement.insertBefore(btn, editor);
      return;
    }

    const btn = _createTemplateButton(editor);
    toolbar.appendChild(btn);
  }

  function _createTemplateButton(editor) {
    const btn = document.createElement('button');
    btn.className = 'cf-template-btn';
    btn.setAttribute('data-coldflow', 'template-btn');
    btn.setAttribute('type', 'button');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
      </svg>
      Templates
    `;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      _toggleDropdown(btn, editor);
    });

    return btn;
  }

  /* ==========================================================
     Template Dropdown
     ========================================================== */

  function _toggleDropdown(anchorBtn, editor) {
    if (dropdown && dropdown.classList.contains('cf-show')) {
      _hideDropdown();
      return;
    }
    _showDropdown(anchorBtn, editor);
  }

  function _showDropdown(anchorBtn, editor) {
    _hideDropdown(); // remove any existing

    dropdown = document.createElement('div');
    dropdown.className = 'cf-template-dropdown cf-show';
    dropdown.setAttribute('data-coldflow', 'dropdown');

    dropdown.innerHTML = `
      <div class="cf-template-dropdown-header">
        <span>ColdFlow Templates</span>
        <button data-coldflow="close-dropdown">&times;</button>
      </div>
      <input type="text" class="cf-template-search" placeholder="Search templates..." data-coldflow="search">
      <div class="cf-template-list" data-coldflow="list"></div>
    `;

    // Position
    const rect = anchorBtn.getBoundingClientRect();
    dropdown.style.top  = (rect.bottom + 4) + 'px';
    dropdown.style.left = Math.max(8, rect.left - 200) + 'px';

    document.body.appendChild(dropdown);

    // Close button
    dropdown.querySelector('[data-coldflow="close-dropdown"]').addEventListener('click', _hideDropdown);

    // Search
    const searchInput = dropdown.querySelector('[data-coldflow="search"]');
    searchInput.addEventListener('input', () => _renderTemplateList(searchInput.value, editor));
    searchInput.focus();

    // Render list
    _renderTemplateList('', editor);

    // Click outside to close
    setTimeout(() => {
      document.addEventListener('click', _onClickOutside, { once: false });
    }, 50);
  }

  function _hideDropdown() {
    document.removeEventListener('click', _onClickOutside);
    if (dropdown) {
      dropdown.remove();
      dropdown = null;
    }
  }

  function _onClickOutside(e) {
    if (dropdown && !dropdown.contains(e.target) && !e.target.closest('[data-coldflow="template-btn"]')) {
      _hideDropdown();
    }
  }

  function _renderTemplateList(query, editor) {
    const list = dropdown.querySelector('[data-coldflow="list"]');
    const q = query.toLowerCase();
    const filtered = templates.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      list.innerHTML = '<div class="cf-template-empty">No templates found</div>';
      return;
    }

    list.innerHTML = filtered.map(t => `
      <div class="cf-template-item" data-coldflow="tpl-item" data-id="${t.id}">
        <div class="cf-template-item-name">${_escHtml(t.name)}</div>
        <div class="cf-template-item-category">${_escHtml(t.category || 'General')}</div>
        <div class="cf-template-item-preview">${_escHtml(t.subject)}</div>
      </div>
    `).join('');

    list.querySelectorAll('[data-coldflow="tpl-item"]').forEach(item => {
      item.addEventListener('click', () => {
        const tpl = templates.find(t => t.id === item.dataset.id);
        if (tpl) _insertTemplate(tpl, editor);
      });
    });
  }

  /* ==========================================================
     Template Insertion & Merge Field Highlighting
     ========================================================== */

  function _insertTemplate(tpl, editor) {
    // Set subject line if available
    if (tpl.subject) {
      const composeRoot = _findComposeRoot(editor);
      const subjectInput = composeRoot
        ? composeRoot.querySelector('input[name="subjectbox"], input[aria-label*="Subject"]')
        : null;
      if (subjectInput) {
        subjectInput.value = tpl.subject;
        subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    // Insert body with merge field highlighting
    const bodyHtml = _bodyToHtml(tpl.body);
    editor.innerHTML = bodyHtml;

    // Trigger Gmail's change detection
    editor.dispatchEvent(new Event('input', { bubbles: true }));

    _hideDropdown();
    _toast(`Template "${tpl.name}" inserted`);
  }

  /**
   * Convert template body text to HTML, highlighting merge fields.
   */
  function _bodyToHtml(body) {
    if (!body) return '';
    let html = _escHtml(body);
    // Highlight {merge_fields}
    html = html.replace(/\{(\w+)\}/g,
      '<span class="cf-merge-field">{$1}</span>'
    );
    // Convert newlines
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  /* ==========================================================
     Message Listener  —  from background.js
     ========================================================== */

  function _listenForMessages() {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === 'send-sequence-email') {
        _handleSequenceSend(msg.data)
          .then(() => sendResponse({ ok: true }))
          .catch(err => sendResponse({ error: err.message }));
        return true;
      }
      if (msg.type === 'templates-updated') {
        _msg('get-templates').then(t => { templates = t || []; });
      }
    });
  }

  /**
   * Programmatically open a compose window and fill in the email.
   * This is used by sequences to send follow-ups.
   */
  async function _handleSequenceSend(data) {
    // Click Gmail's compose button
    const composeBtn = document.querySelector(
      'div[gh="cm"], ' +
      '[data-tooltip="Compose"], ' +
      'div.T-I.T-I-KE.L3'
    );

    if (!composeBtn) {
      throw new Error('Could not find Gmail compose button');
    }

    composeBtn.click();

    // Wait for compose to open
    await _waitFor(() => {
      return document.querySelector('div[role="textbox"][aria-label*="Message Body"]');
    }, 5000);

    // Fill in To field
    const toField = document.querySelector(
      'textarea[name="to"], ' +
      'input[name="to"], ' +
      'div[aria-label*="To"] input, ' +
      'input[aria-label*="To"]'
    );
    if (toField) {
      toField.value = data.to;
      toField.dispatchEvent(new Event('input', { bubbles: true }));
      // Press Tab to confirm the recipient
      toField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', keyCode: 9, bubbles: true }));
    }

    // Fill in Subject
    const subjectField = document.querySelector('input[name="subjectbox"], input[aria-label*="Subject"]');
    if (subjectField) {
      subjectField.value = data.subject;
      subjectField.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Fill in Body
    const bodyEl = document.querySelector('div[role="textbox"][aria-label*="Message Body"]');
    if (bodyEl) {
      bodyEl.innerHTML = data.body.replace(/\n/g, '<br>');
      bodyEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Record the send (user still needs to hit Send manually for safety)
    await _msg('record-send', {
      to: data.to,
      subject: data.subject,
      sequenceId: data.sequenceId,
      step: data.step,
      contactId: data.enrollmentId
    });

    _toast(`Sequence email composed for ${data.to}. Please review and click Send.`, 'warning');
  }

  /* ==========================================================
     Helpers
     ========================================================== */

  function _msg(type, data) {
    return chrome.runtime.sendMessage({ type, data });
  }

  function _escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function _toast(message, variant) {
    const existing = document.querySelector('.cf-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'cf-toast' + (variant ? ` cf-toast-${variant}` : '');
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('cf-show');
      });
    });

    setTimeout(() => {
      toast.classList.remove('cf-show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function _waitFor(conditionFn, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const result = conditionFn();
        if (result) return resolve(result);
        if (Date.now() - start > timeout) return reject(new Error('Timeout waiting for element'));
        requestAnimationFrame(check);
      };
      check();
    });
  }
})();
