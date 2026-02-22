/**
 * LinkedBoost Popup Script
 * Manages templates, CRM search, analytics display, and settings.
 */

(() => {
  'use strict';

  // --- State ---
  let isPremium = false;
  let freeLimits = { maxTemplates: 3, maxCRMContacts: 10, analyticsEnabled: false };
  let editingTemplate = null; // { type: 'post'|'dm', index: number } or null for new
  let editingType = 'post'; // 'post' or 'dm'

  // --- Init ---
  document.addEventListener('DOMContentLoaded', async () => {
    await checkPremium();
    setupTabs();
    setupTemplateModal();
    setupCRM();
    setupAnalytics();
    setupSettings();
    loadPostTemplates();
    loadDMTemplates();
  });

  // --- Premium Check ---
  async function checkPremium() {
    try {
      const result = await chrome.storage.sync.get('premium');
      isPremium = !!result.premium;
    } catch {
      isPremium = false;
    }

    if (isPremium) {
      document.getElementById('premium-badge').classList.remove('hidden');
      document.getElementById('plan-label').textContent = 'Premium';
      document.getElementById('upgrade-btn').textContent = 'Active';
      document.getElementById('upgrade-btn').disabled = true;
      document.getElementById('analytics-locked').classList.add('hidden');
    } else {
      document.getElementById('analytics-locked').classList.remove('hidden');
    }
  }

  // --- Tabs ---
  function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');

        // Refresh data when switching tabs
        if (tab.dataset.tab === 'crm') loadCRM();
        if (tab.dataset.tab === 'analytics') loadAnalytics();
      });
    });
  }

  // ============================================================================
  // TEMPLATE MANAGEMENT
  // ============================================================================

  function setupTemplateModal() {
    const modal = document.getElementById('template-modal');
    const closeBtn = document.getElementById('modal-close');
    const cancelBtn = document.getElementById('modal-cancel');
    const saveBtn = document.getElementById('modal-save');

    // Add template buttons
    document.getElementById('add-post-template').addEventListener('click', () => {
      editingType = 'post';
      editingTemplate = null;
      openTemplateModal('Add Post Template');
    });

    document.getElementById('add-dm-template').addEventListener('click', () => {
      editingType = 'dm';
      editingTemplate = null;
      openTemplateModal('Add DM Template');
    });

    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
    saveBtn.addEventListener('click', saveTemplate);

    // Merge field clicks
    document.querySelectorAll('.merge-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const textarea = document.getElementById('tpl-content');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const field = tag.dataset.field;
        textarea.value = textarea.value.substring(0, start) + field + textarea.value.substring(end);
        textarea.focus();
        textarea.setSelectionRange(start + field.length, start + field.length);
      });
    });
  }

  function openTemplateModal(title, template) {
    const modal = document.getElementById('template-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('tpl-name').value = template ? template.name : '';
    document.getElementById('tpl-category').value = template ? template.category : 'hook';
    document.getElementById('tpl-content').value = template ? template.content : '';
    modal.classList.remove('hidden');
  }

  async function saveTemplate() {
    const name = document.getElementById('tpl-name').value.trim();
    const category = document.getElementById('tpl-category').value;
    const content = document.getElementById('tpl-content').value.trim();

    if (!name || !content) {
      alert('Name and content are required.');
      return;
    }

    const storageKey = editingType === 'post' ? 'postTemplates' : 'dmTemplates';
    const result = await chrome.storage.sync.get(storageKey);
    let templates = result[storageKey] || [];

    // Check free limits
    if (!isPremium && editingTemplate === null) {
      if (templates.length >= freeLimits.maxTemplates) {
        alert(`Free limit: ${freeLimits.maxTemplates} templates. Upgrade to Premium for unlimited!`);
        return;
      }
    }

    const templateData = {
      id: editingTemplate !== null ? templates[editingTemplate.index].id : `tpl_${Date.now()}`,
      name,
      category,
      content
    };

    if (editingTemplate !== null) {
      templates[editingTemplate.index] = templateData;
    } else {
      templates.push(templateData);
    }

    await chrome.storage.sync.set({ [storageKey]: templates });

    document.getElementById('template-modal').classList.add('hidden');

    if (editingType === 'post') {
      loadPostTemplates();
    } else {
      loadDMTemplates();
    }
  }

  async function loadPostTemplates() {
    const result = await chrome.storage.sync.get('postTemplates');
    const templates = result.postTemplates || [];
    renderTemplateList('post-template-list', templates, 'post');
  }

  async function loadDMTemplates() {
    const result = await chrome.storage.sync.get('dmTemplates');
    const templates = result.dmTemplates || [];
    renderTemplateList('dm-template-list', templates, 'dm');
  }

  function renderTemplateList(containerId, templates, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (templates.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">${type === 'post' ? '\uD83D\uDCDD' : '\uD83D\uDCE8'}</div>
          <p>No ${type === 'post' ? 'post' : 'DM'} templates yet. Click "+ Add" to create one.</p>
        </div>
      `;
      return;
    }

    templates.forEach((tpl, index) => {
      const card = document.createElement('div');
      card.className = 'template-card';
      if (!isPremium && index >= freeLimits.maxTemplates) {
        card.classList.add('locked');
      }

      card.innerHTML = `
        <div class="info">
          <div class="name">${escapeHtml(tpl.name)}</div>
          <div class="category">${escapeHtml(tpl.category)}</div>
        </div>
        <div class="actions">
          <button class="edit-btn" title="Edit" data-index="${index}">\u270F\uFE0F</button>
          <button class="delete-btn" title="Delete" data-index="${index}">\uD83D\uDDD1\uFE0F</button>
        </div>
      `;

      card.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        editingType = type;
        editingTemplate = { type, index };
        openTemplateModal(`Edit ${type === 'post' ? 'Post' : 'DM'} Template`, tpl);
      });

      card.querySelector('.delete-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`Delete "${tpl.name}"?`)) return;
        const storageKey = type === 'post' ? 'postTemplates' : 'dmTemplates';
        const result = await chrome.storage.sync.get(storageKey);
        const list = result[storageKey] || [];
        list.splice(index, 1);
        await chrome.storage.sync.set({ [storageKey]: list });
        if (type === 'post') loadPostTemplates();
        else loadDMTemplates();
      });

      container.appendChild(card);
    });
  }

  // ============================================================================
  // CRM
  // ============================================================================

  function setupCRM() {
    document.getElementById('crm-search').addEventListener('input', loadCRM);
    document.getElementById('crm-filter').addEventListener('change', loadCRM);
    loadCRM();
  }

  async function loadCRM() {
    const result = await chrome.storage.local.get('crmContacts');
    const contacts = result.crmContacts || {};
    const search = (document.getElementById('crm-search').value || '').toLowerCase();
    const filter = document.getElementById('crm-filter').value;

    let entries = Object.entries(contacts);

    // Filter
    if (filter !== 'all') {
      entries = entries.filter(([, c]) => c.category === filter);
    }

    // Search
    if (search) {
      entries = entries.filter(([url, c]) => {
        return (c.name || '').toLowerCase().includes(search) ||
               (c.tags || []).some(t => t.toLowerCase().includes(search)) ||
               (c.notes || '').toLowerCase().includes(search);
      });
    }

    // Sort by last updated
    entries.sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));

    document.getElementById('crm-count').textContent = entries.length;

    const container = document.getElementById('crm-list');
    container.innerHTML = '';

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">\uD83D\uDCCB</div>
          <p>No contacts yet. Visit a LinkedIn profile and click the CRM button to add one.</p>
        </div>
      `;
      return;
    }

    entries.forEach(([url, contact]) => {
      const initials = getInitials(contact.name || 'U');
      const card = document.createElement('div');
      card.className = 'crm-card';

      card.innerHTML = `
        <div class="crm-avatar">${initials}</div>
        <div class="info">
          <div class="name">${escapeHtml(contact.name || 'Unknown')}</div>
          <div class="meta">
            <span class="cat-badge ${(contact.category || 'lead').toLowerCase()}">${contact.category || 'Lead'}</span>
            ${contact.lastInteraction ? `<span>Last: ${contact.lastInteraction}</span>` : ''}
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        // Open the LinkedIn profile in a new tab
        chrome.tabs.create({ url });
      });

      container.appendChild(card);
    });
  }

  function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  function setupAnalytics() {
    document.getElementById('unlock-analytics').addEventListener('click', () => {
      // In production, this would open a payment flow
      alert('Premium upgrade coming soon! $14.99/month for unlimited features.');
    });
    loadAnalytics();
  }

  async function loadAnalytics() {
    if (!isPremium) return;

    const result = await chrome.storage.local.get('trackedPosts');
    const posts = result.trackedPosts || [];

    // Summary stats
    const totalReactions = posts.reduce((sum, p) => sum + (p.reactions || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.comments || 0), 0);
    const totalShares = posts.reduce((sum, p) => sum + (p.shares || 0), 0);

    document.getElementById('stat-posts').textContent = posts.length;
    document.getElementById('stat-reactions').textContent = formatNumber(totalReactions);
    document.getElementById('stat-comments').textContent = formatNumber(totalComments);
    document.getElementById('stat-shares').textContent = formatNumber(totalShares);

    // Best posting times
    const timeCounts = {};
    posts.forEach(p => {
      if (p.createdAt) {
        const date = new Date(p.createdAt);
        const hour = date.getHours();
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        const key = `${day} ${hour}:00`;
        const engagement = (p.reactions || 0) + (p.comments || 0) * 2 + (p.shares || 0) * 3;
        if (!timeCounts[key]) timeCounts[key] = { total: 0, count: 0 };
        timeCounts[key].total += engagement;
        timeCounts[key].count += 1;
      }
    });

    const bestTimesContainer = document.getElementById('best-times');
    const sortedTimes = Object.entries(timeCounts)
      .sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))
      .slice(0, 5);

    if (sortedTimes.length > 0) {
      bestTimesContainer.innerHTML = sortedTimes.map(([time]) =>
        `<span class="time-chip">${time}</span>`
      ).join('');
    } else {
      bestTimesContainer.innerHTML = '<span style="color:#999;font-size:12px">Not enough data yet. Keep posting!</span>';
    }

    // Top posts
    const topPostsContainer = document.getElementById('top-posts');
    const sorted = [...posts].sort((a, b) => {
      const engA = (a.reactions || 0) + (a.comments || 0) * 2 + (a.shares || 0) * 3;
      const engB = (b.reactions || 0) + (b.comments || 0) * 2 + (b.shares || 0) * 3;
      return engB - engA;
    }).slice(0, 5);

    if (sorted.length > 0) {
      topPostsContainer.innerHTML = sorted.map(post => `
        <div class="top-post-card">
          <div class="text">${escapeHtml((post.text || '').substring(0, 100))}${(post.text || '').length > 100 ? '...' : ''}</div>
          <div class="metrics">
            <span>\uD83D\uDC4D <strong>${post.reactions || 0}</strong></span>
            <span>\uD83D\uDCAC <strong>${post.comments || 0}</strong></span>
            <span>\u267B\uFE0F <strong>${post.shares || 0}</strong></span>
          </div>
        </div>
      `).join('');
    } else {
      topPostsContainer.innerHTML = '<span style="color:#999;font-size:12px">No posts tracked yet.</span>';
    }
  }

  // ============================================================================
  // SETTINGS
  // ============================================================================

  function setupSettings() {
    document.getElementById('upgrade-btn').addEventListener('click', () => {
      alert('Premium upgrade coming soon! $14.99/month for unlimited features.');
    });

    document.getElementById('export-data').addEventListener('click', async () => {
      const syncData = await chrome.storage.sync.get(null);
      const localData = await chrome.storage.local.get(null);
      const data = { sync: syncData, local: localData };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linkedboost-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('clear-data').addEventListener('click', async () => {
      if (!confirm('Are you sure? This will delete ALL LinkedBoost data (templates, CRM contacts, analytics).')) return;
      if (!confirm('This cannot be undone. Really clear all data?')) return;
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
      // Re-initialize defaults
      await chrome.storage.sync.set({
        premium: false,
        postTemplates: [],
        dmTemplates: []
      });
      await chrome.storage.local.set({
        crmContacts: {},
        trackedPosts: []
      });
      loadPostTemplates();
      loadDMTemplates();
      loadCRM();
      alert('All data cleared.');
    });
  }

  // --- Utilities ---
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return String(num);
  }

})();
