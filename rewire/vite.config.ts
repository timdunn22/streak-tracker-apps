import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const appConfigs: Record<string, { name: string; shortName: string; description: string }> = {
  rewire: { name: 'Rewire — Rewire Your Brain', shortName: 'Rewire', description: 'Break free. Track your streak. Rewire your brain.' },
  vapefree: { name: 'VapeFree — Quit Vaping', shortName: 'VapeFree', description: 'Ditch the vape. Reclaim your lungs.' },
  fasttrack: { name: 'FastTrack — Intermittent Fasting', shortName: 'FastTrack', description: 'Master your fasting. Transform your body.' },
  greenday: { name: 'GreenDay — Quit Weed', shortName: 'GreenDay', description: 'Clear your mind. Live sharper.' },
  sugarfree: { name: 'SugarFree — Quit Sugar', shortName: 'SugarFree', description: 'Break the sugar cycle. Feel alive.' },
  decaf: { name: 'Decaf — Quit Caffeine', shortName: 'Decaf', description: 'Find your natural energy.' },
  primal: { name: 'Primal — Testosterone Optimizer', shortName: 'Primal', description: 'Optimize your testosterone. Naturally.' },
  iceplunge: { name: 'IcePlunge — Cold Exposure Tracker', shortName: 'IcePlunge', description: 'Embrace the cold. Build resilience.' },
  sober: { name: 'Sober — Quit Drinking', shortName: 'Sober', description: 'Choose clarity. Every single day.' },
  clearlungs: { name: 'ClearLungs — Quit Smoking', shortName: 'ClearLungs', description: 'Quit smoking. Breathe free.' },
}

const appId = process.env.VITE_APP_ID || 'rewire'
const pwaConfig = appConfigs[appId] || appConfigs.rewire

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
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
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
})
