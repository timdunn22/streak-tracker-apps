#!/usr/bin/env node

// Generates OG images (SVG format) for all landing pages
// Run: node generate-og-images.js
// Output: og-image.svg in each landing-* and rewire-landing directory

const fs = require('fs')
const path = require('path')

const apps = [
  { id: 'rewire', name: 'Rewire', tagline: 'Break free. Rewire your brain.', accent: '#7c6bf5', glow: '#b4a8ff', dir: 'rewire-landing', description: 'Free private streak tracker for quitting porn' },
  { id: 'vapefree', name: 'VapeFree', tagline: 'Ditch the vape. Reclaim your lungs.', accent: '#06b6d4', glow: '#67e8f9', dir: 'landing-vapefree', description: 'Free private quit vaping streak tracker' },
  { id: 'fasttrack', name: 'FastTrack', tagline: 'Master your fasting. Transform your body.', accent: '#f59e0b', glow: '#fcd34d', dir: 'landing-fasttrack', description: 'Free private intermittent fasting tracker' },
  { id: 'greenday', name: 'GreenDay', tagline: 'Clear your mind. Live sharper.', accent: '#22c55e', glow: '#86efac', dir: 'landing-greenday', description: 'Free private quit weed streak tracker' },
  { id: 'sugarfree', name: 'SugarFree', tagline: 'Break the sugar cycle. Feel alive.', accent: '#ec4899', glow: '#f9a8d4', dir: 'landing-sugarfree', description: 'Free private quit sugar streak tracker' },
  { id: 'decaf', name: 'Decaf', tagline: 'Find your natural energy.', accent: '#d97706', glow: '#fbbf24', dir: 'landing-decaf', description: 'Free private quit caffeine streak tracker' },
  { id: 'primal', name: 'Primal', tagline: 'Optimize your testosterone. Naturally.', accent: '#ef4444', glow: '#fca5a5', dir: 'landing-primal', description: 'Free private testosterone optimization tracker' },
  { id: 'iceplunge', name: 'IcePlunge', tagline: 'Embrace the cold. Build resilience.', accent: '#3b82f6', glow: '#93c5fd', dir: 'landing-iceplunge', description: 'Free private cold plunge streak tracker' },
  { id: 'sober', name: 'Sober', tagline: 'Choose clarity. Every single day.', accent: '#6366f1', glow: '#a5b4fc', dir: 'landing-sober', description: 'Free private sobriety & quit drinking tracker' },
  { id: 'clearlungs', name: 'ClearLungs', tagline: 'Quit smoking. Breathe free.', accent: '#10b981', glow: '#6ee7b7', dir: 'landing-clearlungs', description: 'Free private quit smoking streak tracker' },
]

function generateOgSvg(app) {
  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#08080f"/>
      <stop offset="50%" style="stop-color:#0d0d18"/>
      <stop offset="100%" style="stop-color:#08080f"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${app.accent}"/>
      <stop offset="100%" style="stop-color:${app.glow}"/>
    </linearGradient>
    <radialGradient id="glow1" cx="30%" cy="40%" r="50%">
      <stop offset="0%" style="stop-color:${app.accent};stop-opacity:0.15"/>
      <stop offset="100%" style="stop-color:${app.accent};stop-opacity:0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="70%" cy="60%" r="40%">
      <stop offset="0%" style="stop-color:${app.glow};stop-opacity:0.08"/>
      <stop offset="100%" style="stop-color:${app.glow};stop-opacity:0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow1)"/>
  <rect width="1200" height="630" fill="url(#glow2)"/>

  <!-- Border accent line at top -->
  <rect x="0" y="0" width="1200" height="4" fill="url(#accent)"/>

  <!-- App icon circle -->
  <circle cx="600" cy="200" r="70" fill="url(#accent)" opacity="0.9"/>
  <text x="600" y="225" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="60" font-weight="bold" fill="white">${app.name[0]}</text>

  <!-- App name -->
  <text x="600" y="330" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="bold" fill="#f4f4f8">${app.name}</text>

  <!-- Tagline -->
  <text x="600" y="380" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="26" fill="${app.glow}">${app.tagline}</text>

  <!-- Description -->
  <text x="600" y="430" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" fill="#7a7a95">${app.description}</text>

  <!-- Bottom badges -->
  <rect x="310" y="490" width="130" height="36" rx="18" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <text x="375" y="514" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#c0c0d0">100% Free</text>

  <rect x="460" y="490" width="130" height="36" rx="18" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <text x="525" y="514" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#c0c0d0">No Account</text>

  <rect x="610" y="490" width="130" height="36" rx="18" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <text x="675" y="514" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#c0c0d0">Works Offline</text>

  <rect x="760" y="490" width="130" height="36" rx="18" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <text x="825" y="514" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#c0c0d0">100% Private</text>

  <!-- Bottom bar -->
  <rect x="0" y="560" width="1200" height="70" fill="rgba(0,0,0,0.3)"/>
  <text x="600" y="602" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" fill="#44445a">Free streak tracker PWA — no ads, no signup, data stays on your device</text>
</svg>`
}

apps.forEach(app => {
  const dir = path.join(__dirname, app.dir)
  if (!fs.existsSync(dir)) {
    console.warn(`Directory not found: ${dir}`)
    return
  }
  const svg = generateOgSvg(app)
  fs.writeFileSync(path.join(dir, 'og-image.svg'), svg)
  console.log(`Generated og-image.svg for ${app.name} in ${app.dir}`)
})

console.log('\nDone! OG images generated for all landing pages.')
console.log('Note: Update og:image meta tags to reference og-image.svg instead of og-image.png')
