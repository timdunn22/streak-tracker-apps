import { useEffect, useRef } from 'react'
import { config } from '../config'

const MILESTONES = [1, 3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 365]
const SEEN_KEY = `${config.id}-seen-milestones`

function getSeenMilestones(): number[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    if (!raw || raw.length > 1024) return [] // cap raw size to prevent DoS from crafted localStorage
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((n: unknown) => typeof n === 'number' && isFinite(n)).slice(0, 50)
  } catch {
    return []
  }
}

function markSeen(day: number) {
  if (!isFinite(day) || day < 0 || day > 36500) return
  const seen = getSeenMilestones()
  if (!seen.includes(day)) {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, day].slice(-50))) } catch { /* quota exceeded */ }
  }
}

export function clearSeenMilestones() {
  try { localStorage.removeItem(SEEN_KEY) } catch { /* localStorage unavailable */ }
}

// Play a short ascending chime using Web Audio API (skipped for reduced-motion preference)
function playChime() {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const notes = [523.25, 659.25, 783.99] // C5, E5, G5 — major chord

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12)
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.12 + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.6)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime + i * 0.12)
      osc.stop(ctx.currentTime + i * 0.12 + 0.6)
    })

    // Clean up after sound finishes
    setTimeout(() => ctx.close(), 2000)
  } catch {
    // Web Audio not available
  }
}

export function useMilestoneAlert(
  currentDays: number,
  onMilestone: (day: number) => void
) {
  const prevDays = useRef(currentDays)

  useEffect(() => {
    if (currentDays <= 0) return
    if (currentDays === prevDays.current) return

    prevDays.current = currentDays

    const milestone = MILESTONES.find(m => m === currentDays)
    if (!milestone) return

    const seen = getSeenMilestones()
    if (seen.includes(milestone)) return

    // New milestone reached!
    markSeen(milestone)
    playChime()
    onMilestone(milestone)
  }, [currentDays, onMilestone])
}
