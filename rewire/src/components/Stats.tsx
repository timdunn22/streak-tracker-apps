import { useRef } from 'react'
import { haptic } from '../hooks/useHaptic'
import Badges from './Badges'
import AnimatedNumber from './AnimatedNumber'
import type { JournalEntry } from '../hooks/useStreak'

interface Props {
  currentDays: number
  longestStreak: number
  totalCleanDays: number
  totalResets: number
  streaks: number[]
  startDate: string | null
  moneySaved: number | null
  dailyCost: number | null
  journal: JournalEntry[]
  onExport: () => void
  onImport: (file: File) => void
}

const MOODS = ['', '😣', '😔', '😐', '😊', '💪']

function StreakCalendar({ currentDays, startDate }: { currentDays: number; startDate: string | null }) {
  const today = new Date()
  const days: { date: Date; active: boolean; isToday: boolean }[] = []

  for (let i = 34; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const daysAgo = i
    days.push({
      date: d,
      active: startDate !== null && daysAgo <= currentDays,
      isToday: i === 0,
    })
  }

  const weekdays = [
    { abbr: 'M', full: 'Monday' },
    { abbr: 'T', full: 'Tuesday' },
    { abbr: 'W', full: 'Wednesday' },
    { abbr: 'T', full: 'Thursday' },
    { abbr: 'F', full: 'Friday' },
    { abbr: 'S', full: 'Saturday' },
    { abbr: 'S', full: 'Sunday' },
  ]
  // Pad empty cells so the first day aligns to its correct weekday (0=Sun → col 7, 1=Mon → col 1, etc.)
  const firstDayOfWeek = days[0].date.getDay() // 0=Sun, 1=Mon...
  const padCount = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // Mon-based offset

  return (
    <div className="glass rounded-2xl p-4 mb-6">
      <h3 className="text-sm font-semibold text-text mb-3">Last 5 Weeks</h3>
      <div className="grid grid-cols-7 gap-1.5">
        {weekdays.map((d, i) => (
          <div key={i} className="text-center text-text-muted text-[9px] font-medium pb-1" aria-label={d.full}>{d.abbr}</div>
        ))}
        {Array.from({ length: padCount }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((d, i) => (
          <div
            key={i}
            className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-medium transition-all ${
              d.isToday
                ? d.active
                  ? 'bg-accent text-white ring-1 ring-accent-glow'
                  : 'bg-bg-card-hover text-text-dim ring-1 ring-border'
                : d.active
                ? 'bg-accent/40 text-accent-glow'
                : 'bg-bg-card text-text-muted'
            }`}
            title={`${d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${d.active ? ' — active' : ''}${d.isToday ? ' (today)' : ''}`}
            aria-label={`${d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${d.active ? ', streak active' : ', no streak'}${d.isToday ? ', today' : ''}`}
          >
            {d.date.getDate()}
          </div>
        ))}
      </div>
    </div>
  )
}

function MoodChart({ journal }: { journal: JournalEntry[] }) {
  const last14 = journal.slice(-14)
  if (last14.length < 2) return null

  const avgMood = last14.reduce((sum, e) => sum + e.mood, 0) / last14.length

  return (
    <div className="glass rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text">Mood Trend</h3>
        <span className="text-text-muted text-[10px]">Last {last14.length} entries</span>
      </div>
      <div className="flex items-end gap-1 h-16 mb-2" role="img" aria-label="Mood chart showing recent mood entries">
        {last14.map((entry, i) => (
          <div
            key={entry.id}
            className="flex-1 rounded-t-sm transition-all"
            style={{
              height: `${(entry.mood / 5) * 100}%`,
              backgroundColor: entry.mood >= 4
                ? 'var(--color-success)'
                : entry.mood >= 3
                ? 'var(--color-accent)'
                : 'var(--color-accent-dim)',
              opacity: 0.3 + (i / last14.length) * 0.7,
            }}
            title={`${MOODS[entry.mood]} ${new Date(entry.date).toLocaleDateString()}`}
            aria-hidden="true"
          />
        ))}
      </div>
      <div className="flex justify-between items-center">
        <span className="text-text-muted text-[10px]">Average: {MOODS[Math.round(avgMood)]} {avgMood.toFixed(1)}/5</span>
        {last14.length >= 7 && (
          <span className={`text-[10px] font-semibold ${
            last14.slice(-7).reduce((s, e) => s + e.mood, 0) / 7 >
            last14.slice(0, 7).reduce((s, e) => s + e.mood, 0) / Math.min(7, last14.slice(0, 7).length)
              ? 'text-success' : 'text-text-muted'
          }`}>
            {last14.slice(-7).reduce((s, e) => s + e.mood, 0) / 7 >
            last14.slice(0, 7).reduce((s, e) => s + e.mood, 0) / Math.min(7, last14.slice(0, 7).length)
              ? 'Trending up' : 'Trending steady'}
          </span>
        )}
      </div>
    </div>
  )
}

export default function Stats({ currentDays, longestStreak, totalCleanDays, totalResets, streaks, startDate, moneySaved, dailyCost, journal, onExport, onImport }: Props) {
  const isPersonalBest = currentDays > 0 && currentDays >= longestStreak
  const avgStreak = streaks.length > 0
    ? Math.round(streaks.reduce((a, b) => a + b, 0) / streaks.length)
    : 0
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="px-6 pt-[max(2rem,calc(env(safe-area-inset-top)+0.5rem))] pb-8">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h2 className="text-xl font-bold text-text mb-1">Your Stats</h2>
        <p className="text-text-dim text-xs">Every number tells a story of strength.</p>
      </div>

      {/* Primary stat card */}
      <div className="glass-accent rounded-2xl p-6 mb-4 text-center animate-fade-in-delay-1 glow-accent">
        <AnimatedNumber value={currentDays} className="text-5xl font-bold text-text mb-1" />
        <p className="text-text-dim text-sm">current streak</p>
        {isPersonalBest && currentDays > 0 && (
          <span className="inline-flex items-center gap-1 mt-3 text-xs bg-success/10 border border-success/20 text-success px-3 py-1 rounded-full">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9.5L3 11L3.5 7.5L1 5L4.5 4.5L6 1Z" fill="currentColor" />
            </svg>
            Personal Best
          </span>
        )}
      </div>

      {/* Streak Calendar */}
      <div className="animate-fade-in-delay-1">
        <StreakCalendar currentDays={currentDays} startDate={startDate} />
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-in-delay-2">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-text">{longestStreak}</p>
          <p className="text-text-muted text-[11px] mt-1">Longest</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-text">{totalCleanDays}</p>
          <p className="text-text-muted text-[11px] mt-1">Total Clean</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-text">{totalResets}</p>
          <p className="text-text-muted text-[11px] mt-1">Resets</p>
        </div>
      </div>

      {/* Mood Chart */}
      {journal.length >= 2 && (
        <div className="animate-fade-in-delay-2">
          <MoodChart journal={journal} />
        </div>
      )}

      {/* Improvement indicator */}
      {streaks.length > 0 && (
        <div className="glass rounded-2xl p-4 mb-6 animate-fade-in-delay-2">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-text-dim text-xs font-medium">Average Streak</p>
              <p className="text-text text-lg font-bold">{avgStreak} days</p>
            </div>
            {currentDays > avgStreak && (
              <div className="bg-success/10 border border-success/20 rounded-xl px-3 py-2">
                <p className="text-success text-xs font-semibold">
                  +{currentDays - avgStreak}d above avg
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Money Saved */}
      {moneySaved !== null && dailyCost !== null && (
        <div className="glass-accent rounded-2xl p-4 mb-6 animate-fade-in-delay-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-dim text-xs font-medium">Total Saved</p>
              <div className="flex items-baseline gap-1">
                <span className="text-success text-2xl font-bold">$</span>
                <AnimatedNumber value={Math.floor(moneySaved)} duration={1200} className="text-success text-2xl font-bold tabular-nums" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-text-muted text-[10px]">${dailyCost}/day</p>
              <p className="text-text-muted text-[10px]">${Math.round(dailyCost * 30)}/month</p>
            </div>
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="mb-6">
        <Badges currentDays={currentDays} longestStreak={longestStreak} />
      </div>

      {/* Streak History */}
      {streaks.length > 0 ? (
        <div className="animate-fade-in-delay-3">
          <h3 className="text-sm font-semibold text-text mb-3">Streak History</h3>
          <div className="flex flex-col gap-2" role="list" aria-label="Past streak history">
            {[...streaks].reverse().slice(0, 10).map((s, i) => {
              const pct = Math.max(10, (s / Math.max(longestStreak, 1)) * 100)
              return (
                <div key={i} className="flex items-center gap-3" role="listitem" aria-label={`Streak #${streaks.length - i}: ${s} ${s === 1 ? 'day' : 'days'}${s === longestStreak ? ' — longest streak' : ''}`}>
                  <span className="text-text-muted text-[11px] w-5 text-right">#{streaks.length - i}</span>
                  <div className="flex-1 h-6 bg-border/50 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: s === longestStreak
                          ? 'linear-gradient(90deg, var(--color-accent), var(--color-success))'
                          : 'var(--color-accent-dim)',
                      }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-text-secondary">
                      {s} {s === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-8 text-center animate-fade-in-delay-3">
          <p className="text-3xl mb-3">🎯</p>
          <p className="text-text-dim text-sm">No past streaks yet.</p>
          <p className="text-text-muted text-xs mt-1">Keep this one going!</p>
        </div>
      )}

      {/* Data Export/Import */}
      <div className="mt-8 pt-6 border-t border-border animate-fade-in-delay-3">
        <h3 className="text-sm font-semibold text-text mb-3">Your Data</h3>
        <p className="text-text-muted text-xs mb-4">Export a backup or restore from a previous one. Your data never leaves your device.</p>
        <div className="flex gap-3">
          <button
            onClick={() => { haptic('tap'); onExport() }}
            className="flex-1 bg-bg-card border border-border hover:border-accent/30 text-text-dim font-medium text-sm py-3 rounded-xl transition-all active:scale-[0.97] flex items-center justify-center gap-2"
            aria-label="Export backup to JSON file"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export Backup
          </button>
          <button
            onClick={() => { haptic('tap'); fileInputRef.current?.click() }}
            className="flex-1 bg-bg-card border border-border hover:border-accent/30 text-text-dim font-medium text-sm py-3 rounded-xl transition-all active:scale-[0.97] flex items-center justify-center gap-2"
            aria-label="Import backup from JSON file"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import Backup
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          aria-label="Select backup file to import"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) onImport(file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
