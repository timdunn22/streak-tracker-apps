# Chrome Web Store Listings

> Generated 2026-02-21. Copy-paste ready for Chrome Web Store Developer Dashboard.
> Zip packages are in `store-packages/`.

---

## 1. JSONView Pro

**Zip file:** `store-packages/json-formatter-chrome.zip`

### Name (75 char max)

```
JSONView Pro - JSON Formatter, Viewer & Syntax Highlighter
```

### Short Description (132 char max)

```
Auto-format JSON in your browser with syntax highlighting, collapsible tree view, search, dark/light themes, and one-click copy.
```

### Detailed Description

```
JSONView Pro automatically detects and beautifully formats any JSON response directly in your browser tab. No more squinting at raw, unformatted JSON -- see your data clearly with syntax highlighting, collapsible nodes, and instant search.

FEATURES
--------
- Auto-detect JSON: Instantly recognizes JSON content-type pages and API responses
- Syntax highlighting: Color-coded strings, numbers, booleans, null values, and keys
- Collapsible tree view: Click any object or array to expand/collapse. See item counts at a glance
- Search: Find any key or value instantly with live highlighting that auto-expands matching nodes
- One-click copy: Copy raw JSON or pretty-printed JSON to your clipboard
- Dark & light themes: Toggle between dark and light mode. Your preference is remembered
- Line numbers: Track your position in large JSON files with dynamic line numbering
- File size display: See the JSON payload size (bytes, KB, MB) in the toolbar
- Configurable collapse depth: Set the default depth (1, 2, 3, or expand all) from the popup
- Path copying: Click any key to copy its full JSON path (e.g., $.users[0].name)
- Auto-format toggle: Disable auto-formatting when you need raw JSON
- Page counter: See how many JSON pages you have formatted

HOW IT WORKS
------------
When you navigate to a URL that returns a JSON response (API endpoints, config files, webhook payloads), JSONView Pro replaces the plain text with a formatted, interactive tree view. Everything runs locally in your browser -- your data never leaves your machine.

PERFECT FOR
-----------
- Developers debugging API responses
- QA engineers inspecting JSON payloads
- Data analysts exploring JSON datasets
- Anyone who works with REST APIs, GraphQL, webhooks, or JSON config files

PRIVACY
-------
JSONView Pro does NOT collect, transmit, or store any of your data. It has no analytics, no tracking, no remote servers. All formatting happens locally in your browser tab. The only storage used is chrome.storage.sync to remember your theme and collapse depth preferences.

Permissions explained:
- "activeTab": Format JSON on the current tab
- "storage": Save your theme and preferences

JSONView Pro is open source and free forever.
```

### Category

**Developer Tools**

---

## 2. AutoPlay Killer

**Zip file:** `store-packages/autoplay-killer-chrome.zip`

### Name (75 char max)

```
AutoPlay Killer - Block Autoplay Videos & Audio on Every Site
```

### Short Description (132 char max)

```
Stop autoplay videos and audio everywhere. Per-site whitelist, play button overlay, and daily stats. Lightweight and private.
```

### Detailed Description

```
AutoPlay Killer silences the web. It blocks all auto-playing videos and audio across every website, giving you back control over what plays and when. No more surprise audio in open tabs, no more data-draining background videos.

FEATURES
--------
- Block all autoplay: Prevents videos and audio from playing automatically on every site
- Play button overlay: Blocked videos get a clean play button so you can choose to watch
- Per-site whitelist: Allow autoplay on sites you trust (YouTube, Spotify, Netflix, etc.)
- Global toggle: Turn blocking on or off with one click
- Daily stats: See how many autoplay attempts were blocked today
- Works in all frames: Blocks autoplay in embedded iframes and nested players
- MutationObserver: Catches dynamically injected media elements (infinite scroll, SPAs)
- Prototype-level blocking: Overrides HTMLMediaElement.play() to catch every autoplay attempt
- User interaction detection: Allows media to play when YOU click -- only blocks automatic playback
- Badge indicator: See at a glance whether blocking is ON or OFF for the current site

HOW IT WORKS
------------
AutoPlay Killer intercepts the browser's play() function at the prototype level, so it catches autoplay before the video or audio even starts loading. When a site tries to auto-play media without your interaction, AutoPlay Killer pauses it and shows a play button overlay. Click the overlay to watch on your terms.

The extension tracks your clicks, taps, and keystrokes to distinguish between media YOU chose to play and media the site auto-started. If you clicked play, it goes through. If the site triggered it automatically, it gets blocked.

WHY USE AUTOPLAY KILLER
-----------------------
- Save bandwidth and data on mobile connections
- Stop embarrassing audio blasting from forgotten tabs
- Reduce CPU usage and battery drain from background videos
- Focus on reading without distracting video loops
- Control your browsing experience

PRIVACY
-------
AutoPlay Killer does NOT collect, transmit, or store any personal data. It has no analytics, no tracking, no remote servers. Your whitelist is stored locally using chrome.storage. The extension only needs "activeTab" and "storage" permissions to function.

Lightweight, fast, and completely free.
```

