/* ===================================================================
   FlipFlow — popup.js
   Dashboard popup logic: stats, inventory, cross-post tracker,
   scheduled sharing, settings.
   =================================================================== */

document.addEventListener('DOMContentLoaded', init);

/* ------------------------------------------------------------------
   Init
   ------------------------------------------------------------------ */

async function init() {
  setupTabs();
  setupQuickActions();
  setupSettings();
  await loadDashboard();
  await loadInventory();
  await loadCrossPosts();
  await checkPremium();
}

/* ------------------------------------------------------------------
   Tab navigation
   ------------------------------------------------------------------ */

function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('tab-active'));
      tab.classList.add('tab-active');

      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('tab-panel-active'));
      const target = document.getElementById(`tab-${tab.dataset.tab}`);
      if (target) target.classList.add('tab-panel-active');
    });
  });
}

/* ------------------------------------------------------------------
   Dashboard
   ------------------------------------------------------------------ */

async function loadDashboard() {
  const stats = await sendMessage({ type: 'GET_STATS' });
  if (!stats) return;

  document.getElementById('todayShares').textContent = stats.todayShares;
  document.getElementById('totalListings').textContent = stats.totalListings;
  document.getElementById('crossPostCount').textContent = stats.crossPostCount;

  const usage = stats.todayUsage || { copies: 0 };
  document.getElementById('copiesUsed').textContent = `${usage.copies}/5`;

  renderChart(stats.last7 || []);
}

function renderChart(data) {
  const chart = document.getElementById('shareChart');
  chart.innerHTML = '';

  const max = Math.max(...data.map((d) => d.shares), 1);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  data.forEach((d) => {
    const col = document.createElement('div');
    col.className = 'chart-bar-wrap';

    const val = document.createElement('div');
    val.className = 'chart-val';
    val.textContent = d.shares;

    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    const pct = (d.shares / max) * 100;
    bar.style.height = `${Math.max(pct, 5)}%`;

    const day = document.createElement('div');
    day.className = 'chart-day';
    const date = new Date(d.date + 'T12:00:00');
    day.textContent = days[date.getDay()];

    col.appendChild(val);
    col.appendChild(bar);
    col.appendChild(day);
    chart.appendChild(col);
  });
}

/* ------------------------------------------------------------------
   Inventory
   ------------------------------------------------------------------ */

async function loadInventory() {
  const listings = await sendMessage({ type: 'GET_LISTINGS' });
  renderListings(listings || []);

  document.getElementById('searchListings').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = (listings || []).filter(
      (l) =>
        l.title?.toLowerCase().includes(q) ||
        l.brand?.toLowerCase().includes(q) ||
        l.sourcePlatform?.toLowerCase().includes(q)
    );
    renderListings(filtered);
  });
}

function renderListings(listings) {
  const container = document.getElementById('listingList');

  if (!listings.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#x1F4CB;</div>
        <p>No saved listings yet.</p>
        <p class="empty-hint">Visit a listing on Poshmark, eBay, or Mercari and click "Copy Listing".</p>
      </div>
    `;
    return;
  }

  container.innerHTML = listings
    .slice()
    .reverse()
    .map((l) => {
      const thumb = l.photos && l.photos.length > 0
        ? `<img class="listing-thumb" src="${escapeHtml(l.photos[0])}" alt="">`
        : `<div class="listing-thumb-placeholder">&#x1F4F7;</div>`;

      const platformClass = `platform-${l.sourcePlatform || 'poshmark'}`;

      const soldBadge = l.sold
        ? `<span class="listing-sold-badge">SOLD</span>`
        : `<button class="listing-mark-sold" data-id="${escapeHtml(l.id)}" title="Mark as Sold">Mark Sold</button>`;

      return `
        <div class="listing-item ${l.sold ? 'listing-sold' : ''}" data-id="${escapeHtml(l.id)}">
          ${thumb}
          <div class="listing-info">
            <div class="listing-title">${escapeHtml(l.title)}</div>
            <div class="listing-meta">
              <span class="listing-platform ${platformClass}">${escapeHtml(l.sourcePlatform || 'unknown')}</span>
              ${l.brand ? ` &middot; ${escapeHtml(l.brand)}` : ''}
            </div>
            ${l.price ? `<div class="listing-price">$${escapeHtml(l.price)}</div>` : ''}
            <div class="listing-actions-row">${soldBadge}</div>
          </div>
          <button class="listing-delete" data-id="${escapeHtml(l.id)}" title="Delete">&times;</button>
        </div>
      `;
    })
    .join('');

  /* attach delete handlers */
  container.querySelectorAll('.listing-delete').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      await sendMessage({ type: 'DELETE_LISTING', id });
      await loadInventory();
      await loadDashboard();
    });
  });

  /* attach mark-sold handlers */
  container.querySelectorAll('.listing-mark-sold').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const listing = (listings || []).find((l) => l.id === id);
      const soldOn = listing?.sourcePlatform || 'unknown';
      await sendMessage({ type: 'MARK_SOLD', id, soldOn });
      showPopupToast(`Marked as sold on ${soldOn}`);

      /* check for delist targets */
      const result = await sendMessage({ type: 'GET_DELIST_TARGETS', id });
      if (result?.targets?.length > 0) {
        showDelistPrompt(id, result.targets, result.listing);
      }

      await loadInventory();
      await loadDashboard();
      await loadCrossPosts();
    });
  });
}

/* ------------------------------------------------------------------
   Cross-Post Tracker
   ------------------------------------------------------------------ */

