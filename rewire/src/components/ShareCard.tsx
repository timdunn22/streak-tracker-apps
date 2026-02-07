import { useRef, useState } from 'react'
import { config } from '../config'

interface Props {
  days: number
  longestStreak: number
}

export default function ShareCard({ days, longestStreak }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const getMessage = () => {
    if (days < 3) return 'The journey begins.'
    if (days < 7) return 'Pushing through.'
    if (days < 14) return 'Building momentum.'
    if (days < 30) return 'Getting stronger.'
    if (days < 60) return 'Deep into recovery.'
    if (days < 90) return 'Almost there.'
    if (days < 180) return 'Transformed.'
    if (days < 365) return 'Living proof.'
    return 'One year. Legendary.'
  }

  const getPhase = () => {
    for (const phase of config.phases) {
      if (days < phase.maxDay) return phase.label.toUpperCase()
    }
    return config.phases[config.phases.length - 1].label.toUpperCase()
  }

  const generateAndShare = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setStatus('saving')

    const w = 1080
    const h = 1350
    canvas.width = w
    canvas.height = h

    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#08080f')
    grad.addColorStop(0.5, '#0d0d18')
    grad.addColorStop(1, '#08080f')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    const glow1 = ctx.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, 400)
    glow1.addColorStop(0, config.accentColor + '1f')
    glow1.addColorStop(1, config.accentColor + '00')
    ctx.fillStyle = glow1
    ctx.fillRect(0, 0, w, h)

    const glow2 = ctx.createRadialGradient(w / 2, h * 0.7, 0, w / 2, h * 0.7, 300)
    glow2.addColorStop(0, config.successColor + '0f')
    glow2.addColorStop(1, config.successColor + '00')
    ctx.fillStyle = glow2
    ctx.fillRect(0, 0, w, h)

    const cx = w / 2
    const cy = h * 0.35
    const r = 160
    const progress = Math.min(days / config.goalDays, 1)

    ctx.lineWidth = 8
    ctx.lineCap = 'round'

    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.stroke()

    if (progress > 0) {
      ctx.beginPath()
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress)
      ctx.strokeStyle = days >= config.goalDays ? config.successColor : config.accentColor
      ctx.stroke()
    }

    ctx.fillStyle = '#f4f4f8'
    ctx.font = 'bold 120px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${days}`, cx, cy - 10)

    ctx.fillStyle = '#7a7a95'
    ctx.font = '500 28px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(days === 1 ? config.unitLabelSingular : config.unitLabel, cx, cy + 50)

    ctx.fillStyle = days >= config.goalDays ? config.successColor : config.accentGlow
    ctx.font = '600 18px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(getPhase(), cx, cy - r - 40)

    ctx.fillStyle = '#c0c0d0'
    ctx.font = '500 32px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(getMessage(), cx, h * 0.58)

    const statsY = h * 0.68
    const stats = [
      { val: `${Math.floor(days / 7)}`, label: 'WEEKS' },
      { val: `${Math.min(100, Math.round((days / config.goalDays) * 100))}%`, label: 'PROGRESS' },
      { val: `${longestStreak}`, label: 'BEST' },
    ]

    stats.forEach((stat, i) => {
      const x = w / 2 + (i - 1) * 200
      ctx.fillStyle = '#f4f4f8'
      ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillText(stat.val, x, statsY)
      ctx.fillStyle = '#44445a'
      ctx.font = '600 14px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillText(stat.label, x, statsY + 30)
    })

    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    stats.forEach((_, i) => {
      if (i < stats.length - 1) {
        const x = w / 2 + (i - 0.5) * 200
        ctx.beginPath()
        ctx.moveTo(x, statsY - 30)
        ctx.lineTo(x, statsY + 40)
        ctx.stroke()
      }
    })

    ctx.fillStyle = '#44445a'
    ctx.font = '500 22px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(config.name, cx, h - 80)

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      )
      if (!blob) { setStatus('idle'); return }

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `${config.id}-streak.png`, { type: 'image/png' })
        const shareData = { files: [file], title: `Day ${days} — ${config.name}` }
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData)
          setStatus('idle')
          return
        }
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${config.id}-day-${days}.png`
      a.click()
      URL.revokeObjectURL(url)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('idle')
    }
  }

  return (
    <div className="px-6 pt-8 pb-8">
      <div className="mb-6 animate-fade-in">
        <h2 className="text-xl font-bold text-text mb-1">Share Progress</h2>
        <p className="text-text-dim text-xs">Generate a card to share on TikTok, Instagram, or X.</p>
      </div>

      <div className="glass rounded-2xl overflow-hidden mb-5 animate-fade-in-delay-1">
        <div className="bg-mesh p-8 text-center">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
              <circle
                cx="50" cy="50" r="44"
                fill="none"
                stroke={days >= config.goalDays ? 'var(--color-success)' : 'var(--color-accent)'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={2 * Math.PI * 44 * (1 - Math.min(days / config.goalDays, 1))}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-text">{days}</span>
              <span className="text-text-muted text-[10px]">{days === 1 ? config.unitLabelSingular : config.unitLabel}</span>
            </div>
          </div>

          <p className="text-accent-glow text-sm font-medium mb-1">{getMessage()}</p>

          <div className="flex justify-center gap-6 mt-4">
            <div className="text-center">
              <p className="text-text text-sm font-bold">{Math.floor(days / 7)}</p>
              <p className="text-text-muted text-[10px]">weeks</p>
            </div>
            <div className="text-center">
              <p className="text-text text-sm font-bold">{Math.min(100, Math.round((days / config.goalDays) * 100))}%</p>
              <p className="text-text-muted text-[10px]">progress</p>
            </div>
            <div className="text-center">
              <p className="text-text text-sm font-bold">{longestStreak}</p>
              <p className="text-text-muted text-[10px]">best</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={generateAndShare}
        disabled={status === 'saving'}
        className="w-full bg-accent hover:bg-accent-glow disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all duration-200 active:scale-[0.97] glow-accent animate-fade-in-delay-2"
      >
        {status === 'saving' ? 'Generating...' : status === 'saved' ? 'Saved!' : 'Download Share Card'}
      </button>

      <p className="text-text-muted text-[11px] text-center mt-3 animate-fade-in-delay-3">
        Generates a 1080x1350 image — perfect for TikTok and Instagram
      </p>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
