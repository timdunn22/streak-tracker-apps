import { useState, useEffect, useCallback } from 'react'

interface LiveTime {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function useLiveTimer(startDate: string | null): LiveTime {
  const [now, setNow] = useState(Date.now())

  const tick = useCallback(() => setNow(Date.now()), [])

  useEffect(() => {
    if (!startDate) return

    // Only run timer when tab is visible to save battery
    let interval: ReturnType<typeof setInterval> | null = null

    const startInterval = () => {
      tick() // Sync immediately when becoming visible
      interval = setInterval(tick, 1000)
    }

    const stopInterval = () => {
      if (interval) { clearInterval(interval); interval = null }
    }

    const handleVisibility = () => {
      if (document.hidden) {
        stopInterval()
      } else {
        startInterval()
      }
    }

    if (!document.hidden) startInterval()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      stopInterval()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [startDate, tick])

  if (!startDate) return { days: 0, hours: 0, minutes: 0, seconds: 0 }

  const startMs = new Date(startDate).getTime()
  // Guard against invalid dates (NaN) or future start dates (clock manipulation)
  if (!Number.isFinite(startMs)) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  const diffMs = Math.max(0, now - startMs)
  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { days, hours, minutes, seconds }
}
