import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

const appConfigs: Record<string, {
  name: string
  shortName: string
  description: string
  title: string
  metaDescription: string
  keywords: string
  appUrl: string
  landingUrl: string
  accentColor: string
  gaId: string
}> = {
  rewire: {
    name: 'Rewire — Rewire Your Brain', shortName: 'Rewire',
    description: 'Break free. Track your streak. Rewire your brain.',
    title: 'Rewire — Free Private Streak Tracker for Quitting Porn',
    metaDescription: 'Rewire is a free, private streak tracker for quitting porn and rewiring your brain. Track your streak, recovery phases, milestones, and progress. No account needed. Works offline.',
    keywords: 'quit porn app, nofap tracker, porn addiction recovery, streak tracker, rewire brain, nofap app free, quit porn streak counter, porn free tracker, nofap counter app',
    appUrl: 'https://rewire-psi.vercel.app',
    landingUrl: 'https://rewire-landing.vercel.app',
    accentColor: '#7c6bf5',
    gaId: 'G-EFHPDZXPF7',
  },
  vapefree: {
    name: 'VapeFree — Quit Vaping', shortName: 'VapeFree',
    description: 'Ditch the vape. Reclaim your lungs.',
    title: 'VapeFree — Free Private Quit Vaping Streak Tracker',
    metaDescription: 'Quit vaping with VapeFree — free private streak tracker. Track nicotine-free days, lung recovery phases, money saved, and milestones. No account needed. Works offline.',
    keywords: 'quit vaping app, stop vaping tracker, vape free counter, nicotine free app, quit juul app, vaping streak tracker, quit nicotine app free, days without vaping',
    appUrl: 'https://vapefree-app.vercel.app',
    landingUrl: 'https://vapefree-landing.vercel.app',
    accentColor: '#06b6d4',
    gaId: 'G-EVEKQFSFRE',
  },
  fasttrack: {
    name: 'FastTrack — Intermittent Fasting', shortName: 'FastTrack',
    description: 'Master your fasting. Transform your body.',
    title: 'FastTrack — Free Private Intermittent Fasting Streak Tracker',
    metaDescription: 'Track your intermittent fasting consistency with FastTrack — free private streak tracker. Monitor metabolic phases, milestones, and progress. No account or subscription needed.',
    keywords: 'intermittent fasting tracker free, fasting app no subscription, IF tracker, fasting streak counter, 16:8 fasting app, free fasting timer, autophagy tracker',
    appUrl: 'https://fasttrack-app-three.vercel.app',
    landingUrl: 'https://fasttrack-landing.vercel.app',
    accentColor: '#f59e0b',
    gaId: 'G-1FJFH2DVV4',
  },
  greenday: {
    name: 'GreenDay — Quit Weed', shortName: 'GreenDay',
    description: 'Clear your mind. Live sharper.',
    title: 'GreenDay — Free Private Quit Weed Streak Tracker',
    metaDescription: 'Quit weed with GreenDay — free private streak tracker. Track sober days, mental clarity recovery phases, money saved, and milestones. No account needed.',
    keywords: 'quit weed app, quit marijuana tracker, stop smoking weed app, THC detox tracker, leaves quit weed, sober from weed, weed free counter, cannabis quit app',
    appUrl: 'https://greenday-app.vercel.app',
    landingUrl: 'https://greenday-landing.vercel.app',
    accentColor: '#22c55e',
    gaId: 'G-PW6J0RX1TW',
  },
  sugarfree: {
    name: 'SugarFree — Quit Sugar', shortName: 'SugarFree',
    description: 'Break the sugar cycle. Feel alive.',
    title: 'SugarFree — Free Private Quit Sugar Streak Tracker',
    metaDescription: 'Break your sugar addiction with SugarFree — free private streak tracker. Track sugar-free days, health recovery phases, money saved, and milestones. No account needed.',
    keywords: 'quit sugar app, no sugar tracker, sugar free counter, sugar detox app, stop eating sugar, sugar addiction app, no sugar challenge tracker, sugar free streak',
    appUrl: 'https://sugarfree-app.vercel.app',
    landingUrl: 'https://sugarfree-landing.vercel.app',
    accentColor: '#ec4899',
    gaId: 'G-RZSYQSYFRH',
  },
  decaf: {
    name: 'Decaf — Quit Caffeine', shortName: 'Decaf',
    description: 'Find your natural energy.',
    title: 'Decaf — Free Private Quit Caffeine Streak Tracker',
    metaDescription: 'Quit caffeine with Decaf — free private streak tracker. Track caffeine-free days, energy recovery phases, money saved, and milestones. No account needed.',
    keywords: 'quit caffeine app, quit coffee tracker, caffeine free counter, caffeine detox app, stop drinking coffee, decaf streak tracker, caffeine withdrawal tracker',
    appUrl: 'https://decaf-app-black.vercel.app',
    landingUrl: 'https://decaf-landing.vercel.app',
    accentColor: '#d97706',
    gaId: 'G-53PR298JY2',
  },
  primal: {
    name: 'Primal — Testosterone Optimizer', shortName: 'Primal',
    description: 'Optimize your testosterone. Naturally.',
    title: 'Primal — Free Private Testosterone Optimization Streak Tracker',
    metaDescription: 'Optimize testosterone naturally with Primal — free private streak tracker. Track daily habits for sleep, exercise, nutrition, and cold exposure. No account needed.',
    keywords: 'testosterone tracker app, testosterone optimization, mens health app free, hormone optimization tracker, testosterone boosting habits, biohacking tracker',
    appUrl: 'https://primal-app.vercel.app',
    landingUrl: 'https://primal-landing.vercel.app',
    accentColor: '#ef4444',
    gaId: 'G-1ZVFEG1R1J',
  },
  iceplunge: {
    name: 'IcePlunge — Cold Exposure Tracker', shortName: 'IcePlunge',
    description: 'Embrace the cold. Build resilience.',
    title: 'IcePlunge — Free Private Cold Plunge Streak Tracker',
    metaDescription: 'Track your cold plunge habit with IcePlunge — free private streak tracker. Monitor cold exposure phases, milestones, and resilience progress. No account needed.',
    keywords: 'cold plunge tracker app, ice bath tracker, cold exposure app, wim hof tracker, cold shower streak, cold plunge streak counter, biohacking cold therapy',
    appUrl: 'https://iceplunge-app.vercel.app',
    landingUrl: 'https://iceplunge-landing.vercel.app',
    accentColor: '#3b82f6',
    gaId: 'G-W9Y4MT0338',
  },
  sober: {
    name: 'Sober — Quit Drinking', shortName: 'Sober',
    description: 'Choose clarity. Every single day.',
    title: 'Sober — Free Private Sobriety & Quit Drinking Tracker',
    metaDescription: 'Track your sobriety with Sober — free private streak tracker for quitting alcohol. Monitor sober days, liver recovery phases, money saved, and milestones. No account needed.',
    keywords: 'sobriety tracker app free, quit drinking app, sober counter, alcohol free tracker, days sober counter, quit alcohol app free, sober streak app, stop drinking tracker',
    appUrl: 'https://sober-app-theta.vercel.app',
    landingUrl: 'https://sober-landing.vercel.app',
    accentColor: '#6366f1',
    gaId: 'G-9RLR6LGJBP',
  },
  clearlungs: {
    name: 'ClearLungs — Quit Smoking', shortName: 'ClearLungs',
    description: 'Quit smoking. Breathe free.',
    title: 'ClearLungs — Free Private Quit Smoking Streak Tracker',
    metaDescription: 'Quit smoking with ClearLungs — free private streak tracker. Track smoke-free days, lung recovery phases, money saved, and health milestones. No account needed.',
    keywords: 'quit smoking app free, stop smoking tracker, smoke free counter, cigarette quit app, quit smoking streak tracker, lung health tracker, nicotine free app',
    appUrl: 'https://clearlungs-app.vercel.app',
    landingUrl: 'https://clearlungs-landing.vercel.app',
    accentColor: '#10b981',
    gaId: 'G-1DWE0D6FY0',
  },
}

