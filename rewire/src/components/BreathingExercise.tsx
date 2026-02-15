import { useState, useEffect, useRef, useCallback } from 'react'
import { haptic } from '../hooks/useHaptic'

interface Props {
  onClose: () => void
}

type Phase = 'idle' | 'inhale' | 'hold' | 'exhale'

const PHASES: { phase: Phase; duration: number; label: string }[] = [
  { phase: 'inhale', duration: 4000, label: 'Breathe In' },
  { phase: 'hold', duration: 7000, label: 'Hold' },
  { phase: 'exhale', duration: 8000, label: 'Breathe Out' },
]

const ENCOURAGEMENTS = [
  'You are stronger than this urge.',
  'This craving will pass in a few minutes.',
  "You've survived every urge so far \u2014 100%.",
  "Breathe through it. You're in control.",
  'The discomfort is temporary. Your progress is real.',
  'Every second you resist rewires your brain.',
  'You chose this path for a reason. Remember why.',
  "This feeling is proof that you're healing.",
]

export default function BreathingExercise({ onClose }: Props) {
  const [active, setActive] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [cycle, setCycle] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [totalCycles] = useState(4)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const phaseIndexRef = useRef(0)

  const encouragement = ENCOURAGEMENTS[cycle % ENCOURAGEMENTS.length]

  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }, [])

  const runPhase = useCallback((phaseIdx: number, currentCycle: number) => {
    if (currentCycle >= totalCycles) {
      setPhase('idle')
      setActive(false)
      haptic('success')
      return
    }

    const p = PHASES[phaseIdx]
    setPhase(p.phase)
    setSecondsLeft(Math.ceil(p.duration / 1000))
    phaseIndexRef.current = phaseIdx

    if (p.phase === 'inhale') haptic('tap')

    countdownRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    timerRef.current = setTimeout(() => {
      if (countdownRef.current) clearInterval(countdownRef.current)
      const nextIdx = phaseIdx + 1
      if (nextIdx >= PHASES.length) {
        setCycle(currentCycle + 1)
        runPhase(0, currentCycle + 1)
      } else {
        runPhase(nextIdx, currentCycle)
      }
    }, p.duration)
  }, [totalCycles])

  const start = () => {
    cleanup()
    setActive(true)
    setCycle(0)
    haptic('tap')
    runPhase(0, 0)
  }

  const stop = () => {
    cleanup()
    setActive(false)
    setPhase('idle')
    setCycle(0)
  }

  useEffect(() => cleanup, [cleanup])

  // Handle Escape key and scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose, cleanup])

  const getCircleScale = () => {
    if (phase === 'inhale') return 'scale-100'
    if (phase === 'hold') return 'scale-100'
    if (phase === 'exhale') return 'scale-75'
    return 'scale-75'
  }

  const getCircleDuration = () => {
    if (phase === 'inhale') return 'duration-[4000ms]'
    if (phase === 'hold') return 'duration-[100ms]'
    if (phase === 'exhale') return 'duration-[8000ms]'
    return 'duration-300'
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/90 backdrop-blur-xl" onClick={onClose} role="dialog" aria-modal="true" aria-label="Breathing exercise">
      <div className="relative w-full max-w-sm mx-8 text-center" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-text-muted hover:text-text transition-colors p-2"
          aria-label="Close breathing exercise"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {!active ? (
          <div className="animate-fade-in">
            <div className="text-4xl mb-4">🫁</div>
            <h2 className="text-xl font-bold text-text mb-2">Feeling an Urge?</h2>
            <p className="text-text-dim text-sm mb-2 leading-relaxed">
              Try the 4-7-8 breathing technique. It activates your parasympathetic nervous system and reduces cravings.
            </p>
            <p className="text-text-muted text-xs mb-8">4 cycles — about 80 seconds total</p>

            <button
              onClick={start}
              className="w-full bg-accent hover:bg-accent-glow text-white font-semibold py-4 rounded-2xl transition-all duration-200 active:scale-[0.97] glow-accent"
            >
              Start Breathing
            </button>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="relative w-48 h-48 mx-auto mb-8">
              <div
                className={`absolute inset-0 rounded-full transition-transform ease-in-out ${getCircleScale()} ${getCircleDuration()}`}
                style={{
                  background: phase === 'hold'
                    ? 'radial-gradient(circle, var(--color-accent-glow) 0%, var(--color-accent) 60%, transparent 70%)'
                    : 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)',
                  opacity: 0.3,
                }}
              />
              <div
                className={`absolute inset-4 rounded-full border-2 transition-transform ease-in-out ${getCircleScale()} ${getCircleDuration()}`}
                style={{
                  borderColor: phase === 'hold' ? 'var(--color-accent-glow)' : 'var(--color-accent)',
                  boxShadow: `0 0 20px var(--color-accent), 0 0 40px color-mix(in srgb, var(--color-accent) 30%, transparent)`,
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-text tabular-nums">{secondsLeft}</span>
              </div>
            </div>

            <p className="text-accent-glow text-lg font-semibold mb-2 tracking-wide">
              {phase === 'inhale' && 'Breathe In'}
              {phase === 'hold' && 'Hold'}
              {phase === 'exhale' && 'Breathe Out'}
            </p>

            <p className="text-text-muted text-xs mb-6">
              Cycle {Math.min(cycle + 1, totalCycles)} of {totalCycles}
            </p>

            <p className="text-text-secondary text-sm italic leading-relaxed mb-8 px-4">
              "{encouragement}"
            </p>

            <button
              onClick={stop}
              className="text-text-muted text-xs hover:text-text-dim transition-colors py-2 px-4"
            >
              Stop
            </button>
          </div>
        )}

        {!active && cycle >= totalCycles && cycle > 0 && (
          <div className="mt-6 glass rounded-2xl p-4 animate-fade-in">
            <p className="text-success text-sm font-semibold mb-1">Great work!</p>
            <p className="text-text-dim text-xs">The craving has likely passed. You're in control.</p>
          </div>
        )}
      </div>
    </div>
  )
}
