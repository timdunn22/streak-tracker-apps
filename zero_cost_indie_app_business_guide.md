# The $0 Indie Mobile App Business: Exhaustive Free Alternatives Guide

*Researched February 2026. Real limits, not marketing claims.*

---

## Table of Contents
1. [App Store Optimization (ASO) Tools](#1-app-store-optimization-aso-tools)
2. [Apple Search Ads](#2-apple-search-ads)
3. [UGC Video Creation](#3-ugc-video-creation)
4. [Paid Ad Credits (Free Money)](#4-paid-ad-credits-free-money)
5. [Auto-Posting / Social Media Scheduling](#5-auto-posting--social-media-scheduling)
6. [Comment Management / Chatbots](#6-comment-management--chatbots)
7. [AI Voice Generation](#7-ai-voice-generation)
8. [Paywall / Subscription Management](#8-paywall--subscription-management)
9. [Backend Infrastructure](#9-backend-infrastructure)
10. [App Development & Distribution](#10-app-development--distribution)
11. [Design & Assets](#11-design--assets)
12. [Analytics & Crash Reporting](#12-analytics--crash-reporting)
13. [Domain & Web Presence](#13-domain--web-presence)
14. [Total Minimum Cost Summary](#14-total-minimum-cost-summary)

---

## 1. App Store Optimization (ASO) Tools

### Free Alternatives to Astro ($9/mo)

| Tool | Free Tier | Key Limits |
|------|-----------|------------|
| **APPlyzer** | Unlimited apps, 100 keywords, 12 months of historical data | Gold standard for free ASO |
| **Asolytics** | Free keyword research, monitor 1,000+ keywords per app across localizations | Fully free core tools |
| **ASOTools** (asotools.io) | Competitor keyword analysis, popularity scores, volume, difficulty | No stated limit on free searches |
| **AppFollow** | 2 apps, review analysis + keyword tracking + competitive monitoring | Limited to 2 apps |
| **Keyapp** | 30-day keyword rank history, free analytics | Good for initial research |
| **Keyword Tool** (keywordtool.io) | App Store keyword suggestions from autocomplete data | Limited results without paid plan |

### AppFigures Free Tier -- Real Limits

- **Free Starter Plan**: Track up to 5 apps, no keyword tracking
- No credit card required
- If you start a trial, you get full "Optimize" plan features temporarily; when it expires, you drop to Starter automatically
- **Verdict**: Useful for download/revenue tracking of your own apps, but NOT useful for ASO keyword research on the free tier

### Free Competitor Research (Replacing Sensor Tower / data.ai)

- **ASOTools.io**: Free competitor keyword spy tool -- see what keywords competitors rank for, their difficulty scores, and search volume
- **AppFollow free plan**: Basic competitive monitoring for 2 apps
- **APPlyzer**: 12 months of competitor ranking history for free
- **App Store Connect itself**: If you run Apple Search Ads (even on the $100 free credit), you get Search Tab impression data showing what keywords drive installs

### Completely Free Manual Keyword Research Methods

1. **App Store Autocomplete**: Type seed keywords into the App Store search bar and note every suggestion -- these are real user searches ranked by popularity
2. **Competitor Title/Subtitle Mining**: Look at the top 10-20 apps in your category. Note every word in their titles and subtitles. These are likely high-value keywords
3. **Review Mining**: Read 1-star and 5-star reviews of competitor apps. Users describe features in their own words -- these ARE your keywords
4. **Apple Search Ads Keyword Suggestions**: Even on the free $100 credit, the Apple Search Ads dashboard shows keyword suggestions with popularity scores (1-100 scale)
5. **Google Trends**: Check if interest in related terms is rising or falling
6. **Reddit/Forum Mining**: Search subreddits related to your app category. See how people describe the problem your app solves
7. **ChatGPT/Claude**: Ask AI to brainstorm 200 keyword variations for your app concept

**Pro tip**: Your keyword field is limited to 100 characters. Separate with commas, no spaces. Every character counts.

---

## 2. Apple Search Ads

### Free Ad Credit Program

**YES -- Apple gives $100 USD free credit to every new Apple Ads account.** This is an ongoing, standard offer (not a limited promotion). You see it at the top of the Billing page when you set up your account. You DO need to add a credit card, but Apple will not charge it until the $100 is used up.

### Basic vs Advanced

| Feature | Basic | Advanced |
|---------|-------|----------|
| **Cost model** | Cost-per-install (CPI) | Cost-per-tap (CPT) |
| **Automation** | Fully automated (Apple picks keywords) | Full manual control |
| **Ad placements** | Search results only | Today tab, Search tab, Search results, Product pages |
| **Budget cap** | $5,000/month max | Unlimited |
| **Targeting** | Minimal | Location, gender, keywords, re-engagement |
| **Management time** | ~80% less than Advanced | Requires ongoing optimization |
| **Typical CPI** | 15-25% higher than optimized Advanced | Lower with optimization |

**Recommendation for $0 budget**: Use Basic with your $100 free credit. Apple automates everything. You will learn which keywords convert before spending any real money.

### Other Free Promotion from Apple

1. **Featuring Nominations**: Submit your app via App Store Connect's "Featuring Nominations" feature. Apple editors hand-pick featured apps -- this is FREE exposure worth thousands in equivalent ad spend
2. **App Promotion Form**: Submit at developer.apple.com/app-store/promote/ -- give Apple 2+ weeks notice before launches
3. **Apple's "Apps We Love" / "App of the Day"**: Requires 4.5+ star rating, beautiful screenshots, and excellent design. Submit early (Apple plans 6-8 weeks ahead)
4. **Seasonal Tie-ins**: Apple aligns features with events (Black Friday, World Accessibility Day, Earth Day). Time your updates accordingly
5. **Apple Developer Stories**: Apple sometimes writes developer stories for their newsroom -- small indie stories get picked

---

## 3. UGC Video Creation

### Free AI Avatar/Video Tools

| Tool | Free Tier | Limits | Watermark? |
|------|-----------|--------|------------|
| **HeyGen** | 3 videos/month, 3 min each | 720p, 500+ stock avatars, 30+ languages, 1 custom avatar | Yes |
| **Synthesia** | 3 minutes/month | 9 stock avatars, basic features only | Yes |
| **D-ID** | Free trial credits | ~5 min video limit, limited generations | Yes |
| **SendShort** | Free to start | AI UGC generator, choose avatar + type script | Limited |
| **Predis.ai** | Free plan | Text-to-video, direct TikTok posting | Limited features |
| **InVideo AI** | Free tier | TikTok video generation from text prompts | Watermark |

### Free AI Voice Tools (Replacing ElevenLabs $5/mo)

**BEST FREE OPTION: Edge TTS (Microsoft)**
- **Cost**: Completely free, no API key needed
- **Quality**: Neural voices, very human-sounding -- arguably as good as ElevenLabs for narration
- **Limits**: Technically unlimited, but heavy use may get rate-limited
- **How to use**: `pip install edge-tts` then `edge-tts --text "Your text here" --write-media output.mp3`
- **Languages**: 300+ voices across dozens of languages
- **Features**: Control rate, volume, pitch. Outputs MP3 + SRT/VTT subtitle files
- **OpenAI-compatible wrapper**: github.com/travisvn/openai-edge-tts -- drop-in replacement for OpenAI TTS API

**Kokoro TTS (Open Source -- Apache 2.0)**
- **Cost**: Completely free, even for commercial use
- **Quality**: #1 on HuggingFace TTS Arena, beats models 5-15x its size
- **Speed**: 210x real-time on RTX 4090, 36x real-time on free Google Colab GPU
- **Size**: Only 82M parameters -- runs on consumer hardware
- **Voices**: 48 voices across 8 languages
- **Limitation**: No voice cloning
- **Try free**: Live demo at unrealspeech.com/studio or self-host via Docker (github.com/eduardolat/kokoro-web)

**Bark (by Suno AI)**
- **Cost**: Free, MIT license (full commercial use)
- **Quality**: Very expressive -- can generate laughter, sighing, crying, background noise, even simple music
- **Best for**: Emotional, expressive content (not just narration)
- **Limitation**: Slower than Edge TTS, requires decent GPU

**Coqui TTS / XTTS-v2**
- **Status**: Coqui the COMPANY shut down in 2024, but the open-source code lives on
- **Community fork**: Actively maintained, latest release January 2026 on PyPI (`pip install coqui-tts`)
- **XTTS-v2**: Zero-shot voice cloning from 6 seconds of audio -- free and open source
- **License**: Coqui Public Model License (non-commercial for XTTS-v2 specifically). Other Coqui models have more permissive licenses

**Other Free Options:**

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Google Cloud TTS | 4M chars/mo (Standard), 1M chars/mo (WaveNet) | Ongoing free tier, not trial |
| Amazon Polly | 5M chars/mo (Standard), 1M chars/mo (Neural) | First 12 months only |
| OpenAI TTS | $5 initial credit (no card needed) | ~333K characters, expires in 3 months |
| ElevenLabs | ~10,000 credits/mo (~20 min audio) | Non-commercial only, watermarked, no voice cloning |

**Verdict**: Edge TTS + Kokoro TTS together cover 99% of needs for $0. Edge TTS for quick narration, Kokoro for highest quality.

### CapCut -- Is It Fully Free?

**YES, CapCut is overwhelmingly free** and is the single most powerful free tool for indie app makers:
- Auto captions (free)
- AI avatars (free)
- Text-to-speech (free)
- Script-to-video (free)
- 1080p export (free, NO watermark)
- AI auto-editor, transitions, effects (free)
- Stock footage, music, templates (free)
- **Pro features** (4K, full asset library, advanced AI): Paid

CapCut can auto-generate complete TikTok/Reels/Shorts videos from a script. This alone replaces Billo ($100/video).

### Free Screen Recording for App Demos

| Tool | Platform | Limits |
|------|----------|--------|
| **Built-in iOS Screen Recording** | iPhone/iPad | Free, no watermark, unlimited |
| **QuickTime Player** | Mac (record iPhone via USB) | Free, no watermark, unlimited |
| **Built-in Android Screen Recorder** | Android | Free, no watermark |
| **OBS Studio** | Mac/Windows/Linux | Free, open source, no watermark, no time limit, pro-grade |
| **Loom** | Browser/Desktop | Free plan: 5-min cap, 25 videos |

**Best workflow**: Record your app with QuickTime (iPhone via USB for crisp quality) -> Edit in CapCut -> Add AI voiceover with Edge TTS -> Post.

### Free UGC-Style Video Creation Workflow (Completely $0)

1. **Script**: ChatGPT / Claude (free tiers)
2. **AI voiceover**: Edge TTS or Kokoro TTS (free)
3. **AI avatar video**: HeyGen free tier (3 videos/month) OR record yourself on iPhone
4. **Screen recording**: QuickTime + iPhone (free)
5. **Editing**: CapCut (free, no watermark at 1080p)
6. **Captions**: CapCut auto-captions (free)
7. **Music**: CapCut royalty-free library (free)
8. **Posting**: Direct from CapCut or Buffer free tier

### Free UGC Creator Platforms

Most legitimate UGC platforms now pay creators (no "exposure only" deals). However, you can:
- Offer **affiliate deals** to micro-creators (they earn % of sales from their referral link)
- Post on **r/UGCcreators** subreddit offering product + affiliate commission
- Use **Creator.co** where some opportunities are content-only (no posting required)
- Build relationships on **TikTok creator marketplace** (free to join as a brand)

---

## 4. Paid Ad Credits (Free Money)

### Current Free Ad Credit Offers (as of February 2026)

| Platform | Credit Amount | Requirements | Expiration |
|----------|--------------|--------------|------------|
| **Apple Search Ads** | $100 | New account, add credit card | Use it or lose it |
| **TikTok** | $100 credit when you spend $50 | New advertiser, spend within 30 days | ~May 2026 |
| **TikTok (higher tiers)** | Up to $6,000 back | Spend $200-$10,000 within 30 days | Varies |
| **Google Ads** | Up to $1,500 | Spend $3,000 in first 60 days | Region-dependent |
| **Google Ads (lower tier)** | $550 | Spend $1,000 in first 60 days | Region-dependent |
| **Snapchat** | $75 credit | Spend $50 within 14 days | 30 days from issuance |
| **Snapchat (higher)** | $375 credit | Spend $350 within 14 days | 30 days from issuance |
| **Pinterest** | $100 credit | Install Shopify app + launch first campaign | Has expiration |
| **Pinterest (promo)** | $60 credit | Spend $15 on ads | Periodic offers |
| **X (Twitter) Premium Business** | $1,000/month or $12,000/year | Requires Premium Business subscription ($200+/mo) | Limited period |
| **X (Twitter) Basic Business** | $200/month or $2,500/year | Requires Premium Business Basic subscription | Limited period |
| **Meta/Facebook** | NONE currently | No free credit program as of 2026 | N/A |

### Maximum Free Ad Spend Strategy

If you time everything right and start fresh accounts:
- Apple: $100 (free, just add card)
- TikTok: $100 (costs $50 to unlock)
- Snapchat: $75 (costs $50 to unlock)
- **Total free credits**: $275 for a $100 investment
- Google Ads credits require significant upfront spend, so skip unless you have budget

**Meta/Facebook has NO free credits** -- this is the most expensive platform to start on with zero budget. Focus organic efforts here instead.

---

## 5. Auto-Posting / Social Media Scheduling

### Free Tier Comparison

| Tool | Free Channels | Free Posts | Platforms Supported |
|------|---------------|------------|---------------------|
| **Buffer** | 3 channels | 10 posts per channel (30 total queued) | FB, IG, TikTok, LinkedIn, Threads, Bluesky, YT Shorts, Pinterest, Google Business, Mastodon, X |
| **Later** | 1 profile per platform | 30 posts/profile/month | IG, FB, TikTok, Pinterest, LinkedIn, X (Reels/Shorts may need paid) |
| **Pallyy** | 1 social set | 15 posts/month | IG, FB, TikTok, LinkedIn, X, Google Business |
| **Publer** | 3 profiles | 10 posts queued per profile | Most major platforms |
| **Crowdfire** | 3 accounts | 10 posts per account | Major platforms + content curation |
| **Short AI** | 3 channels | 3 posts/channel/day (10 total/day) | Major platforms |

**Best free option**: Buffer (3 channels, 30 queued posts, supports TikTok + IG Reels + YT Shorts).

### Open-Source Self-Hosted Alternatives (Completely Free)

**Postiz** (github.com/gitroomhq/postiz-app)
- Fully open source, self-host on any VPS
- Supports: Facebook, Instagram, TikTok, YouTube, Reddit, LinkedIn, Threads, Pinterest
- No difference between hosted and self-hosted versions
- API support for n8n, Make.com, Zapier integration
- **Cost**: $0 if self-hosted (need a VPS, but see Cloudflare/Oracle free tiers below)

**Mixpost Lite** (github.com/inovector/mixpost)
- Open source, self-hosted via Docker
- Supports: Facebook Pages, Instagram, X, LinkedIn, YouTube, TikTok, Pinterest, Threads, Bluesky, Google Business, Mastodon
- Lite version is completely free on GitHub
- **Cost**: $0 self-hosted

### Can You Use Platform APIs Directly?

- **TikTok Content Posting API**: Available but requires approved TikTok developer app (takes weeks for approval, business account required)
- **Instagram Graph API**: Can publish content programmatically, requires Facebook developer app approval
- **YouTube Data API**: Free tier includes upload capability with quota limits
- **All are technically free** but require developer account setup and API approval -- not trivial

---

## 6. Comment Management / Chatbots

### ManyChat Free Tier -- Real Limits

- **Cost**: $0/month
- **Contacts**: Up to 1,000
- **Keywords**: Only 3 custom keywords (this is the major limitation)
- **Automation triggers**: 4 non-keyword triggers
- **Sequences**: 2 message sequences
- **Tags**: 10 tags
- **Team members**: 1
- **Channels**: Instagram, Facebook Messenger, Telegram only (NO WhatsApp, SMS, or email)
- **Branding**: ManyChat branding on all customer-facing elements
- **Gotcha**: Even deleted/unsubscribed contacts count toward 1,000 limit. If you exceed 1,000 contacts OR the trigger limits, ManyChat blocks message sending

**Verdict**: The 3-keyword limit is brutal. For a "Comment INFO to get the link" strategy, you can only have 3 such trigger words on the free plan.

### Free Alternatives

| Tool | Free Tier | Best For |
|------|-----------|----------|
| **Chatfuel** | Free plan for Messenger + IG | No-code chatbot builder, simpler than ManyChat |
| **Chatbase** | Free tier | AI-trained agent that learns your business data |
| **Jotform Instagram Agent** | Free tier | DM triggers, post comments, story replies |
| **UChat** | Free tier | Multi-channel, drag-and-drop builder |
| **Tidio** | Free plan (50 conversations/mo) | Website + IG chat |

### Building Your Own Auto-Reply Bot (Free)

**For Instagram**:
- Use Make.com (free tier: 1,000 operations/month) + Instagram Graph API
- Workflow: Monitor comments -> Detect keyword -> Send DM via API
- Free tutorials available on the Make.com community

**For TikTok**:
- TikTok API only supports Business accounts for DM automation
- Chatbot Builder AI supports TikTok for Pro accounts (not free)
- **Hacky workaround**: Use TikTok's built-in auto-reply feature in Business Suite (limited but free)

**Open Source Options**:
- GitHub has various `auto-reply-bot` projects
- Most are simple Node.js tools that can be adapted
- Self-host on free tier of Railway, Render, or Cloudflare Workers

---

## 7. AI Voice Generation -- Complete Comparison

### Ranked by Quality (Free Options Only)

| Rank | Tool | Quality | Speed | Free Limit | Commercial Use? |
|------|------|---------|-------|------------|-----------------|
| 1 | **Kokoro TTS** | Best in class (HF Arena #1) | Very fast | Unlimited (self-hosted) | Yes (Apache 2.0) |
| 2 | **Edge TTS** | Excellent neural voices | Instant | Effectively unlimited | Gray area (uses MS service) |
| 3 | **Bark** (Suno) | Most expressive (laughs, emotions) | Slow | Unlimited (self-hosted) | Yes (MIT license) |
| 4 | **Google Cloud TTS** | Very good (WaveNet) | Fast | 1M WaveNet chars/mo | Yes |
| 5 | **Amazon Polly** | Good (Neural voices) | Fast | 1M Neural chars/mo (12 mo) | Yes |
| 6 | **XTTS-v2** (Coqui fork) | Great + voice cloning | Medium | Unlimited (self-hosted) | Non-commercial only |
| 7 | **Fish Speech V1.5** | Top multilingual quality | Fast | Unlimited (self-hosted) | Check license |
| 8 | **ElevenLabs** | Excellent | Fast | ~10K credits/mo (~20 min) | Non-commercial only on free |

### What's the Absolute Best FREE TTS That Sounds Human?

**For narration/voiceover**: Kokoro TTS. Period. It won #1 on the HuggingFace TTS Arena beating models 15x its size, runs on a free Google Colab notebook, and is Apache 2.0 licensed for commercial use.

**For quick generation with zero setup**: Edge TTS. Install with `pip install edge-tts`, one command, instant high-quality output. 300+ voices.

**For emotional/expressive content**: Bark. It naturally generates laughter, gasps, sighs, and emotional inflections that other models cannot.

**For voice cloning**: XTTS-v2 (Coqui community fork). Clone any voice from a 6-second sample. Non-commercial license though.

---

## 8. Paywall / Subscription Management

### Free Tier Comparison

| Service | Free Until | After Free Tier | Best For |
|---------|-----------|-----------------|----------|
| **Superwall** | $10K Monthly Attributed Revenue | 1% of MAR | Most generous -- paywalls, campaigns, A/B testing all free |
| **Adapty** | $10K monthly revenue | 1% (min $99/mo) | Paywall builder + analytics |
| **Qonversion** | $10K Monthly Tracked Revenue | 0.6% of revenue | Lowest post-free-tier rate |
| **RevenueCat** | $2,500 Monthly Tracked Revenue | 1% of revenue | Largest community, best docs |

**Verdict**: Superwall is the winner for $0 startups -- $10K free threshold AND includes remote paywall configuration + A/B testing. RevenueCat's $2,500 limit means you'd start paying earlier.

### Can You Skip ALL Third-Party Services? (StoreKit 2 Direct)

**YES.** StoreKit 2 is fully capable for indie apps:

- Modern Swift async/await APIs
- Built-in receipt validation (no server needed)
- SwiftUI views: `SubscriptionStoreView`, `ProductView`, `StoreView` for instant paywall UI
- Local testing with StoreKit Configuration Files in Xcode
- Transaction verification built in
- Works with subscriptions, consumables, and non-consumables

**What you lose without RevenueCat/Superwall**:
- No cross-platform subscription syncing (iOS-only is fine)
- No server-side receipt validation (StoreKit 2 handles this locally)
- No remote paywall A/B testing (you'd need to hardcode paywalls)
- No analytics dashboard (use your own analytics)
- No webhooks for server events

**For a simple app with one subscription tier**: StoreKit 2 alone is 100% sufficient. Zero cost.

**For paywall A/B testing and optimization**: Use Superwall's free tier (free up to $10K MAR).

---

## 9. Backend Infrastructure

### Do You Even Need a Backend?

**For a simple counter/streak/habit app: NO.**

You can go 100% local with free iCloud sync:

| Storage Method | Use Case | Sync? |
|---------------|----------|-------|
| **UserDefaults** | Small key-value data (settings, preferences, streaks) | Use NSUbiquitousKeyValueStore for iCloud sync |
| **SwiftData / Core Data** | Complex data models, relationships | Use NSPersistentCloudKitContainer for automatic iCloud sync |
| **CloudKit directly** | Custom cloud storage | Free with Apple Developer account |

**CloudKit is Apple's free backend**:
- Included with your $99/year Apple Developer membership
- Automatic sync across all user devices
- No server to manage
- Generous free limits for indie apps
- Apple handles authentication via Sign in with Apple

### When You DO Need a Backend

If you need: user accounts beyond Apple ID, shared/social features, server-side logic, or web dashboard access.

### Supabase Free Tier (Real Limits)

- **Database**: 500MB PostgreSQL storage
- **Auth**: 50,000 monthly active users
- **Storage**: 1GB file storage
- **Edge Functions**: 500,000 invocations/month
- **Realtime**: 200 concurrent connections
- **Projects**: 2 active projects
- **Gotcha**: Free projects are PAUSED after 1 week of inactivity. You must log into the dashboard periodically or set up a keep-alive ping
- **Verdict**: Extremely generous for an indie app. 500MB database + 50K MAUs covers most apps well into profitability

### Firebase Spark Plan (Real Limits)

- **Firestore**: 1GB storage, 50K reads/day, 20K writes/day, 20K deletes/day
- **Realtime Database**: 1GB storage, 10GB download/month
- **Authentication**: 50K MAUs (email/social), 10K phone verifications/month
- **Hosting**: 1GB storage, 10GB transfer/month
- **Cloud Functions**: NOT available on Spark plan (requires Blaze/pay-as-you-go)
- **Analytics**: Free and unlimited
- **Crashlytics**: Free and unlimited
- **Verdict**: Good for simpler apps, but the daily read/write limits can be restrictive. Supabase is generally more generous

### Cloudflare Workers Free Tier

- **Requests**: 100,000/day
- **Workers**: Up to 100
- **KV Storage**: 1GB total, 100K reads/day, 1K writes/day
- **Worker size**: Up to 3MB
- **Verdict**: Excellent for lightweight API endpoints, webhooks, and edge logic

### Free Backend Comparison (Sorted by Generosity)

| Service | Storage | MAUs | Best For |
|---------|---------|------|----------|
| **CloudKit** (Apple) | 10GB assets, generous DB | Unlimited (your users) | iOS-only apps with iCloud sync |
| **Supabase** | 500MB DB + 1GB files | 50K | Full-featured backend with Postgres |
| **Firebase** | 1GB Firestore | 50K | Analytics + auth + simple data |
| **Cloudflare Workers** | 1GB KV | N/A (100K req/day) | Lightweight APIs and edge logic |
| **PocketBase** | Self-hosted (unlimited) | Unlimited | Open source, single binary, self-host on free VPS |

---

## 10. App Development & Distribution

### Expo / React Native -- Fully Free?

**YES.** Expo and React Native are fully free and open source (MIT license). You can build complete production apps without paying Expo anything.

- Expo CLI, SDK, and development tools: Free
- Local builds: Free (using your own machine)
- EAS Build free tier: Limited quantity of low-priority builds per month
- EAS Update: Free updates included

**Free Alternative to EAS Build**: Use GitHub Actions to build your React Native/Expo apps. The repo `github.com/TanayK07/expo-react-native-cicd` provides a complete CI/CD pipeline that saves $100s/month vs paid EAS plans.

### The $99/Year Apple Developer Fee -- Any Way Around It?

**To distribute on the App Store: NO. The $99/year is mandatory.** There is no workaround.

However:
- **Fee waiver program**: If you are a nonprofit organization, accredited educational institution, or government entity, you can request a fee waiver
- **Free without distribution**: You can develop, test on devices, and learn for free with just an Apple Account. You get Xcode, documentation, sample code, forums, and on-device testing. You just cannot submit to the App Store
- **Alternative distribution (EU only)**: Under DMA regulations, EU developers can distribute through alternative marketplaces, but this doesn't eliminate developer program requirements

**Bottom line**: Budget $99/year as a hard cost. This is the ONE cost you cannot eliminate.

### Google Play $25 -- Any Way Around It?

- **One-time $25 fee** (not annual like Apple)
- **No known waiver** for individuals
- **Coming in 2026**: Google is introducing a "limited distribution" option with NO registration fee, designed for students and hobbyists. However, this will have distribution limits
- **Bottom line**: $25 once is much cheaper than Apple's $99/year. Pay it

### Free CI/CD for Mobile Apps

| Service | Free Tier | Notes |
|---------|-----------|-------|
| **GitHub Actions** | 2,000 min/mo (private repos), unlimited (public repos) | macOS runners cost 10x Linux minutes |
| **GitHub Actions (public repo)** | Unlimited | Best option -- make your repo public if possible |
| **Expo EAS Build** | Limited free builds (low priority) | Queue times can be long |
| **Codemagic** | 500 build min/mo (macOS) | Good for iOS builds specifically |
| **Bitrise** | Free for open source | Community plan available |

**Best free CI/CD strategy**: Keep your repo public on GitHub -> unlimited Actions minutes -> use the expo-react-native-cicd GitHub Action for builds.

**For native iOS (Swift)**: GitHub Actions with macOS runners. On the free tier you get ~200 minutes of macOS time per month (2,000 Linux minutes / 10x multiplier). One iOS build takes ~15-20 minutes, so you get ~10-13 builds per month free.

---

## 11. Design & Assets

### Free App Icon Generators

| Tool | Features |
|------|----------|
| **AppIcon.co** | Upload image, generates all required sizes for iOS + Android |
| **IconKitchen** | Generates icons for Android, iOS, and web instantly |
| **Venngage AI** | AI-powered icon generation following Apple design guidelines |
| **VisualKit** | AI icon creation in all required sizes |
| **MakeAppIcon** | Drag-and-drop, outputs all sizes |
| **Figma** | Design your own with free tier (3 files) |

### Free App Store Screenshot Generators

| Tool | Features |
|------|----------|
| **AppMockUp Studio** (app-mockup.com) | Best free screenshot creator -- device frames, text, backgrounds |
| **AppLaunchpad** (theapplaunchpad.com) | Free preview screen builder for App Store + Google Play |
| **Hotpot.ai** | Free App Store screenshot generator |
| **OrShot** | Bulk generate from templates, add text/emojis |
| **AppScreens** | Professional screenshots, 100K+ developers use it |
| **Screenshots Pro** (by Pika) | Simple and effective |

### Free Design Tools

| Tool | Free Tier |
|------|-----------|
| **Figma** | 3 design files, 3 FigJam files, 2 editors, unlimited viewers, plugins, community files |
| **Canva** | Extensive free plan -- templates, basic stock photos, landing pages, social media posts |
| **Photopea** | Free Photoshop alternative in browser -- no limits |
| **GIMP** | Free open-source Photoshop alternative (desktop) |
| **Excalidraw** | Free whiteboarding/wireframing |

### Free Stock Photos/Videos/Music

| Resource | License |
|----------|---------|
| **Unsplash** | Free, no attribution required, commercial use OK |
| **Pexels** | Free, no attribution required, commercial use OK |
| **Pixabay** | Free, commercial use OK |
| **CapCut built-in library** | Royalty-free music and stock footage |
| **Mixkit** | Free stock video clips, music, sound effects |
| **Free Music Archive** | Free music under Creative Commons |
| **Icons8** | Free icons, photos, illustrations (with attribution on free plan) |

---

## 12. Analytics & Crash Reporting

### Free Analytics Comparison

| Tool | Free Tier | Best For |
|------|-----------|----------|
| **Firebase Analytics** (Google Analytics for Firebase) | Completely free, unlimited events | Most apps -- deep integration with Firebase ecosystem |
| **PostHog** | 1M events/mo, 2,500 session replays, unlimited users/seats | Product analytics, funnels, feature flags |
| **Mixpanel** | 1M events/mo (with Growth plan + credit card), 5 saved reports, 10K session replays | Advanced product analytics |
| **TelemetryDeck** | 100K signals/mo (~3,300 MAUs) | Privacy-focused, Swift-native, EU-based |
| **Aptabase** | 20K events/month | Privacy-first, open source, simple |
| **Plausible** | Self-hosted (free), hosted ($9/mo) | Website analytics (not app-specific) |
| **Amplitude** | Free plan available | Product analytics |

**Best free stack**: Firebase Analytics (unlimited events) + PostHog (funnels, feature flags, session replays).

### Free Crash Reporting

**Firebase Crashlytics**: Completely free. No usage limits documented. No cost whatsoever. This is the industry standard and there is no reason to pay for crash reporting.

Also free:
- **Sentry** free tier: 5K errors/month
- **Bugsnag** free tier: Available for small projects

---

## 13. Domain & Web Presence

### Free Landing Page Builders

| Tool | Free Tier | Best For |
|------|-----------|----------|
| **Carrd** | 3 sites, most features available, carrd.co subdomain | Single-page app landing pages (BEST for app marketing) |
| **GitHub Pages** | Unlimited sites, 1GB storage, 100GB bandwidth/mo, custom domains | Developer portfolio + app pages |
| **Cloudflare Pages** | Unlimited bandwidth, unlimited sites, global CDN | Static sites with best performance |
| **Netlify** | 100GB bandwidth, 300 build min/mo | Git-based deployment |
| **Vercel** | Generous free tier, instant deployments | React/Next.js landing pages |
| **Wix** | Free plan with Wix subdomain, 110+ templates, AI builder | Non-technical users |
| **HubSpot CMS** | 30 free landing pages | If you want CRM integration |
| **MailerLite** | 10 landing pages on subdomain | Email marketing + landing pages |
| **Canva** | Free landing page builder | Quick and easy design |

### Free Domains / Subdomains

- **GitHub Pages**: yourapp.github.io (free, supports custom domains)
- **Cloudflare Pages**: yourapp.pages.dev (free)
- **Netlify**: yourapp.netlify.app (free)
- **Vercel**: yourapp.vercel.app (free)
- **Carrd**: yourapp.carrd.co (free)
- **Freenom alternatives**: Most free domain services (.tk, .ml) have become unreliable. Better to use a subdomain
- **.dev domain**: ~$12/year from Google Domains / Cloudflare Registrar (cheapest TLD that looks professional)

### Best Free Web Presence Strategy

1. Build landing page on **Carrd** (free, looks professional, fast)
2. Host your privacy policy and terms on **GitHub Pages** (free)
3. Use your App Store listing as your primary "website" (link directly to it)
4. If you want a custom domain later, buy a .dev or .app domain (~$12/year) and point to Carrd or GitHub Pages

---

## 14. Total Minimum Cost Summary

### Absolute Minimum to Launch (iOS Only)

| Item | Cost | Notes |
|------|------|-------|
| Apple Developer Program | $99/year | **Cannot be avoided** |
| Development tools (Xcode, Swift) | $0 | Free |
| Backend (CloudKit / local storage) | $0 | Included with dev account |
| Analytics (Firebase) | $0 | Free forever |
| Crash reporting (Crashlytics) | $0 | Free forever |
| Paywall (StoreKit 2 direct) | $0 | Built into iOS |
| ASO tools (APPlyzer + manual) | $0 | Free tools + manual research |
| Ad credits (Apple Search Ads) | $0 | $100 free credit |
| Voice generation (Edge TTS / Kokoro) | $0 | Free / open source |
| Video creation (CapCut + iPhone) | $0 | Free, no watermark |
| Design (Figma + Canva) | $0 | Free tiers |
| Screenshots (AppMockUp) | $0 | Free |
| Landing page (Carrd / GitHub Pages) | $0 | Free |
| Social scheduling (Buffer) | $0 | 3 channels, 30 posts |
| Comment management (ManyChat) | $0 | 1,000 contacts, 3 keywords |
| **TOTAL** | **$99/year** | Everything else is genuinely free |

### Adding Google Play

| Item | Cost | Notes |
|------|------|-------|
| Google Play Console | $25 (one-time) | Cannot be avoided |
| **TOTAL with both platforms** | **$124 first year, $99/year after** | |

### Unlocking More Ad Credits (Optional)

| Investment | Return | ROI |
|------------|--------|-----|
| $50 on TikTok Ads | $100 credit ($50 profit) | 2x |
| $50 on Snapchat | $75 credit ($25 profit) | 1.5x |
| **$100 total** | **$175 in ad credits** | **1.75x** |

### The Complete $0-Adjacent Stack

```
Development:     Xcode + Swift + SwiftUI (free)
                 OR Expo + React Native (free)
Backend:         CloudKit (free) or Supabase (free tier)
Auth:            Sign in with Apple (free) or Firebase Auth (free)
Database:        SwiftData + iCloud sync (free) or Supabase Postgres (free)
Analytics:       Firebase Analytics (free) + PostHog (free)
Crash Reports:   Firebase Crashlytics (free)
Paywall:         StoreKit 2 (free) or Superwall (free to $10K MAR)
Subscriptions:   StoreKit 2 (free) or RevenueCat (free to $2.5K MTR)
ASO:             APPlyzer (free) + manual keyword research
Ads:             Apple Search Ads ($100 free credit)
Voice/TTS:       Edge TTS + Kokoro TTS (free)
Video:           CapCut (free) + iPhone recording
AI Avatars:      HeyGen (3 free/mo) or DIY
Design:          Figma (free) + Canva (free)
Screenshots:     AppMockUp Studio (free)
Icons:           AppIcon.co or IconKitchen (free)
Stock Assets:    Unsplash + Pexels (free)
Landing Page:    Carrd (free) or GitHub Pages (free)
Scheduling:      Buffer (free, 3 channels)
Chat/DMs:        ManyChat (free, 1K contacts)
CI/CD:           GitHub Actions (free for public repos)
Hosting:         Cloudflare Pages (free) or Netlify (free)
```

**Only unavoidable costs: $99/year (Apple) + $25 one-time (Google) = $124 to launch on both platforms.**

Everything else -- from development to marketing to analytics to video production -- can be done for $0 with the tools listed in this guide.
