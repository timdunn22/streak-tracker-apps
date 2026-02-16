import { useEffect, useRef, useState } from 'react'
import { formatNumber } from '../utils/format'

interface Props {
  value: number
  duration?: number
  className?: string
  /** When true, display raw number without locale formatting (e.g. for IDs) */
  raw?: boolean
}

// Query the live media query on each render rather than caching at module load.
// This ensures the animation skip is respected if the user toggles reduced motion
// while the app is open (e.g. via system settings or accessibility shortcut).
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function AnimatedNumber({ value, duration = 800, className = '', raw = false }: Props) {
  // Guard against NaN/Infinity to prevent animation loops or display of "NaN"
  const safeValue = Number.isFinite(value) ? value : 0
  const [display, setDisplay] = useState(safeValue)
  const prevValue = useRef(safeValue)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const start = prevValue.current
    const end = safeValue
    const diff = end - start
    if (diff === 0) return

    // Skip animation for reduced motion users
    if (prefersReducedMotion()) {
      setDisplay(end)
      prevValue.current = end
      return
    }

    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(start + diff * eased)
      setDisplay(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        prevValue.current = end
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [safeValue, duration])

  return <span className={className}>{raw ? display : formatNumber(display)}</span>
}
