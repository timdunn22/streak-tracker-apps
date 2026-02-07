#!/usr/bin/env node

// Generates copy-paste-ready submission text for all 10 apps
// Run: node directory-submissions.js
// Output: directory-submissions.md (one section per app with all fields pre-filled)

const fs = require('fs')

const apps = [
  {
    id: 'rewire',
    name: 'Rewire',
    tagline: 'Break free. Rewire your brain.',
    shortDesc: 'Free private streak tracker for quitting porn and rewiring your brain.',
    longDesc: 'Rewire is a free, private streak tracker designed to help you quit porn and rewire your brain. Track your streak, view your progress through recovery phases, celebrate milestones, and share your journey — all without creating an account. Your data stays on your device. Built as a progressive web app that works offline and installs like a native app on any device.',
    category: 'Health & Wellness',
    tags: ['nofap', 'quit porn', 'streak tracker', 'habit tracker', 'brain health', 'addiction recovery', 'self-improvement'],
    appUrl: 'https://rewire-psi.vercel.app',
    landingUrl: 'https://rewire-landing.vercel.app',
    competitors: ['Fortify', 'Brainbuddy', 'Reboot'],
    niche: 'NoFap / Quit Porn',
  },
  {
    id: 'vapefree',
    name: 'VapeFree',
    tagline: 'Ditch the vape. Reclaim your lungs.',
    shortDesc: 'Free private streak tracker for quitting vaping. No account needed.',
    longDesc: 'VapeFree is a free, private streak tracker that helps you quit vaping for good. Track your vape-free days, see your lung health improving through recovery phases, hit milestones, and share your progress — all without creating an account. Your data never leaves your device. Works offline as a progressive web app that installs on any phone or computer.',
    category: 'Health & Wellness',
    tags: ['quit vaping', 'vape free', 'nicotine', 'streak tracker', 'quit smoking', 'lung health', 'addiction recovery'],
    appUrl: 'https://vapefree-app.vercel.app',
    landingUrl: 'https://vapefree-landing.vercel.app',
    competitors: ['Quit Vaping - QuitSure', 'Smoke Free', 'QuitNow'],
    niche: 'Quit Vaping',
  },
  {
    id: 'fasttrack',
    name: 'FastTrack',
    tagline: 'Master your fasting. Transform your body.',
    shortDesc: 'Free private intermittent fasting streak tracker. No account needed.',
    longDesc: 'FastTrack is a free intermittent fasting streak tracker that helps you build a consistent fasting habit. Track your fasting days, see your body adapt through metabolic phases, celebrate milestones like autophagy activation, and share your progress — all without creating an account. Your data stays private on your device. Works offline as a progressive web app.',
    category: 'Health & Fitness',
    tags: ['intermittent fasting', 'fasting tracker', 'streak tracker', 'weight loss', 'autophagy', 'metabolism', 'health'],
    appUrl: 'https://fasttrack-app-three.vercel.app',
    landingUrl: 'https://fasttrack-landing.vercel.app',
    competitors: ['Zero', 'Fastic', 'LIFE Fasting'],
    niche: 'Intermittent Fasting',
  },
  {
    id: 'greenday',
    name: 'GreenDay',
    tagline: 'Clear your mind. Live sharper.',
    shortDesc: 'Free private streak tracker for quitting weed. No account needed.',
    longDesc: 'GreenDay is a free, private streak tracker for quitting marijuana. Track your sober days, watch mental clarity return through recovery phases, celebrate milestones, and share your journey — all without signing up. Your data stays on your device, never uploaded anywhere. Works offline as a progressive web app that installs on any device.',
    category: 'Health & Wellness',
    tags: ['quit weed', 'quit marijuana', 'sober', 'streak tracker', 'mental clarity', 'addiction recovery', 'THC detox'],
    appUrl: 'https://greenday-app.vercel.app',
    landingUrl: 'https://greenday-landing.vercel.app',
    competitors: ['Grounded', 'Sober Time', 'I Am Sober'],
    niche: 'Quit Weed / Marijuana',
  },
  {
    id: 'sugarfree',
    name: 'SugarFree',
    tagline: 'Break the sugar cycle. Feel alive.',
    shortDesc: 'Free private streak tracker for quitting sugar. No account needed.',
    longDesc: 'SugarFree is a free, private streak tracker that helps you break your sugar addiction. Track your sugar-free days, see your body heal through recovery phases, celebrate milestones as your taste buds reset, and share your progress — all without creating an account. Your data stays private on your device. Installs as a progressive web app on any device.',
    category: 'Health & Fitness',
    tags: ['quit sugar', 'sugar free', 'no sugar', 'streak tracker', 'healthy eating', 'diet tracker', 'nutrition'],
    appUrl: 'https://sugarfree-app.vercel.app',
    landingUrl: 'https://sugarfree-landing.vercel.app',
    competitors: ['Sugar Free Counter', 'MyFitnessPal', 'Noom'],
    niche: 'Quit Sugar',
  },
  {
    id: 'decaf',
    name: 'Decaf',
    tagline: 'Find your natural energy.',
    shortDesc: 'Free private streak tracker for quitting caffeine. No account needed.',
    longDesc: 'Decaf is a free, private streak tracker for quitting caffeine. Track your caffeine-free days, see your natural energy return through recovery phases, celebrate milestones as your sleep improves, and share your progress — all without creating an account. Your data stays on your device. Works offline as a progressive web app that installs on any phone or computer.',
    category: 'Health & Wellness',
    tags: ['quit caffeine', 'quit coffee', 'decaf', 'streak tracker', 'sleep improvement', 'natural energy', 'wellness'],
    appUrl: 'https://decaf-app-black.vercel.app',
    landingUrl: 'https://decaf-landing.vercel.app',
    competitors: ['HabitBull', 'Streaks', 'Done'],
    niche: 'Quit Caffeine',
  },
  {
    id: 'primal',
    name: 'Primal',
    tagline: 'Optimize your testosterone. Naturally.',
    shortDesc: 'Free private streak tracker for testosterone-boosting habits. No account needed.',
    longDesc: 'Primal is a free, private streak tracker for building testosterone-optimizing habits. Track your daily consistency with sleep, exercise, nutrition, and cold exposure. See your progress through optimization phases, celebrate milestones, and share your gains — all without creating an account. Your data stays on your device. Installs as a progressive web app.',
    category: 'Health & Fitness',
    tags: ['testosterone', 'mens health', 'hormone optimization', 'streak tracker', 'fitness', 'cold exposure', 'biohacking'],
    appUrl: 'https://primal-app.vercel.app',
    landingUrl: 'https://primal-landing.vercel.app',
    competitors: ['Bro', 'Whoop', 'Flo (for men)'],
    niche: 'Testosterone Optimization',
  },
  {
    id: 'iceplunge',
    name: 'IcePlunge',
    tagline: 'Embrace the cold. Build resilience.',
    shortDesc: 'Free private streak tracker for cold plunge and cold exposure habits. No account needed.',
    longDesc: 'IcePlunge is a free, private streak tracker for building a consistent cold plunge and cold exposure habit. Track your daily cold exposure, see your body adapt through phases from Shocking to Unbreakable, celebrate milestones, and share your journey — all without creating an account. Your data stays on your device. Works offline as a progressive web app.',
    category: 'Health & Fitness',
    tags: ['cold plunge', 'ice bath', 'cold exposure', 'wim hof', 'streak tracker', 'biohacking', 'resilience'],
    appUrl: 'https://iceplunge-app.vercel.app',
    landingUrl: 'https://iceplunge-landing.vercel.app',
    competitors: ['Plunge', 'Wim Hof Method', 'Cold Shower Therapy'],
    niche: 'Cold Plunge / Cold Exposure',
  },
  {
    id: 'sober',
    name: 'Sober',
    tagline: 'Choose clarity. Every single day.',
    shortDesc: 'Free private sobriety tracker for quitting alcohol. No account needed.',
    longDesc: 'Sober is a free, private sobriety tracker that helps you quit drinking. Track your sober days, watch your body heal through recovery phases, celebrate milestones as your liver and brain recover, and share your progress — all without creating an account. Your data never leaves your device. Works offline as a progressive web app that installs on any device.',
    category: 'Health & Wellness',
    tags: ['quit drinking', 'sobriety', 'sober', 'alcohol free', 'streak tracker', 'addiction recovery', 'dry january'],
    appUrl: 'https://sober-app-theta.vercel.app',
    landingUrl: 'https://sober-landing.vercel.app',
    competitors: ['I Am Sober', 'Sober Time', 'Nomo'],
    niche: 'Quit Drinking / Sobriety',
  },
  {
    id: 'clearlungs',
    name: 'ClearLungs',
    tagline: 'Quit smoking. Breathe free.',
    shortDesc: 'Free private streak tracker for quitting smoking. No account needed.',
    longDesc: 'ClearLungs is a free, private streak tracker that helps you quit smoking for good. Track your smoke-free days, see your lungs heal through recovery phases, celebrate milestones as your body repairs itself, and share your progress — all without creating an account. Your data stays on your device. Works offline as a progressive web app.',
    category: 'Health & Wellness',
    tags: ['quit smoking', 'smoke free', 'nicotine', 'streak tracker', 'lung health', 'addiction recovery', 'cigarettes'],
    appUrl: 'https://clearlungs-app.vercel.app',
    landingUrl: 'https://clearlungs-landing.vercel.app',
    competitors: ['Smoke Free', 'QuitNow', 'Kwit'],
    niche: 'Quit Smoking',
  },
]

