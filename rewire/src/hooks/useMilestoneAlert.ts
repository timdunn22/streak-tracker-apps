import { useEffect, useRef } from 'react'
import { config } from '../config'

const MILESTONES = [1, 3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 365]
const SEEN_KEY = `${config.id}-seen-milestones`

function getSeenMilestones(): number[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')
  } catch {
    return []
  }
}

function markSeen(day: number) {
  const seen = getSeenMilestones()
  if (!seen.includes(day)) {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, day]))
  }
}

export function clearSeenMilestones() {
  localStorage.removeItem(SEEN_KEY)
}

// Play a short ascending chime using Web Audio API
function playChime() {
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
