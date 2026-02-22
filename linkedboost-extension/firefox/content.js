/**
 * LinkedBoost Content Script
 * Runs on linkedin.com — injects formatting toolbar, template panels,
 * CRM sidebar, DM templates, and post analytics scraping.
 */

(() => {
  'use strict';

  // --- State ---
  let isPremium = false;
  let freeLimits = null;
  let toolbarInjected = new WeakSet();
  let dmButtonInjected = new WeakSet();
  let crmSidebar = null;
  let currentProfileUrl = null;

  // --- Selectors (using aria labels and data attributes where possible) ---
  const SELECTORS = {
    // Post composer — LinkedIn uses contenteditable with aria-label or role-based attributes
    postComposer: [
      '[role="textbox"][aria-label*="write" i]',
      '[role="textbox"][aria-label*="post" i]',
      '[role="textbox"][aria-label*="share" i]',
      '[role="textbox"][contenteditable="true"]',
      '.ql-editor[contenteditable="true"]',
      'div[data-placeholder][contenteditable="true"]'
    ].join(', '),
    // Message compose
    msgComposer: [
      '[role="textbox"][aria-label*="message" i]',
      'div.msg-form__contenteditable[contenteditable="true"]',
      'div[aria-label*="Write a message" i][contenteditable="true"]'
    ].join(', '),
    // Message form container
    msgFormContainer: [
      '.msg-form',
      'form[data-control-name*="message"]',
      '[role="dialog"] [role="textbox"]'
    ].join(', '),
    // Profile page name
    profileName: [
      'h1.text-heading-xlarge',
      '[data-anonymize="person-name"]',
      '.pv-text-details--left-aligned h1'
    ].join(', '),
    // Profile headline
    profileHeadline: [
      '.text-body-medium[data-anonymize="headline"]',
      '.pv-text-details--left-aligned .text-body-medium'
    ].join(', '),
    // Profile actions area
    profileActions: [
      '.pv-top-card-v2-ctas',
      '.pvs-profile-actions',
      '.pv-top-card--list'
    ].join(', '),
    // Activity feed posts (for analytics)
    feedPost: [
      '[data-urn*="activity"]',
      '.feed-shared-update-v2',
      '[data-id*="urn:li:activity"]'
    ].join(', ')
  };

  // --- Initialization ---
  async function init() {
    // Check premium status
    try {
      const response = await sendMessage({ type: 'CHECK_PREMIUM' });
      isPremium = response?.premium || false;
    } catch {
      isPremium = false;
    }

    if (!isPremium) {
      try {
        const limits = await sendMessage({ type: 'GET_LIMITS' });
        freeLimits = limits;
      } catch {
        freeLimits = { maxTemplates: 3, maxCRMContacts: 10, analyticsEnabled: false, remindersEnabled: false };
      }
    }

    // Start observing DOM
    observeDOM();
    // Initial scan
    scanAndInject();
    // Check for profile page
    checkProfilePage();
    // Listen for SPA navigation
    listenForNavigation();
  }

  // --- Send message to background ---
  function sendMessage(msg) {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(msg, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      } else {
        reject(new Error('Chrome runtime not available'));
      }
    });
  }

  // --- Message listener (from background) ---
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'FOLLOWUP_REMINDER') {
        showToast(`Follow-up reminder: ${message.contact.name || 'Contact'}`);
      }
      if (message.type === 'INSERT_DM_TEMPLATE') {
        insertDMTemplate(message.template);
      }
    });
  }

  // --- DOM Observer ---
  function observeDOM() {
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldScan = true;
          break;
        }
      }
      if (shouldScan) {
        requestAnimationFrame(scanAndInject);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // --- SPA Navigation Listener ---
  function listenForNavigation() {
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(() => {
          checkProfilePage();
          scanAndInject();
        }, 500);
      }
    });
    urlObserver.observe(document.querySelector('body'), { childList: true, subtree: true });
  }

  // --- Scan and Inject ---
  function scanAndInject() {
    injectPostToolbar();
    injectDMTemplateButton();
  }

  // ============================================================================
  // POST COMPOSER TOOLBAR
  // ============================================================================

  function injectPostToolbar() {
    const composers = document.querySelectorAll(SELECTORS.postComposer);
    composers.forEach(composer => {
      if (toolbarInjected.has(composer)) return;
      toolbarInjected.add(composer);

      // Find the parent container to insert above
      const parent = composer.closest('.share-creation-state__text-editor') ||
                     composer.closest('[class*="editor"]') ||
                     composer.parentElement;
      if (!parent) return;

      // Create toolbar wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'lb-toolbar-wrapper';
      wrapper.style.position = 'relative';

      // Toolbar
      const toolbar = createToolbar(composer);
      wrapper.appendChild(toolbar);

      // Character counter
      const charCounter = createCharCounter(composer);
      wrapper.appendChild(charCounter);

      // Insert before the composer
      parent.insertBefore(wrapper, composer);

      // Listen for input on composer
      composer.addEventListener('input', () => {
        updateCharCounter(composer, charCounter);
        updateHashtagSuggestions(composer, wrapper);
      });
    });
  }

  function createToolbar(composer) {
    const toolbar = document.createElement('div');
    toolbar.className = 'lb-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'LinkedBoost formatting toolbar');

    const buttons = [
      { label: 'B', title: 'Bold', action: () => formatSelection(composer, 'bold'), style: 'font-weight:800' },
      { label: 'I', title: 'Italic', action: () => formatSelection(composer, 'italic'), style: 'font-style:italic' },
      { label: 'BI', title: 'Bold Italic', action: () => formatSelection(composer, 'boldItalic'), style: 'font-weight:800;font-style:italic' },
      { label: 'U\u0332', title: 'Underline', action: () => formatSelection(composer, 'underline') },
      { label: 'S\u0336', title: 'Strikethrough', action: () => formatSelection(composer, 'strikethrough') },
      'divider',
      { label: '\u2022', title: 'Bullet List', action: () => formatSelection(composer, 'bullets') },
      { label: '1.', title: 'Numbered List', action: () => formatSelection(composer, 'numbered') },
      'divider',
      { label: '\uD83D\uDE00', title: 'Emoji', action: (e) => toggleEmojiPicker(e, composer, toolbar) },
      { label: '#', title: 'Hashtag suggestions', action: () => triggerHashtagSuggestions(composer, toolbar.parentElement) },
      'divider',
      { label: '\uD83D\uDCCB', title: 'Templates', action: (e) => toggleTemplatePanel(e, composer, toolbar) },
      { label: '\uD83D\uDC41', title: 'Preview', action: () => showPreview(composer) }
    ];

    buttons.forEach(btn => {
      if (btn === 'divider') {
        const div = document.createElement('span');
        div.className = 'lb-toolbar-divider';
        toolbar.appendChild(div);
        return;
      }

      const el = document.createElement('button');
      el.className = 'lb-toolbar-btn';
      el.innerHTML = btn.label;
      el.title = btn.title;
      if (btn.style) el.style.cssText = btn.style;
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.action(e);
      });
      toolbar.appendChild(el);
    });

    return toolbar;
  }

  // --- Format Selection ---
  function formatSelection(composer, format) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    // Check the selection is inside the composer
    if (!composer.contains(range.commonAncestorContainer)) {
      composer.focus();
      return;
    }

    const selectedText = sel.toString();
    if (!selectedText) return;

    let formatted;
    switch (format) {
      case 'bold':
        formatted = UnicodeFormatter.toBold(selectedText);
        break;
      case 'italic':
        formatted = UnicodeFormatter.toItalic(selectedText);
        break;
      case 'boldItalic':
        formatted = UnicodeFormatter.toBoldItalic(selectedText);
        break;
      case 'underline':
        formatted = UnicodeFormatter.toUnderline(selectedText);
        break;
      case 'strikethrough':
        formatted = UnicodeFormatter.toStrikethrough(selectedText);
        break;
      case 'bullets':
        formatted = UnicodeFormatter.toBulletList(selectedText.split('\n'));
        break;
      case 'numbered':
        formatted = UnicodeFormatter.toNumberedList(selectedText.split('\n'));
        break;
      default:
        return;
    }

    // Replace selection
    range.deleteContents();
    range.insertNode(document.createTextNode(formatted));

    // Dispatch input event so LinkedIn and our counter detect the change
    composer.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // --- Character Counter ---
  function createCharCounter(composer) {
    const counter = document.createElement('div');
    counter.className = 'lb-char-counter';
    counter.innerHTML = `
      <span class="count normal">0 chars</span>
      <div class="lb-char-bar"><div class="lb-char-bar-fill normal" style="width:0%"></div></div>
      <span class="hint" style="font-size:11px;color:#999">Optimal: 1300-1700</span>
    `;
    return counter;
  }

  function updateCharCounter(composer, counterEl) {
    const text = composer.innerText || '';
    const len = text.length;
    const maxDisplay = 3000;
    const pct = Math.min((len / maxDisplay) * 100, 100);

    const countSpan = counterEl.querySelector('.count');
    const barFill = counterEl.querySelector('.lb-char-bar-fill');

    let cls = 'normal';
    if (len >= 1300 && len <= 1700) cls = 'optimal';
    else if (len > 1700 && len <= 2500) cls = 'warning';
    else if (len > 2500) cls = 'over';

    countSpan.textContent = `${len} chars`;
    countSpan.className = `count ${cls}`;
    barFill.className = `lb-char-bar-fill ${cls}`;
    barFill.style.width = `${pct}%`;
  }

  // --- Emoji Picker ---
  function toggleEmojiPicker(e, composer, toolbar) {
    const existing = toolbar.querySelector('.lb-emoji-picker');
    if (existing) {
      existing.remove();
      return;
    }

    // Close other panels
    closeAllPanels(toolbar);

    const picker = document.createElement('div');
    picker.className = 'lb-emoji-picker';

    const emojis = [
      '\uD83D\uDE80', '\uD83D\uDD25', '\uD83C\uDFAF', '\uD83D\uDCA1', '\uD83D\uDCAA', '\u2728', '\uD83C\uDF1F', '\uD83C\uDFC6',
      '\uD83D\uDCC8', '\uD83E\uDD1D', '\uD83D\uDE4C', '\uD83D\uDC4F', '\u2705', '\u274C', '\u26A0\uFE0F', '\uD83D\uDCA4',
      '\u2764\uFE0F', '\uD83D\uDC99', '\uD83D\uDC9A', '\uD83D\uDC9B', '\uD83D\uDDA4', '\uD83D\uDE4F', '\uD83D\uDE0D', '\uD83E\uDD29',
      '\uD83D\uDCDD', '\uD83D\uDCCA', '\uD83D\uDCBC', '\uD83C\uDF89', '\uD83D\uDE0A', '\uD83E\uDD14', '\uD83D\uDCAF', '\u2B50',
      '\u267B\uFE0F', '\uD83D\uDD16', '\uD83D\uDC49', '\u2194\uFE0F', '\uD83D\uDCAC', '\uD83D\uDE4B', '\uD83E\uDDD1\u200D\uD83D\uDCBB', '\uD83D\uDCE2',
      '\uD83C\uDF31', '\uD83C\uDF0D', '\u23F0', '\uD83C\uDFE0', '\uD83D\uDCF1', '\u2615', '\uD83C\uDF93', '\uD83D\uDEE0\uFE0F'
    ];

    emojis.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'lb-emoji-btn';
      btn.textContent = emoji;
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        insertTextAtCursor(composer, emoji);
        picker.remove();
      });
      picker.appendChild(btn);
    });

    toolbar.style.position = 'relative';
    toolbar.appendChild(picker);

    // Close when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function handler(ev) {
        if (!picker.contains(ev.target)) {
          picker.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 100);
  }

  // --- Template Panel ---
  function toggleTemplatePanel(e, composer, toolbar) {
    const existing = toolbar.querySelector('.lb-template-panel');
    if (existing) {
      existing.remove();
      return;
    }

    closeAllPanels(toolbar);

    const panel = document.createElement('div');
    panel.className = 'lb-template-panel';

    panel.innerHTML = '<h3>Post Templates</h3><div class="lb-template-tabs"></div><div class="lb-template-list"></div>';

    toolbar.style.position = 'relative';
    toolbar.appendChild(panel);

    loadTemplates(panel, composer, 'post');

    // Close when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function handler(ev) {
        if (!panel.contains(ev.target) && !ev.target.closest('.lb-toolbar-btn')) {
          panel.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 100);
  }

  async function loadTemplates(panel, composer, type) {
    const storageKey = type === 'post' ? 'postTemplates' : 'dmTemplates';
    let templates = [];

    try {
      const result = await new Promise((resolve) => {
        chrome.storage.sync.get(storageKey, resolve);
      });
      templates = result[storageKey] || [];
    } catch {
      templates = [];
    }

    // Enforce free limits
    const maxTemplates = isPremium ? Infinity : (freeLimits?.maxTemplates || 3);

    const categories = [...new Set(templates.map(t => t.category))];

    const tabsContainer = panel.querySelector('.lb-template-tabs');
    const listContainer = panel.querySelector('.lb-template-list');

    // "All" tab
    tabsContainer.innerHTML = '';
    const allTab = document.createElement('button');
    allTab.className = 'lb-template-tab active';
    allTab.textContent = 'All';
    allTab.addEventListener('click', () => renderTemplateList(templates, listContainer, composer, maxTemplates, tabsContainer, allTab));
    tabsContainer.appendChild(allTab);

    categories.forEach(cat => {
      const tab = document.createElement('button');
      tab.className = 'lb-template-tab';
      tab.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      tab.addEventListener('click', () => {
        const filtered = templates.filter(t => t.category === cat);
        renderTemplateList(filtered, listContainer, composer, maxTemplates, tabsContainer, tab);
      });
      tabsContainer.appendChild(tab);
    });

    renderTemplateList(templates, listContainer, composer, maxTemplates, tabsContainer, allTab);
  }

  function renderTemplateList(templates, container, composer, maxTemplates, tabsContainer, activeTab) {
    // Update active tab
    tabsContainer.querySelectorAll('.lb-template-tab').forEach(t => t.classList.remove('active'));
    activeTab.classList.add('active');

    container.innerHTML = '';
    templates.forEach((tpl, index) => {
      const item = document.createElement('div');
      item.className = 'lb-template-item';
      if (index >= maxTemplates) {
        item.classList.add('lb-locked-overlay');
      }

      const preview = tpl.content.substring(0, 80).replace(/\n/g, ' ');
      item.innerHTML = `
        <div class="name">${escapeHtml(tpl.name)}</div>
        <div class="preview">${escapeHtml(preview)}...</div>
      `;

      item.addEventListener('click', () => {
        if (index >= maxTemplates) {
          showToast('Upgrade to Premium for unlimited templates! $14.99/mo');
          return;
        }
        insertTextAtCursor(composer, tpl.content);
        container.closest('.lb-template-panel')?.remove();
        showToast('Template inserted!');
      });

      container.appendChild(item);
    });

    if (templates.length === 0) {
      container.innerHTML = '<p style="color:#888;font-size:13px;text-align:center;padding:20px">No templates yet. Add templates from the extension popup.</p>';
    }
  }

  // --- Hashtag Suggestions ---
  const HASHTAG_MAP = {
    'leadership': ['#Leadership', '#Management', '#ExecutiveCoaching', '#LeadershipDevelopment'],
    'marketing': ['#Marketing', '#DigitalMarketing', '#ContentMarketing', '#MarketingStrategy'],
    'sales': ['#Sales', '#B2BSales', '#SalesStrategy', '#SocialSelling'],
    'startup': ['#Startup', '#Entrepreneurship', '#StartupLife', '#Founders'],
    'tech': ['#Technology', '#Innovation', '#TechTrends', '#DigitalTransformation'],
    'career': ['#CareerAdvice', '#CareerGrowth', '#ProfessionalDevelopment', '#JobSearch'],
    'productivity': ['#Productivity', '#TimeManagement', '#Efficiency', '#WorkSmarter'],
    'ai': ['#ArtificialIntelligence', '#AI', '#MachineLearning', '#GenerativeAI'],
    'hiring': ['#Hiring', '#Recruitment', '#TalentAcquisition', '#WeAreHiring'],
    'remote': ['#RemoteWork', '#WFH', '#FutureOfWork', '#HybridWork'],
    'culture': ['#CompanyCulture', '#WorkplaceCulture', '#EmployeeExperience'],
    'design': ['#Design', '#UXDesign', '#ProductDesign', '#CreativeDesign'],
    'growth': ['#Growth', '#PersonalGrowth', '#GrowthMindset', '#ProfessionalGrowth'],
    'networking': ['#Networking', '#ProfessionalNetworking', '#LinkedInNetworking'],
    'mindset': ['#Mindset', '#GrowthMindset', '#PositiveMindset', '#SuccessMindset'],
    'success': ['#Success', '#Achievement', '#Goals', '#Motivation'],
    'data': ['#DataScience', '#DataAnalytics', '#BigData', '#DataDriven'],
    'finance': ['#Finance', '#FinancialPlanning', '#Investing', '#PersonalFinance'],
    'branding': ['#PersonalBranding', '#Branding', '#BrandStrategy', '#LinkedInBranding']
  };

  function updateHashtagSuggestions(composer, wrapper) {
    const text = (composer.innerText || '').toLowerCase();
    const existing = wrapper.querySelector('.lb-hashtag-suggestions');

    const matched = new Set();
    for (const [keyword, hashtags] of Object.entries(HASHTAG_MAP)) {
      if (text.includes(keyword)) {
        hashtags.forEach(h => matched.add(h));
      }
    }

    if (matched.size === 0) {
      if (existing) existing.remove();
      return;
    }

    const container = existing || document.createElement('div');
    container.className = 'lb-hashtag-suggestions';
    container.innerHTML = '';

    const hashtagArray = [...matched].slice(0, 8);
    hashtagArray.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'lb-hashtag-chip';
      chip.textContent = tag;
      chip.addEventListener('click', () => {
        insertTextAtCursor(composer, ' ' + tag);
      });
      container.appendChild(chip);
    });

    if (!existing) {
      wrapper.appendChild(container);
    }
  }

  function triggerHashtagSuggestions(composer, wrapper) {
    updateHashtagSuggestions(composer, wrapper);
    showToast('Hashtag suggestions updated based on your content');
  }

  // --- Preview Modal ---
  function showPreview(composer) {
    const text = composer.innerText || '';
    if (!text.trim()) {
      showToast('Write something first to preview!');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'lb-preview-overlay';

    overlay.innerHTML = `
      <div class="lb-preview-modal">
        <div class="lb-preview-header">
          <h3>Post Preview</h3>
          <button class="lb-preview-close" aria-label="Close preview">&times;</button>
        </div>
        <div class="lb-preview-body">
          <div class="lb-preview-post">${escapeHtml(text)}</div>
          <div style="margin-top:12px;display:flex;gap:16px;color:#666;font-size:13px">
            <span>\uD83D\uDC4D Like</span>
            <span>\uD83D\uDCAC Comment</span>
            <span>\u267B\uFE0F Repost</span>
            <span>\uD83D\uDCE8 Send</span>
          </div>
        </div>
      </div>
    `;

    overlay.querySelector('.lb-preview-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  // ============================================================================
  // DM TEMPLATE BUTTON
  // ============================================================================

  function injectDMTemplateButton() {
    const msgComposers = document.querySelectorAll(SELECTORS.msgComposer);
    msgComposers.forEach(composer => {
      if (dmButtonInjected.has(composer)) return;
      dmButtonInjected.add(composer);

      const form = composer.closest('form') || composer.closest('.msg-form') || composer.parentElement;
      if (!form) return;

      const btn = document.createElement('button');
      btn.className = 'lb-dm-template-btn';
      btn.innerHTML = '\uD83D\uDCCB Templates';
      btn.style.position = 'relative';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleDMTemplateDropdown(btn, composer);
      });

      // Insert the button near the send area or at the bottom of the form
      const sendBtn = form.querySelector('[type="submit"], [aria-label*="Send" i]');
      if (sendBtn && sendBtn.parentElement) {
        sendBtn.parentElement.insertBefore(btn, sendBtn);
      } else {
        form.appendChild(btn);
      }
    });
  }

  function toggleDMTemplateDropdown(btn, composer) {
    const existing = btn.querySelector('.lb-dm-dropdown');
    if (existing) {
      existing.remove();
      return;
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'lb-dm-dropdown';
    dropdown.innerHTML = '<h4>DM Templates</h4><div class="lb-template-tabs"></div><div class="lb-template-list"></div>';
    btn.appendChild(dropdown);

    loadDMTemplates(dropdown, composer);

    setTimeout(() => {
      document.addEventListener('click', function handler(ev) {
        if (!dropdown.contains(ev.target) && ev.target !== btn) {
          dropdown.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 100);
  }

  async function loadDMTemplates(dropdown, composer) {
    let templates = [];
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.sync.get('dmTemplates', resolve);
      });
      templates = result.dmTemplates || [];
    } catch {
      templates = [];
    }

    const maxTemplates = isPremium ? Infinity : (freeLimits?.maxTemplates || 3);
    const categories = [...new Set(templates.map(t => t.category))];

    const tabsContainer = dropdown.querySelector('.lb-template-tabs');
    const listContainer = dropdown.querySelector('.lb-template-list');

    tabsContainer.innerHTML = '';
    const allTab = document.createElement('button');
    allTab.className = 'lb-template-tab active';
    allTab.textContent = 'All';
    allTab.addEventListener('click', () => renderDMList(templates, listContainer, composer, maxTemplates, tabsContainer, allTab));
    tabsContainer.appendChild(allTab);

    categories.forEach(cat => {
      const tab = document.createElement('button');
      tab.className = 'lb-template-tab';
      tab.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      tab.addEventListener('click', () => {
        const filtered = templates.filter(t => t.category === cat);
        renderDMList(filtered, listContainer, composer, maxTemplates, tabsContainer, tab);
      });
      tabsContainer.appendChild(tab);
    });

    renderDMList(templates, listContainer, composer, maxTemplates, tabsContainer, allTab);
  }

  function renderDMList(templates, container, composer, maxTemplates, tabsContainer, activeTab) {
    tabsContainer.querySelectorAll('.lb-template-tab').forEach(t => t.classList.remove('active'));
    activeTab.classList.add('active');

    container.innerHTML = '';

    // Try to detect profile info from the conversation header for merge fields
    const profileInfo = detectProfileInfoFromConversation();

    templates.forEach((tpl, index) => {
      const item = document.createElement('div');
      item.className = 'lb-template-item';
      if (index >= maxTemplates) {
        item.classList.add('lb-locked-overlay');
      }

      const preview = tpl.content.substring(0, 60).replace(/\n/g, ' ');
      item.innerHTML = `
        <div class="name">${escapeHtml(tpl.name)}</div>
        <div class="preview">${escapeHtml(preview)}...</div>
      `;

      item.addEventListener('click', () => {
        if (index >= maxTemplates) {
          showToast('Upgrade to Premium for unlimited templates! $14.99/mo');
          return;
        }
        let content = tpl.content;
        // Replace merge fields
        if (profileInfo.firstName) content = content.replace(/\{first_name\}/g, profileInfo.firstName);
        if (profileInfo.company) content = content.replace(/\{company\}/g, profileInfo.company);
        if (profileInfo.role) content = content.replace(/\{role\}/g, profileInfo.role);

        insertTextAtCursor(composer, content);
        container.closest('.lb-dm-dropdown')?.remove();
        showToast('Template inserted!');
      });

      container.appendChild(item);
    });
  }

  function detectProfileInfoFromConversation() {
    const info = { firstName: '', company: '', role: '' };
    try {
      // Try to get name from the message thread header
      const nameEl = document.querySelector('.msg-overlay-bubble-header__title, .msg-conversation-card__participant-names, [data-control-name="conversation_title"]');
      if (nameEl) {
        const fullName = nameEl.textContent.trim();
        info.firstName = fullName.split(' ')[0];
      }
    } catch { /* ignore */ }
    return info;
  }

  function insertDMTemplate(template) {
    const composers = document.querySelectorAll(SELECTORS.msgComposer);
    if (composers.length > 0) {
      const composer = composers[composers.length - 1];
      composer.focus();
      insertTextAtCursor(composer, template.content);
      showToast('Template inserted!');
    }
  }

  // ============================================================================
  // CRM SIDEBAR
  // ============================================================================

  function checkProfilePage() {
    const url = window.__lbTestLocationHref || window.location.href;
    const isProfile = /linkedin\.com\/in\/[^/]+/.test(url);

    if (isProfile) {
      currentProfileUrl = url.split('?')[0]; // clean URL
      injectCRMButton();
    } else {
      currentProfileUrl = null;
      if (crmSidebar) crmSidebar.classList.remove('open');
    }
  }

  function injectCRMButton() {
    if (document.querySelector('.lb-crm-toggle')) return;

    // Wait for the profile actions area to load
    const waitForActions = () => {
      const actionsArea = document.querySelector(SELECTORS.profileActions);
      if (actionsArea) {
        const btn = document.createElement('button');
        btn.className = 'lb-crm-toggle';
        btn.innerHTML = '\uD83D\uDCCB CRM';
        btn.addEventListener('click', () => toggleCRMSidebar());
        actionsArea.appendChild(btn);
      } else {
        setTimeout(waitForActions, 500);
      }
    };
    waitForActions();
  }

  function toggleCRMSidebar() {
    if (!crmSidebar) {
      crmSidebar = createCRMSidebar();
      document.body.appendChild(crmSidebar);
    }

    if (crmSidebar.classList.contains('open')) {
      crmSidebar.classList.remove('open');
    } else {
      loadCRMData();
      crmSidebar.classList.add('open');
    }
  }

  function createCRMSidebar() {
    const sidebar = document.createElement('div');
    sidebar.className = 'lb-crm-sidebar';
    sidebar.setAttribute('role', 'complementary');
    sidebar.setAttribute('aria-label', 'LinkedBoost CRM');

    sidebar.innerHTML = `
      <div class="lb-crm-header">
        <h3>LinkedBoost CRM</h3>
        <button class="lb-crm-close" aria-label="Close CRM sidebar">&times;</button>
      </div>
      <div class="lb-crm-body">
        <div class="lb-crm-field">
          <label>Name</label>
          <input type="text" id="lb-crm-name" placeholder="Contact name" />
        </div>
        <div class="lb-crm-field">
          <label>Category</label>
          <div class="lb-crm-tags" id="lb-crm-category">
            <span class="lb-crm-tag lead" data-cat="Lead">Lead</span>
            <span class="lb-crm-tag client" data-cat="Client">Client</span>
            <span class="lb-crm-tag partner" data-cat="Partner">Partner</span>
            <span class="lb-crm-tag friend" data-cat="Friend">Friend</span>
          </div>
        </div>
        <div class="lb-crm-field">
          <label>Tags (comma-separated)</label>
          <input type="text" id="lb-crm-tags" placeholder="e.g. SaaS, Decision Maker, NYC" />
        </div>
        <div class="lb-crm-field">
          <label>Notes</label>
          <textarea id="lb-crm-notes" placeholder="Add notes about this contact..."></textarea>
        </div>
        <div class="lb-crm-field">
          <label>Last Interaction</label>
          <input type="date" id="lb-crm-last-interaction" />
        </div>
        <div class="lb-crm-reminder">
          <label>Follow-up Reminder</label>
          <input type="date" id="lb-crm-reminder-date" />
        </div>
        <button class="lb-crm-save-btn" id="lb-crm-save">Save Contact</button>
      </div>
    `;

    // Close button
    sidebar.querySelector('.lb-crm-close').addEventListener('click', () => {
      sidebar.classList.remove('open');
    });

    // Category tag selection
    sidebar.querySelectorAll('.lb-crm-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        sidebar.querySelectorAll('.lb-crm-tag').forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
      });
    });

    // Save button
    sidebar.querySelector('#lb-crm-save').addEventListener('click', () => saveCRMContact());

    return sidebar;
  }

  async function loadCRMData() {
    if (!currentProfileUrl || !crmSidebar) return;

    // Auto-fill name from profile page
    const nameEl = document.querySelector(SELECTORS.profileName);
    const profileName = nameEl ? nameEl.textContent.trim() : '';

    try {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get('crmContacts', resolve);
      });
      const contacts = result.crmContacts || {};
      const contact = contacts[currentProfileUrl];

      const nameInput = crmSidebar.querySelector('#lb-crm-name');
      const tagsInput = crmSidebar.querySelector('#lb-crm-tags');
      const notesInput = crmSidebar.querySelector('#lb-crm-notes');
      const lastInteraction = crmSidebar.querySelector('#lb-crm-last-interaction');
      const reminderDate = crmSidebar.querySelector('#lb-crm-reminder-date');

      if (contact) {
        nameInput.value = contact.name || profileName;
        tagsInput.value = (contact.tags || []).join(', ');
        notesInput.value = contact.notes || '';
        lastInteraction.value = contact.lastInteraction || '';
        reminderDate.value = contact.reminderDate || '';

        // Set category
        crmSidebar.querySelectorAll('.lb-crm-tag').forEach(tag => {
          tag.classList.toggle('active', tag.dataset.cat === contact.category);
        });
      } else {
        nameInput.value = profileName;
        tagsInput.value = '';
        notesInput.value = '';
        lastInteraction.value = new Date().toISOString().split('T')[0];
        reminderDate.value = '';
        crmSidebar.querySelectorAll('.lb-crm-tag').forEach(t => t.classList.remove('active'));
      }
    } catch {
      // ignore
    }
  }

  async function saveCRMContact() {
    if (!currentProfileUrl || !crmSidebar) return;

    // Check free limits
    if (!isPremium) {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get('crmContacts', resolve);
      });
      const contacts = result.crmContacts || {};
      const count = Object.keys(contacts).length;
      const isExisting = !!contacts[currentProfileUrl];
      if (!isExisting && count >= (freeLimits?.maxCRMContacts || 10)) {
        showToast('Free limit: 10 CRM contacts. Upgrade to Premium for unlimited! $14.99/mo');
        return;
      }
    }

    const name = crmSidebar.querySelector('#lb-crm-name').value.trim();
    const tags = crmSidebar.querySelector('#lb-crm-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    const notes = crmSidebar.querySelector('#lb-crm-notes').value.trim();
    const lastInteraction = crmSidebar.querySelector('#lb-crm-last-interaction').value;
    const reminderDate = crmSidebar.querySelector('#lb-crm-reminder-date').value;
    const activeCategory = crmSidebar.querySelector('.lb-crm-tag.active');
    const category = activeCategory ? activeCategory.dataset.cat : 'Lead';

    const contactData = {
      name,
      category,
      tags,
      notes,
      lastInteraction,
      reminderDate,
      profileUrl: currentProfileUrl,
      updatedAt: Date.now()
    };

    try {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get('crmContacts', resolve);
      });
      const contacts = result.crmContacts || {};
      contacts[currentProfileUrl] = contactData;
      await new Promise((resolve) => {
        chrome.storage.local.set({ crmContacts: contacts }, resolve);
      });

      // Set follow-up reminder if date provided
      if (reminderDate) {
        await sendMessage({
          type: 'SET_FOLLOWUP_REMINDER',
          profileUrl: currentProfileUrl,
          reminderDate
        });
      }

      showToast('Contact saved!');
    } catch (err) {
      showToast('Error saving contact');
      console.error('LinkedBoost CRM save error:', err);
    }
  }

  // ============================================================================
  // POST ANALYTICS SCRAPING
  // ============================================================================

  function scrapePostAnalytics() {
    if (!isPremium && freeLimits && !freeLimits.analyticsEnabled) return;

    const posts = document.querySelectorAll(SELECTORS.feedPost);
    posts.forEach(post => {
      try {
        const urn = post.dataset.urn || post.dataset.id || '';
        if (!urn) return;

        const textEl = post.querySelector('.feed-shared-text, .update-components-text, [dir="ltr"]');
        const text = textEl ? textEl.textContent.trim().substring(0, 200) : '';

        // Engagement metrics (LinkedIn renders these differently)
        const reactionsEl = post.querySelector('[aria-label*="reaction" i], .social-details-social-counts__reactions-count');
        const commentsEl = post.querySelector('[aria-label*="comment" i], .social-details-social-counts__comments');
        const sharesEl = post.querySelector('[aria-label*="repost" i], .social-details-social-counts__shares');

        const reactions = parseMetric(reactionsEl);
        const comments = parseMetric(commentsEl);
        const shares = parseMetric(sharesEl);

        sendMessage({
          type: 'TRACK_POST',
          postData: {
            id: urn,
            text,
            reactions,
            comments,
            shares,
            timestamp: Date.now()
          }
        }).catch(() => {});
      } catch { /* ignore individual post errors */ }
    });
  }

  function parseMetric(el) {
    if (!el) return 0;
    const text = el.textContent.trim().replace(/,/g, '');
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  // Run analytics scraping periodically
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      scrapePostAnalytics();
    }
  }, 30000); // Every 30 seconds

  // ============================================================================
  // UTILITIES
  // ============================================================================

  function insertTextAtCursor(element, text) {
    element.focus();

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (element.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        element.textContent += text;
      }
    } else {
      element.textContent += text;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function closeAllPanels(toolbar) {
    toolbar.querySelectorAll('.lb-emoji-picker, .lb-template-panel').forEach(p => p.remove());
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showToast(message) {
    const existing = document.querySelector('.lb-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'lb-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // --- Initialize ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
