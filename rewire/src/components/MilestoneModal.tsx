import { useEffect, useState } from 'react'
import { config } from '../config'

interface Props {
  milestone: number | null
  onClose: () => void
}

export default function MilestoneModal({ milestone, onClose }: Props) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (milestone) {
      const timer = setTimeout(() => setShow(true), 100)
      return () => clearTimeout(timer)
    } else {
      setShow(false)
    }
  }, [milestone])

  if (!milestone) return null
  const data = config.milestones.find(m => m.day === milestone)
  if (!data) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center px-8 transition-all duration-500 ${
        show ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-md" />

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
          <h2 className="text-2xl font-bold text-text mb-3">{data.label}</h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-6">{data.message}</p>

          <button
            onClick={onClose}
            className="bg-accent hover:bg-accent-glow text-white font-semibold py-3 px-8 rounded-2xl transition-all duration-200 active:scale-[0.97]"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
