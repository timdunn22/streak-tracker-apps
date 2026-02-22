/* ===================================================================
   FlipFlow — content-poshmark.js
   Poshmark-specific: Share All, Relist, Copy Listing, Closet Stats
   =================================================================== */

(() => {
  const SELECTORS = {
    /* closet page */
    CLOSET_TILES: '[data-et-name="listing"]',
    CLOSET_TILE_ALT: '.card--small',
    SHARE_BUTTON: '[data-et-name="share"]',
    SHARE_BUTTON_ALT: '.btn--share, .share-btn, [aria-label="Share"]',
    SHARE_TO_FOLLOWERS: '[data-et-name="share_to_followers"]',
    SHARE_TO_FOLLOWERS_ALT: '.share-wrapper .btn--primary, .internal-share__link',
    LISTING_TITLE: '[data-et-name="listing_title"], .tile__title',
    LISTING_PRICE: '[data-et-name="listing_price"], .tile__price span',
    SOLD_TAG: '.tile__tag--sold, .sold-tag',

    /* single listing page */
    DETAIL_TITLE: '[data-test="listing-title"], .listing__title h1, h1.listing__title',
    DETAIL_PRICE: '[data-test="listing-price"] span, .h1, [data-test="listing-price"], .listing__price .p--t--1',
    DETAIL_DESCRIPTION: '[data-test="listing-description"], .listing__description',
    DETAIL_BRAND: '[data-test="item-details"] [data-test="brand"], .listing__details-list .listing__detail-item:first-child',
    DETAIL_SIZE: '[data-test="listing-size"], .listing__size',
    DETAIL_CONDITION: '.listing__condition, .listing__details .condition',
    DETAIL_IMAGES: '.listing__carousel img, .media-carousel__image, .listing__image img',
    DETAIL_CATEGORY: '[data-test^="breadcrumbs-href"] a, [data-test="breadcrumbs"] a, .listing__breadcrumbs a, .listing__category',

    /* create listing page */
    CREATE_TITLE: '#listing-title, input[name="title"], [data-vv-name="title"]',
    CREATE_DESCRIPTION: '#listing-description, textarea[name="description"]',
    CREATE_PRICE: '#listing-price, input[name="price"], input[name="originalPrice"]',
    CREATE_BRAND: '#listing-brand, input[name="brand"]',
    CREATE_SIZE: '#listing-size, input[name="size"]',
    CREATE_CATEGORY: '#listing-category, input[name="category"]',
  };

  let isSharing = false;

  /* ------------------------------------------------------------------
     Page detection
     ------------------------------------------------------------------ */

  function isClosetPage() {
    return /\/closet\//.test(FlipFlow.getPathname());
  }

  function isListingPage() {
    return /\/listing\//.test(FlipFlow.getPathname());
  }

  function isCreatePage() {
    return (
      /\/create-listing/.test(FlipFlow.getPathname()) ||
      /\/listing\/create/.test(FlipFlow.getPathname()) ||
      /\/sell/.test(FlipFlow.getPathname())
    );
  }

  /* ------------------------------------------------------------------
     Closet stats
     ------------------------------------------------------------------ */

  function getClosetStats() {
    const tiles = document.querySelectorAll(
      `${SELECTORS.CLOSET_TILES}, ${SELECTORS.CLOSET_TILE_ALT}`
    );
    let active = 0;
    let sold = 0;
    let totalPrice = 0;

    tiles.forEach((tile) => {
      const isSold = tile.querySelector(SELECTORS.SOLD_TAG);
      if (isSold) {
        sold++;
      } else {
        active++;
        const priceEl = tile.querySelector(SELECTORS.LISTING_PRICE);
        if (priceEl) {
          const price = parseFloat(priceEl.textContent.replace(/[^0-9.]/g, ''));
          if (!isNaN(price)) totalPrice += price;
        }
      }
    });

    return {
      active,
      sold,
      total: tiles.length,
      avgPrice: active > 0 ? (totalPrice / active).toFixed(2) : '0.00',
    };
  }

  /* ------------------------------------------------------------------
     Share All
     ------------------------------------------------------------------ */

  async function shareAllListings() {
    if (isSharing) {
      FlipFlow.showToast('Sharing already in progress', 'warn');
      return;
    }

    const { allowed, remaining } = await FlipFlow.canPerformAction('shares');
    if (!allowed) {
      FlipFlow.showToast(
        `Daily share limit reached (${FlipFlow.FREE_LIMITS.SHARES_PER_DAY}). Upgrade for unlimited.`,
        'error'
      );
      return;
    }

    const tiles = document.querySelectorAll(
      `${SELECTORS.CLOSET_TILES}, ${SELECTORS.CLOSET_TILE_ALT}`
    );

    const activeTiles = [...tiles].filter((t) => !t.querySelector(SELECTORS.SOLD_TAG));

    if (activeTiles.length === 0) {
      FlipFlow.showToast('No active listings found to share', 'warn');
      return;
    }

    const maxShares = Math.min(activeTiles.length, remaining);
    const progress = FlipFlow.createProgressOverlay();
    progress.setStatus(`Sharing ${maxShares} listings...`);
    progress.setProgress(0, maxShares);

    isSharing = true;
    let shared = 0;

    progress.onCancel(() => {
      isSharing = false;
      progress.setStatus('Cancelling...');
    });

    for (let i = 0; i < maxShares; i++) {
      if (!isSharing || progress.isCancelled()) break;

      const tile = activeTiles[i];
      progress.setStatus(`Sharing listing ${i + 1} of ${maxShares}...`);

      try {
        /* click the share button on the tile */
        const shareBtn =
          tile.querySelector(SELECTORS.SHARE_BUTTON) ||
          tile.querySelector(SELECTORS.SHARE_BUTTON_ALT);

        if (shareBtn) {
          FlipFlow.simulateClick(shareBtn);
          await FlipFlow.sleep(800 + Math.random() * 500);

          /* select "Share to My Followers" in the share modal */
          const followersBtn =
            document.querySelector(SELECTORS.SHARE_TO_FOLLOWERS) ||
            document.querySelector(SELECTORS.SHARE_TO_FOLLOWERS_ALT);

          if (followersBtn) {
            FlipFlow.simulateClick(followersBtn);
            shared++;
            await FlipFlow.incrementUsage('shares');
          }
        }
      } catch (err) {
        console.warn('[FlipFlow] Error sharing listing', i, err);
      }

      progress.setProgress(i + 1, maxShares);

      /* human-like delay 2-5 seconds */
      const delay = FlipFlow.randomDelay(2000, 5000);
      await FlipFlow.sleep(delay);
    }

    isSharing = false;
    await FlipFlow.recordShares(shared);

    /* send stats to background for badge update */
    chrome.runtime.sendMessage({ type: 'SHARES_COMPLETED', count: shared });

    progress.setStatus(`Done! Shared ${shared} listings.`);
    setTimeout(() => progress.close(), 2000);
    FlipFlow.showToast(`Shared ${shared} listings`, 'success');
  }

  /* ------------------------------------------------------------------
     Copy / scrape listing
     ------------------------------------------------------------------ */

  function scrapeListingPage() {
    const title =
      document.querySelector(SELECTORS.DETAIL_TITLE)?.textContent?.trim() || '';

    const priceEl = document.querySelector(SELECTORS.DETAIL_PRICE);
    const price = priceEl ? priceEl.textContent.replace(/[^0-9.]/g, '') : '';

    const descEl = document.querySelector(SELECTORS.DETAIL_DESCRIPTION);
    const description = descEl ? descEl.textContent.trim() : '';

    const brandEl = document.querySelector(SELECTORS.DETAIL_BRAND);
    const brand = brandEl ? brandEl.textContent.replace(/brand:?/i, '').trim() : '';

    const sizeEl = document.querySelector(SELECTORS.DETAIL_SIZE);
    const size = sizeEl ? sizeEl.textContent.replace(/size:?/i, '').trim() : '';

    const conditionEl = document.querySelector(SELECTORS.DETAIL_CONDITION);
    const condition = conditionEl ? conditionEl.textContent.trim() : '';

    const images = [
      ...document.querySelectorAll(SELECTORS.DETAIL_IMAGES),
    ].map((img) => img.src || img.dataset.src || '').filter(Boolean);

    const categoryEls = document.querySelectorAll(SELECTORS.DETAIL_CATEGORY);
    const category = [...categoryEls].map((a) => a.textContent.trim()).join(' > ');

    return {
      title,
      price,
      description,
      brand,
      size,
      condition,
      category,
      photos: images,
      sourceUrl: FlipFlow.getHref(),
      sourcePlatform: FlipFlow.PLATFORMS.POSHMARK,
    };
  }

  async function copyListing() {
    const { allowed, remaining } = await FlipFlow.canPerformAction('copies');
    if (!allowed) {
      FlipFlow.showToast(
        `Daily copy limit reached (${FlipFlow.FREE_LIMITS.COPIES_PER_DAY}). Upgrade for unlimited.`,
        'error'
      );
      return;
    }

    const listing = scrapeListingPage();
    if (!listing.title) {
      FlipFlow.showToast('Could not extract listing data', 'error');
      return;
    }

    await FlipFlow.saveListing(listing);
    await FlipFlow.recordCrossPost(listing.id, FlipFlow.PLATFORMS.POSHMARK);
    FlipFlow.showToast(`Copied: ${listing.title}`, 'success');
  }

  /* ------------------------------------------------------------------
     Paste / auto-fill on create page
     ------------------------------------------------------------------ */

  async function pasteListing() {
    const listing = await FlipFlow.getLastCopiedListing();
    if (!listing) {
      FlipFlow.showToast('No listing copied. Copy a listing first.', 'warn');
      return;
    }

    const titleInput = document.querySelector(SELECTORS.CREATE_TITLE);
    const descInput = document.querySelector(SELECTORS.CREATE_DESCRIPTION);
    const priceInput = document.querySelector(SELECTORS.CREATE_PRICE);
    const brandInput = document.querySelector(SELECTORS.CREATE_BRAND);

    if (titleInput) FlipFlow.setInputValue(titleInput, listing.title);
    if (descInput) FlipFlow.setInputValue(descInput, listing.description);
    if (priceInput) FlipFlow.setInputValue(priceInput, listing.price);
    if (brandInput) FlipFlow.setInputValue(brandInput, listing.brand || '');

    await FlipFlow.recordCrossPost(listing.id, FlipFlow.PLATFORMS.POSHMARK);
    FlipFlow.showToast(`Pasted: ${listing.title}`, 'success');
  }

  /* ------------------------------------------------------------------
     Relist stale items
     ------------------------------------------------------------------ */

  async function relistItem(tile) {
    const titleEl = tile.querySelector(SELECTORS.LISTING_TITLE);
    const priceEl = tile.querySelector(SELECTORS.LISTING_PRICE);

    const listing = {
      title: titleEl?.textContent?.trim() || 'Untitled',
      price: priceEl?.textContent?.replace(/[^0-9.]/g, '') || '',
      description: '',
      brand: '',
      size: '',
      condition: '',
      category: '',
      photos: [],
      sourceUrl: FlipFlow.getHref(),
      sourcePlatform: FlipFlow.PLATFORMS.POSHMARK,
      isRelist: true,
    };

    await FlipFlow.saveListing(listing);
    FlipFlow.showToast(`Copied for relisting: ${listing.title}`, 'success');
  }

  /* ------------------------------------------------------------------
     Inject UI
     ------------------------------------------------------------------ */

  function injectClosetUI() {
    if (document.querySelector('.flipflow-closet-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'flipflow-closet-toolbar flipflow-toolbar';

    /* stats */
    const stats = getClosetStats();
    const statsEl = document.createElement('div');
    statsEl.className = 'flipflow-stats';
    statsEl.innerHTML = `
      <span class="flipflow-stat"><strong>${stats.active}</strong> Active</span>
      <span class="flipflow-stat"><strong>${stats.sold}</strong> Sold</span>
      <span class="flipflow-stat">Avg <strong>$${stats.avgPrice}</strong></span>
    `;

    /* Share All button */
    const shareBtn = FlipFlow.createFloatingButton('Share All', shareAllListings, {
      className: 'flipflow-btn-poshmark',
      icon: '\u27F3',
    });

    toolbar.appendChild(statsEl);
    toolbar.appendChild(shareBtn);

    /* inject at the top of the closet area */
    const closetContainer =
      document.querySelector('.closet-container') ||
      document.querySelector('[data-et-name="closet"]') ||
      document.querySelector('main') ||
      document.body;

    closetContainer.prepend(toolbar);

    /* add relist buttons to each tile */
    const tiles = document.querySelectorAll(
      `${SELECTORS.CLOSET_TILES}, ${SELECTORS.CLOSET_TILE_ALT}`
    );
    tiles.forEach((tile) => {
      if (tile.querySelector('.flipflow-relist-btn')) return;
      const relistBtn = FlipFlow.createFloatingButton(
        'Relist',
        () => relistItem(tile),
        { className: 'flipflow-btn-sm flipflow-relist-btn' }
      );
      tile.style.position = 'relative';
      tile.appendChild(relistBtn);
    });
  }

  function injectListingUI() {
    if (document.querySelector('.flipflow-listing-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'flipflow-listing-toolbar flipflow-toolbar';

    const copyBtn = FlipFlow.createFloatingButton('Copy Listing', copyListing, {
      className: 'flipflow-btn-poshmark',
      icon: '\uD83D\uDCCB',
    });

    toolbar.appendChild(copyBtn);

    const detailContainer =
      document.querySelector('.listing__details') ||
      document.querySelector('[data-test="listing"]') ||
      document.querySelector('main') ||
      document.body;

    detailContainer.prepend(toolbar);
  }

  function injectCreateUI() {
    if (document.querySelector('.flipflow-create-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'flipflow-create-toolbar flipflow-toolbar';

    const pasteBtn = FlipFlow.createFloatingButton('Paste Listing', pasteListing, {
      className: 'flipflow-btn-poshmark',
      icon: '\uD83D\uDCCB',
    });

    toolbar.appendChild(pasteBtn);

    const formContainer =
      document.querySelector('.listing-form') ||
      document.querySelector('[data-test="create-listing"]') ||
      document.querySelector('main') ||
      document.body;

    formContainer.prepend(toolbar);
  }

  /* ------------------------------------------------------------------
     Init
     ------------------------------------------------------------------ */

  function init() {
    /* wait a moment for Poshmark SPA to settle */
    setTimeout(() => {
      if (isClosetPage()) {
        injectClosetUI();
      } else if (isCreatePage()) {
        injectCreateUI();
      } else if (isListingPage()) {
        injectListingUI();
      }
    }, 1500);

    /* re-inject on SPA navigation */
    const observer = new MutationObserver(() => {
      if (isClosetPage() && !document.querySelector('.flipflow-closet-toolbar')) {
        injectClosetUI();
      } else if (isListingPage() && !document.querySelector('.flipflow-listing-toolbar')) {
        injectListingUI();
      } else if (isCreatePage() && !document.querySelector('.flipflow-create-toolbar')) {
        injectCreateUI();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
