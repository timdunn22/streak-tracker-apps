import { useState, useEffect, useRef, useCallback } from 'react'
import { useLiveTimer } from '../hooks/useLiveTimer'
import { config } from '../config'
import { haptic } from '../hooks/useHaptic'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { formatNumber } from '../utils/format'
import AnimatedNumber from './AnimatedNumber'
import GrowthTree from './GrowthTree'
import WeeklyRecap from './WeeklyRecap'
import DailyCheckIn from './DailyCheckIn'
import FloatingParticles from './FloatingParticles'
import MoneySaved from './MoneySaved'
import Journal from './Journal'
import type { JournalEntry } from '../hooks/useStreak'

/** Returns a responsive font-size class based on day count digits to prevent overflow on small screens. */
function getDaysFontClass(days: number): string {
  if (days >= 10000) return 'text-4xl sm:text-5xl'
  if (days >= 1000) return 'text-5xl sm:text-6xl'
  return 'text-7xl'
}

/** Debounce guard: prevents double-tap within 600ms on critical actions */
function useDebounceAction() {
  const lastRef = useRef(0)
  return useCallback((fn: () => void) => {
    const now = Date.now()
    if (now - lastRef.current < 600) return
    lastRef.current = now
    fn()
  }, [])
}

const WELCOME_KEY = `${config.id}-welcome-seen`

