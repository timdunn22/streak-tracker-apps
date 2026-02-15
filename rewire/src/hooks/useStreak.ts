import { useState, useEffect, useCallback } from 'react'
import { clearSeenMilestones } from './useMilestoneAlert'
import { config } from '../config'

export interface JournalEntry {
  id: string
  date: string
  mood: number // 1-5
  text: string
  triggers?: string[]
}

export interface StreakData {
  startDate: string | null
  streaks: number[] // array of past streak lengths in days
  totalCleanDays: number
  freezesAvailable: number
  freezesUsed: number
  lastFreezeRecharge: string | null // ISO date of last recharge
  dailyCost: number | null // user's daily spending on the habit
  journal: JournalEntry[]
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
  journal: [],
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
    return validateData(parsed)
  } catch {
    return defaultData
  }
}

function isValidDate(s: string): boolean {
  return !isNaN(new Date(s).getTime())
}

function validateData(parsed: unknown): StreakData {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return defaultData
  }
  const p = parsed as Record<string, unknown>
  return {
    startDate: typeof p.startDate === 'string' && isValidDate(p.startDate) ? p.startDate : null,
    streaks: Array.isArray(p.streaks) ? p.streaks.filter((n: unknown) => typeof n === 'number' && isFinite(n) && n >= 0 && n <= 36500).slice(0, 10000) : [],
    totalCleanDays: typeof p.totalCleanDays === 'number' && isFinite(p.totalCleanDays) ? Math.max(0, Math.min(p.totalCleanDays, 1000000)) : 0,
    freezesAvailable: typeof p.freezesAvailable === 'number' ? Math.min(Math.max(p.freezesAvailable, 0), 2) : 2,
    freezesUsed: typeof p.freezesUsed === 'number' && isFinite(p.freezesUsed) ? Math.max(0, p.freezesUsed) : 0,
    lastFreezeRecharge: typeof p.lastFreezeRecharge === 'string' && isValidDate(p.lastFreezeRecharge) ? p.lastFreezeRecharge : null,
    dailyCost: typeof p.dailyCost === 'number' && isFinite(p.dailyCost) && p.dailyCost >= 0 && p.dailyCost <= 10000 ? p.dailyCost : null,
    journal: Array.isArray(p.journal) ? p.journal.filter((e: unknown) => {
      if (typeof e !== 'object' || e === null) return false
      const j = e as Record<string, unknown>
      return typeof j.id === 'string' && typeof j.date === 'string' &&
        typeof j.mood === 'number' && j.mood >= 1 && j.mood <= 5 &&
        typeof j.text === 'string' && j.text.length <= 1000
    }).map((e: unknown) => {
      const j = e as Record<string, unknown>
      const entry: JournalEntry = {
        id: (j.id as string).slice(0, 50),
        date: (j.date as string).slice(0, 30),
        mood: j.mood as number,
        text: (j.text as string).slice(0, 1000),
      }
      if (Array.isArray(j.triggers)) {
        entry.triggers = j.triggers
          .filter((t: unknown) => typeof t === 'string')
          .slice(0, 20)
          .map((t: string) => t.slice(0, 100))
      }
      return entry
    }).slice(0, 1000) : [],
  }
}

function saveData(data: StreakData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage quota exceeded — silently fail to avoid crashing
  }
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
  const longestStreak = Math.max(currentDays, data.streaks.length > 0 ? data.streaks.reduce((a, b) => Math.max(a, b), 0) : 0)

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
    if (!isFinite(cost) || cost < 0 || cost > 10000) return
    setData(prev => ({ ...prev, dailyCost: Math.round(cost * 100) / 100 }))
  }, [])

  const addJournalEntry = useCallback((mood: number, text: string, triggers?: string[]) => {
    const entry: JournalEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: new Date().toISOString(),
      mood: Math.max(1, Math.min(5, Math.round(mood))),
      text: text.slice(0, 500),
      triggers,
    }
    setData(prev => ({
      ...prev,
      journal: [...prev.journal, entry],
    }))
  }, [])

  const deleteJournalEntry = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      journal: prev.journal.filter(e => e.id !== id),
    }))
  }, [])

  const exportData = useCallback(() => {
    const exportPayload = {
      app: config.id,
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    }
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${config.id}-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [data])

  const importData = useCallback((file: File) => {
    const MAX_IMPORT_SIZE = 1024 * 1024 // 1 MB
    if (file.size > MAX_IMPORT_SIZE) {
      alert('Backup file is too large (max 1 MB). Please select a valid backup.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string)
        if (typeof parsed.app !== 'string' || parsed.app !== config.id) {
          alert('This backup is for a different app. Import cancelled.')
          return
        }
        if (parsed.data) {
          const confirmed = confirm(
            'Import will replace all your current data (streak, journal, stats). This cannot be undone.\n\nContinue?'
          )
          if (!confirmed) return
          const validated = validateData(parsed.data)
          setData(validated)
          clearSeenMilestones()
        }
      } catch {
        alert('Invalid backup file. Please select a valid JSON backup.')
      }
    }
    reader.readAsText(file)
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
    addJournalEntry,
    deleteJournalEntry,
    exportData,
    importData,
  }
}
