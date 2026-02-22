# Microsoft Edge Add-ons Store -- Submission Guide

## Overview

All 5 Chrome extensions are Manifest V3 (MV3) and work on Microsoft Edge with zero code changes. Edge is Chromium-based and supports the same extension APIs, manifest format, and packaging (.zip) as Chrome.

## Fees

**None.** Microsoft does not charge a registration fee or per-extension fee to publish on the Edge Add-ons store. This is a significant advantage over the Chrome Web Store ($5 one-time developer fee).

## Edge Add-ons Store URL

Dashboard: https://partner.microsoft.com/en-us/dashboard/microsoftedge/overview

## Extensions to Submit

| # | Extension | Zip Package | Manifest Name |
|---|-----------|-------------|---------------|
| 1 | JSON Formatter | `store-packages/json-formatter-edge.zip` | JSONView Pro -- Formatter & Viewer |
| 2 | AutoPlay Killer | `store-packages/autoplay-killer-edge.zip` | AutoPlay Killer -- Stop All Auto-Playing Media |
| 3 | Clean Copy | `store-packages/clean-copy-edge.zip` | Clean Copy -- Enable Right-Click, Copy & Paste Everywhere |
| 4 | Paste Plain | `store-packages/paste-plain-edge.zip` | PastePure -- Always Paste as Plain Text |
| 5 | URL Hygiene | `store-packages/url-hygiene-edge.zip` | CleanLink -- Strip Tracking from URLs |

## Step-by-Step Submission Process

### Step 1: Create a Microsoft Partner Center Account

1. Go to https://partner.microsoft.com/en-us/dashboard/microsoftedge/overview
2. Sign in with a Microsoft account (MSA) -- either a personal @outlook.com/@hotmail.com or a work/school account
3. If you do not have a Partner Center account, you will be prompted to register as a Microsoft Edge extension developer
4. Complete the registration form (name, email, country)
5. No payment required -- registration is free

### Step 2: Upload the Extension Package

1. In Partner Center, click **Extensions** in the left sidebar
2. Click **Create new extension**
3. Upload the `.zip` file for the extension (e.g., `json-formatter-edge.zip`)
4. Partner Center will validate the manifest and display the extension name and version

### Step 3: Fill in the Store Listing

For each extension, provide the following metadata:

#### Required Fields
- **Extension name**: Auto-populated from manifest.json (can be overridden)
- **Description**: 250-5,000 characters. Reuse the same descriptions from the Chrome Web Store listings
- **Category**: Choose the most appropriate category (e.g., "Productivity", "Developer Tools", "Privacy & Security")
- **Language**: English (or whichever languages you support)
- **Privacy policy URL**: Required if the extension requests any permissions. Host a privacy policy page (can be a simple GitHub Pages or standalone URL)

#### Required Visual Assets
- **Extension logo**: 300 x 300 pixels (PNG). This is the store tile image, separate from the manifest icons
- **At least 1 screenshot**: 640 x 480 or 1280 x 800 pixels (PNG or JPEG). Up to 10 screenshots allowed
- **Small promotional tile**: 440 x 280 pixels (optional but recommended)

#### Optional Fields
- **Large promotional tile**: 1400 x 560 pixels
- **YouTube video URL**: A demo or promo video
- **Short description**: Up to 132 characters (shown in search results)

### Step 4: Set Availability

- **Visibility**: Public (available to everyone) or Hidden (only accessible via direct link)
- **Markets**: Select which countries/regions to publish in (default: all markets)

### Step 5: Review and Submit

1. Review all information on the summary page
2. Add **testing notes** for the certification team (e.g., "This extension works on any website. Visit any page and click the extension icon to see the popup.")
3. Click **Publish** to submit for certification

### Step 6: Certification and Publishing

- Microsoft reviews extensions for policy compliance
- Review typically takes **1-7 business days** (often 1-3 days for simple extensions)
- You will receive an email when the extension is approved or if changes are required
- Once approved, the status changes to **"In the Store"** and the extension is live

## Edge-Specific Notes

### No Code Changes Required
The same MV3 extension packages used for Chrome work identically on Edge. The zip files in `store-packages/` contain the Chrome versions of each extension, which is exactly what Edge expects.

### Reusing Chrome Descriptions
You can copy-paste the exact same descriptions, feature lists, and promotional text from your Chrome Web Store listings. The only things you need to create fresh are:
- A 300 x 300 px store logo (the 128px manifest icon is too small for the Edge store tile)
- Screenshots at the required dimensions (640x480 or 1280x800)

### Privacy Policy
Edge requires a privacy policy URL for extensions that request permissions. Since all 5 extensions request permissions like `storage`, `activeTab`, etc., you will need a privacy policy for each. A single shared privacy policy page covering all extensions is acceptable.

A minimal privacy policy should state:
- What data the extension accesses (and that it does NOT collect or transmit user data)
- That no personal information is stored on external servers
- Contact information for privacy inquiries

### Manifest Differences (None)
Edge uses the exact same `manifest_version: 3` format as Chrome. There are no Edge-specific manifest keys or modifications needed. The `declarativeNetRequest` API (used by CleanLink) is fully supported in Edge.

### Update Process
To update an extension after initial publication:
1. Increment the `version` field in `manifest.json`
2. Create a new zip package
3. Go to Partner Center > Extensions > select the extension > **Update**
4. Upload the new zip and submit for certification

## Quick Reference: Categories for Each Extension

| Extension | Suggested Category |
|-----------|--------------------|
| JSONView Pro | Developer Tools |
| AutoPlay Killer | Productivity |
| Clean Copy | Productivity |
| PastePure | Productivity |
| CleanLink | Privacy & Security |

## Estimated Timeline

- Account setup: ~10 minutes
- Per-extension submission: ~15-20 minutes (mostly filling in store listing details)
- Certification: 1-7 business days per extension
- Total: All 5 extensions can be submitted in a single session (~1.5 hours), with all going live within a week
