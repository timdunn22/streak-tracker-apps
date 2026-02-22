/* ──────────────────────────────────────────────────────────────────────────────
   NicheScout — Popup Script
   Keyword research, BSR calculator, history, settings
   ────────────────────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // ── Elements ──────────────────────────────────────────────────────────────

  const tabs = document.querySelectorAll('.ns-tab');
  const panels = document.querySelectorAll('.ns-panel');
  const usageEl = document.getElementById('ns-usage');

  // Keywords
  const kwInput = document.getElementById('ns-keyword-input');
  const kwSearch = document.getElementById('ns-keyword-search');
  const kwResults = document.getElementById('ns-keyword-results');
  const kwStatus = document.getElementById('ns-keyword-status');
  const sampleBtns = document.querySelectorAll('.ns-sample');

  // BSR
  const bsrInput = document.getElementById('ns-bsr-input');
  const bsrCategory = document.getElementById('ns-bsr-category');
  const bsrCalcBtn = document.getElementById('ns-bsr-calc');
  const bsrResults = document.getElementById('ns-bsr-results');

  // History
  const historyList = document.getElementById('ns-history-list');
  const clearHistoryBtn = document.getElementById('ns-clear-history');

  // Settings
  const premiumCard = document.getElementById('ns-premium-card');
  const upgradeBtn = document.getElementById('ns-upgrade-btn');

  // ── Tab Switching ─────────────────────────────────────────────────────────

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');

      // Load tab-specific data
      if (tab.dataset.tab === 'history') loadHistory();
      if (tab.dataset.tab === 'settings') loadSettings();
    });
  });

  // ── Usage Display ─────────────────────────────────────────────────────────

  function updateUsage() {
    chrome.runtime.sendMessage({ type: 'GET_USAGE' }, (res) => {
      if (chrome.runtime.lastError || !res) return;
      if (res.premium) {
        usageEl.innerHTML = '<strong>Premium</strong> \u2714';
      } else {
        usageEl.innerHTML = `<strong>${res.remaining}</strong>/5 searches today`;
      }
    });
  }

  updateUsage();

  // ── Keyword Research ──────────────────────────────────────────────────────

  function doKeywordSearch(keyword) {
    if (!keyword.trim()) return;

    kwResults.innerHTML = '';
    kwStatus.innerHTML = '<span class="ns-spinner"></span> Searching...';
    kwStatus.classList.remove('ns-error');
    kwSearch.disabled = true;

    chrome.runtime.sendMessage({ type: 'AUTOCOMPLETE', prefix: keyword.trim() }, (res) => {
      kwSearch.disabled = false;

      if (chrome.runtime.lastError) {
        kwStatus.textContent = 'Error contacting background script.';
        kwStatus.classList.add('ns-error');
        return;
      }

      if (res.error === 'limit') {
        kwStatus.innerHTML = 'Daily limit reached (5/5). <strong>Upgrade to Premium</strong> for unlimited searches.';
        kwStatus.classList.add('ns-error');
        return;
      }

      if (res.error) {
        kwStatus.textContent = `Error: ${res.error}`;
        kwStatus.classList.add('ns-error');
        return;
      }

      updateUsage();

      const suggestions = res.suggestions || [];
      if (suggestions.length === 0) {
        kwStatus.textContent = 'No suggestions found. Try a different keyword.';
        return;
      }

      kwStatus.textContent = `${suggestions.length} suggestions found`;

      suggestions.forEach((s) => {
        const volClass = s.volumeIndicator === 'High' ? 'ns-vol-high'
          : s.volumeIndicator === 'Medium' ? 'ns-vol-medium' : 'ns-vol-low';

        const item = document.createElement('div');
        item.className = 'ns-result-item';
        item.innerHTML = `
          <span class="ns-result-pos">${s.position}</span>
          <span class="ns-result-keyword" title="Search on Amazon">${s.keyword}</span>
          <span class="ns-result-volume ${volClass}">${s.volumeIndicator}</span>
          <button class="ns-result-action" title="Search on Amazon">\u2192</button>
        `;

        // Click keyword to search on Amazon
        const kwLink = item.querySelector('.ns-result-keyword');
        const actionBtn = item.querySelector('.ns-result-action');
        const openAmazon = () => {
          chrome.tabs.create({
            url: `https://www.amazon.com/s?k=${encodeURIComponent(s.keyword)}`,
          });
        };
        kwLink.addEventListener('click', openAmazon);
        actionBtn.addEventListener('click', openAmazon);

        kwResults.appendChild(item);
      });
    });
  }

  kwSearch.addEventListener('click', () => doKeywordSearch(kwInput.value));
  kwInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doKeywordSearch(kwInput.value);
  });

  sampleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      kwInput.value = btn.dataset.kw;
      doKeywordSearch(btn.dataset.kw);
    });
  });

  // ── BSR Calculator ────────────────────────────────────────────────────────

  bsrCalcBtn.addEventListener('click', () => {
    const bsr = parseInt(bsrInput.value, 10);
    if (!bsr || bsr < 1) {
      bsrResults.innerHTML = '<p class="ns-status ns-error">Enter a valid BSR number.</p>';
      return;
    }

    const category = bsrCategory.value;

    chrome.runtime.sendMessage({ type: 'BSR_TO_SALES', bsr, category }, (res) => {
      if (chrome.runtime.lastError || !res) {
        bsrResults.innerHTML = '<p class="ns-status ns-error">Calculation error.</p>';
        return;
      }

      bsrResults.innerHTML = `
        <div class="ns-bsr-card">
          <h3>BSR #${bsr.toLocaleString()} (${bsrCategory.options[bsrCategory.selectedIndex].text})</h3>
          <div class="ns-bsr-stats">
            <div class="ns-bsr-stat">
              <div class="ns-bsr-stat-value">${res.daily}</div>
              <div class="ns-bsr-stat-label">Daily Sales</div>
            </div>
            <div class="ns-bsr-stat">
              <div class="ns-bsr-stat-value">${res.monthly.toLocaleString()}</div>
              <div class="ns-bsr-stat-label">Monthly Sales</div>
            </div>
            <div class="ns-bsr-stat">
              <div class="ns-bsr-stat-value">${res.yearly.toLocaleString()}</div>
              <div class="ns-bsr-stat-label">Yearly Sales</div>
            </div>
          </div>
        </div>
      `;
    });
  });

  // Enter key on BSR input
  bsrInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') bsrCalcBtn.click();
  });

  // ── History ───────────────────────────────────────────────────────────────

  function nicheColor(score) {
    if (score >= 70) return '#22c55e';
    if (score >= 45) return '#eab308';
    return '#ef4444';
  }

  function loadHistory() {
    chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (history) => {
      if (chrome.runtime.lastError || !history) {
        historyList.innerHTML = '<div class="ns-empty-state"><p>Could not load history.</p></div>';
        return;
      }

      if (history.length === 0) {
        historyList.innerHTML = `
          <div class="ns-empty-state">
            <p>No research history yet.</p>
            <p>Visit Amazon search results to start tracking niches.</p>
          </div>
        `;
        return;
      }

      historyList.innerHTML = history.map((h) => {
        const date = new Date(h.timestamp).toLocaleDateString();
        return `
          <div class="ns-history-item">
            <div class="ns-history-score" style="background:${nicheColor(h.nicheScore)}">${h.nicheScore}</div>
            <div class="ns-history-info">
              <div class="ns-history-keyword">${h.keyword}</div>
              <div class="ns-history-meta">
                <span>${h.resultCount} results</span>
                <span>${h.totalReviews.toLocaleString()} reviews</span>
                <span>$${h.avgPrice}</span>
                <span>${h.trend}</span>
              </div>
            </div>
            <span class="ns-history-date">${date}</span>
          </div>
        `;
      }).join('');
    });
  }

  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Clear all research history?')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' }, () => {
        loadHistory();
      });
    }
  });

  // ── Settings ──────────────────────────────────────────────────────────────

  function loadSettings() {
    chrome.runtime.sendMessage({ type: 'GET_USAGE' }, (res) => {
      if (chrome.runtime.lastError || !res) return;

      const badge = premiumCard.querySelector('.ns-premium-badge');
      const btn = document.getElementById('ns-upgrade-btn');
      const title = premiumCard.querySelector('h3');

      if (res.premium) {
        badge.textContent = 'PREMIUM';
        badge.classList.add('ns-is-premium');
        title.textContent = 'You\'re Premium!';
        btn.textContent = 'Manage Subscription';
      } else {
        badge.textContent = 'FREE';
        badge.classList.remove('ns-is-premium');
        title.textContent = 'Upgrade to Premium';
        btn.textContent = 'Upgrade Now';
      }
    });
  }

  upgradeBtn.addEventListener('click', () => {
    // In production this would open a payment page; for now toggle premium
    chrome.runtime.sendMessage({ type: 'GET_USAGE' }, (res) => {
      if (res && res.premium) {
        chrome.runtime.sendMessage({ type: 'SET_PREMIUM', value: false }, () => {
          loadSettings();
          updateUsage();
        });
      } else {
        // Simulated upgrade
        if (confirm('Activate Premium ($12.99/mo)?\n\n(This is a demo — premium will be activated for free.)')) {
          chrome.runtime.sendMessage({ type: 'SET_PREMIUM', value: true }, () => {
            loadSettings();
            updateUsage();
          });
        }
      }
    });
  });
});
