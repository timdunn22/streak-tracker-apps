# SaveSmart — Coupon Finder

**Automatically finds and applies coupon codes at checkout. Privacy-first. No data sold.**

A free, open-source Chrome extension that replaces Honey — built for the 8M+ users who lost their coupon tool when PayPal shut it down. SaveSmart is privacy-first: **your data never leaves your browser**.

---

## Features

- **Auto-detect checkout pages** — Recognizes cart, checkout, and payment pages on any website
- **Smart coupon field detection** — Finds promo/coupon/discount code inputs using 20+ selector strategies
- **One-click coupon testing** — Automatically types, applies, and compares every available code
- **Best-price guarantee** — Tests all codes and keeps the one that saves you the most
- **Progress indicator** — Animated overlay shows which code is being tested in real-time
- **50+ stores built in** — Pre-loaded database of coupon codes for top shopping sites
- **Stats dashboard** — Track total savings and coupons applied this month
- **Badge counter** — See available coupon count right on the extension icon
- **Privacy-first** — Zero data collection, zero tracking, zero network requests. Everything stays in `chrome.storage.local`
- **Dark theme UI** — Clean, modern popup with emerald green accents

## Supported Stores

Amazon, Target, Walmart, Best Buy, Costco, eBay, Nike, Adidas, H&M, ASOS, Gap, Old Navy, Forever 21, Zara, Nordstrom, Macy's, SHEIN, Uniqlo, Sephora, Ulta, Bath & Body Works, Domino's, Pizza Hut, Uber Eats, DoorDash, Grubhub, Papa John's, GoDaddy, Namecheap, Newegg, B&H Photo, Wayfair, IKEA, Home Depot, Lowe's, Overstock, GNC, Vitamin Shoppe, Myprotein, Chewy, Petco, Expedia, Hotels.com, Booking.com, Spotify, Canva, Instacart, HelloFresh, Blue Apron, Staples, Office Depot, Foot Locker, Zappos, Samsung, Apple, Dell — and growing.

## Installation

### From source (Developer Mode)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the `coupon-finder-extension` folder
6. The SaveSmart icon will appear in your toolbar

### From Chrome Web Store

*Coming soon — pending review.*

## How It Works

1. **Browse normally** — SaveSmart quietly watches for checkout pages
2. **Get notified** — When a coupon field is detected, a non-intrusive bar slides down: "We found X coupon codes for this store"
3. **Click "Try Coupons"** — SaveSmart automatically enters each code, clicks apply, and checks if your total went down
4. **Save money** — The best working code is applied and you see exactly how much you saved

## Privacy

SaveSmart is built on a simple principle: **your data is yours**.

- No data is ever sent to any server
- No browsing history is tracked
- No analytics or telemetry
- All coupon codes are stored locally in the extension
- All statistics (savings, usage) live in `chrome.storage.local` only
- Open source — audit the code yourself

## Tech Stack

- **Manifest V3** — Latest Chrome extension standard
- **Vanilla JS** — No frameworks, no build tools, no dependencies
- **Chrome Storage API** — Local-only persistence
- **Content Scripts** — DOM interaction for coupon detection and application
- **Service Worker** — Background coupon lookup and badge management

## File Structure

```
coupon-finder-extension/
├── manifest.json              # Extension manifest (MV3)
├── background.js              # Service worker: badge, stats, coupon lookup
├── content.js                 # Content script: page detection, coupon testing
├── coupon-database.js         # Built-in coupon code database (50+ stores)
├── popup.html                 # Browser action popup
├── popup.css                  # Popup styles (dark theme)
├── popup.js                   # Popup controller
├── styles/
│   └── notification-bar.css   # In-page notification & progress overlay styles
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Chrome Web Store Listing

### Short Description
Automatically finds and applies coupon codes at checkout. Privacy-first. No data sold. A free Honey replacement.

### Detailed Description
SaveSmart automatically finds and tests coupon codes when you shop online — completely free, with zero data collection.

Unlike other coupon extensions, SaveSmart never sends your data to any server. Your browsing history, purchase data, and personal information stay on your device. Period.

**How it works:**
1. Shop normally on any of 50+ supported stores
2. At checkout, SaveSmart detects coupon code fields automatically
3. Click "Try Coupons" to test all available codes in seconds
4. The best working code is applied — you see your savings instantly

**Why SaveSmart?**
- 100% free, no account required
- Privacy-first: no data leaves your browser
- 50+ stores with built-in coupon codes
- Smart detection works on real checkout pages
- Clean, modern UI with savings tracking
- Open source and transparent

**Built for the millions of users who lost Honey.** SaveSmart is the coupon finder you can trust.

## License

MIT License. Free to use, modify, and distribute.

## Contributing

Pull requests welcome. To add new coupon codes, edit `coupon-database.js` and follow the existing format.