### Category

**Productivity**

---

## 3. Clean Copy

**Zip file:** `store-packages/clean-copy-chrome.zip`

### Name (75 char max)

```
Clean Copy - Enable Right-Click, Copy & Paste on Any Website
```

### Short Description (132 char max)

```
Re-enable right-click, copy, paste, and text selection on websites that block them. Works on all sites. Per-site controls.
```

### Detailed Description

```
Clean Copy removes all copy protection and right-click restrictions from websites. Many sites block right-click context menus, disable text selection, prevent copying, or block pasting into form fields. Clean Copy overrides all of these restrictions so you can use the web normally.

FEATURES
--------
- Enable right-click: Restore the context menu on sites that block it
- Enable copy & cut: Copy text from any page, even those with copy protection
- Enable text selection: Select and highlight text on pages that disable it
- Enable paste: Paste into form fields that block the paste event (password fields, email confirmations, etc.)
- Clean paste mode: Optionally strip formatting from pasted text for plain text paste
- Per-site control: Enable or disable the extension for individual sites
- Global toggle: Master on/off switch to quickly disable all protections
- Granular toggles: Control right-click, copy, selection, and paste independently
- MAIN world injection: Intercepts page-level JavaScript in the page's own execution context
- Inline handler removal: Strips oncontextmenu, oncopy, onselectstart, onpaste attributes
- CSS override: Forces user-select: text on all elements
- MutationObserver: Continuously cleans dynamically added restrictions
- Event.preventDefault override: Prevents sites from blocking browser-native events
- Badge indicator: See ON/OFF status for the current site at a glance

HOW IT WORKS
------------
Clean Copy uses a dual content script architecture. One script runs in Chrome's isolated world (for secure API access), while another runs in the page's MAIN world (to intercept the page's own JavaScript). This two-pronged approach catches restrictions that simpler extensions miss:

1. Overrides EventTarget.addEventListener to neutralize copy/paste/selection event blockers
2. Overrides Event.preventDefault to stop sites from canceling native browser events
3. Removes inline event handlers (oncontextmenu, oncopy, etc.) from all elements
4. Injects CSS to force user-select: text on every element
5. Watches for dynamically added restrictions and removes them in real-time

COMMON USE CASES
----------------
- Copy text from news articles behind copy protection
- Right-click on images to save or search
- Paste passwords from your password manager into sites that block paste
- Select text on recipe sites, educational pages, or documentation
- Copy code snippets from tutorial sites that disable selection

PRIVACY
-------
Clean Copy does NOT read, collect, or transmit any of your data. It does not access your clipboard contents. The extension only modifies how the current page handles browser events. Your per-site settings are stored locally using chrome.storage.

Permissions explained:
- "activeTab": Modify the current tab's page behavior
- "storage": Remember your per-site preferences
- "clipboardWrite" / "clipboardRead": Required for the clean paste feature only

Free, lightweight, and open source.
```

### Category

**Productivity**

---

## 4. PastePure

**Zip file:** `store-packages/paste-plain-chrome.zip`

### Name (75 char max)

