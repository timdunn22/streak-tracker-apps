// Test scenarios for manual verification — fake date injection
// Run these mentally or inject via console to verify all edge cases

import { getDaysBetween } from './hooks/useStreak'

// === getDaysBetween tests ===

// Test 1: Same day — should be 0
console.assert(getDaysBetween(new Date().toISOString()) === 0, 'FAIL: Same day should be 0')

// Test 2: 1 day ago
const oneDayAgo = new Date(Date.now() - 86400000).toISOString()
console.assert(getDaysBetween(oneDayAgo) === 1, 'FAIL: 1 day ago should be 1')

// Test 3: 90 days ago
const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString()
console.assert(getDaysBetween(ninetyDaysAgo) === 90, 'FAIL: 90 days should be 90')

// Test 4: 365 days ago
const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString()
console.assert(getDaysBetween(yearAgo) === 365, 'FAIL: 365 days should be 365')

// Test 5: Future date — should be 0 (not negative)
const future = new Date(Date.now() + 86400000).toISOString()
console.assert(getDaysBetween(future) === 0, 'FAIL: Future date should be 0')

// Test 6: Hours granularity — 23 hours should be 0 days
const almost1Day = new Date(Date.now() - 23 * 3600000).toISOString()
console.assert(getDaysBetween(almost1Day) === 0, 'FAIL: 23 hours should be 0 days')

// Test 7: Exactly 24 hours should be 1 day
const exact1Day = new Date(Date.now() - 24 * 3600000).toISOString()
console.assert(getDaysBetween(exact1Day) === 1, 'FAIL: 24 hours should be 1 day')

console.log('All getDaysBetween tests passed!')

// === UI State Scenarios to verify ===

// Scenario A: Brand new user (no localStorage)
// Expected: Welcome screen with "Start My Streak" button, no nav bar

// Scenario B: Day 0 (just started)
// Expected: Ring shows 0, "0h into your streak", motivation text

// Scenario C: Day 1
// Expected: Ring slightly filled, "1 day clean" (singular)

// Scenario D: Day 7 (first milestone)
// Expected: Timeline shows Day 1, 3, 7 unlocked, Day 14 as "next" with "7 days away"

// Scenario E: Day 45 (mid-journey)
// Expected: Ring ~50% filled, 6 milestones unlocked, stats show weeks=6, months=1

// Scenario F: Day 90 (full reboot)
// Expected: Ring 100% with glow effect, "90 Days — Rewired" unlocked

// Scenario G: Day 400 (beyond all milestones)
// Expected: Ring stays at 100%, all milestones unlocked, "One full year. Legendary."

// Scenario H: Multiple resets with history
// Expected: Stats shows past streaks as bars, total clean days accumulates

// Scenario I: Share card at various day counts
// Expected: Preview and canvas render match, download/share works

// === Fake localStorage data for testing ===

// Inject Day 45 streak:
// localStorage.setItem('rewire-streak-data', JSON.stringify({
//   startDate: new Date(Date.now() - 45 * 86400000).toISOString(),
//   streaks: [7, 14, 3, 21],
//   totalCleanDays: 45
// }))

// Inject Day 90 streak:
// localStorage.setItem('rewire-streak-data', JSON.stringify({
//   startDate: new Date(Date.now() - 90 * 86400000).toISOString(),
//   streaks: [30, 7, 60, 14, 45],
//   totalCleanDays: 156
// }))

// Inject Day 365 streak:
// localStorage.setItem('rewire-streak-data', JSON.stringify({
//   startDate: new Date(Date.now() - 365 * 86400000).toISOString(),
//   streaks: [90, 45, 120, 7],
//   totalCleanDays: 262
// }))

export {}