const appId = process.env.VITE_APP_ID || 'rewire'
const pwaConfig = appConfigs[appId] || appConfigs.rewire

function seoPlugin(): Plugin {
  return {
    name: 'inject-seo-meta',
    transformIndexHtml(html) {
      const cfg = pwaConfig
      const structuredData = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: cfg.shortName,
        applicationCategory: 'HealthApplication',
        operatingSystem: 'Any (Web Browser)',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: cfg.metaDescription,
        url: cfg.appUrl,
      })

      const metaTags = `
    <meta name="description" content="${cfg.metaDescription}" />
    <meta name="keywords" content="${cfg.keywords}" />
    <link rel="canonical" href="${cfg.appUrl}" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
    <meta property="og:title" content="${cfg.title}" />
    <meta property="og:description" content="${cfg.metaDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${cfg.appUrl}" />
    <meta property="og:site_name" content="${cfg.shortName}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${cfg.title}" />
    <meta name="twitter:description" content="${cfg.metaDescription}" />
    <script type="application/ld+json">${structuredData}</script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=${cfg.gaId}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{'analytics_storage':'denied','ad_storage':'denied','ad_user_data':'denied','ad_personalization':'denied'});gtag('js',new Date());gtag('config','${cfg.gaId}',{anonymize_ip:true});</script>`

      return html
        .replace(/<title>.*<\/title>/, `<title>${cfg.title}</title>${metaTags}`)
    },
    closeBundle() {
      const cfg = pwaConfig
      const today = new Date().toISOString().split('T')[0]
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${cfg.appUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`
      const outDir = resolve(process.cwd(), process.env.VITE_OUT_DIR || `../dist-${appId}`)
      writeFileSync(resolve(outDir, 'sitemap.xml'), sitemap)
      writeFileSync(resolve(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${cfg.appUrl}/sitemap.xml\n`)

      // Generate vercel.json with security headers
      const vercelConfig = JSON.stringify({
        buildCommand: '',
        outputDirectory: '.',
        headers: [{
          source: '/(.*)',
          headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
            { key: 'X-XSS-Protection', value: '0' },
            { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
            { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" },
          ],
        }],
      }, null, 2)
      writeFileSync(resolve(outDir, 'vercel.json'), vercelConfig)
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    seoPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg'],
      manifest: {
        name: pwaConfig.name,
        short_name: pwaConfig.shortName,
        description: pwaConfig.description,
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
})
