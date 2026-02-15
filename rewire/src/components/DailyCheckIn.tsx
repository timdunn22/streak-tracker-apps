import { useState, useEffect } from 'react'
import { config } from '../config'
import { haptic } from '../hooks/useHaptic'

const CHECKIN_KEY = `${config.id}-last-checkin`

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function hasCheckedInToday(): boolean {
  return localStorage.getItem(CHECKIN_KEY) === getToday()
}

const encouragements = [
  "You're doing amazing. Keep it up.",
  "Another day stronger. You've got this.",
  "Small wins compound. This is one.",
  "Consistency beats perfection. Always.",
  "Your future self will thank you for today.",
  "One more day in the books. Proud of you.",
  "Still here, still fighting. That's everything.",
]

export default function DailyCheckIn({ days }: { days: number }) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!hasCheckedInToday() && days > 0) {
      const timer = setTimeout(() => setVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [days])

  const checkIn = () => {
    haptic('success')
    try { localStorage.setItem(CHECKIN_KEY, getToday()) } catch { /* quota exceeded */ }
    setDismissed(true)
    setTimeout(() => setVisible(false), 400)
  }

  if (!visible) return null

  const msg = encouragements[days % encouragements.length]

  return (
    <div className={`w-full max-w-sm mb-6 ${dismissed ? 'animate-fade-out' : 'animate-slide-down'}`}>
      <div className="glass-accent rounded-2xl p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse-slow" />
          <p className="text-accent-glow text-xs font-semibold tracking-wide uppercase">Daily Check-in</p>
        </div>
        <p className="text-text-secondary text-sm leading-relaxed mb-4">
          Day {days}. {msg}
        </p>
        <button
          onClick={checkIn}
          className="w-full bg-accent hover:bg-accent-glow text-white font-semibold text-sm py-3 rounded-xl transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2"
          aria-label={`Check in for day ${days}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Still going strong
        </button>
      </div>
    </div>
  )
}