```
PastePure - Paste as Plain Text Everywhere, Strip Formatting
```

### Short Description (132 char max)

```
Automatically strip formatting from every paste. Pure plain text or smart mode that preserves links and tables. Per-site toggle.
```

### Detailed Description

```
PastePure strips all formatting from your clipboard every time you paste. No more fighting with font sizes, colors, backgrounds, and styles when you paste from one app to another. Just clean, plain text -- every time.

FEATURES
--------
- Automatic plain text paste: Every Ctrl+V / Cmd+V is automatically converted to plain text
- Smart paste mode: Preserves useful structure (hyperlinks, line breaks, table layouts) while stripping fonts, colors, and styling
- Table preservation: In smart mode, HTML tables are converted to clean tab-separated text that pastes perfectly into spreadsheets
- Link preservation: In smart mode, hyperlinks are preserved as "text (url)" format
- Per-site toggle: Disable PastePure on specific sites where you need rich formatting (Google Docs, Notion, etc.)
- Global toggle: Turn the extension on or off with one click
- Visual feedback: A green flash on the input field confirms when formatting was stripped
- Daily paste counter: See how many pastes were cleaned today
- Works everywhere: Handles textarea, input, contenteditable elements (Gmail, Slack, Discord, etc.)
- Undo-friendly: Uses execCommand('insertText') so Ctrl+Z still works after pasting

HOW IT WORKS
------------
PastePure intercepts paste events at the document level (capture phase) before any website JavaScript can interfere. When you paste:

1. It checks if the clipboard contains HTML formatting
2. If yes, it strips the formatting and inserts clean plain text
3. If the clipboard is already plain text, it lets the normal paste through
4. In smart mode, it parses the HTML to preserve line breaks, links, and tables

TWO PASTE MODES
---------------
- Pure mode (default): Strips ALL formatting. You get exactly the raw text, nothing else.
- Smart mode: Strips visual formatting (fonts, colors, sizes, backgrounds) but preserves structural elements like line breaks, hyperlinks with URLs, and table layouts as tab-separated values.

PERFECT FOR
-----------
- Pasting into emails without carrying over weird formatting
- Copying from websites into documents without style conflicts
- Pasting into spreadsheets from HTML tables
- Keeping your notes and documents clean and consistent
- Anyone tired of Ctrl+Shift+V (paste without formatting)

PRIVACY
-------
PastePure does NOT read, store, or transmit your clipboard contents or any personal data. The extension only processes paste events in the moment they happen -- nothing is logged or saved. Your settings (global toggle, per-site preferences, paste mode) are stored locally using chrome.storage.sync.

Lightweight, fast, and completely free.
```

### Category

**Productivity**

---

## 5. CleanLink

**Zip file:** `store-packages/url-hygiene-chrome.zip`

### Name (75 char max)

```
CleanLink - Remove Tracking Parameters from URLs Automatically
```

### Short Description (132 char max)

```
Strip UTM, fbclid, gclid, and 40+ tracking parameters from URLs automatically. Zero-latency privacy using declarativeNetRequest.
```

### Detailed Description

