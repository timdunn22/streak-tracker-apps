/* ──────────────────────────────────────────────
   SaveSmart — Content Script
   Detects checkout pages, finds coupon fields,
   and auto-applies coupon codes.
   ────────────────────────────────────────────── */

(function () {
  "use strict";

  /* Prevent double-injection */
  if (window.__savesmart_loaded) return;
  window.__savesmart_loaded = true;

  /* ── Configuration ── */
  const CHECKOUT_URL_PATTERNS = [
    /checkout/i, /cart/i, /basket/i, /order/i, /payment/i,
    /billing/i, /shipping/i, /purchase/i, /bag/i, /pay\b/i,
    /store/i, /shop/i, /product/i, /buy/i, /pricing/i,
  ];

  /* Also detect checkout pages by DOM content (for SPAs that don't change URL) */
  function isCheckoutPageByContent() {
    const bodyText = (document.body?.innerText || '').toLowerCase();
    const markers = ['add to cart', 'proceed to checkout', 'shopping cart', 'your cart',
      'order summary', 'subtotal', 'promo code', 'coupon code', 'discount code'];
    return markers.some(m => bodyText.includes(m));
  }

  const COUPON_INPUT_SELECTORS = [
    'input[name*="coupon" i]',
    'input[name*="promo" i]',
    'input[name*="discount" i]',
    'input[name*="voucher" i]',
    'input[name*="gift" i][name*="code" i]',
    'input[name*="redemption" i]',
    'input[id*="coupon" i]',
    'input[id*="promo" i]',
    'input[id*="discount" i]',
    'input[id*="voucher" i]',
    'input[class*="coupon" i]',
    'input[class*="promo" i]',
    'input[class*="discount" i]',
    'input[placeholder*="coupon" i]',
    'input[placeholder*="promo" i]',
    'input[placeholder*="discount" i]',
    'input[placeholder*="voucher" i]',
    'input[placeholder*="code" i]',
    'input[placeholder*="gift card" i]',
    'input[aria-label*="coupon" i]',
    'input[aria-label*="promo" i]',
    'input[aria-label*="discount" i]',
    'input[data-testid*="promo" i]',
    'input[data-testid*="coupon" i]',
  ];

  const APPLY_BUTTON_SELECTORS = [
    'button[class*="apply" i]',
    'button[class*="coupon" i]',
    'button[class*="promo" i]',
    'button[id*="apply" i]',
    'button[aria-label*="apply" i]',
    'input[type="submit"][value*="apply" i]',
    'button[data-testid*="apply" i]',
    'a[class*="apply" i]',
  ];

  /* Selectors and text patterns for expand/toggle buttons that reveal coupon inputs */
  const EXPAND_TRIGGER_SELECTORS = [
    'button[class*="promo" i]',
    'button[class*="coupon" i]',
    'button[class*="discount" i]',
    'button[class*="voucher" i]',
    'a[class*="promo" i]',
    'a[class*="coupon" i]',
    'a[class*="discount" i]',
    'a[class*="voucher" i]',
    'button[id*="promo" i]',
    'button[id*="coupon" i]',
    'a[id*="promo" i]',
    'a[id*="coupon" i]',
    'button[aria-label*="promo" i]',
    'button[aria-label*="coupon" i]',
    'button[data-testid*="promo" i]',
    'button[data-testid*="coupon" i]',
    '[class*="accordion" i][class*="promo" i]',
    '[class*="accordion" i][class*="coupon" i]',
    'details summary',
    '[role="button"][class*="promo" i]',
    '[role="button"][class*="coupon" i]',
    'span[class*="promo" i]',
    'span[class*="coupon" i]',
  ];

  const EXPAND_TEXT_PATTERNS = [
    /add\s*(a\s+)?promo/i,
    /add\s*(a\s+)?coupon/i,
    /enter\s*(a\s+)?promo/i,
    /enter\s*(a\s+)?coupon/i,
    /have\s*(a\s+)?promo/i,
    /have\s*(a\s+)?coupon/i,
    /apply\s*(a\s+)?promo/i,
    /apply\s*(a\s+)?coupon/i,
    /promo\s*code/i,
    /coupon\s*code/i,
    /discount\s*code/i,
    /voucher\s*code/i,
    /gift\s*card\s*code/i,
    /redeem\s*(a\s+)?code/i,
    /add\s*(an?\s+)?offer\s*code/i,
    /use\s*(a\s+)?code/i,
  ];

  const PRICE_SELECTORS = [
    '[class*="total" i]',
    '[class*="order-total" i]',
    '[class*="grand-total" i]',
    '[class*="summary-total" i]',
    '[data-testid*="total" i]',
    '[id*="total" i]',
    '.cart-total',
    '.order-summary-total',
  ];

  /* ── Helpers ── */
  function isCheckoutPage() {
    const url = window.location.href;
    return CHECKOUT_URL_PATTERNS.some((p) => p.test(url));
  }

  function findCouponInput() {
    for (const sel of COUPON_INPUT_SELECTORS) {
      const el = document.querySelector(sel);
      if (el && isVisible(el)) return el;
    }
    return null;
  }

  /* Try to click expand/toggle buttons that reveal hidden coupon inputs */
  async function tryExpandCouponSection() {
    /* Strategy 1: CSS selector matching */
    for (const sel of EXPAND_TRIGGER_SELECTORS) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (!isVisible(el)) continue;
        /* Skip if it's already an input (not a toggle) */
        if (el.tagName === 'INPUT' && el.type !== 'button' && el.type !== 'submit') continue;
        el.click();
        await sleep(800);
        const input = findCouponInput();
        if (input) return input;
      }
    }

    /* Strategy 2: Text content scanning — find any clickable element with promo/coupon text */
    const clickables = document.querySelectorAll('a, button, span, div, label, [role="button"], summary');
    for (const el of clickables) {
      if (!isVisible(el)) continue;
      const text = (el.textContent || '').trim();
      if (text.length > 80) continue; /* Skip large blocks of text */
      const matches = EXPAND_TEXT_PATTERNS.some(p => p.test(text));
      if (!matches) continue;
      /* Don't re-click elements we already tried via selectors */
      try { el.click(); } catch (_) { continue; }
      await sleep(800);
      const input = findCouponInput();
      if (input) return input;
    }

    return null;
  }

  function findApplyButton(couponInput) {
    /* Strategy 1: sibling / nearby button with "apply" text */
    for (const sel of APPLY_BUTTON_SELECTORS) {
      const buttons = document.querySelectorAll(sel);
      for (const btn of buttons) {
        if (isVisible(btn)) return btn;
      }
    }

    /* Strategy 2: walk up from the coupon input and find a nearby button */
    if (couponInput) {
      let parent = couponInput.parentElement;
      for (let i = 0; i < 5 && parent; i++) {
        const btn = parent.querySelector("button") || parent.querySelector('input[type="submit"]');
        if (btn && isVisible(btn)) return btn;
        parent = parent.parentElement;
      }
    }

    /* Strategy 3: any button whose text includes "apply" */
    const allButtons = document.querySelectorAll("button");
    for (const btn of allButtons) {
      const text = (btn.textContent || "").toLowerCase();
      if ((text.includes("apply") || text.includes("redeem") || text.includes("submit")) && isVisible(btn)) {
        return btn;
      }
    }

    return null;
  }

  function isVisible(el) {
    if (!el) return false;
    const style = getComputedStyle(el);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      el.offsetWidth > 0 &&
      el.offsetHeight > 0
    );
  }

  function extractPrice() {
    for (const sel of PRICE_SELECTORS) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        const text = (el.textContent || "").trim();
        const match = text.match(/\$?([\d,]+\.?\d{0,2})/);
        if (match) {
          const price = parseFloat(match[1].replace(/,/g, ""));
          if (price > 0 && price < 100000) return price;
        }
      }
    }
    return null;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function setInputValue(input, value) {
    /* React / framework-friendly value setter */
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, value);
    } else {
      input.value = value;
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
  }

  /* ── DOM Injection Helpers ── */
  function createNotificationBar(codeCount) {
    removeUI();

    const bar = document.createElement("div");
    bar.id = "savesmart-notification";
    bar.innerHTML =
      '<span class="ss-logo"><span class="ss-logo-dot"></span> SaveSmart</span>' +
      '<span class="ss-message">We found <strong>' + codeCount + ' coupon code' + (codeCount !== 1 ? "s" : "") + '</strong> for this store</span>' +
      '<button class="ss-try-btn" id="savesmart-try-btn">Try Coupons</button>' +
      '<button class="ss-close" id="savesmart-close">&times;</button>';

    document.body.appendChild(bar);

    /* Animate in after a frame */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.classList.add("visible");
      });
    });

    document.getElementById("savesmart-close").addEventListener("click", () => {
      bar.classList.remove("visible");
      setTimeout(() => bar.remove(), 400);
    });

    document.getElementById("savesmart-try-btn").addEventListener("click", () => {
      bar.classList.remove("visible");
      setTimeout(() => bar.remove(), 400);
      startCouponTest();
    });
  }

  function createProgressOverlay() {
    const backdrop = document.createElement("div");
    backdrop.id = "savesmart-backdrop";
    document.body.appendChild(backdrop);

    const overlay = document.createElement("div");
    overlay.id = "savesmart-progress";
    overlay.innerHTML =
      '<div class="ss-prog-title">Testing Coupon Codes</div>' +
      '<div class="ss-prog-subtitle">Trying codes to find you the best deal...</div>' +
      '<div class="ss-prog-code" id="ss-current-code">---</div>' +
      '<div class="ss-prog-bar-track"><div class="ss-prog-bar-fill" id="ss-prog-fill"></div></div>' +
      '<div class="ss-prog-status" id="ss-prog-status">Preparing...</div>';

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      backdrop.classList.add("visible");
      overlay.classList.add("visible");
    });

    return {
      setCode(code) {
        const el = document.getElementById("ss-current-code");
        if (el) el.textContent = code;
      },
      setProgress(current, total) {
        const fill = document.getElementById("ss-prog-fill");
        const status = document.getElementById("ss-prog-status");
        if (fill) fill.style.width = ((current / total) * 100) + "%";
        if (status) status.textContent = "Testing " + current + " of " + total + "...";
      },
      remove() {
        const b = document.getElementById("savesmart-backdrop");
        const o = document.getElementById("savesmart-progress");
        if (b) b.remove();
        if (o) o.remove();
      },
    };
  }

  function showSuccessOverlay(savings, code) {
    const backdrop = document.createElement("div");
    backdrop.id = "savesmart-backdrop";
    document.body.appendChild(backdrop);

    const overlay = document.createElement("div");
    overlay.id = "savesmart-success";
    overlay.innerHTML =
      '<div class="ss-check-circle">&#10003;</div>' +
      '<div class="ss-saved-amount">Saved $' + savings.toFixed(2) + '</div>' +
      '<div class="ss-saved-label">with coupon code</div>' +
      '<div class="ss-saved-code">' + code + '</div>' +
      '<button class="ss-dismiss-btn" id="savesmart-dismiss">Awesome!</button>';

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      backdrop.classList.add("visible");
      overlay.classList.add("visible");
    });

    document.getElementById("savesmart-dismiss").addEventListener("click", () => {
      backdrop.remove();
      overlay.remove();
    });

    /* Auto-dismiss after 8s */
    setTimeout(() => {
      if (document.getElementById("savesmart-success")) {
        backdrop.remove();
        overlay.remove();
      }
    }, 8000);
  }

  function showNoSavingsMessage() {
    const bar = document.createElement("div");
    bar.id = "savesmart-notification";
    bar.innerHTML =
      '<span class="ss-logo"><span class="ss-logo-dot"></span> SaveSmart</span>' +
      '<span class="ss-message">No working codes found for this store right now</span>' +
      '<button class="ss-close" id="savesmart-close">&times;</button>';

    document.body.appendChild(bar);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.classList.add("visible");
      });
    });

    document.getElementById("savesmart-close").addEventListener("click", () => {
      bar.classList.remove("visible");
      setTimeout(() => bar.remove(), 400);
    });

    setTimeout(() => {
      if (document.getElementById("savesmart-notification")) {
        bar.classList.remove("visible");
        setTimeout(() => bar.remove(), 400);
      }
    }, 5000);
  }

  function removeUI() {
    ["savesmart-notification", "savesmart-progress", "savesmart-success", "savesmart-backdrop"].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) el.remove();
      }
    );
  }

  /* ── Core: Test Coupons ── */
  async function startCouponTest() {
    const couponInput = findCouponInput();
    if (!couponInput) return;

    const hostname = window.location.hostname;
    const entry = getCouponsForDomain(hostname);
    if (!entry || !entry.codes.length) return;

    const codes = entry.codes;
    const progress = createProgressOverlay();
    const originalPrice = extractPrice();

    let bestCode = null;
    let bestPrice = originalPrice || Infinity;
    let bestSavings = 0;

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      progress.setCode(code);
      progress.setProgress(i + 1, codes.length);

      /* Clear and enter code */
      couponInput.focus();
      setInputValue(couponInput, "");
      await sleep(200);
      setInputValue(couponInput, code);
      await sleep(300);

      /* Find and click apply */
      const applyBtn = findApplyButton(couponInput);
      if (applyBtn) {
        applyBtn.click();
        await sleep(1500); // Wait for page to update
      } else {
        /* Try pressing Enter */
        couponInput.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true })
        );
        await sleep(1500);
      }

      /* Check new price */
      const newPrice = extractPrice();
      if (newPrice && originalPrice && newPrice < bestPrice && newPrice < originalPrice) {
        bestPrice = newPrice;
        bestCode = code;
        bestSavings = originalPrice - newPrice;
      }

      /* Brief pause between codes */
      await sleep(400);
    }

    progress.remove();

    if (bestCode && bestSavings > 0) {
      /* Re-apply the best code */
      couponInput.focus();
      setInputValue(couponInput, "");
      await sleep(200);
      setInputValue(couponInput, bestCode);
      await sleep(300);

      const applyBtn = findApplyButton(couponInput);
      if (applyBtn) {
        applyBtn.click();
        await sleep(1000);
      } else {
        couponInput.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true })
        );
        await sleep(1000);
      }

      showSuccessOverlay(bestSavings, bestCode);

      /* Report to background */
      chrome.runtime.sendMessage({
        type: "COUPON_APPLIED",
        code: bestCode,
        savings: bestSavings,
        domain: window.location.hostname,
      });
    } else {
      showNoSavingsMessage();
    }
  }

  /* ── Message Listener (from popup) ── */
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "FIND_COUPONS") {
      (async () => {
        let couponInput = findCouponInput();
        if (!couponInput) {
          couponInput = await tryExpandCouponSection();
        }
        const hostname = window.location.hostname;
        const entry = getCouponsForDomain(hostname);
        const count = entry?.codes?.length || 0;

        if (couponInput && count > 0) {
          createNotificationBar(count);
          sendResponse({ found: true, count });
        } else if (count > 0) {
          createPassiveNotification(count);
          sendResponse({ found: true, count, passive: true });
        } else {
          sendResponse({ found: false, count: 0 });
        }
      })();
      return true; /* Keep message channel open for async response */
    }
  });

  /* ── Auto-detect on page load ── */
  async function autoDetect() {
    const data = await chrome.storage.local.get(["autoSearch"]);
    if (data.autoSearch === false) return;

    const hostname = window.location.hostname;
    const entry = getCouponsForDomain(hostname);
    if (!entry || !entry.codes.length) return;

    /* Check if this looks like a shopping/checkout page */
    if (!isCheckoutPage() && !isCheckoutPageByContent()) return;

    /* Wait for SPAs to settle */
    await sleep(1500);

    /* First try: look for an already-visible coupon input */
    let couponInput = findCouponInput();

    /* Second try: click expand/toggle buttons to reveal hidden coupon inputs */
    if (!couponInput) {
      couponInput = await tryExpandCouponSection();
    }

    /* Third try: wait longer and scan again (some sites load late) */
    if (!couponInput) {
      await sleep(2000);
      couponInput = findCouponInput();
    }

    if (couponInput) {
      createNotificationBar(entry.codes.length);
    } else {
      /* Even if no input found, show a passive notification on supported stores */
      createPassiveNotification(entry.codes.length);
    }
  }

  /* Show a subtle bar indicating codes are available (for when cart is empty or input not found yet) */
  function createPassiveNotification(codeCount) {
    removeUI();
    const bar = document.createElement("div");
    bar.id = "savesmart-notification";
    bar.innerHTML =
      '<span class="ss-logo"><span class="ss-logo-dot"></span> SaveSmart</span>' +
      '<span class="ss-message">' + codeCount + ' coupon code' + (codeCount !== 1 ? 's' : '') + ' available for this store. Add items to cart to use them.</span>' +
      '<button class="ss-close" id="savesmart-close">&times;</button>';
    document.body.appendChild(bar);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { bar.classList.add("visible"); });
    });
    document.getElementById("savesmart-close").addEventListener("click", () => {
      bar.classList.remove("visible");
      setTimeout(() => bar.remove(), 400);
    });
    /* Auto-dismiss passive notification after 6s */
    setTimeout(() => {
      const el = document.getElementById("savesmart-notification");
      if (el) { el.classList.remove("visible"); setTimeout(() => el.remove(), 400); }
    }, 6000);
  }

  /* Kick off auto-detection */
  if (document.readyState === "complete") {
    autoDetect();
  } else {
    window.addEventListener("load", () => autoDetect());
  }

  /* Watch for SPA navigation and dynamically loaded coupon fields */
  let lastUrl = location.href;
  let domScanTimer = null;
  let hasShownNotification = false;

  const observer = new MutationObserver(() => {
    /* URL change detection for SPA navigation */
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      hasShownNotification = false;
      setTimeout(autoDetect, 2000);
      return;
    }

    /* Throttled DOM mutation scan — detect late-loaded coupon inputs */
    if (hasShownNotification) return;
    if (domScanTimer) return;
    domScanTimer = setTimeout(() => {
      domScanTimer = null;
      if (hasShownNotification) return;
      if (!isCheckoutPage() && !isCheckoutPageByContent()) return;

      const couponInput = findCouponInput();
      if (couponInput) {
        const hostname = window.location.hostname;
        const entry = getCouponsForDomain(hostname);
        if (entry && entry.codes.length > 0) {
          hasShownNotification = true;
          createNotificationBar(entry.codes.length);
        }
      }
    }, 1500);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
