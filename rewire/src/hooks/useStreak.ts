import { useState, useEffect, useCallback } from 'react'
import { clearSeenMilestones } from './useMilestoneAlert'
import { config } from '../config'

export interface StreakData {
  startDate: string | null
  streaks: number[] // array of past streak lengths in days
  totalCleanDays: number
  freezesAvailable: number
  freezesUsed: number
  lastFreezeRecharge: string | null // ISO date of last recharge
  dailyCost: number | null // user's daily spending on the habit
}

const STORAGE_KEY = `${config.id}-streak-data`
const LEGACY_KEY = 'rewire-streak-data'

const defaultData: StreakData = {
  startDate: null,
  streaks: [],
  totalCleanDays: 0,
  freezesAvailable: 2,
  freezesUsed: 0,
  lastFreezeRecharge: null,
  dailyCost: null,
}

function loadData(): StreakData {
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    // Migrate from legacy key if needed
    if (!raw && STORAGE_KEY !== LEGACY_KEY) {
      raw = localStorage.getItem(LEGACY_KEY)
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw)
        localStorage.removeItem(LEGACY_KEY)
      }
    }
    if (!raw) return defaultData
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return defaultData
    }
    return {
      startDate: typeof parsed.startDate === 'string' ? parsed.startDate : null,
      streaks: Array.isArray(parsed.streaks) ? parsed.streaks.filter((n: unknown) => typeof n === 'number' && isFinite(n) && n >= 0) : [],
      totalCleanDays: typeof parsed.totalCleanDays === 'number' && isFinite(parsed.totalCleanDays) ? Math.max(0, parsed.totalCleanDays) : 0,
      freezesAvailable: typeof parsed.freezesAvailable === 'number' ? Math.min(Math.max(parsed.freezesAvailable, 0), 2) : 2,
      freezesUsed: typeof parsed.freezesUsed === 'number' && isFinite(parsed.freezesUsed) ? Math.max(0, parsed.freezesUsed) : 0,
      lastFreezeRecharge: typeof parsed.lastFreezeRecharge === 'string' ? parsed.lastFreezeRecharge : null,
      dailyCost: typeof parsed.dailyCost === 'number' && isFinite(parsed.dailyCost) && parsed.dailyCost >= 0 ? parsed.dailyCost : null,
    }
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

  // Recharge a freeze every 7 consecutive days (max 2)
  useEffect(() => {
    if (!data.startDate || data.freezesAvailable >= 2) return
    const daysSinceRecharge = data.lastFreezeRecharge
      ? getDaysBetween(data.lastFreezeRecharge)
      : currentDays
    if (daysSinceRecharge >= 7 && currentDays >= 7) {
      setData(prev => ({
        ...prev,
        freezesAvailable: Math.min(prev.freezesAvailable + 1, 2),
        lastFreezeRecharge: new Date().toISOString(),
      }))
    }
  }, [currentDays, data.startDate, data.freezesAvailable, data.lastFreezeRecharge])

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
        ...prev,
        startDate: new Date().toISOString(),
        streaks: daysCompleted > 0 ? [...prev.streaks, daysCompleted] : prev.streaks,
        totalCleanDays: prev.totalCleanDays + daysCompleted,
        freezesAvailable: 2,
        freezesUsed: 0,
        lastFreezeRecharge: null,
      }
    })
  }, [])

  const useFreeze = useCallback(() => {
    if (data.freezesAvailable <= 0) return false
    setData(prev => {
      if (prev.freezesAvailable <= 0) return prev
      return {
        ...prev,
        freezesAvailable: prev.freezesAvailable - 1,
        freezesUsed: prev.freezesUsed + 1,
      }
    })
    return true
  }, [data.freezesAvailable])

  const setDailyCost = useCallback((cost: number) => {
    setData(prev => ({ ...prev, dailyCost: cost }))
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
    freezesAvailable: data.freezesAvailable,
    freezesUsed: data.freezesUsed,
    useFreeze,
    dailyCost: data.dailyCost,
    setDailyCost,
    moneySaved: data.dailyCost ? Math.round(data.dailyCost * (data.totalCleanDays + currentDays) * 100) / 100 : null,
  }
}
