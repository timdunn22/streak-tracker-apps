import { useState, useEffect, useRef } from 'react'
import { config } from '../config'
import { haptic } from '../hooks/useHaptic'

const CHECKIN_KEY = `${config.id}-last-checkin`

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function hasCheckedInToday(): boolean {
  try {
    return localStorage.getItem(CHECKIN_KEY) === getToday()
  } catch {
    return false
  }
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
  const [state, setState] = useState<'prompt' | 'success' | 'dismissed'>('prompt')
  // Track check-in animation timers so they can be cleaned up on unmount
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!hasCheckedInToday() && days > 0) {
      const timer = setTimeout(() => setVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [days])

  // Clean up any pending animation timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => clearTimeout(t))
      timersRef.current = []
    }
  }, [])

  const checkingRef = useRef(false)
  const checkIn = () => {
    // Prevent double-tap on the check-in button
    if (checkingRef.current) return
    checkingRef.current = true
    haptic('success')
    try { localStorage.setItem(CHECKIN_KEY, getToday()) } catch { /* quota exceeded */ }
    setState('success')
    // Show success state briefly, then fade out
    timersRef.current.push(setTimeout(() => setState('dismissed'), 1500))
    timersRef.current.push(setTimeout(() => setVisible(false), 1900))
  }

  if (!visible) return null

  const msg = encouragements[days % encouragements.length]

  return (
    <div className={`w-full max-w-sm mb-6 ${state === 'dismissed' ? 'animate-fade-out' : 'animate-slide-down'}`}>
      <div className="glass-accent rounded-2xl p-5 text-center">
        {state === 'success' ? (
          <div className="py-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p className="text-success text-sm font-semibold">Checked in!</p>
            <p className="text-text-muted text-xs mt-1">Day {days} logged — you're on track.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse-slow" />
              <p className="text-accent-glow text-xs font-semibold tracking-wide uppercase">Daily Check-in</p>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed mb-4">
              Day {days}. {msg}
            </p>
            <button
              onClick={checkIn}
              className="w-full bg-accent hover:bg-accent-glow text-white font-semibold text-sm py-3 rounded-xl transition-all duration-200 ease-out active:scale-[0.97] flex items-center justify-center gap-2"
              aria-label={`Check in for day ${days}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Still going strong
            </button>
          </>
        )}
      </div>
    </div>
  )
}
