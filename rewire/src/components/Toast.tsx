import { useEffect, useState, useRef } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onDone: () => void
  duration?: number
}

export default function Toast({ message, type = 'success', onDone, duration = 2500 }: ToastProps) {
  const [visible, setVisible] = useState(false)
  // Stabilize onDone via ref so that if parent passes a new function identity
  // on re-render, the timers don't restart (which would cause infinite loops
  // or flickering toasts)
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone })

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setVisible(true), 10)
    // Animate out
    const hideTimer = setTimeout(() => setVisible(false), duration)
    // Remove from DOM
    const removeTimer = setTimeout(() => onDoneRef.current(), duration + 300)
    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
      clearTimeout(removeTimer)
    }
  }, [duration])

  const bgColor = type === 'success'
    ? 'bg-success/15 border-success/25 text-success'
    : type === 'error'
    ? 'bg-danger/15 border-danger/25 text-danger'
    : 'bg-accent/15 border-accent/25 text-accent-glow'

  const progressColor = type === 'success'
    ? 'bg-success/40'
    : type === 'error'
    ? 'bg-danger/40'
    : 'bg-accent/40'

  const icon = type === 'success'
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
    : type === 'error'
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>

  const dismiss = () => {
    setVisible(false)
    setTimeout(() => onDoneRef.current(), 300)
  }

  return (
    <div
      className={`fixed top-[max(1rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[200] rounded-xl border backdrop-blur-xl text-sm font-medium transition-all duration-300 cursor-pointer overflow-hidden ${bgColor} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
      role="status"
      aria-live="polite"
      onClick={dismiss}
    >
      <div className="flex items-center gap-2 px-4 py-2.5">
        {icon}
        {message}
      </div>
      {/* Auto-dismiss progress bar */}
      <div className="h-0.5 w-full" aria-hidden="true">
        <div
          className={`h-full ${progressColor} rounded-full`}
          style={{
            animation: visible ? `toast-progress ${duration}ms linear forwards` : 'none',
          }}
        />
      </div>
    </div>
  )
}
