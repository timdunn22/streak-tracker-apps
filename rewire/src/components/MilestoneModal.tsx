import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { config } from '../config'
import { haptic } from '../hooks/useHaptic'

interface Props {
  milestone: number | null
  onClose: () => void
}

function Confetti({ show }: { show: boolean }) {
  const particles = useMemo(() => {
    const colors = [config.accentColor, config.accentGlow, config.successColor, '#fbbf24', '#f472b6', '#818cf8']
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 0.8}s`,
      duration: `${1.8 + Math.random() * 1.2}s`,
      size: `${6 + Math.random() * 6}px`,
      rotation: `${Math.random() * 360}deg`,
      xDrift: `${(Math.random() - 0.5) * 120}px`,
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
    }))
  }, [])

  if (!show) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            top: '-10px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            borderRadius: p.borderRadius,
            '--x-drift': p.xDrift,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

export default function MilestoneModal({ milestone, onClose }: Props) {
  const [show, setShow] = useState(false)
  const continueRef = useRef<HTMLButtonElement>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (milestone) {
      haptic('success')
      const timer = setTimeout(() => {
        setShow(true)
        // Focus the Continue button after animation
        setTimeout(() => continueRef.current?.focus(), 500)
      }, 100)
      document.addEventListener('keydown', handleKeyDown)
      // Prevent background scrolling
      document.body.style.overflow = 'hidden'
      return () => {
        clearTimeout(timer)
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
      }
    } else {
      setShow(false)
    }
  }, [milestone, handleKeyDown])

  if (!milestone) return null
  const data = config.milestones.find(m => m.day === milestone)
  if (!data) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center px-8 transition-all duration-500 ${
        show ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Milestone unlocked: ${data.label}`}
    >
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-md" />

      <Confetti show={show} />

      <div
        className={`relative glass-accent rounded-3xl p-8 max-w-sm w-full text-center glow-accent transition-all duration-500 ${
          show ? 'scale-100 translate-y-0' : 'scale-90 translate-y-4'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full transition-all duration-1000 ${
              show ? 'opacity-100 scale-150' : 'opacity-0 scale-50'
            }`}
            style={{
              background: `radial-gradient(circle, ${config.accentColor}33 0%, transparent 70%)`,
            }}
          />
        </div>

        <div className="relative">
          <div
            className={`text-6xl mb-4 transition-all duration-700 ${
              show ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            {data.icon}
          </div>

          <p className="text-accent-glow text-xs font-semibold tracking-widest uppercase mb-2">
            Milestone Unlocked
          </p>
          <h2 className="text-2xl font-bold text-shimmer mb-3">{data.label}</h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-6">{data.message}</p>

          <div className="flex gap-3 justify-center">
            <button
              ref={continueRef}
              onClick={() => { haptic('tap'); onClose() }}
              className="bg-accent hover:bg-accent-glow text-white font-semibold py-3 px-8 rounded-2xl transition-all duration-200 active:scale-[0.97]"
            >
              Continue
            </button>
            <button
              onClick={async () => {
                haptic('tap')
                const text = `Day ${milestone} — ${data.label}! Tracking with ${config.name}`
                if (navigator.share) {
                  try { await navigator.share({ title: `${config.name} Milestone`, text, url: window.location.origin }) } catch {}
                } else if (navigator.clipboard) {
                  navigator.clipboard.writeText(text)
                }
                onClose()
              }}
              className="bg-bg-card border border-border hover:border-accent/30 text-text-dim font-semibold py-3 px-6 rounded-2xl transition-all duration-200 active:scale-[0.97]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="inline mr-1"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