async function loadCrossPosts() {
  const crossPosts = await sendMessage({ type: 'GET_CROSS_POSTS' });
  const listings = await sendMessage({ type: 'GET_LISTINGS' });
  renderCrossPosts(crossPosts || {}, listings || []);
}

function renderCrossPosts(crossPosts, listings) {
  const container = document.getElementById('crosspostList');
  const entries = Object.entries(crossPosts).filter(([, platforms]) => platforms.length > 0);

  if (!entries.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#x1F504;</div>
        <p>No cross-posted items yet.</p>
        <p class="empty-hint">Copy a listing, then paste it on another marketplace to track cross-posts.</p>
      </div>
    `;
    return;
  }

  /* build a map of listing id -> title */
  const titleMap = {};
  listings.forEach((l) => {
    if (l.id) titleMap[l.id] = l.title;
  });

  container.innerHTML = entries
    .map(([id, platforms]) => {
      const title = titleMap[id] || 'Unknown Listing';
      const badges = platforms
        .map((p) => `<span class="listing-platform platform-${p}">${p}</span>`)
        .join('');

      return `
        <div class="crosspost-item">
          <div class="crosspost-title">${escapeHtml(title)}</div>
          <div class="crosspost-platforms">${badges}</div>
        </div>
      `;
    })
    .join('');
}

/* ------------------------------------------------------------------
   Quick Actions
   ------------------------------------------------------------------ */

function setupQuickActions() {
  document.getElementById('btnOpenPoshmark').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://poshmark.com/closet' });
  });
  document.getElementById('btnOpenEbay').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.ebay.com/sl/sell' });
  });
  document.getElementById('btnOpenMercari').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.mercari.com/sell/' });
  });
}

/* ------------------------------------------------------------------
   Settings
   ------------------------------------------------------------------ */

function setupSettings() {
  /* add schedule row */
  document.getElementById('btnAddSchedule').addEventListener('click', () => {
    const container = document.getElementById('scheduleTimes');
    const row = document.createElement('div');
    row.className = 'schedule-row';
    row.innerHTML = `
      <input type="time" class="schedule-input" value="08:00">
      <button class="schedule-remove" title="Remove">&times;</button>
    `;
    row.querySelector('.schedule-remove').addEventListener('click', () => row.remove());
    container.appendChild(row);
  });

  /* remove schedule rows */
  document.querySelectorAll('.schedule-remove').forEach((btn) => {
    btn.addEventListener('click', () => btn.parentElement.remove());
  });

  /* save schedule */
  document.getElementById('btnSaveSchedule').addEventListener('click', async () => {
    const inputs = document.querySelectorAll('.schedule-input');
    const times = [...inputs].map((i) => i.value).filter(Boolean);
    const result = await sendMessage({ type: 'SCHEDULE_SHARES', times });
    if (result?.success) {
      showPopupToast(`Saved ${result.scheduled} scheduled share times.`);
    }
  });

  /* upgrade */
  document.getElementById('btnUpgrade').addEventListener('click', () => {
    /* placeholder — would connect to payment provider */
    showPopupToast('Payment integration coming soon!');
  });

  /* clear data */
  document.getElementById('btnClearData').addEventListener('click', async () => {
    if (confirm('Clear all FlipFlow data? This cannot be undone.')) {
      await chrome.storage.local.clear();
      showPopupToast('All data cleared.');
      await loadDashboard();
      await loadInventory();
      await loadCrossPosts();
    }
  });
}

/* ------------------------------------------------------------------
   Premium check
   ------------------------------------------------------------------ */

async function checkPremium() {
  const isPremium = await sendMessage({ type: 'GET_PREMIUM' });
  const badge = document.getElementById('premiumBadge');
  if (isPremium) {
    badge.textContent = 'PREMIUM';
    badge.classList.add('premium');
  }
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const DELIST_URLS = {
  poshmark: 'https://poshmark.com/closet',
  ebay: 'https://www.ebay.com/sh/lst/active',
  mercari: 'https://www.mercari.com/mypage/listings/',
};

function showDelistPrompt(listingId, targets, listing) {
  const existing = document.querySelector('.delist-prompt');
  if (existing) existing.remove();

  const prompt = document.createElement('div');
  prompt.className = 'delist-prompt';
  prompt.innerHTML = `
    <div class="delist-header">
      <strong>${escapeHtml(listing.title)}</strong> sold!
    </div>
    <p class="delist-text">Delist from other platforms:</p>
    <div class="delist-buttons">
      ${targets.map((p) => `
        <button class="delist-btn delist-btn-${p}" data-platform="${p}">
          Delist from ${p.charAt(0).toUpperCase() + p.slice(1)}
        </button>
      `).join('')}
    </div>
    <button class="delist-dismiss">Dismiss</button>
  `;

  prompt.querySelector('.delist-dismiss').addEventListener('click', () => prompt.remove());

  prompt.querySelectorAll('.delist-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const platform = btn.dataset.platform;
      const url = DELIST_URLS[platform] || '#';
      chrome.tabs.create({ url });
      showPopupToast(`Opened ${platform} — find and delist "${listing.title}"`);
      btn.textContent = 'Opened';
      btn.disabled = true;
    });
  });

  document.querySelector('.popup').appendChild(prompt);
}

function showPopupToast(msg) {
  /* quick inline toast for popup */
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%) translateY(10px);
    background: #4F46E5; color: #fff; padding: 8px 16px; border-radius: 8px;
    font-size: 12px; z-index: 9999; opacity: 0; transition: all 0.2s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, 2500);
}
