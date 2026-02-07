#!/usr/bin/env node
// Generates per-app SVG icons for PWA manifest and apple-touch-icon
import { writeFileSync } from 'fs'

const apps = {
  rewire:     { color: '#7c6bf5', glow: '#b4a8ff', letter: 'R' },
  vapefree:   { color: '#06b6d4', glow: '#67e8f9', letter: 'V' },
  fasttrack:  { color: '#f59e0b', glow: '#fcd34d', letter: 'F' },
  greenday:   { color: '#22c55e', glow: '#86efac', letter: 'G' },
  sugarfree:  { color: '#ec4899', glow: '#f9a8d4', letter: 'S' },
  decaf:      { color: '#d97706', glow: '#fbbf24', letter: 'D' },
  primal:     { color: '#ef4444', glow: '#fca5a5', letter: 'P' },
  iceplunge:  { color: '#3b82f6', glow: '#93c5fd', letter: 'I' },
  sober:      { color: '#6366f1', glow: '#a5b4fc', letter: 'S' },
  clearlungs: { color: '#10b981', glow: '#6ee7b7', letter: 'C' },
}

const appId = process.env.VITE_APP_ID || 'rewire'
const app = apps[appId] || apps.rewire

function makeSvg(size) {
  const fontSize = Math.round(size * 0.5)
  const textY = Math.round(size * 0.66)
  const r = Math.round(size * 0.48)
  const cx = Math.round(size / 2)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${app.color}"/>
      <stop offset="100%" style="stop-color:${app.glow}"/>
    </linearGradient>
  </defs>
  <circle cx="${cx}" cy="${cx}" r="${r}" fill="url(#g)"/>
  <text x="${cx}" y="${textY}" text-anchor="middle" font-size="${fontSize}" font-family="Arial,Helvetica,sans-serif" font-weight="bold" fill="white">${app.letter}</text>
</svg>`
}

writeFileSync('public/favicon.svg', makeSvg(100))
writeFileSync('public/pwa-192x192.svg', makeSvg(192))
writeFileSync('public/pwa-512x512.svg', makeSvg(512))
writeFileSync('public/apple-touch-icon.svg', makeSvg(180))

console.log(`Generated icons for ${appId} (${app.letter}, ${app.color})`)
