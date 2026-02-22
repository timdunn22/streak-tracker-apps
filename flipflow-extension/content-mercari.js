/* ===================================================================
   FlipFlow — content-mercari.js
   Mercari-specific: Copy Listing from detail page, Paste on sell page
   =================================================================== */

(() => {
  const SELECTORS = {
    /* listing detail page */
    DETAIL_TITLE: '[data-testid="ItemName"], [data-testid="item-name"], h1[class*="ItemName"], .item-name h1, h2[data-testid="ItemInfo"]',
    DETAIL_PRICE: '[data-testid="ItemPrice"], [data-testid="item-price"], [class*="ItemPrice"], .item-price',
    DETAIL_DESCRIPTION: '[data-testid="ItemDescription"], [data-testid="item-description"], [class*="ItemDescription"], .item-description',
    DETAIL_BRAND: '[data-testid="ItemBrand"], [data-testid="item-brand"], [class*="Brand"] a, .item-brand',
    DETAIL_SIZE: '[data-testid="ItemSize"], [data-testid="item-size"], [class*="Size"]',
    DETAIL_CONDITION: '[data-testid="ItemCondition"], [data-testid="item-condition"], [class*="Condition"]',
    DETAIL_IMAGES: '[data-testid^="FilmStripImg"] img, [data-testid="CarouselContainer"] img, [data-testid="image-carousel"] img, [class*="ItemPhotos"] img, .item-photo img, [class*="DesktopCarousel"] img',
    DETAIL_CATEGORY: '[data-testid="Breadcrumb"] a, [data-testid="RootBreadcrumb"] a, [data-testid="item-category"], [class*="Category"] a, .item-category a',

    /* create / sell page */
    CREATE_TITLE: 'input[name="name"], input[name="title"], input[placeholder*="What are you selling"]',
    CREATE_DESCRIPTION: 'textarea[name="description"], textarea[placeholder*="describe"]',
    CREATE_PRICE: 'input[name="price"], input[type="number"][placeholder*="Price"], input[aria-label="Price"]',
    CREATE_BRAND: 'input[name="brand"], input[placeholder*="Brand"]',
    CREATE_SIZE: 'input[name="size"], input[placeholder*="Size"]',
    CREATE_CONDITION: 'select[name="condition"], [data-testid="condition-selector"]',
    CREATE_CATEGORY: 'input[name="category"], [data-testid="category-selector"]',
  };

  /* ------------------------------------------------------------------
     Page detection
     ------------------------------------------------------------------ */

  function isListingPage() {
    return (
      /\/item\//.test(FlipFlow.getPathname()) ||
      /\/items\//.test(FlipFlow.getPathname())
    );
  }

  function isCreatePage() {
    return (
      /\/sell/.test(FlipFlow.getPathname()) ||
      /\/create/.test(FlipFlow.getPathname()) ||
      /\/listing\/new/.test(FlipFlow.getPathname())
    );
  }

  /* ------------------------------------------------------------------
     Copy / scrape listing
     ------------------------------------------------------------------ */

  function scrapeListingPage() {
    const titleEl = document.querySelector(SELECTORS.DETAIL_TITLE);
    const title = titleEl ? titleEl.textContent.trim() : '';

    const priceEl = document.querySelector(SELECTORS.DETAIL_PRICE);
    const price = priceEl ? priceEl.textContent.replace(/[^0-9.]/g, '') : '';

    const descEl = document.querySelector(SELECTORS.DETAIL_DESCRIPTION);
    const description = descEl ? descEl.textContent.trim() : '';

    const brandEl = document.querySelector(SELECTORS.DETAIL_BRAND);
    const brand = brandEl ? brandEl.textContent.trim() : '';

    const sizeEl = document.querySelector(SELECTORS.DETAIL_SIZE);
    const size = sizeEl ? sizeEl.textContent.trim() : '';

    const conditionEl = document.querySelector(SELECTORS.DETAIL_CONDITION);
    let condition = conditionEl ? conditionEl.textContent.trim() : '';
    /* Mercari shows condition labels like "Like New" - normalize */
    condition = condition.replace(/condition:?\s*/i, '').trim();

    const images = [
      ...document.querySelectorAll(SELECTORS.DETAIL_IMAGES),
    ]
      .map((img) => {
        let src = img.src || img.dataset.src || '';
        /* Mercari sometimes uses thumbnail sizes — try to get original */
        src = src.replace(/\?.*$/, '');
        return src;
      })
      .filter(Boolean);

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
      photos: [...new Set(images)],
      sourceUrl: FlipFlow.getHref(),
      sourcePlatform: FlipFlow.PLATFORMS.MERCARI,
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
    await FlipFlow.recordCrossPost(listing.id, FlipFlow.PLATFORMS.MERCARI);
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
    if (titleInput) FlipFlow.setInputValue(titleInput, listing.title);

    /* description */
    const descInput = document.querySelector(SELECTORS.CREATE_DESCRIPTION);
    if (descInput) FlipFlow.setInputValue(descInput, listing.description);

    /* price */
    const priceInput = document.querySelector(SELECTORS.CREATE_PRICE);
    if (priceInput) FlipFlow.setInputValue(priceInput, listing.price);

    /* brand — Mercari often uses a search/autosuggest for brand */
    const brandInput = document.querySelector(SELECTORS.CREATE_BRAND);
    if (brandInput && listing.brand) {
      FlipFlow.setInputValue(brandInput, listing.brand);
      /* trigger search by simulating typing */
      await FlipFlow.sleep(500);
      brandInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }

    /* size */
    const sizeInput = document.querySelector(SELECTORS.CREATE_SIZE);
    if (sizeInput && listing.size) {
      FlipFlow.setInputValue(sizeInput, listing.size);
    }

    /* condition — Mercari uses numbered conditions or buttons */
    const condSelect = document.querySelector(SELECTORS.CREATE_CONDITION);
    if (condSelect && listing.condition) {
      if (condSelect.tagName === 'SELECT') {
        const condMap = {
          'like new': '2',
          new: '1',
          good: '3',
          fair: '4',
          poor: '5',
        };
        const normalized = listing.condition.toLowerCase().trim();
        for (const [key, val] of Object.entries(condMap)) {
          if (normalized.includes(key)) {
            condSelect.value = val;
            condSelect.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
      } else {
        /* button-based condition selector */
        const buttons = condSelect.querySelectorAll('button, [role="radio"]');
        const normalized = listing.condition.toLowerCase();
        buttons.forEach((btn) => {
          if (btn.textContent.toLowerCase().includes(normalized)) {
            FlipFlow.simulateClick(btn);
          }
        });
      }
    }

    await FlipFlow.recordCrossPost(listing.id, FlipFlow.PLATFORMS.MERCARI);
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
      className: 'flipflow-btn-mercari',
      icon: '\uD83D\uDCCB',
    });

    toolbar.appendChild(copyBtn);

    const container =
      document.querySelector('[data-testid="item-detail"]') ||
      document.querySelector('main') ||
      document.body;

    container.prepend(toolbar);
  }

  function injectCreateUI() {
    if (document.querySelector('.flipflow-create-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'flipflow-create-toolbar flipflow-toolbar';

    const pasteBtn = FlipFlow.createFloatingButton('Paste Listing', pasteListing, {
      className: 'flipflow-btn-mercari',
      icon: '\uD83D\uDCCB',
    });

    toolbar.appendChild(pasteBtn);

    const container =
      document.querySelector('[data-testid="sell-form"]') ||
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
