/* ──────────────────────────────────────────────
   SaveSmart — Background Service Worker (MV3)
   Manages coupon look-ups, badge, and stats.
   Everything stays in chrome.storage.local.
   ────────────────────────────────────────────── */

/* ── Inline coupon database (mirror of coupon-database.js for service worker context) ── */
const DB = [
  { domain: "amazon.com",      codes: ["SAVE10","PRIMEDAY","AMZN20","HOLIDAY15","FIRSTORDER"] },
  { domain: "target.com",      codes: ["TGT20OFF","FREESHIP","CIRCLE10","SAVE5NOW","WELCOME15"] },
  { domain: "walmart.com",     codes: ["WMTSAVE10","GROCERY20","PICKUP10","DELIVERY15","ROLLBACK"] },
  { domain: "bestbuy.com",     codes: ["SAVE15BB","STUDENT20","TOTALTECH","HOLIDAY10","FREESHIP"] },
  { domain: "costco.com",      codes: ["COSTCO25","MEMBER10","DELIVERY5","SAVE15","HOLIDAY20"] },
  { domain: "ebay.com",        codes: ["SAVE20NOW","FALLSAVE15","WELCOME5","EBAY10OFF","SHOPNOW"] },
  { domain: "nike.com",        codes: ["EXTRA20","MEMBER25","FALL20","SAVE10NOW","NIKESALE"] },
  { domain: "adidas.com",      codes: ["EXTRA30","ADICLUB20","ALLACCESS","SAVE15","HOLIDAY25"] },
  { domain: "hm.com",          codes: ["HM20OFF","WELCOME10","FREESHIP","SUMMER15","FALL25"] },
  { domain: "asos.com",        codes: ["ASOS20","NEWLOOK15","EXTRA10","BIGDEAL25","FREESHIP"] },
  { domain: "gap.com",         codes: ["GAPNOW","FRIEND40","SALE25","EXTRA50","FREESHIP"] },
  { domain: "oldnavy.com",     codes: ["SAVE30","EXTRA40","ONSALE","GETON15","FREESHIP"] },
  { domain: "forever21.com",   codes: ["F21SAVE10","EXTRA15","NEWYEAR20","SALE25","FREESHIP"] },
  { domain: "zara.com",        codes: ["ZARA10","WELCOME15","FREESHIP","SALE20","EXTRA10"] },
  { domain: "nordstrom.com",   codes: ["NORDY15","BEAUTY20","FREESHIP","HOLIDAY10","SAVE25"] },
  { domain: "macys.com",       codes: ["FRIEND25","VIP15","SAVE20","FREESHIP","STAR10"] },
  { domain: "shein.com",       codes: ["SHEIN15","SAVE20","EXTRA10","BTS25","NEWUSER"] },
  { domain: "uniqlo.com",      codes: ["UQWELCOME","SAVE10","FREESHIP","EXTRA15","HOLIDAY"] },
  { domain: "sephora.com",     codes: ["FREESHIP","SAVENOW","BEAUTY15","WELCOMEBACK","INSIDER20"] },
  { domain: "ulta.com",        codes: ["SAVE20","BEAUTYHAUL","TREAT15","WELCOME10","FREESHIP"] },
  { domain: "bathandbodyworks.com", codes: ["FREESHIP39","TAKE20","SWEET","BODY10","HOLIDAY"] },
  { domain: "dominos.com",     codes: ["CARRYOUT50","MIX999","9174","9193","TWOMEDIUMS"] },
  { domain: "pizzahut.com",    codes: ["BIGDINNER","50MENU","SAVE20","HUTHUT","FREEDELIVERY"] },
  { domain: "ubereats.com",    codes: ["EATS20OFF","NEWUSER15","FREEDELIVERY","SAVE10","TRYNEW"] },
  { domain: "doordash.com",    codes: ["DASHPASS","25WELCOME","SAVE40","NEWDASH15","FREEDELIVERY"] },
  { domain: "grubhub.com",     codes: ["GRUB10OFF","FREEDELIVERY","SAVE15","WELCOME20","TRYNOW"] },
  { domain: "papajohns.com",   codes: ["25OFF","PAPAJOHNS","FREESHIP","SAVE30","PIZZAPARTY"] },
  { domain: "godaddy.com",     codes: ["GDBBX1","CJCRMN20","HOSTING49","GET35OFF","NEWDOMAIN"] },
  { domain: "namecheap.com",   codes: ["NEWCOM","COUPONFIRST","SAVE20NOW","DOMAIN50","HOSTING30"] },
  { domain: "newegg.com",      codes: ["NEWEGG10","TECH20","BFCM2024","SAVE15","FREESHIP"] },
  { domain: "bhphotovideo.com",codes: ["BHSAVE10","FREESHIP","WELCOME15","HOLIDAY20","TECHSALE"] },
  { domain: "wayfair.com",     codes: ["WAYFAIR10","SAVE20","NEWCUSTOMER","FREESHIP","HOLIDAY15"] },
  { domain: "ikea.com",        codes: ["IKEA10","FAMILYDEAL","FREESHIP","SAVE15","HOLIDAY20"] },
  { domain: "homedepot.com",   codes: ["SAVE10HD","FREESHIP","SPRING15","PRO25","HOLIDAY"] },
  { domain: "lowes.com",       codes: ["LOWES10OFF","FREESHIP","SAVE20","SPRING15","MILITARY"] },
  { domain: "overstock.com",   codes: ["SAVE15","EXTRA20","FREESHIP","WELCOME10","CLEARANCE"] },
  { domain: "gnc.com",         codes: ["GNC20","PROTEIN15","FREESHIP49","SAVE10","BOGO50"] },
  { domain: "vitaminshoppe.com", codes: ["SAVE20VS","EXTRA15","FREESHIP","WELCOME10","BOGO"] },
  { domain: "myprotein.com",   codes: ["EXTRA35","MYPDEAL","SAVE25","PROTEIN20","WELCOME"] },
  { domain: "chewy.com",       codes: ["SAVE20FIRST","CHEWY15","FREESHIP49","AUTOSHIP","WELCOME"] },
  { domain: "petco.com",       codes: ["SAVE20","FREESHIP35","WELCOME10","PALS15","HOLIDAY"] },
  { domain: "expedia.com",     codes: ["SAVE10EXP","TRAVEL15","MEMBER20","HOLIDAY25","HOTEL10"] },
  { domain: "hotels.com",      codes: ["SAVE10","MEMBER15","FREECANCELLATION","LOYALTY","DEAL20"] },
  { domain: "booking.com",     codes: ["GENIUS10","SAVE15","WELCOME","EARLYBIRD","HOLIDAY20"] },
  { domain: "spotify.com",     codes: ["PREMIUM3MO","STUDENT50","FAMILYPLAN","DUO30","TRYFREE"] },
  { domain: "canva.com",       codes: ["CANVA30","PROTRIAL","EDUCATION","TEAMS20","SAVE15"] },
  { domain: "instacart.com",   codes: ["SAVE10IC","FREEDELIVERY","WELCOME20","EXPRESS","HOLIDAY"] },
  { domain: "hellofresh.com",  codes: ["HELLOFRESH60","FREEBOX","SAVE50","FRESH40","WELCOME65"] },
  { domain: "blueapron.com",   codes: ["BLUE60OFF","WELCOME50","SAVE40","TRYFREE","HOLIDAY"] },
  { domain: "staples.com",     codes: ["SAVE20SP","FREESHIP","TECH15","INK10OFF","BACKTOSCHOOL"] },
  { domain: "officedepot.com", codes: ["SAVE20OD","FREESHIP","TECH15","WELCOME10","HOLIDAY"] },
  { domain: "footlocker.com",  codes: ["FL20OFF","SAVE15","SNEAKER10","FREESHIP","HOLIDAY25"] },
  { domain: "zappos.com",      codes: ["ZAPPOS10","WELCOME15","FREESHIP","SAVE20","VIP25"] },
  { domain: "samsung.com",     codes: ["SAMSUNG10","STUDENT15","HOLIDAY20","TRADEIN25","FREESHIP"] },
  { domain: "apple.com",       codes: ["EDUCATION","BACKTOSCHO","APPLECARE","HOLIDAY","TRADE15"] },
  { domain: "dell.com",        codes: ["SAVE10DELL","MEMBER15","STUDENT20","FREESHIP","HOLIDAY"] },
];

