import { useState } from 'react'
import { useLiveTimer } from '../hooks/useLiveTimer'
import { config } from '../config'
import GrowthTree from './GrowthTree'
import WeeklyRecap from './WeeklyRecap'

interface Props {
  days: number
  isActive: boolean
  startDate: string | null
  longestStreak: number
  totalResets: number
  onStart: () => void
  onReset: () => void
}

function getDailyQuote(daysSinceStart: number): string {
  return config.quotes[daysSinceStart % config.quotes.length]
}

export default function StreakCounter({ days, isActive, startDate, longestStreak, totalResets, onStart, onReset }: Props) {
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const liveTime = useLiveTimer(startDate)

  const getPhase = () => {
    for (const phase of config.phases) {
      if (days < phase.maxDay) return { label: phase.label, color: phase.color }
    }
    const last = config.phases[config.phases.length - 1]
    return { label: last.label, color: last.color }
  }

  const progress = Math.min(days / config.goalDays, 1)
  const circumference = 2 * Math.PI * 88
  const phase = getPhase()

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] px-8 bg-mesh">
        <div className="animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-8 glow-accent">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-glow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-text tracking-tight mb-3 animate-fade-in-delay-1">
          {config.name}
        </h1>

        <p className="text-text-dim text-center mb-3 max-w-[280px] leading-relaxed text-[15px] animate-fade-in-delay-2">
          {config.tagline}
        </p>

        <p className="text-text-muted text-center mb-12 max-w-[260px] text-xs leading-relaxed animate-fade-in-delay-2">
          100% private. No account needed. Your data stays on your device.
        </p>

        <button
          onClick={onStart}
          className="w-full max-w-[280px] bg-accent hover:bg-accent-glow text-white font-semibold text-base py-4 rounded-2xl transition-all duration-200 active:scale-[0.97] glow-accent animate-fade-in-delay-3"
        >
          Start My Journey
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center pt-14 pb-6 px-6 bg-mesh min-h-[85vh]">
      <div className={`animate-fade-in mb-8`}>
        <span className={`text-xs font-semibold tracking-widest uppercase ${phase.color}`}>
          {phase.label}
        </span>
      </div>

      <div className="relative w-64 h-64 mb-8 animate-fade-in">
        {/* Breathing glow ring behind the SVG */}
        {days > 0 && (
          <div
            className="absolute inset-2 rounded-full animate-breathe"
            style={{
              background: `radial-gradient(circle, ${
                days >= config.goalDays ? 'var(--color-success)' : 'var(--color-accent)'
              }15 40%, transparent 70%)`,
            }}
          />
        )}
        <svg className="relative w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100" cy="100" r="88"
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="6"
          />
          <circle
            cx="100" cy="100" r="88"
            fill="none"
            stroke={days >= config.goalDays ? 'var(--color-success)' : 'var(--color-accent)'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            className="transition-all duration-1000 ease-out"
            style={{
              filter: days >= config.goalDays
                ? 'drop-shadow(0 0 12px var(--color-success)) drop-shadow(0 0 4px var(--color-success))'
                : days > 0
                ? 'drop-shadow(0 0 8px var(--color-accent))'
                : 'none',
            }}
          />
          {days > 0 && (
            <circle
              cx="100" cy="100" r="88"
              fill="none"
              stroke="url(#ringGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="transition-all duration-1000 ease-out"
              opacity="0.3"
            />
          )}
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent-glow)" />
              <stop offset="100%" stopColor="var(--color-success)" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-7xl font-bold text-text tracking-tighter animate-count tabular-nums">{days}</span>
          <span className="text-text-dim text-sm mt-1 font-medium">
            {days === 1 ? config.unitLabelSingular : config.unitLabel}
          </span>
          <span className="text-text-muted text-xs mt-1 tabular-nums">
            {String(liveTime.hours).padStart(2, '0')}:{String(liveTime.minutes).padStart(2, '0')}:{String(liveTime.seconds).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="mb-6 animate-fade-in-delay-1">
        <GrowthTree days={days} />
      </div>

      <div className="flex gap-6 mb-8 animate-fade-in-delay-1">
        <div className="text-center">
          <p className="text-xl font-bold text-text tabular-nums">{Math.floor(days / 7)}</p>
          <p className="text-text-muted text-[11px] mt-0.5">weeks</p>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="text-center">
          <p className="text-xl font-bold text-text tabular-nums">{Math.floor(days / 30)}</p>
          <p className="text-text-muted text-[11px] mt-0.5">months</p>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="text-center">
          <p className="text-xl font-bold text-text tabular-nums">{Math.round((days / config.goalDays) * 100)}%</p>
          <p className="text-text-muted text-[11px] mt-0.5">to goal</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 w-full max-w-sm mb-8 animate-fade-in-delay-2">
        <p className="text-text-secondary text-[13px] leading-relaxed text-center italic">
          "{getDailyQuote(days)}"
        </p>
      </div>

      <WeeklyRecap currentDays={days} longestStreak={longestStreak} totalResets={totalResets} />

      {days < 365 && (
        <NextMilestone days={days} />
      )}

      <div className="mt-auto pt-6 animate-fade-in-delay-3">
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-text-muted text-xs hover:text-danger/70 transition-colors py-2 px-4"
          >
            I relapsed
          </button>
        ) : (
          <div className="flex flex-col items-center gap-3 glass rounded-2xl p-5 w-full max-w-sm">
            <p className="text-text-secondary text-sm text-center leading-relaxed">
              It's okay. Setbacks don't erase progress. Every day still counts.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 bg-bg-card-hover text-text-dim py-3 rounded-xl text-sm font-medium transition-all hover:text-text active:scale-[0.97]"
              >
                Keep Going
              </button>
              <button
                onClick={() => {
                  onReset()
                  setShowResetConfirm(false)
                }}
                className="flex-1 bg-danger/10 border border-danger/20 text-danger py-3 rounded-xl text-sm font-medium transition-all hover:bg-danger/20 active:scale-[0.97]"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function NextMilestone({ days }: { days: number }) {
  const milestoneList = config.milestones
  const next = milestoneList.find(m => m.day > days)
  if (!next) return null
  const daysLeft = next.day - days
  const prevMilestone = milestoneList.filter(m => m.day <= days).pop()
  const prevDay = prevMilestone ? prevMilestone.day : 0
  const segmentProgress = (days - prevDay) / (next.day - prevDay)

  return (
    <div className="glass-accent rounded-2xl p-4 w-full max-w-sm animate-fade-in-delay-2">
      <div className="flex justify-between items-center mb-2">
        <span className="text-text-dim text-xs font-medium">Next: {next.label}</span>
        <span className="text-accent-glow text-xs font-semibold">{daysLeft}d left</span>
      </div>
      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500"
          style={{ width: `${segmentProgress * 100}%` }}
        />
      </div>
    </div>
  )
}
