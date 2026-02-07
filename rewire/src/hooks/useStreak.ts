import { useState, useEffect, useCallback } from 'react'
import { clearSeenMilestones } from './useMilestoneAlert'

export interface StreakData {
  startDate: string | null
  streaks: number[] // array of past streak lengths in days
  totalCleanDays: number
}

const STORAGE_KEY = 'rewire-streak-data'

const defaultData: StreakData = {
  startDate: null,
  streaks: [],
  totalCleanDays: 0,
}

function loadData(): StreakData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultData
    return JSON.parse(raw) as StreakData
  } catch {
    return defaultData
  }
}

function saveData(data: StreakData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getDaysBetween(start: string, end: Date = new Date()): number {
  const startDate = new Date(start)
  const diffMs = end.getTime() - startDate.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

export function useStreak() {
  const [data, setData] = useState<StreakData>(loadData)

  useEffect(() => {
    saveData(data)
  }, [data])

  const currentDays = data.startDate ? getDaysBetween(data.startDate) : 0
  const longestStreak = Math.max(currentDays, ...data.streaks, 0)

  const startStreak = useCallback(() => {
    setData(prev => ({
      ...prev,
      startDate: new Date().toISOString(),
    }))
  }, [])

  const resetStreak = useCallback(() => {
    clearSeenMilestones()
    setData(prev => {
      const daysCompleted = prev.startDate ? getDaysBetween(prev.startDate) : 0
      return {
        startDate: new Date().toISOString(),
        streaks: daysCompleted > 0 ? [...prev.streaks, daysCompleted] : prev.streaks,
        totalCleanDays: prev.totalCleanDays + daysCompleted,
      }
    })
  }, [])

  return {
    data,
    currentDays,
    longestStreak,
    totalCleanDays: data.totalCleanDays + currentDays,
    totalResets: data.streaks.length,
    isActive: data.startDate !== null,
    startStreak,
    resetStreak,
    startDate: data.startDate,
  }
}