interface Props {
  days: number
  isActive: boolean
  startDate: string | null
  longestStreak: number
  totalResets: number
  totalCleanDays: number
  onStart: () => void
  onReset: () => void
  freezesAvailable: number
  onUseFreeze: () => boolean
  dailyCost: number | null
  moneySaved: number | null
  onSetDailyCost: (cost: number) => void
  onShowBreathing: () => void
  journal: JournalEntry[]
  onAddJournal: (mood: number, text: string, triggers?: string[]) => void
  onDeleteJournal: (id: string) => void
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

function getDailyQuote(daysSinceStart: number): string {
  return config.quotes[daysSinceStart % config.quotes.length]
}

export default function StreakCounter({ days, isActive, startDate, longestStreak, totalResets, totalCleanDays, onStart, onReset, freezesAvailable, onUseFreeze, dailyCost, moneySaved, onSetDailyCost, onShowBreathing, journal, onAddJournal, onDeleteJournal, showToast }: Props) {
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const liveTime = useLiveTimer(startDate)
  const { canInstall, install } = useInstallPrompt()
  const guardAction = useDebounceAction()

  // "Welcome back" banner for returning users after 7+ days of inactivity
  const [showWelcomeBack, setShowWelcomeBack] = useState(false)
  useEffect(() => {
    if (!isActive || days === 0) return
    try {
      const LAST_VISIT_KEY = `${config.id}-last-visit`
      const SESSION_KEY = `${config.id}-wb-seen`
      const lastVisit = localStorage.getItem(LAST_VISIT_KEY)
      const alreadyShown = sessionStorage.getItem(SESSION_KEY)
      // Update last visit timestamp
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString())
      if (alreadyShown) return
      if (lastVisit) {
        const daysSinceVisit = Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86400000)
        if (daysSinceVisit >= 7) {
          sessionStorage.setItem(SESSION_KEY, '1')
          const timer = setTimeout(() => setShowWelcomeBack(true), 800)
          const dismiss = setTimeout(() => setShowWelcomeBack(false), 10000)
          return () => { clearTimeout(timer); clearTimeout(dismiss) }
        }
      } else {
        // First-ever visit with an active streak (e.g. imported data) -- don't show
        sessionStorage.setItem(SESSION_KEY, '1')
      }
    } catch { /* storage unavailable */ }
  }, [isActive, days])

  // Show welcome tooltip for first-time users (day 0, first ever streak)
  useEffect(() => {
    if (isActive && days === 0 && totalResets === 0) {
      try {
        if (!localStorage.getItem(WELCOME_KEY)) {
          const timer = setTimeout(() => setShowWelcome(true), 1500)
          const dismiss = setTimeout(() => {
            setShowWelcome(false)
            try { localStorage.setItem(WELCOME_KEY, '1') } catch { /* quota */ }
          }, 8000)
          return () => { clearTimeout(timer); clearTimeout(dismiss) }
        }
      } catch { /* localStorage unavailable */ }
    }
  }, [isActive, days, totalResets])

  // Handle Escape key to dismiss the reset confirmation alertdialog,
  // matching the keyboard behavior of MilestoneModal and BreathingExercise.
  const resetDialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!showResetConfirm) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowResetConfirm(false)
      }
      // Focus trap within the alertdialog
      if (e.key === 'Tab' && resetDialogRef.current) {
        const focusable = resetDialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus() }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus() }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    // Auto-focus the first button in the dialog for keyboard users
    const rafId = requestAnimationFrame(() => {
      const firstBtn = resetDialogRef.current?.querySelector<HTMLElement>('button')
      firstBtn?.focus()
    })
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      cancelAnimationFrame(rafId)
    }
  }, [showResetConfirm])

  const getPhase = () => {
    for (const phase of config.phases) {
      if (days < phase.maxDay) return { label: phase.label, color: phase.color }
    }
    const last = config.phases[config.phases.length - 1]
    return { label: last.label, color: last.color }
  }

  // Guard against division by zero if goalDays is ever misconfigured
  const progress = config.goalDays > 0 ? Math.min(days / config.goalDays, 1) : 0
  const circumference = 2 * Math.PI * 88
  const phase = getPhase()

  if (!isActive) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[85vh] px-8 bg-mesh pt-[env(safe-area-inset-top)]">
        <FloatingParticles />
        <div className="animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-8 glow-accent animate-breathe">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-glow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
          100% private. No account needed. Your data never leaves your device.
        </p>

        <button
          onClick={() => guardAction(() => { haptic('success'); onStart() })}
          className="w-full max-w-[280px] bg-accent hover:bg-accent-glow text-white font-semibold text-base py-4 rounded-2xl transition-all duration-200 ease-out active:scale-[0.97] glow-accent animate-fade-in-delay-3 min-h-[44px]"
        >
          Start My Journey
        </button>

        {canInstall && (
          <button
            onClick={() => { haptic('tap'); install() }}
            className="mt-4 w-full max-w-[280px] bg-bg-card border border-border text-text-dim font-medium text-sm py-3 rounded-2xl transition-all duration-200 ease-out active:scale-[0.97] animate-fade-in-delay-3 flex items-center justify-center gap-2 min-h-[44px]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Install App
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center pt-[max(3.5rem,calc(env(safe-area-inset-top)+1rem))] pb-6 px-6 bg-mesh min-h-[85vh]">
      <div className={`animate-fade-in mb-6 flex items-center gap-3`}>
        <span className={`text-xs font-semibold tracking-widest uppercase ${phase.color}`}>
          {phase.label}
        </span>
        {freezesAvailable > 0 && (
          <div className="flex gap-0.5" title={`${freezesAvailable} streak freeze${freezesAvailable > 1 ? 's' : ''} available`} aria-label={`${freezesAvailable} streak freeze${freezesAvailable > 1 ? 's' : ''} available`}>
            {Array.from({ length: freezesAvailable }).map((_, i) => (
              <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="var(--color-accent-glow)" opacity="0.6" aria-hidden="true">
                <path d="M12 2L9 9H2l6 5-2 7 6-4 6 4-2-7 6-5h-7z"/>
              </svg>
            ))}
          </div>
        )}
      </div>

      <div className="relative w-64 h-64 mb-6 animate-fade-in">
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
        <svg className="relative w-full h-full -rotate-90" viewBox="0 0 200 200" role="img" aria-label={`Streak progress: ${Math.min(100, Math.round(progress * 100))}% toward ${config.goalDays}-day goal`}>
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

        <div className="absolute inset-0 flex flex-col items-center justify-center" aria-live="polite" aria-atomic="true">
          <AnimatedNumber value={days} className={`${getDaysFontClass(days)} font-bold text-text tracking-tighter animate-count tabular-nums`} />
          <span className="text-text-dim text-sm mt-1 font-medium">
            {days === 1 ? config.unitLabelSingular : config.unitLabel}
          </span>
          {days >= config.goalDays && (
            <span className="text-success text-[9px] font-semibold mt-0.5">Goal reached!</span>
          )}
          <span className="text-text-muted text-xs mt-1 tabular-nums" aria-label={`${String(liveTime.hours).padStart(2, '0')} hours ${String(liveTime.minutes).padStart(2, '0')} minutes ${String(liveTime.seconds).padStart(2, '0')} seconds`}>
            {String(liveTime.hours).padStart(2, '0')}:{String(liveTime.minutes).padStart(2, '0')}:{String(liveTime.seconds).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* First-time welcome tooltip */}
      {showWelcome && (
        <div className="w-full max-w-sm mb-4 animate-slide-down" role="status" aria-live="polite">
          <div className="glass-accent rounded-2xl p-4 text-center relative">
            <button
              onClick={() => {
                setShowWelcome(false)
                try { localStorage.setItem(WELCOME_KEY, '1') } catch { /* quota */ }
              }}
              className="absolute top-2 right-2 text-text-muted hover:text-text-dim transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Dismiss welcome message"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <p className="text-accent-glow text-xs font-semibold tracking-wide uppercase mb-1">Welcome</p>
            <p className="text-text-secondary text-xs leading-relaxed">
              Your journey has begun! Swipe between tabs to explore your Timeline, Stats, and Share card. Check in daily and journal to build your streak.
            </p>
          </div>
        </div>
      )}

      {/* Welcome back banner for returning users */}
      {showWelcomeBack && (
        <div className="w-full max-w-sm mb-4 animate-slide-down" role="status" aria-live="polite">
          <div className="glass-accent rounded-2xl p-4 text-center relative">
            <button
              onClick={() => setShowWelcomeBack(false)}
              className="absolute top-2 right-2 text-text-muted hover:text-text-dim transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Dismiss welcome back message"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <p className="text-accent-glow text-xs font-semibold tracking-wide uppercase mb-1">Welcome Back</p>
            <p className="text-text-secondary text-xs leading-relaxed">
              {days > 0
                ? `Great to see you again! You're on day ${formatNumber(days)}. Every day counts.`
                : "Great to see you again! Ready to continue your journey?"
              }
            </p>
          </div>
        </div>
      )}

      {/* Emergency breathing button */}
      <button
        onClick={() => { haptic('tap'); onShowBreathing() }}
        className="mb-6 flex items-center gap-2 bg-bg-card border border-border hover:border-accent/20 text-text-dim text-xs font-medium py-2.5 px-5 rounded-full transition-all duration-200 ease-out active:scale-[0.97] animate-fade-in"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
          <path d="M9 12h6"/><path d="M12 9v6"/>
        </svg>
        Feeling an urge? Breathe.
      </button>

      <div className="mb-6 animate-fade-in-delay-1">
        <GrowthTree days={days} />
      </div>

      <div className="flex gap-4 sm:gap-6 mb-6 animate-fade-in-delay-1 flex-wrap justify-center">
        {days >= 365 ? (
          <>
            <div className="text-center min-w-0">
              <p className="text-lg sm:text-xl font-bold text-text tabular-nums">{formatNumber(Math.floor(days / 365))}</p>
              <p className="text-text-muted text-[11px] mt-0.5">{Math.floor(days / 365) === 1 ? 'year' : 'years'}</p>
            </div>
            <div className="w-px h-10 bg-border shrink-0" aria-hidden="true" />
          </>
        ) : null}
        <div className="text-center min-w-0">
          <p className="text-lg sm:text-xl font-bold text-text tabular-nums">{formatNumber(Math.floor(days / 30))}</p>
          <p className="text-text-muted text-[11px] mt-0.5">{Math.floor(days / 30) === 1 ? 'month' : 'months'}</p>
        </div>
        <div className="w-px h-10 bg-border shrink-0" aria-hidden="true" />
        {days < 365 && (
          <>
            <div className="text-center min-w-0">
              <p className="text-lg sm:text-xl font-bold text-text tabular-nums">{formatNumber(Math.floor(days / 7))}</p>
              <p className="text-text-muted text-[11px] mt-0.5">{Math.floor(days / 7) === 1 ? 'week' : 'weeks'}</p>
            </div>
            <div className="w-px h-10 bg-border shrink-0" aria-hidden="true" />
          </>
        )}
        <div className="text-center min-w-0">
          <p className="text-lg sm:text-xl font-bold text-text tabular-nums">{config.goalDays > 0 ? Math.min(100, Math.round((days / config.goalDays) * 100)) : 0}%</p>
          <p className="text-text-muted text-[11px] mt-0.5">to goal</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 w-full max-w-sm mb-6 animate-fade-in-delay-2">
        <p className="text-text-secondary text-[13px] leading-relaxed text-center italic">
          "{getDailyQuote(days)}"
        </p>
      </div>

      <MoneySaved days={days} dailyCost={dailyCost} moneySaved={moneySaved} onSetCost={onSetDailyCost} />

      <DailyCheckIn days={days} />

      {/* Journal */}
      <div className="w-full flex justify-center mb-6">
        <Journal entries={journal} onAdd={onAddJournal} onDelete={onDeleteJournal} currentDays={days} showToast={showToast} />
      </div>

      <WeeklyRecap currentDays={days} longestStreak={longestStreak} totalResets={totalResets} />

      <NextMilestone days={days} />

      <div className="mt-auto pt-6 animate-fade-in-delay-3">
        {!showResetConfirm ? (
          <button
            onClick={() => { haptic('tap'); setShowResetConfirm(true) }}
            className="text-text-muted text-xs hover:text-danger/70 transition-colors duration-200 py-3 px-6 min-h-[44px]"
            aria-expanded="false"
            aria-controls="reset-dialog"
          >
            I had a setback
          </button>
        ) : (
          <div ref={resetDialogRef} id="reset-dialog" className="flex flex-col items-center gap-3 glass rounded-2xl p-5 w-full max-w-sm animate-slide-down" role="alertdialog" aria-label="Reset streak confirmation">
            <p className="text-text-secondary text-sm text-center leading-relaxed">
              It's okay — setbacks are part of the journey, not the end of it.
            </p>
            {/* Compassionate stats - show total progress */}
            <div className="flex gap-4 py-2">
              <div className="text-center">
                <p className="text-text text-lg font-bold tabular-nums">{formatNumber(totalCleanDays)}</p>
                <p className="text-text-muted text-[10px]">total clean days</p>
              </div>
              <div className="w-px bg-border" aria-hidden="true" />
              <div className="text-center">
                <p className="text-text text-lg font-bold tabular-nums">{formatNumber(longestStreak)}</p>
                <p className="text-text-muted text-[10px]">personal best</p>
              </div>
            </div>
            <p className="text-accent-glow text-xs text-center italic">
              {days > longestStreak
                ? "This was your longest streak ever. That's real growth."
                : totalResets > 0
                ? `You've been clean ${formatNumber(totalCleanDays)} of your total days. Every single one counts.`
                : "Every day you stayed clean made your brain stronger."
              }
            </p>
            {freezesAvailable > 0 && (
              <button
                onClick={() => guardAction(() => {
                  haptic('success')
                  onUseFreeze()
                  setShowResetConfirm(false)
                })}
                className="w-full bg-accent/10 border border-accent/20 text-accent-glow py-3 rounded-xl text-sm font-semibold transition-all duration-200 ease-out hover:bg-accent/20 active:scale-[0.97] flex items-center justify-center gap-2 min-h-[44px]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2L9 9H2l6 5-2 7 6-4 6 4-2-7 6-5h-7z"/>
                </svg>
                Use Streak Freeze ({freezesAvailable} left)
              </button>
            )}
            <div className="flex gap-3 w-full">
              <button
                onClick={() => { haptic('tap'); setShowResetConfirm(false) }}
                className="flex-1 bg-bg-card-hover text-text-dim py-3 rounded-xl text-sm font-medium transition-all duration-200 ease-out hover:text-text active:scale-[0.97] min-h-[44px]"
              >
                Keep Going
              </button>
              <button
                onClick={() => guardAction(() => {
                  haptic('heavy')
                  onReset()
                  setShowResetConfirm(false)
                })}
                className="flex-1 bg-danger/10 border border-danger/20 text-danger py-3 rounded-xl text-sm font-medium transition-all duration-200 ease-out hover:bg-danger/20 active:scale-[0.97] min-h-[44px]"
              >
                Start Fresh
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
  const segmentRange = next.day - prevDay
  const segmentProgress = segmentRange > 0 ? (days - prevDay) / segmentRange : 0

  return (
    <div className="glass-accent rounded-2xl p-4 w-full max-w-sm animate-fade-in-delay-2">
      <div className="flex justify-between items-center mb-2">
        <span className="text-text-dim text-xs font-medium">Next: {next.label}</span>
        <span className="text-accent-glow text-xs font-semibold tabular-nums">
          {daysLeft === 1 ? '1 day left' : `${formatNumber(daysLeft)} days left`}
        </span>
      </div>
      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(segmentProgress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to ${next.label}: ${Math.round(segmentProgress * 100)}%`}>
        <div
          className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
          style={{ width: `${segmentProgress * 100}%` }}
        />
      </div>
    </div>
  )
}
