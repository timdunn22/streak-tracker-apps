/* ===================================================================
   FlipFlow — content-ebay.js
   eBay-specific: Copy Listing from detail page, Paste on sell page
   =================================================================== */

(() => {
  const SELECTORS = {
    /* listing detail page */
    DETAIL_TITLE: 'h1.x-item-title__mainTitle span, h1[itemprop="name"], .vim .x-item-title span',
    DETAIL_PRICE: '[itemprop="price"], .x-price-primary span, .notranslate',
    DETAIL_DESCRIPTION: '#desc_ifr, #viTabs_0_is, .d-item-description, #desc_div',
    DETAIL_BRAND: '.ux-labels-values--brand .ux-textspans--BOLD, td[data-attrLabel="Brand"] span',
    DETAIL_SIZE: '.ux-labels-values--size .ux-textspans--BOLD, td[data-attrLabel="Size"] span',
    DETAIL_CONDITION: '#vi-itm-cond, .x-item-condition-text span, [data-testid="x-item-condition"] span',
    DETAIL_IMAGES: '.ux-image-carousel img, #icImg, .pic-vert img, [data-testid="ux-image-carousel"] img',
    DETAIL_CATEGORY: '.breadcrumbs a, .seo-breadcrumb-text a',

    /* sell / create listing page */
    CREATE_TITLE: '#editpane_title input, input[name="title"], #s0-1-1-24-7-\\@title-textbox',
    CREATE_DESCRIPTION: '#editpane_description textarea, textarea[name="description"], #editor_area iframe',
    CREATE_PRICE: '#editpane_price input, input[name="price"], input[aria-label="Price"]',
    CREATE_BRAND: '#editpane_brand input, input[name="Brand"]',
    CREATE_SIZE: 'input[name="Size"]',
    CREATE_CONDITION: '#editpane_conditionLevel select, select[name="condition"]',
    CREATE_CATEGORY: '#editpane_category input, input[name="category"]',
  };

  /* ------------------------------------------------------------------
     Page detection
     ------------------------------------------------------------------ */

  function isListingPage() {
    return /\/itm\//.test(FlipFlow.getPathname());
  }

  function isCreatePage() {
    return (
      /\/sell\/create/.test(FlipFlow.getPathname()) ||
      /\/sl\/sell/.test(FlipFlow.getPathname()) ||
      /\/lstng/.test(FlipFlow.getPathname()) ||
      /\/listing\/create/.test(FlipFlow.getPathname())
    );
  }

  /* ------------------------------------------------------------------
     Copy / scrape listing
     ------------------------------------------------------------------ */

  function scrapeListingPage() {
    const titleEl = document.querySelector(SELECTORS.DETAIL_TITLE);
    const title = titleEl ? titleEl.textContent.trim() : '';

    const priceEl = document.querySelector(SELECTORS.DETAIL_PRICE);
    let price = '';
    if (priceEl) {
      price = priceEl.getAttribute('content') || priceEl.textContent.replace(/[^0-9.]/g, '');
    }

    /* eBay sometimes loads description in an iframe */
    let description = '';
    const descFrame = document.querySelector('#desc_ifr');
    if (descFrame) {
      try {
        const frameDoc = descFrame.contentDocument || descFrame.contentWindow?.document;
        description = frameDoc?.body?.innerText?.trim() || '';
      } catch {
        /* cross-origin: fall back to visible description */
        const altDesc = document.querySelector(SELECTORS.DETAIL_DESCRIPTION);
        description = altDesc ? altDesc.textContent.trim() : '';
      }
    } else {
      const descEl = document.querySelector(SELECTORS.DETAIL_DESCRIPTION);
      description = descEl ? descEl.textContent.trim() : '';
    }

    const brandEl = document.querySelector(SELECTORS.DETAIL_BRAND);
    const brand = brandEl ? brandEl.textContent.trim() : '';

    const sizeEl = document.querySelector(SELECTORS.DETAIL_SIZE);
    const size = sizeEl ? sizeEl.textContent.trim() : '';

    const conditionEl = document.querySelector(SELECTORS.DETAIL_CONDITION);
    const condition = conditionEl ? conditionEl.textContent.trim() : '';

    const images = [
      ...document.querySelectorAll(SELECTORS.DETAIL_IMAGES),
    ]
      .map((img) => {
        /* eBay often uses s-l64 thumbnails — upgrade to s-l1600 */
        let src = img.src || img.dataset.src || '';
        src = src.replace(/s-l\d+/, 's-l1600');
        return src;
      })
      .filter(Boolean);

    const categoryEls = document.querySelectorAll(SELECTORS.DETAIL_CATEGORY);
    const category = [...categoryEls]
      .map((a) => a.textContent.trim())
      .filter((t) => t && !t.includes('...'))
      .join(' > ');

    return {
      title,
      price,
      description,
      brand,
      size,
      condition,
      category,
      photos: [...new Set(images)],
      sourceUrl: FlipFlow.getHref(),
      sourcePlatform: FlipFlow.PLATFORMS.EBAY,
    };
  }

  async function copyListing() {
    const { allowed } = await FlipFlow.canPerformAction('copies');
    if (!allowed) {
      FlipFlow.showToast(
        `Daily copy limit reached (${FlipFlow.FREE_LIMITS.COPIES_PER_DAY}). Upgrade for unlimited.`,
        'error'
      );
      return;
    }

    const listing = scrapeListingPage();
    if (!listing.title) {
      FlipFlow.showToast('Could not extract listing data from this page', 'error');
      return;
    }

    await FlipFlow.saveListing(listing);
    await FlipFlow.recordCrossPost(listing.id, FlipFlow.PLATFORMS.EBAY);
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

    /* title */
    const titleInput = document.querySelector(SELECTORS.CREATE_TITLE);
    if (titleInput) {
      /* eBay title limit is 80 chars */
      FlipFlow.setInputValue(titleInput, listing.title.substring(0, 80));
    }

    /* description — may be an iframe or a textarea */
    const descFrame = document.querySelector(SELECTORS.CREATE_DESCRIPTION);
    if (descFrame && descFrame.tagName === 'IFRAME') {
      try {
        const frameDoc = descFrame.contentDocument || descFrame.contentWindow?.document;
        if (frameDoc?.body) {
          frameDoc.body.innerHTML = listing.description.replace(/\n/g, '<br>');
        }
      } catch {
        /* cross-origin, skip */
      }
    } else if (descFrame) {
      FlipFlow.setInputValue(descFrame, listing.description);
    }

    /* price */
    const priceInput = document.querySelector(SELECTORS.CREATE_PRICE);
    if (priceInput) FlipFlow.setInputValue(priceInput, listing.price);

    /* brand */
    const brandInput = document.querySelector(SELECTORS.CREATE_BRAND);
    if (brandInput) FlipFlow.setInputValue(brandInput, listing.brand || '');

    /* size */
    const sizeInput = document.querySelector(SELECTORS.CREATE_SIZE);
    if (sizeInput) FlipFlow.setInputValue(sizeInput, listing.size || '');

    /* condition dropdown */
    const condSelect = document.querySelector(SELECTORS.CREATE_CONDITION);
    if (condSelect && listing.condition) {
      const condMap = {
        'very good': '4000',
        'like new': '3000',
        new: '1000',
        good: '5000',
        acceptable: '6000',
      };
      const normalized = listing.condition.toLowerCase().trim();
      for (const [key, val] of Object.entries(condMap)) {
        if (normalized.includes(key)) {
          condSelect.value = val;
          condSelect.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    }

    await FlipFlow.recordCrossPost(listing.id, FlipFlow.PLATFORMS.EBAY);
    FlipFlow.showToast(`Pasted: ${listing.title}`, 'success');
  }

  /* ------------------------------------------------------------------
     Inject UI
     ------------------------------------------------------------------ */

  function injectListingUI() {
    if (document.querySelector('.flipflow-listing-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'flipflow-listing-toolbar flipflow-toolbar';

    const copyBtn = FlipFlow.createFloatingButton('Copy Listing', copyListing, {
      className: 'flipflow-btn-ebay',
      icon: '\uD83D\uDCCB',
    });

    toolbar.appendChild(copyBtn);

    const container =
      document.querySelector('.vim') ||
      document.querySelector('#mainContent') ||
      document.querySelector('main') ||
      document.body;

    container.prepend(toolbar);
  }

  function injectCreateUI() {
    if (document.querySelector('.flipflow-create-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'flipflow-create-toolbar flipflow-toolbar';

    const pasteBtn = FlipFlow.createFloatingButton('Paste Listing', pasteListing, {
      className: 'flipflow-btn-ebay',
      icon: '\uD83D\uDCCB',
    });

    toolbar.appendChild(pasteBtn);

    const container =
      document.querySelector('#mainContent') ||
      document.querySelector('main') ||
      document.body;

    container.prepend(toolbar);
  }

  /* ------------------------------------------------------------------
     Init
     ------------------------------------------------------------------ */

  function init() {
    setTimeout(() => {
      if (isListingPage()) {
        injectListingUI();
      } else if (isCreatePage()) {
        injectCreateUI();
      }
    }, 1500);

    /* observe SPA changes */
    const observer = new MutationObserver(() => {
      if (isListingPage() && !document.querySelector('.flipflow-listing-toolbar')) {
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
