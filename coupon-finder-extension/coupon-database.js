/* ──────────────────────────────────────────────
   SaveSmart — Built-in Coupon Database
   50+ stores with commonly-circulated codes.
   All data stays local. No network requests.
   ────────────────────────────────────────────── */

// eslint-disable-next-line no-unused-vars
const COUPON_DATABASE = [
  // ─── General / Big-Box ─────────────────────
  { domain: "amazon.com",      codes: ["SAVE10", "PRIMEDAY", "AMZN20", "HOLIDAY15", "FIRSTORDER"],          lastUpdated: "2024-12" },
  { domain: "target.com",      codes: ["TGT20OFF", "FREESHIP", "CIRCLE10", "SAVE5NOW", "WELCOME15"],        lastUpdated: "2024-12" },
  { domain: "walmart.com",     codes: ["WMTSAVE10", "GROCERY20", "PICKUP10", "DELIVERY15", "ROLLBACK"],      lastUpdated: "2024-12" },
  { domain: "bestbuy.com",     codes: ["SAVE15BB", "STUDENT20", "TOTALTECH", "HOLIDAY10", "FREESHIP"],       lastUpdated: "2024-12" },
  { domain: "costco.com",      codes: ["COSTCO25", "MEMBER10", "DELIVERY5", "SAVE15", "HOLIDAY20"],          lastUpdated: "2024-12" },
  { domain: "ebay.com",        codes: ["SAVE20NOW", "FALLSAVE15", "WELCOME5", "EBAY10OFF", "SHOPNOW"],       lastUpdated: "2024-12" },

  // ─── Fashion ───────────────────────────────
  { domain: "nike.com",        codes: ["EXTRA20", "MEMBER25", "FALL20", "SAVE10NOW", "NIKESALE"],             lastUpdated: "2024-12" },
  { domain: "adidas.com",      codes: ["EXTRA30", "ADICLUB20", "ALLACCESS", "SAVE15", "HOLIDAY25"],          lastUpdated: "2024-12" },
  { domain: "hm.com",          codes: ["HM20OFF", "WELCOME10", "FREESHIP", "SUMMER15", "FALL25"],            lastUpdated: "2024-12" },
  { domain: "asos.com",        codes: ["ASOS20", "NEWLOOK15", "EXTRA10", "BIGDEAL25", "FREESHIP"],           lastUpdated: "2024-12" },
  { domain: "gap.com",         codes: ["GAPNOW", "FRIEND40", "SALE25", "EXTRA50", "FREESHIP"],               lastUpdated: "2024-12" },
  { domain: "oldnavy.com",     codes: ["SAVE30", "EXTRA40", "ONSALE", "GETON15", "FREESHIP"],                lastUpdated: "2024-12" },
  { domain: "forever21.com",   codes: ["F21SAVE10", "EXTRA15", "NEWYEAR20", "SALE25", "FREESHIP"],           lastUpdated: "2024-12" },
  { domain: "zara.com",        codes: ["ZARA10", "WELCOME15", "FREESHIP", "SALE20", "EXTRA10"],              lastUpdated: "2024-12" },
  { domain: "nordstrom.com",   codes: ["NORDY15", "BEAUTY20", "FREESHIP", "HOLIDAY10", "SAVE25"],            lastUpdated: "2024-12" },
  { domain: "macys.com",       codes: ["FRIEND25", "VIP15", "SAVE20", "FREESHIP", "STAR10"],                 lastUpdated: "2024-12" },
  { domain: "shein.com",       codes: ["SHEIN15", "SAVE20", "EXTRA10", "BTS25", "NEWUSER"],                  lastUpdated: "2024-12" },
  { domain: "uniqlo.com",      codes: ["UQWELCOME", "SAVE10", "FREESHIP", "EXTRA15", "HOLIDAY"],             lastUpdated: "2024-12" },

  // ─── Beauty ────────────────────────────────
  { domain: "sephora.com",            codes: ["FREESHIP", "SAVENOW", "BEAUTY15", "WELCOMEBACK", "INSIDER20"],     lastUpdated: "2024-12" },
  { domain: "ulta.com",               codes: ["SAVE20", "BEAUTYHAUL", "TREAT15", "WELCOME10", "FREESHIP"],        lastUpdated: "2024-12" },
  { domain: "bathandbodyworks.com",   codes: ["FREESHIP39", "TAKE20", "SWEET", "BODY10", "HOLIDAY"],              lastUpdated: "2024-12" },

  // ─── Food / Delivery ──────────────────────
  { domain: "dominos.com",    codes: ["CARRYOUT50", "MIX999", "9174", "9193", "TWOMEDIUMS"],                lastUpdated: "2024-12" },
  { domain: "pizzahut.com",   codes: ["BIGDINNER", "50MENU", "SAVE20", "HUTHUT", "FREEDELIVERY"],           lastUpdated: "2024-12" },
  { domain: "ubereats.com",   codes: ["EATS20OFF", "NEWUSER15", "FREEDELIVERY", "SAVE10", "TRYNEW"],        lastUpdated: "2024-12" },
  { domain: "doordash.com",   codes: ["DASHPASS", "25WELCOME", "SAVE40", "NEWDASH15", "FREEDELIVERY"],      lastUpdated: "2024-12" },
  { domain: "grubhub.com",    codes: ["GRUB10OFF", "FREEDELIVERY", "SAVE15", "WELCOME20", "TRYNOW"],        lastUpdated: "2024-12" },
  { domain: "papajohns.com",  codes: ["25OFF", "PAPAJOHNS", "FREESHIP", "SAVE30", "PIZZAPARTY"],            lastUpdated: "2024-12" },

  // ─── Tech / Software ──────────────────────
  { domain: "godaddy.com",        codes: ["GDBBX1", "CJCRMN20", "HOSTING49", "GET35OFF", "NEWDOMAIN"],      lastUpdated: "2024-12" },
  { domain: "namecheap.com",      codes: ["NEWCOM", "COUPONFIRST", "SAVE20NOW", "DOMAIN50", "HOSTING30"],    lastUpdated: "2024-12" },
  { domain: "newegg.com",         codes: ["NEWEGG10", "TECH20", "BFCM2024", "SAVE15", "FREESHIP"],          lastUpdated: "2024-12" },
  { domain: "bhphotovideo.com",   codes: ["BHSAVE10", "FREESHIP", "WELCOME15", "HOLIDAY20", "TECHSALE"],    lastUpdated: "2024-12" },

  // ─── Home & Garden ─────────────────────────
  { domain: "wayfair.com",     codes: ["WAYFAIR10", "SAVE20", "NEWCUSTOMER", "FREESHIP", "HOLIDAY15"],       lastUpdated: "2024-12" },
  { domain: "ikea.com",        codes: ["IKEA10", "FAMILYDEAL", "FREESHIP", "SAVE15", "HOLIDAY20"],           lastUpdated: "2024-12" },
  { domain: "homedepot.com",   codes: ["SAVE10HD", "FREESHIP", "SPRING15", "PRO25", "HOLIDAY"],              lastUpdated: "2024-12" },
  { domain: "lowes.com",       codes: ["LOWES10OFF", "FREESHIP", "SAVE20", "SPRING15", "MILITARY"],          lastUpdated: "2024-12" },
  { domain: "overstock.com",   codes: ["SAVE15", "EXTRA20", "FREESHIP", "WELCOME10", "CLEARANCE"],           lastUpdated: "2024-12" },

  // ─── Health & Fitness ──────────────────────
  { domain: "gnc.com",              codes: ["GNC20", "PROTEIN15", "FREESHIP49", "SAVE10", "BOGO50"],         lastUpdated: "2024-12" },
  { domain: "vitaminshoppe.com",    codes: ["SAVE20VS", "EXTRA15", "FREESHIP", "WELCOME10", "BOGO"],        lastUpdated: "2024-12" },
  { domain: "myprotein.com",        codes: ["EXTRA35", "MYPDEAL", "SAVE25", "PROTEIN20", "WELCOME"],        lastUpdated: "2024-12" },

  // ─── Pet ────────────────────────────────────
  { domain: "chewy.com",   codes: ["SAVE20FIRST", "CHEWY15", "FREESHIP49", "AUTOSHIP", "WELCOME"],          lastUpdated: "2024-12" },
  { domain: "petco.com",   codes: ["SAVE20", "FREESHIP35", "WELCOME10", "PALS15", "HOLIDAY"],               lastUpdated: "2024-12" },

  // ─── Travel ────────────────────────────────
  { domain: "expedia.com",   codes: ["SAVE10EXP", "TRAVEL15", "MEMBER20", "HOLIDAY25", "HOTEL10"],           lastUpdated: "2024-12" },
  { domain: "hotels.com",    codes: ["SAVE10", "MEMBER15", "FREECANCELLATION", "LOYALTY", "DEAL20"],         lastUpdated: "2024-12" },
  { domain: "booking.com",   codes: ["GENIUS10", "SAVE15", "WELCOME", "EARLYBIRD", "HOLIDAY20"],             lastUpdated: "2024-12" },

  // ─── Subscription / Services ───────────────
  { domain: "spotify.com",   codes: ["PREMIUM3MO", "STUDENT50", "FAMILYPLAN", "DUO30", "TRYFREE"],          lastUpdated: "2024-12" },
  { domain: "canva.com",     codes: ["CANVA30", "PROTRIAL", "EDUCATION", "TEAMS20", "SAVE15"],               lastUpdated: "2024-12" },

  // ─── Grocery / Meal Kits ───────────────────
  { domain: "instacart.com",    codes: ["SAVE10IC", "FREEDELIVERY", "WELCOME20", "EXPRESS", "HOLIDAY"],      lastUpdated: "2024-12" },
  { domain: "hellofresh.com",   codes: ["HELLOFRESH60", "FREEBOX", "SAVE50", "FRESH40", "WELCOME65"],        lastUpdated: "2024-12" },
  { domain: "blueapron.com",    codes: ["BLUE60OFF", "WELCOME50", "SAVE40", "TRYFREE", "HOLIDAY"],           lastUpdated: "2024-12" },

  // ─── Office / Education ────────────────────
  { domain: "staples.com",       codes: ["SAVE20SP", "FREESHIP", "TECH15", "INK10OFF", "BACKTOSCHOOL"],      lastUpdated: "2024-12" },
  { domain: "officedepot.com",   codes: ["SAVE20OD", "FREESHIP", "TECH15", "WELCOME10", "HOLIDAY"],          lastUpdated: "2024-12" },

  // ─── Shoes ─────────────────────────────────
  { domain: "footlocker.com",  codes: ["FL20OFF", "SAVE15", "SNEAKER10", "FREESHIP", "HOLIDAY25"],           lastUpdated: "2024-12" },
  { domain: "zappos.com",      codes: ["ZAPPOS10", "WELCOME15", "FREESHIP", "SAVE20", "VIP25"],              lastUpdated: "2024-12" },

  // ─── Electronics ───────────────────────────
  { domain: "samsung.com",   codes: ["SAMSUNG10", "STUDENT15", "HOLIDAY20", "TRADEIN25", "FREESHIP"],        lastUpdated: "2024-12" },
  { domain: "apple.com",     codes: ["EDUCATION", "BACKTOSCHO", "APPLECARE", "HOLIDAY", "TRADE15"],          lastUpdated: "2024-12" },
  { domain: "dell.com",      codes: ["SAVE10DELL", "MEMBER15", "STUDENT20", "FREESHIP", "HOLIDAY"],          lastUpdated: "2024-12" },
];

/* Helper: look up coupons for a domain (also matches subdomains) */
function getCouponsForDomain(hostname) {
  if (!hostname) return null;
  var domain = hostname.replace(/^www\./, "").toLowerCase();

  // Exact match first
  var exact = COUPON_DATABASE.find(function(e) { return domain === e.domain; });
  if (exact) return exact;

  // Subdomain match (e.g. shop.nike.com -> nike.com)
  return COUPON_DATABASE.find(function(e) { return domain.endsWith("." + e.domain); }) || null;
}
