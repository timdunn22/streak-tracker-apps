/* ============================================
   LeadHarvest — Popup Script
   ============================================ */

(function () {
  'use strict';

  const FREE_DAILY_LIMIT = 25;

  // ---- Load Stats ----
  async function loadStats() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_STATS' }, (stats) => {
        if (chrome.runtime.lastError || !stats) {
          resolve(null);
          return;
        }
        resolve(stats);
      });
    });
  }

  async function updateUI() {
    const stats = await loadStats();
    if (!stats) return;

    document.getElementById('stat-today').textContent = stats.dailyCount;
    document.getElementById('stat-total').textContent = stats.totalLeads;
    document.getElementById('stat-emails').textContent = stats.emailCount;
    document.getElementById('stat-phones').textContent = stats.phoneCount;
    document.getElementById('stat-lifetime').textContent = stats.lifetime;

    // Tier badge
    const tierBadge = document.getElementById('tier-badge');
    const tierText = document.getElementById('tier-text');
    const tierDot = tierBadge.querySelector('.tier-dot');

    if (stats.isPremium) {
      tierText.textContent = 'Premium Plan \u2014 Unlimited leads';
      tierDot.className = 'tier-dot tier-premium';
    } else {
      const remaining = Math.max(0, FREE_DAILY_LIMIT - stats.dailyCount);
      tierText.textContent = `Free Plan \u2014 ${remaining} leads remaining today`;
      tierDot.className = 'tier-dot tier-free';
    }
  }

  // ---- CSV Export ----
  function escapeCSV(val) {
    if (!val) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  async function exportCSV() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'EXPORT_LEADS' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          showStatus('Failed to export.', 'error');
          resolve();
          return;
        }

        const leads = response.leads || [];
        if (leads.length === 0) {
          showStatus('No leads to export.', 'error');
          resolve();
          return;
        }

        const headers = [
          'Business Name',
          'Address',
          'Phone',
          'Website',
          'Email',
          'Rating',
          'Reviews',
          'Category',
          'Hours',
          'Social Links',
          'Scraped At',
        ];

        const rows = leads.map((l) =>
          [
            l.name,
            l.address,
            l.phone,
            l.website,
            l.email,
            l.rating,
            l.reviewCount,
            l.category,
            l.hours,
            (l.socialLinks || []).join('; '),
            l.scrapedAt,
          ]
            .map(escapeCSV)
            .join(',')
        );

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leadharvest-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        showStatus(`Exported ${leads.length} leads to CSV.`, 'success');
        resolve();
      });
    });
  }

  // ---- Copy Emails ----
  async function copyEmails() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'EXPORT_LEADS' }, async (response) => {
        if (chrome.runtime.lastError || !response) {
          showStatus('Failed to get leads.', 'error');
          resolve();
          return;
        }

        const leads = response.leads || [];
        const emails = [...new Set(leads.map((l) => l.email).filter(Boolean))];

        if (emails.length === 0) {
          showStatus('No emails found yet.', 'info');
          resolve();
          return;
        }

        try {
          await navigator.clipboard.writeText(emails.join('\n'));
          showStatus(`Copied ${emails.length} email(s) to clipboard.`, 'success');
        } catch (err) {
          showStatus('Failed to copy to clipboard.', 'error');
        }
        resolve();
      });
    });
  }

  // ---- Clear Data ----
  async function clearData() {
    if (!confirm('Clear all scraped leads? This cannot be undone.')) return;

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'CLEAR_LEADS' }, () => {
        showStatus('All data cleared.', 'info');
        updateUI();
        resolve();
      });
    });
  }

  // ---- Toggle Panel ----
  function togglePanel() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_PANEL' });
      }
    });
    window.close();
  }

  // ---- Status Message ----
  function showStatus(message, type) {
    const el = document.getElementById('popup-status');
    el.textContent = message;
    el.className = 'popup-status ' + (type || '');
    setTimeout(() => {
      el.textContent = '';
      el.className = 'popup-status';
    }, 4000);
  }

  // ---- Wire Events ----
  document.getElementById('btn-export').addEventListener('click', exportCSV);
  document.getElementById('btn-copy-emails').addEventListener('click', copyEmails);
  document.getElementById('btn-clear').addEventListener('click', clearData);
  document.getElementById('btn-toggle-panel').addEventListener('click', (e) => {
    e.preventDefault();
    togglePanel();
  });

  // ---- Init ----
  updateUI();
})();
