/* ──────────────────────────────────────────────────────────────────────────────
   NicheScout — Background Service Worker (Manifest V3)
   Handles: autocomplete proxy, usage limits, storage, message routing
   ────────────────────────────────────────────────────────────────────────────── */

// ── Constants ────────────────────────────────────────────────────────────────

const FREE_DAILY_SEARCHES = 5;
const PREMIUM_PRICE = 12.99;

const BSR_SALES_FORMULAS = {
  books:      (bsr) => Math.max(1, Math.round(200000 / bsr)),
  clothing:   (bsr) => Math.max(1, Math.round(150000 / bsr)),
  shirts:     (bsr) => Math.max(1, Math.round(150000 / bsr)),
  popsockets: (bsr) => Math.max(1, Math.round(80000 / bsr)),
  stickers:   (bsr) => Math.max(1, Math.round(60000 / bsr)),
  default:    (bsr) => Math.max(1, Math.round(120000 / bsr)),
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayKey() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

async function getUsage() {
  const { usage = {} } = await chrome.storage.local.get('usage');
  const today = todayKey();
  if (!usage[today]) usage[today] = { searches: 0 };
  return usage;
}

async function incrementSearchCount() {
  const usage = await getUsage();
  const today = todayKey();
  usage[today].searches += 1;
  await chrome.storage.local.set({ usage });
  return usage[today].searches;
}

async function canSearch() {
  const { premium } = await chrome.storage.local.get('premium');
  if (premium) return { allowed: true, remaining: Infinity, premium: true };

  const usage = await getUsage();
  const today = todayKey();
  const used = usage[today].searches;
  return {
    allowed: used < FREE_DAILY_SEARCHES,
    remaining: Math.max(0, FREE_DAILY_SEARCHES - used),
    premium: false,
  };
}

// ── Amazon Autocomplete ─────────────────────────────────────────────────────

async function fetchAutocomplete(prefix) {
  const url = `https://completion.amazon.com/api/2017/suggestions?mid=ATVPDKIKX0DER&alias=aps&prefix=${encodeURIComponent(prefix)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.suggestions || []).map((s, i) => ({
      keyword: s.value,
      position: i + 1,
      volumeIndicator: i < 3 ? 'High' : i < 7 ? 'Medium' : 'Low',
    }));
  } catch (err) {
    console.error('[NicheScout] Autocomplete error:', err);
    return [];
  }
}

// ── BSR-to-Sales ────────────────────────────────────────────────────────────

function bsrToSales(bsr, category = 'default') {
  const fn = BSR_SALES_FORMULAS[category] || BSR_SALES_FORMULAS.default;
  const dailySales = fn(bsr);
  return {
    daily: dailySales,
    monthly: dailySales * 30,
    yearly: dailySales * 365,
  };
}

// ── Niche Scoring ───────────────────────────────────────────────────────────

function computeNicheScore({ totalReviews, resultCount, avgRating, avgPrice }) {
  // Demand score: more reviews = higher demand (log scale, 0-50)
  const demandRaw = Math.log10(Math.max(1, totalReviews)) * 12;
  const demandScore = Math.min(50, demandRaw);

  // Competition score: more results = more competition (penalise, 0-50)
  const compRaw = Math.log10(Math.max(1, resultCount)) * 15;
  const compScore = Math.min(50, compRaw);

  // Bonus for good avg rating (0-10)
  const ratingBonus = avgRating >= 4.0 ? 5 : avgRating >= 3.5 ? 3 : 0;

  // Bonus for healthy price range (0-10)
  const priceBonus = avgPrice >= 12 && avgPrice <= 25 ? 5 : avgPrice > 25 ? 3 : 0;

  const score = Math.round(
    Math.max(1, Math.min(100, demandScore - compScore + 50 + ratingBonus + priceBonus))
  );

  return {
    score,
    label: score >= 70 ? 'Great' : score >= 45 ? 'Moderate' : 'Oversaturated',
    color: score >= 70 ? '#22c55e' : score >= 45 ? '#eab308' : '#ef4444',
    demand: Math.round(demandScore),
    competition: Math.round(compScore),
  };
}

// ── Research History ────────────────────────────────────────────────────────

async function saveResearch(entry) {
  const { history = [] } = await chrome.storage.local.get('history');
  history.unshift({ ...entry, timestamp: Date.now() });
  // Keep last 200 entries
  if (history.length > 200) history.length = 200;
  await chrome.storage.local.set({ history });
}

async function getHistory() {
  const { history = [] } = await chrome.storage.local.get('history');
  return history;
}

// ── Message Router ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {
        case 'AUTOCOMPLETE': {
          const status = await canSearch();
          if (!status.allowed) {
            sendResponse({ error: 'limit', remaining: 0, premium: false });
            return;
          }
          const suggestions = await fetchAutocomplete(msg.prefix);
          await incrementSearchCount();
          const updated = await canSearch();
          sendResponse({ suggestions, remaining: updated.remaining, premium: updated.premium });
          return;
        }

        case 'BSR_TO_SALES': {
          const sales = bsrToSales(msg.bsr, msg.category);
          sendResponse(sales);
          return;
        }

        case 'NICHE_SCORE': {
          const result = computeNicheScore(msg.data);
          sendResponse(result);
          return;
        }

        case 'SAVE_RESEARCH': {
          await saveResearch(msg.entry);
          sendResponse({ ok: true });
          return;
        }

        case 'GET_HISTORY': {
          const history = await getHistory();
          sendResponse(history);
          return;
        }

        case 'GET_USAGE': {
          const status = await canSearch();
          sendResponse(status);
          return;
        }

        case 'SET_PREMIUM': {
          await chrome.storage.local.set({ premium: msg.value });
          sendResponse({ ok: true });
          return;
        }

        case 'CLEAR_HISTORY': {
          await chrome.storage.local.set({ history: [] });
          sendResponse({ ok: true });
          return;
        }

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (err) {
      console.error('[NicheScout] Background error:', err);
      sendResponse({ error: err.message });
    }
  })();
  return true; // keep channel open for async
});

// ── Install / Update ────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      premium: false,
      history: [],
      usage: {},
    });
    console.log('[NicheScout] Extension installed.');
  }
});
