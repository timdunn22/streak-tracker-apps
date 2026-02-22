const CATEGORIES = {
  utm: { label: 'UTM', params: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id'] },
  facebook: { label: 'Facebook', params: ['fbclid', 'fb_action_ids', 'fb_action_types', 'fb_ref', 'fb_source'] },
  google: { label: 'Google', params: ['gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid'] },
  microsoft: { label: 'Microsoft', params: ['msclkid'] },
  hubspot: { label: 'HubSpot', params: ['hsa_cam', 'hsa_grp', 'hsa_mt', 'hsa_src', 'hsa_ad', 'hsa_acc', 'hsa_net', 'hsa_ver', 'hsa_la', 'hsa_ol', 'hsa_kw', '_hsenc', '_hsmi', '__hstc', '__hsfp', '__hssc'] },
  mailchimp: { label: 'Mailchimp', params: ['mc_cid', 'mc_eid'] },
  adobe: { label: 'Adobe', params: ['s_cid'] },
  generic: { label: 'Generic', params: ['ref', 'referrer', '_ga', '_gl', 'igshid', 'si', 'feature', 'app'] }
};

document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  buildCategories();
  setupListeners();
});

function loadStats() {
  chrome.runtime.sendMessage({ type: 'getStats' }, (data) => {
    if (!data) return;
    document.getElementById('paramsToday').textContent = data.paramsRemovedToday || 0;
    document.getElementById('urlsCleaned').textContent = data.urlsCleanedSession || 0;
    document.getElementById('globalToggle').checked = data.enabled !== false;

    // Update category toggles
    if (data.categoryToggles) {
      for (const [cat, enabled] of Object.entries(data.categoryToggles)) {
        const toggle = document.getElementById(`cat-${cat}`);
        if (toggle) toggle.checked = enabled;
      }
    }

    renderRecentUrls(data.recentUrls || []);
  });
}

function buildCategories() {
  const container = document.getElementById('categoryList');
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const div = document.createElement('div');
    div.className = 'category-item';
    div.innerHTML = `
      <span class="category-name">${cat.label}</span>
      <label class="category-toggle">
        <input type="checkbox" id="cat-${key}" data-category="${key}" checked>
        <span class="cat-slider"></span>
      </label>
    `;
    container.appendChild(div);
  }
}

function renderRecentUrls(urls) {
  const container = document.getElementById('recentList');
  if (!urls.length) {
    container.innerHTML = '<p class="empty-state">No URLs cleaned yet</p>';
    return;
  }

  container.innerHTML = '';
  urls.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'recent-item';
    const displayUrl = item.cleaned.length > 80 ? item.cleaned.slice(0, 80) + '...' : item.cleaned;
    const time = new Date(item.timestamp).toLocaleTimeString();
    div.innerHTML = `
      <div class="recent-url">${escapeHtml(displayUrl)}</div>
      <div class="recent-meta">${item.paramsRemoved} param(s) removed &middot; ${time}</div>
    `;
    container.appendChild(div);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function setupListeners() {
  // Global toggle
  document.getElementById('globalToggle').addEventListener('change', (e) => {
    chrome.runtime.sendMessage({ type: 'toggleEnabled', enabled: e.target.checked });
  });

  // Clean URL button
  document.getElementById('cleanBtn').addEventListener('click', () => {
    const dirtyUrl = document.getElementById('dirtyUrl').value.trim();
    if (!dirtyUrl) return;

    chrome.runtime.sendMessage({ type: 'cleanUrl', url: dirtyUrl }, (response) => {
      if (response && response.cleaned) {
        document.getElementById('cleanedUrl').value = response.cleaned;
        document.getElementById('cleanResult').classList.remove('hidden');
      }
    });
  });

  // Copy button
  document.getElementById('copyBtn').addEventListener('click', () => {
    const cleanedUrl = document.getElementById('cleanedUrl').value;
    navigator.clipboard.writeText(cleanedUrl).then(() => {
      const btn = document.getElementById('copyBtn');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });
  });

  // Category toggles
  document.getElementById('categoryList').addEventListener('change', (e) => {
    if (e.target.dataset.category) {
      const toggles = {};
      for (const key of Object.keys(CATEGORIES)) {
        const el = document.getElementById(`cat-${key}`);
        toggles[key] = el ? el.checked : true;
      }
      chrome.runtime.sendMessage({ type: 'updateCategoryToggles', categoryToggles: toggles });
    }
  });

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'resetStats' }, () => {
      document.getElementById('paramsToday').textContent = '0';
      document.getElementById('urlsCleaned').textContent = '0';
      document.getElementById('recentList').innerHTML = '<p class="empty-state">No URLs cleaned yet</p>';
    });
  });
}
