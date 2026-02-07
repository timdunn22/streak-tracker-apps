import { useState } from 'react'
import { config } from '../config'
import { haptic } from '../hooks/useHaptic'
import AnimatedNumber from './AnimatedNumber'

interface Props {
  days: number
  dailyCost: number | null
  moneySaved: number | null
  onSetCost: (cost: number) => void
}

export default function MoneySaved({ days, dailyCost, moneySaved, onSetCost }: Props) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState(dailyCost?.toString() || config.defaultDailyCost?.toString() || '')

  if (!config.defaultDailyCost && !dailyCost) return null

  if (dailyCost === null && !editing) {
    return (
      <div className="glass rounded-2xl p-4 w-full max-w-sm mb-6 animate-fade-in-delay-2">
        <div className="text-center">
          <p className="text-text-dim text-xs mb-2">Track how much you're saving</p>
          <button
            onClick={() => { haptic('tap'); setEditing(true) }}
            className="text-accent-glow text-sm font-semibold"
          >
            Set daily spending
          </button>
        </div>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="glass-accent rounded-2xl p-5 w-full max-w-sm mb-6 animate-slide-down">
        <p className="text-text-dim text-xs mb-3 text-center">
          How much did you spend per day {config.costLabel || 'on this habit'}?
        </p>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-text text-lg font-bold">$</span>
          <input
            type="number"
            inputMode="decimal"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={config.defaultDailyCost?.toString() || '0'}
            className="flex-1 bg-bg-card border border-border rounded-xl px-3 py-2.5 text-text text-lg font-semibold text-center outline-none focus:border-accent transition-colors"
            autoFocus
          />
          <span className="text-text-muted text-sm">/day</span>
        </div>
        <button
          onClick={() => {
            const val = parseFloat(inputVal) || config.defaultDailyCost || 0
            if (val > 0) {
              haptic('success')
              onSetCost(val)
              setEditing(false)
            }
          }}
          className="w-full bg-accent hover:bg-accent-glow text-white font-semibold text-sm py-3 rounded-xl transition-all active:scale-[0.97]"
        >
          Save
        </button>
      </div>
    )
  }

  return (
    <div className="glass-accent rounded-2xl p-4 w-full max-w-sm mb-6 animate-fade-in-delay-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-dim text-xs font-medium">Money Saved</p>
          <div className="flex items-baseline gap-1">
            <span className="text-text text-2xl font-bold">$</span>
            <AnimatedNumber
              value={Math.floor(moneySaved || 0)}
              duration={1200}
              className="text-text text-2xl font-bold tabular-nums"
            />
          </div>
          <p className="text-text-muted text-[10px] mt-0.5">
            ${dailyCost}/day × {days} days
          </p>
        </div>
        <button
          onClick={() => { haptic('tap'); setEditing(true) }}
          className="text-text-muted text-[10px] hover:text-text-dim transition-colors"
        >
          Edit
        </button>
      </div>
    </div>
  )
}