```
CleanLink automatically removes tracking parameters from every URL you visit. UTM tags, Facebook click IDs, Google click IDs, HubSpot tokens, and 40+ other tracking parameters are stripped before the page even loads -- giving you cleaner URLs and better privacy.

FEATURES
--------
- 44 tracking parameters blocked: Covers all major ad platforms and analytics providers
- Zero-latency stripping: Uses Chrome's declarativeNetRequest API so parameters are removed BEFORE the request is made -- no page load delay
- Real-time stats: See how many parameters were removed today and URLs cleaned this session
- URL cleaning tool: Paste any URL into the popup to manually strip tracking parameters
- Category toggles: Enable or disable blocking by category (UTM, Facebook, Google, Microsoft, HubSpot, Mailchimp, Adobe, Generic)
- Recent URL log: View the last 20 cleaned URLs with before/after comparison
- Copy cleaned URLs: One-click copy of any cleaned URL
- Badge counter: See today's removed parameter count on the extension icon
- Global toggle: Disable all cleaning with one click
- Reset stats: Clear your counters and URL history

TRACKING PARAMETERS REMOVED
----------------------------
- UTM: utm_source, utm_medium, utm_campaign, utm_term, utm_content, utm_id
- Facebook: fbclid, fb_action_ids, fb_action_types, fb_ref, fb_source
- Google Ads: gclid, gclsrc, dclid, gbraid, wbraid
- Microsoft Ads: msclkid
- HubSpot: hsa_cam, hsa_grp, hsa_mt, hsa_src, hsa_ad, hsa_acc, hsa_net, hsa_ver, hsa_la, hsa_ol, hsa_kw, _hsenc, _hsmi, __hstc, __hsfp, __hssc
- Mailchimp: mc_cid, mc_eid
- Adobe Analytics: s_cid
- Generic trackers: ref, referrer, _ga, _gl, igshid, si, feature, app

HOW IT WORKS
------------
CleanLink uses Chrome's built-in declarativeNetRequest API, the same high-performance mechanism used by ad blockers. Tracking parameters are stripped at the network level before the request is sent, which means:

1. No page load delay -- cleaning happens before the navigation
2. No content script running on every page
3. Minimal memory and CPU usage
4. The cleaned URL appears in your address bar automatically

This is fundamentally different from (and faster than) extensions that clean URLs after the page loads.

WHY CLEAN YOUR URLS
--------------------
- Privacy: Tracking parameters let advertisers follow you across websites. Removing them reduces cross-site tracking.
- Cleaner sharing: When you share a link, it will not contain ugly tracking parameters that reveal where you came from.
- Shorter URLs: Stripped URLs are shorter and cleaner in bookmarks, notes, and messages.
- Transparency: See exactly which parameters are being added by the sites you visit.

PRIVACY
-------
CleanLink does NOT collect, transmit, or phone home any data. There are no analytics, no remote servers, no telemetry. Your cleaned URL history and stats are stored locally using chrome.storage.local and never leave your browser. The extension uses declarativeNetRequest rules that run entirely within Chrome's built-in network engine.

Permissions explained:
- "declarativeNetRequest": Strip tracking parameters at the network level
- "declarativeNetRequestFeedback": Count how many parameters were removed
- "webNavigation": Detect page navigations to track cleaning stats
- "storage": Save your preferences and daily stats
- "host_permissions: <all_urls>": Required to clean URLs on all websites

Free, open source, and built for privacy.
```

### Category

**Privacy & Security** (alternatively: Productivity)

---

## Summary Table

| Extension | Zip File | Size | Category |
|-----------|----------|------|----------|
| JSONView Pro | `json-formatter-chrome.zip` | ~14 KB | Developer Tools |
| AutoPlay Killer | `autoplay-killer-chrome.zip` | ~9 KB | Productivity |
| Clean Copy | `clean-copy-chrome.zip` | ~12 KB | Productivity |
| PastePure | `paste-plain-chrome.zip` | ~7 KB | Productivity |
| CleanLink | `url-hygiene-chrome.zip` | ~10 KB | Privacy & Security |

## Chrome Web Store Submission Checklist

For each extension, you will also need:

- [ ] **Screenshots**: At least 1 screenshot (1280x800 or 640x400). Recommended: 3-5 showing the extension in action.
- [ ] **Promo tile** (optional): 440x280 small tile for featured spots.
- [ ] **Privacy practices**: Declare in the dashboard that the extension does not collect user data.
- [ ] **Single purpose description**: One sentence explaining the single purpose (required by Chrome policy).
- [ ] **$5 developer registration fee**: One-time payment to publish on Chrome Web Store.

### Single Purpose Statements

| Extension | Single Purpose |
|-----------|---------------|
| JSONView Pro | Automatically format and display JSON responses with syntax highlighting and an interactive tree view. |
| AutoPlay Killer | Block auto-playing videos and audio on websites. |
| Clean Copy | Re-enable right-click, copy, paste, and text selection on websites that disable them. |
| PastePure | Strip formatting from clipboard content when pasting. |
| CleanLink | Remove tracking parameters from URLs to protect user privacy. |
