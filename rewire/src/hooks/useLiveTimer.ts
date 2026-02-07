import { useState, useEffect } from 'react'

interface LiveTime {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function useLiveTimer(startDate: string | null): LiveTime {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!startDate) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [startDate])

  if (!startDate) return { days: 0, hours: 0, minutes: 0, seconds: 0 }

  const diffMs = Math.max(0, now - new Date(startDate).getTime())
  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { days, hours, minutes, seconds }
}
