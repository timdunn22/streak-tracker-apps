/* ===================================================================
   FlipFlow — content-common.js
   Shared utilities used by all marketplace content scripts.
   =================================================================== */

const FlipFlow = (() => {
  /* ---------- constants ---------- */
  const STORAGE_KEYS = {
    SAVED_LISTINGS: 'flipflow_saved_listings',
    CROSS_POSTS: 'flipflow_cross_posts',
    SHARE_STATS: 'flipflow_share_stats',
    PREMIUM: 'flipflow_premium',
    DAILY_USAGE: 'flipflow_daily_usage',
  };

  const FREE_LIMITS = {
    SHARES_PER_DAY: 10,
    COPIES_PER_DAY: 5,
  };

  const PLATFORMS = {
    POSHMARK: 'poshmark',
    EBAY: 'ebay',
    MERCARI: 'mercari',
  };

  /* ---------- helpers ---------- */

  /** Return a random integer between min and max inclusive. */
  function randomDelay(min = 2000, max = 10000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /** Promise-wrapped setTimeout. */
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Get the current hostname (testable). */
  function getHostname() {
    return (window._flipflowTestHost || window.location.hostname).replace('www.', '');
  }

  /** Get the current pathname (testable). */
  function getPathname() {
    return window._flipflowTestPath || window.location.pathname;
  }

  /** Get the current href (testable). */
  function getHref() {
    return window._flipflowTestHref || window.location.href;
  }

  /** Detect which marketplace we're on. */
  function detectPlatform() {
    const host = getHostname();
    if (host.includes('poshmark.com')) return PLATFORMS.POSHMARK;
    if (host.includes('ebay.com')) return PLATFORMS.EBAY;
    if (host.includes('mercari.com')) return PLATFORMS.MERCARI;
    return null;
  }

  /** Today's date as YYYY-MM-DD. */
  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  /* ---------- storage wrappers ---------- */

  async function getStorage(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => resolve(result[key]));
    });
  }

  async function setStorage(obj) {
    return new Promise((resolve) => {
      chrome.storage.local.set(obj, resolve);
    });
  }

  /* ---------- daily usage tracking ---------- */

  async function getDailyUsage() {
    const usage = (await getStorage(STORAGE_KEYS.DAILY_USAGE)) || {};
    const today = todayKey();
    if (!usage[today]) {
      usage[today] = { shares: 0, copies: 0 };
    }
    return { usage, today };
  }

  async function incrementUsage(type) {
    const { usage, today } = await getDailyUsage();
    usage[today][type] = (usage[today][type] || 0) + 1;
    await setStorage({ [STORAGE_KEYS.DAILY_USAGE]: usage });
    return usage[today][type];
  }

  async function canPerformAction(type) {
    const isPremium = await getStorage(STORAGE_KEYS.PREMIUM);
    if (isPremium) return { allowed: true, remaining: Infinity };

    const { usage, today } = await getDailyUsage();
    const current = usage[today]?.[type] || 0;
    const limit =
      type === 'shares' ? FREE_LIMITS.SHARES_PER_DAY : FREE_LIMITS.COPIES_PER_DAY;
    return { allowed: current < limit, remaining: limit - current };
  }

  /* ---------- saved-listing helpers ---------- */

  async function saveListing(listing) {
    const listings = (await getStorage(STORAGE_KEYS.SAVED_LISTINGS)) || [];
    listing.id = listing.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    listing.savedAt = new Date().toISOString();
    listings.push(listing);
    await setStorage({ [STORAGE_KEYS.SAVED_LISTINGS]: listings });
    await incrementUsage('copies');
    return listing;
  }

  async function getSavedListings() {
    return (await getStorage(STORAGE_KEYS.SAVED_LISTINGS)) || [];
  }

  async function deleteSavedListing(id) {
    let listings = (await getStorage(STORAGE_KEYS.SAVED_LISTINGS)) || [];
    listings = listings.filter((l) => l.id !== id);
    await setStorage({ [STORAGE_KEYS.SAVED_LISTINGS]: listings });
  }

  async function getLastCopiedListing() {
    const listings = await getSavedListings();
    return listings.length > 0 ? listings[listings.length - 1] : null;
  }

  /* ---------- cross-post tracking ---------- */

  async function recordCrossPost(listingId, platform) {
    const posts = (await getStorage(STORAGE_KEYS.CROSS_POSTS)) || {};
    if (!posts[listingId]) posts[listingId] = [];
    if (!posts[listingId].includes(platform)) {
      posts[listingId].push(platform);
    }
    await setStorage({ [STORAGE_KEYS.CROSS_POSTS]: posts });
  }

  async function getCrossPosts() {
    return (await getStorage(STORAGE_KEYS.CROSS_POSTS)) || {};
  }

  /* ---------- share stats ---------- */

  async function recordShares(count) {
    const stats = (await getStorage(STORAGE_KEYS.SHARE_STATS)) || {};
    const today = todayKey();
    stats[today] = (stats[today] || 0) + count;
    await setStorage({ [STORAGE_KEYS.SHARE_STATS]: stats });
  }

  async function getShareStats() {
    return (await getStorage(STORAGE_KEYS.SHARE_STATS)) || {};
  }

  /* ---------- DOM helpers ---------- */

  /** Wait for a selector to appear in the DOM. */
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout waiting for ${selector}`));
      }, timeout);
    });
  }

  /** Simulate a realistic click. */
  function simulateClick(element) {
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    ['mouseover', 'mouseenter', 'mousemove', 'mousedown', 'mouseup', 'click'].forEach(
      (type) => {
        element.dispatchEvent(
          new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y,
          })
        );
      }
    );
  }

  /** Set an input's value with React-compatible events. */
  function setInputValue(input, value) {
    if (!input) return;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;

    try {
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, value);
      } else {
        input.value = value;
      }
    } catch {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ---------- injected-UI helpers ---------- */

  /** Create a FlipFlow floating button that's injected into the page. */
  function createFloatingButton(text, onClick, options = {}) {
    const btn = document.createElement('button');
    btn.className = `flipflow-btn ${options.className || ''}`;
    btn.textContent = text;
    btn.addEventListener('click', onClick);

    if (options.icon) {
      const icon = document.createElement('span');
      icon.className = 'flipflow-btn-icon';
      icon.textContent = options.icon;
      btn.prepend(icon);
    }
    return btn;
  }

  /** Show a transient toast notification. */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `flipflow-toast flipflow-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('flipflow-toast-show'));

    setTimeout(() => {
      toast.classList.remove('flipflow-toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /** Show a progress overlay. */
  function createProgressOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'flipflow-progress-overlay';
    overlay.innerHTML = `
      <div class="flipflow-progress-box">
        <div class="flipflow-progress-title">FlipFlow</div>
        <div class="flipflow-progress-status">Initializing...</div>
        <div class="flipflow-progress-bar-wrap">
          <div class="flipflow-progress-bar"></div>
        </div>
        <div class="flipflow-progress-count">0 / 0</div>
        <button class="flipflow-btn flipflow-btn-cancel">Cancel</button>
      </div>
    `;
    document.body.appendChild(overlay);

    let cancelled = false;

    return {
      el: overlay,
      setStatus(text) {
        overlay.querySelector('.flipflow-progress-status').textContent = text;
      },
      setProgress(current, total) {
        const pct = total > 0 ? (current / total) * 100 : 0;
        overlay.querySelector('.flipflow-progress-bar').style.width = `${pct}%`;
        overlay.querySelector('.flipflow-progress-count').textContent = `${current} / ${total}`;
      },
      onCancel(cb) {
        overlay.querySelector('.flipflow-btn-cancel').addEventListener('click', () => {
          cancelled = true;
          if (cb) cb();
        });
      },
      isCancelled() {
        return cancelled;
      },
      close() {
        overlay.remove();
      },
    };
  }

  /* ---------- public API ---------- */
  return {
    STORAGE_KEYS,
    FREE_LIMITS,
    PLATFORMS,
    randomDelay,
    sleep,
    detectPlatform,
    getHostname,
    getPathname,
    getHref,
    todayKey,
    getStorage,
    setStorage,
    getDailyUsage,
    incrementUsage,
    canPerformAction,
    saveListing,
    getSavedListings,
    deleteSavedListing,
    getLastCopiedListing,
    recordCrossPost,
    getCrossPosts,
    recordShares,
    getShareStats,
    waitForElement,
    simulateClick,
    setInputValue,
    createFloatingButton,
    showToast,
    createProgressOverlay,
  };
})();