const features = [
  'Track your streak with a live day counter',
  'Recovery phases that show your body healing',
  'Milestone celebrations with haptic feedback',
  'Daily motivational quotes',
  'Weekly progress recaps',
  'Shareable progress cards (1080x1350, perfect for TikTok/Instagram)',
  'Statistics and streak history',
  'Works offline — no internet needed',
  'No account required — 100% private',
  'Installs like a native app on any device (PWA)',
  'Free forever — no ads, no subscriptions',
]

let md = `# Directory Submission Kit — All 10 Apps
Generated: ${new Date().toISOString().split('T')[0]}

Use this document to copy-paste into directory submission forms.
Each app has all fields pre-filled for the most common form fields.

---

## Quick Reference

| App | App URL | Landing URL |
|-----|---------|-------------|
${apps.map(a => `| ${a.name} | ${a.appUrl} | ${a.landingUrl} |`).join('\n')}

---

## Common Fields (same for all apps)

- **Pricing:** Free
- **Pricing Model:** Free (no paid plans)
- **Platform:** Web (PWA — Progressive Web App)
- **Supported Platforms:** iOS, Android, Windows, Mac, Linux (any browser)
- **Company/Developer:** Independent Developer
- **Open Source:** No
- **Features (universal):**
${features.map(f => `  - ${f}`).join('\n')}

---

`