/* ── Lookup helper ── */
function lookupCoupons(hostname) {
  if (!hostname) return null;
  const domain = hostname.replace(/^www\./, "").toLowerCase();
  return (
    DB.find((e) => domain === e.domain) ||
    DB.find((e) => domain.endsWith("." + e.domain)) ||
    null
  );
}

/* ── Message handler ── */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_COUPONS") {
    const result = lookupCoupons(msg.domain);
    sendResponse(result || { codes: [] });
    return false; // synchronous
  }

  if (msg.type === "COUPON_APPLIED") {
    // Track stats
    chrome.storage.local.get(["totalSaved", "couponsApplied"], (data) => {
      const totalSaved = (data.totalSaved || 0) + (msg.savings || 0);
      const couponsApplied = (data.couponsApplied || 0) + 1;
      chrome.storage.local.set({ totalSaved, couponsApplied });
    });
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === "TOGGLE_AUTO_SEARCH") {
    chrome.storage.local.set({ autoSearch: msg.enabled });
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

/* ── Tab update listener: update badge with coupon count ── */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  try {
    const url = new URL(tab.url);
    const result = lookupCoupons(url.hostname);
    const count = result ? result.codes.length : 0;

    if (count > 0) {
      chrome.action.setBadgeText({ text: String(count), tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#10b981", tabId });
    } else {
      chrome.action.setBadgeText({ text: "", tabId });
    }
  } catch {
    // Non-parseable URLs (chrome://, etc.)
    chrome.action.setBadgeText({ text: "", tabId });
  }
});

/* ── Tab activation: refresh badge ── */
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab?.url) return;
    try {
      const url = new URL(tab.url);
      const result = lookupCoupons(url.hostname);
      const count = result ? result.codes.length : 0;

      if (count > 0) {
        chrome.action.setBadgeText({ text: String(count), tabId });
        chrome.action.setBadgeBackgroundColor({ color: "#10b981", tabId });
      } else {
        chrome.action.setBadgeText({ text: "", tabId });
      }
    } catch {
      chrome.action.setBadgeText({ text: "", tabId });
    }
  });
});

/* ── Install / update ── */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({
      totalSaved: 0,
      couponsApplied: 0,
      autoSearch: true,
    });
  }
});
