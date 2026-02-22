/* ──────────────────────────────────────────────────────────────────────────────
   NicheScout — Content Script (Amazon Search Results)
   Injects niche-score badges, revenue estimates, and a niche-report panel.
   ────────────────────────────────────────────────────────────────────────────── */

(() => {
  'use strict';

  // Prevent double-injection
  if (window.__nichescout_loaded) return;
  window.__nichescout_loaded = true;

  // ── Constants ─────────────────────────────────────────────────────────────

  const BADGE_CLASS = 'ns-badge';
  const OVERLAY_CLASS = 'ns-overlay';
  const REPORT_CLASS = 'ns-report-panel';

  // BSR-to-sales multiplier (approximate, for the clothing/merch category)
  const BSR_DIVISOR = 150000;

  // ── Utility ───────────────────────────────────────────────────────────────

  function parsePrice(text) {
    if (!text) return null;
    const m = text.replace(/[^0-9.]/g, '');
    const val = parseFloat(m);
    return isNaN(val) ? null : val;
  }

  function parseBSR(text) {
    if (!text) return null;
    const m = text.replace(/[#,]/g, '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }

  function estimateSalesFromBSR(bsr) {
    if (!bsr || bsr <= 0) return 0;
    return Math.max(1, Math.round(BSR_DIVISOR / bsr));
  }

  function estimateRevenue(price, monthlySales) {
    return (price * monthlySales).toFixed(2);
  }

  function nicheColor(score) {
    if (score >= 70) return '#22c55e';
    if (score >= 45) return '#eab308';
    return '#ef4444';
  }

  function nicheLabel(score) {
    if (score >= 70) return 'Great Niche';
    if (score >= 45) return 'Moderate';
    return 'Oversaturated';
  }

  // ── Parse Search Results ──────────────────────────────────────────────────

  function getSearchKeyword() {
    const params = new URLSearchParams(window.location.search);
    return params.get('k') || params.get('field-keywords') || '';
  }

  function parseProductCards() {
    const cards = document.querySelectorAll('[data-component-type="s-search-result"]');
    const products = [];

    cards.forEach((card) => {
      // Title: Amazon restructured so <a> now wraps <h2>, not the other way around
      const titleEl = card.querySelector('h2 span') || card.querySelector('h2');
      const priceWhole = card.querySelector('.a-price-whole');
      const priceFraction = card.querySelector('.a-price-fraction');
      const ratingEl = card.querySelector('.a-icon-alt');

      // Link: try h2 > a first, then a wrapping h2, then any /dp/ link
      const h2El = card.querySelector('h2');
      const linkEl = h2El ? (h2El.querySelector('a') || h2El.closest('a')) : card.querySelector('a[href*="/dp/"]');

      let price = null;
      if (priceWhole) {
        const whole = priceWhole.textContent.replace(/[^0-9]/g, '');
        const fraction = priceFraction ? priceFraction.textContent.replace(/[^0-9]/g, '') : '00';
        price = parseFloat(`${whole}.${fraction}`);
      }

      let rating = null;
      if (ratingEl) {
        const m = ratingEl.textContent.match(/([\d.]+)\s*out\s*of/);
        if (m) rating = parseFloat(m[1]);
      }

      // Review count: prefer aria-label on ratings link, fall back to class selectors
      const reviewLink = card.querySelector('a[aria-label*="ratings"]');
      let reviewCount = 0;
      if (reviewLink) {
        const ariaLabel = reviewLink.getAttribute('aria-label') || '';
        const raw = ariaLabel.replace(/[,]/g, '').match(/(\d+)/);
        if (raw) reviewCount = parseInt(raw[1], 10);
      } else {
        // Fallback to old method
        const reviewCountEl = card.querySelector('.a-size-base.s-underline-text, .a-size-mini.s-underline-text');
        if (reviewCountEl) {
          const txt = reviewCountEl.textContent.replace(/[(),K]/gi, '').trim();
          reviewCount = txt.includes('.') ? Math.round(parseFloat(txt) * 1000) : parseInt(txt, 10) || 0;
        }
      }

      const href = linkEl ? linkEl.href : '';
      const asin = card.getAttribute('data-asin') || '';

      // Estimate BSR from review count (rough heuristic: reviews ~ sales / 50)
      const estimatedBSR = reviewCount > 0 ? Math.round(BSR_DIVISOR / (reviewCount / 5)) : null;
      const monthlySales = estimatedBSR ? estimateSalesFromBSR(estimatedBSR) : Math.round(reviewCount / 5);

      products.push({
        element: card,
        title: titleEl ? titleEl.textContent.trim() : '',
        price,
        rating,
        reviewCount,
        href,
        asin,
        estimatedBSR,
        monthlySales,
        revenue: price && monthlySales ? estimateRevenue(price, monthlySales) : null,
      });
    });

    return products;
  }

  // ── Determine listing age (new vs old) for trend analysis ─────────────────

  function estimateTrendFromListings(products) {
    // Heuristic: listings with fewer reviews are likely newer
    const lowReviewThreshold = 50;
    const newListings = products.filter(p => p.reviewCount < lowReviewThreshold).length;
    const oldListings = products.filter(p => p.reviewCount >= lowReviewThreshold).length;
    const total = products.length || 1;
    const newRatio = newListings / total;

    if (newRatio >= 0.5) return { trend: 'Growing', icon: '\u2191', color: '#22c55e' };
    if (newRatio >= 0.25) return { trend: 'Stable', icon: '\u2194', color: '#eab308' };
    return { trend: 'Declining', icon: '\u2193', color: '#ef4444' };
  }

  // ── Inject Badges on Each Product Card ────────────────────────────────────

  function injectBadge(product) {
    // Skip if already badged
    if (product.element.querySelector(`.${BADGE_CLASS}`)) return;

    const badge = document.createElement('div');
    badge.className = BADGE_CLASS;

    const sales = product.monthlySales || 0;
    const bsr = product.estimatedBSR;
    const revenue = product.revenue;

    // Mini niche score for this individual product (simplified)
    const itemScore = Math.min(100, Math.max(1,
      Math.round(50 + (sales > 100 ? 20 : sales > 30 ? 10 : 0) - (product.reviewCount > 1000 ? 20 : product.reviewCount > 500 ? 10 : 0))
    ));

    badge.innerHTML = `
      <div class="ns-badge-score" style="background:${nicheColor(itemScore)}">${itemScore}</div>
      <div class="ns-badge-details">
        <span class="ns-badge-row"><strong>Est. Sales:</strong> ~${sales}/mo</span>
        ${bsr ? `<span class="ns-badge-row"><strong>Est. BSR:</strong> #${bsr.toLocaleString()}</span>` : ''}
        ${revenue ? `<span class="ns-badge-row"><strong>Revenue:</strong> $${parseFloat(revenue).toLocaleString()}/mo</span>` : ''}
      </div>
    `;

    // Insert at top-right of card
    product.element.style.position = 'relative';
    product.element.appendChild(badge);
  }

  // ── Niche Summary Bar ────────────────────────────────────────────────────

  function injectNicheSummary(products, keyword) {
    // Remove old summary if present
    const old = document.querySelector(`.${OVERLAY_CLASS}`);
    if (old) old.remove();

    if (products.length === 0) return;

    const prices = products.map(p => p.price).filter(Boolean);
    const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const totalReviews = products.reduce((a, p) => a + p.reviewCount, 0);
    const avgRating = products.reduce((a, p) => a + (p.rating || 0), 0) / (products.filter(p => p.rating).length || 1);
    const totalMonthlySales = products.reduce((a, p) => a + (p.monthlySales || 0), 0);
    const resultCount = products.length;
    const trend = estimateTrendFromListings(products);

    // Compute niche score via background
    chrome.runtime.sendMessage({
      type: 'NICHE_SCORE',
      data: { totalReviews, resultCount, avgRating, avgPrice },
    }, (nicheResult) => {
      if (chrome.runtime.lastError) {
        console.error('[NicheScout] Niche score error:', chrome.runtime.lastError);
        return;
      }

      const ns = nicheResult || { score: 50, label: 'Moderate', color: '#eab308' };

      const bar = document.createElement('div');
      bar.className = OVERLAY_CLASS;
      bar.innerHTML = `
        <div class="ns-overlay-inner">
          <div class="ns-overlay-brand">
            <span class="ns-logo">NS</span>
            <strong>NicheScout</strong>
          </div>

          <div class="ns-overlay-stat">
            <div class="ns-overlay-stat-label">Niche Score</div>
            <div class="ns-overlay-stat-value" style="color:${ns.color}">${ns.score}/100</div>
            <div class="ns-overlay-stat-sub">${ns.label}</div>
          </div>

          <div class="ns-overlay-stat">
            <div class="ns-overlay-stat-label">Avg Price</div>
            <div class="ns-overlay-stat-value">$${avgPrice.toFixed(2)}</div>
            <div class="ns-overlay-stat-sub">$${minPrice.toFixed(2)} – $${maxPrice.toFixed(2)}</div>
          </div>

          <div class="ns-overlay-stat">
            <div class="ns-overlay-stat-label">Est. Monthly Sales</div>
            <div class="ns-overlay-stat-value">${totalMonthlySales.toLocaleString()}</div>
            <div class="ns-overlay-stat-sub">${resultCount} results</div>
          </div>

          <div class="ns-overlay-stat">
            <div class="ns-overlay-stat-label">Total Reviews</div>
            <div class="ns-overlay-stat-value">${totalReviews.toLocaleString()}</div>
            <div class="ns-overlay-stat-sub">Avg ${avgRating.toFixed(1)} stars</div>
          </div>

          <div class="ns-overlay-stat">
            <div class="ns-overlay-stat-label">Trend</div>
            <div class="ns-overlay-stat-value" style="color:${trend.color}">${trend.icon} ${trend.trend}</div>
          </div>

          <button class="ns-report-btn" id="ns-generate-report">Niche Report</button>
          <button class="ns-close-btn" id="ns-close-bar" title="Close">&times;</button>
        </div>
      `;

      // Insert at top of main content
      const mainResults = document.querySelector('.s-main-slot') || document.querySelector('#search');
      if (mainResults) {
        mainResults.parentNode.insertBefore(bar, mainResults);
      } else {
        document.body.prepend(bar);
      }

      // Close button
      document.getElementById('ns-close-bar').addEventListener('click', () => bar.remove());

      // Generate report
      document.getElementById('ns-generate-report').addEventListener('click', () => {
        generateNicheReport({
          keyword,
          nicheScore: ns,
          avgPrice,
          minPrice,
          maxPrice,
          totalReviews,
          resultCount,
          avgRating,
          totalMonthlySales,
          trend,
          products,
        });
      });

      // Save to research history
      chrome.runtime.sendMessage({
        type: 'SAVE_RESEARCH',
        entry: {
          keyword,
          nicheScore: ns.score,
          nicheLabel: ns.label,
          avgPrice: avgPrice.toFixed(2),
          totalReviews,
          resultCount,
          totalMonthlySales,
          trend: trend.trend,
        },
      });
    });
  }

  // ── Niche Report Panel ───────────────────────────────────────────────────

  function generateNicheReport(data) {
    // Remove old report
    const old = document.querySelector(`.${REPORT_CLASS}`);
    if (old) old.remove();

    const topProducts = data.products
      .sort((a, b) => (b.monthlySales || 0) - (a.monthlySales || 0))
      .slice(0, 10);

    const panel = document.createElement('div');
    panel.className = REPORT_CLASS;
    panel.innerHTML = `
      <div class="ns-report-header">
        <h2>NicheScout Report: "${data.keyword}"</h2>
        <button class="ns-close-btn" id="ns-close-report">&times;</button>
      </div>
      <div class="ns-report-body">

        <div class="ns-report-section">
          <h3>Overview</h3>
          <table class="ns-report-table">
            <tr><td>Niche Score</td><td style="color:${data.nicheScore.color};font-weight:700">${data.nicheScore.score}/100 (${data.nicheScore.label})</td></tr>
            <tr><td>Results Found</td><td>${data.resultCount}</td></tr>
            <tr><td>Total Reviews</td><td>${data.totalReviews.toLocaleString()}</td></tr>
            <tr><td>Avg Rating</td><td>${data.avgRating.toFixed(1)} stars</td></tr>
            <tr><td>Price Range</td><td>$${data.minPrice.toFixed(2)} – $${data.maxPrice.toFixed(2)} (avg $${data.avgPrice.toFixed(2)})</td></tr>
            <tr><td>Est. Monthly Sales (page)</td><td>${data.totalMonthlySales.toLocaleString()}</td></tr>
            <tr><td>Trend</td><td style="color:${data.trend.color}">${data.trend.icon} ${data.trend.trend}</td></tr>
          </table>
        </div>

        <div class="ns-report-section">
          <h3>Recommendation</h3>
          <p>${getRecommendation(data)}</p>
        </div>

        <div class="ns-report-section">
          <h3>Top 10 Products</h3>
          <table class="ns-report-table ns-report-products">
            <thead>
              <tr><th>#</th><th>Title</th><th>Price</th><th>Reviews</th><th>Est. Sales/Mo</th></tr>
            </thead>
            <tbody>
              ${topProducts.map((p, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td class="ns-truncate">${p.title.slice(0, 80)}${p.title.length > 80 ? '...' : ''}</td>
                  <td>${p.price ? '$' + p.price.toFixed(2) : 'N/A'}</td>
                  <td>${p.reviewCount.toLocaleString()}</td>
                  <td>${(p.monthlySales || 0).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="ns-report-section">
          <h3>Demand vs Competition</h3>
          <div class="ns-bar-chart">
            <div class="ns-bar-row">
              <span class="ns-bar-label">Demand</span>
              <div class="ns-bar-track"><div class="ns-bar-fill ns-bar-green" style="width:${data.nicheScore.demand}%"></div></div>
              <span class="ns-bar-val">${data.nicheScore.demand}/50</span>
            </div>
            <div class="ns-bar-row">
              <span class="ns-bar-label">Competition</span>
              <div class="ns-bar-track"><div class="ns-bar-fill ns-bar-red" style="width:${data.nicheScore.competition}%"></div></div>
              <span class="ns-bar-val">${data.nicheScore.competition}/50</span>
            </div>
          </div>
        </div>

        <button class="ns-export-btn" id="ns-export-report">Export as Text</button>
      </div>
    `;

    document.body.appendChild(panel);

    document.getElementById('ns-close-report').addEventListener('click', () => panel.remove());
    document.getElementById('ns-export-report').addEventListener('click', () => exportReport(data, topProducts));
  }

  function getRecommendation(data) {
    const s = data.nicheScore.score;
    if (s >= 70) {
      return `This niche looks promising! With a score of ${s}/100 and ${data.trend.trend.toLowerCase()} momentum, ` +
        `there's healthy demand (${data.totalReviews.toLocaleString()} total reviews) without excessive competition. ` +
        `The average price of $${data.avgPrice.toFixed(2)} supports good margins. Consider entering this niche.`;
    }
    if (s >= 45) {
      return `This niche is moderately competitive (score ${s}/100). There's demand, but you'll face established ` +
        `sellers. Focus on differentiation — unique designs, better keywords, or targeting a sub-niche. ` +
        `The ${data.trend.trend.toLowerCase()} trend suggests ${data.trend.trend === 'Growing' ? 'opportunity' : 'caution'}.`;
    }
    return `This niche appears oversaturated (score ${s}/100) with ${data.resultCount} results and ` +
      `${data.totalReviews.toLocaleString()} total reviews. Breaking in will be difficult unless you have a ` +
      `unique angle. Consider targeting a long-tail sub-niche instead.`;
  }

  function exportReport(data, topProducts) {
    const lines = [
      `NICHESCOUT NICHE REPORT`,
      `========================`,
      `Keyword: ${data.keyword}`,
      `Date: ${new Date().toLocaleDateString()}`,
      ``,
      `OVERVIEW`,
      `--------`,
      `Niche Score: ${data.nicheScore.score}/100 (${data.nicheScore.label})`,
      `Results: ${data.resultCount}`,
      `Total Reviews: ${data.totalReviews.toLocaleString()}`,
      `Avg Rating: ${data.avgRating.toFixed(1)} stars`,
      `Price Range: $${data.minPrice.toFixed(2)} - $${data.maxPrice.toFixed(2)} (avg $${data.avgPrice.toFixed(2)})`,
      `Est. Monthly Sales: ${data.totalMonthlySales.toLocaleString()}`,
      `Trend: ${data.trend.trend}`,
      ``,
      `TOP PRODUCTS`,
      `------------`,
      ...topProducts.map((p, i) =>
        `${i + 1}. ${p.title.slice(0, 70)} | $${p.price || 'N/A'} | ${p.reviewCount} reviews | ~${p.monthlySales || 0} sales/mo`
      ),
      ``,
      `Generated by NicheScout Extension`,
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nichescout-${data.keyword.replace(/\s+/g, '-')}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Main ──────────────────────────────────────────────────────────────────

  function run() {
    const keyword = getSearchKeyword();
    if (!keyword) return;

    const products = parseProductCards();
    if (products.length === 0) return;

    // Inject badges on each product card
    products.forEach(injectBadge);

    // Inject the niche summary bar
    injectNicheSummary(products, keyword);
  }

  // Run on load and on SPA navigation (Amazon uses pushState)
  run();

  // Observe URL changes for SPA navigation
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Delay to let Amazon render new results
      setTimeout(run, 1500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

})();