for (const app of apps) {
  md += `## ${app.name}

### Basic Info
- **Product Name:** ${app.name}
- **Tagline:** ${app.tagline}
- **Short Description (under 80 chars):** ${app.shortDesc}
- **Category:** ${app.category}
- **Tags/Keywords:** ${app.tags.join(', ')}

### URLs
- **Website / Product URL:** ${app.landingUrl}
- **App URL (direct link):** ${app.appUrl}

### Descriptions

**One-liner (for social/directories):**
${app.name} — ${app.tagline} Free, private, no account needed. ${app.appUrl}

**Short description (100-200 chars):**
${app.shortDesc}

**Full description (for directories that want detail):**
${app.longDesc}

### For "Alternatives To" Sites
- **Alternative to:** ${app.competitors.join(', ')}
- **What makes it different:** Completely free with no ads, no account required, 100% private (data stays on device), works offline, and installs as a native app on any phone or computer.

### For Product Hunt
- **Maker comment:**
Hey! I built ${app.name} because most ${app.niche.toLowerCase()} apps either require accounts, show ads, or lock features behind paywalls. ${app.name} is 100% free, works offline, and your data never leaves your device. It tracks your streak through science-backed recovery phases with milestone celebrations to keep you motivated. Would love your feedback!

### Social Media One-Liner
${app.name} — ${app.tagline} Free, private streak tracker. No account needed. ${app.appUrl}

---

`
}

md += `## Directory Submission Order (Recommended)

### Week 1: High-Impact Directories
1. **SaaSHub** (saashub.com/submit) — Submit all 10. Unlocks 110+ more directories.
2. **AlternativeTo** (alternativeto.net) — Submit all 10 as alternatives to competitors listed above.
3. **Capterra** (capterra.com/vendors/sign-up) — Free "Launch" plan. Auto-lists on GetApp + Software Advice too.

### Week 2: Product Launch Sites
4. **Product Hunt** — Launch 1 app (start with Rewire as the flagship).
5. **Uneed** (uneed.best) — Submit all 10.
6. **BetaList** (betalist.com) — Submit all 10 (free queue, be patient).
7. **MicroLaunch** (microlaunch.net) — Submit all 10.

### Week 3: Review & Tool Directories
8. **G2** (g2.com) — Create profiles for all 10.
9. **DevHunt** (devhunt.org) — Submit all 10.
10. **Fazier** (fazier.com) — Submit all 10.
11. **SideProjectors** (sideprojectors.com) — Submit all 10.
12. **BetaPage** (betapage.co) — Submit all 10.

### Week 4: PWA & Niche Directories
13. **Appscope** (appsco.pe/submit) — Submit all 10.
14. **findPWA** (findpwa.com) — Submit all 10.
15. **WebCatalog** (webcatalog.io/en/apps/submit) — Submit all 10.
16. **Slant** (slant.co) — Answer relevant questions with your apps.

### Ongoing: GitHub PRs
17. **awesome-pwa** — PR to add all 10 apps.
18. **awesome-mental-health** — PR for Rewire, Sober, GreenDay.
19. **awesome-quantified-self** — PR for FastTrack, IcePlunge, Primal.

### Ongoing: Product Hunt Launches
- Launch 1 app per week on Product Hunt for 10 weeks
- Best days: Tuesday, Wednesday, Thursday
- Best time: 12:01 AM PT (midnight)
- Each launch builds momentum for the next

---

**Total potential backlinks: 430+** (10 apps x 43 directories)
**Estimated time to submit all: 15-20 hours over 4 weeks**
**Expected SEO results: 2-8 weeks for first organic traffic**
`

fs.writeFileSync('/Users/timdunn/mobile_app_ideas/directory-submissions.md', md)
console.log('Generated: directory-submissions.md')
console.log(`Contains submission text for ${apps.length} apps across 43+ directories`)
