import { useState, useEffect } from 'react'
import { config } from '../config'
import { haptic } from '../hooks/useHaptic'
import { formatCurrencyDecimal, formatNumber } from '../utils/format'
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
  const [inputError, setInputError] = useState(false)

  // Sync input value when dailyCost changes externally (e.g. data import)
  // but only when not actively editing to avoid overwriting user input
  useEffect(() => {
    if (!editing && dailyCost !== null) {
      setInputVal(dailyCost.toString())
    }
  }, [dailyCost, editing])

  if (!config.defaultDailyCost && !dailyCost) return null

  const validateAndSave = () => {
    const val = parseFloat(inputVal) || config.defaultDailyCost || 0
    if (val > 0 && val <= 10000) {
      haptic('success')
      onSetCost(val)
      setEditing(false)
      setInputError(false)
    } else {
      setInputError(true)
      haptic('warning')
    }
  }

  if (dailyCost === null && !editing) {
    return (
      <div className="glass rounded-2xl p-4 w-full max-w-sm mb-6 animate-fade-in-delay-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-text-dim text-xs font-medium">Track how much you're saving</p>
            <p className="text-text-muted text-[10px]">See the money you keep by staying clean</p>
          </div>
          <button
            onClick={() => { haptic('tap'); setEditing(true) }}
            className="text-accent-glow text-xs font-semibold py-2 px-4 min-h-[44px] min-w-[44px] rounded-xl bg-accent/10 border border-accent/20 transition-all duration-200 ease-out active:scale-[0.97]"
          >
            Set up
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
        <div className="flex items-center gap-2 mb-2">
          <span className="text-text text-lg font-bold" aria-hidden="true">$</span>
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={inputVal}
            onChange={(e) => { setInputVal(e.target.value); setInputError(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') validateAndSave() }}
            placeholder={config.defaultDailyCost?.toString() || '0'}
            className={`flex-1 bg-bg-card border rounded-xl px-3 py-2.5 text-text text-lg font-semibold text-center outline-none transition-colors ${
              inputError ? 'border-danger/50 focus:border-danger' : 'border-border focus:border-accent'
            }`}
            autoFocus
            aria-label="Daily spending amount in dollars"
            aria-describedby="cost-hint"
            aria-invalid={inputError}
          />
          <span className="text-text-muted text-sm" aria-hidden="true">/day</span>
        </div>
        <p id="cost-hint" className={`text-[10px] text-center mb-3 ${inputError ? 'text-danger' : 'text-text-muted'}`}>
          {inputError ? 'Please enter a valid amount between $0.01 and $10,000' : 'Enter a value greater than 0. Press Enter or tap Save.'}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => { setEditing(false); setInputError(false) }}
            className="flex-1 bg-bg-card border border-border text-text-dim font-medium text-sm py-3 rounded-xl transition-all duration-200 ease-out active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            onClick={validateAndSave}
            className="flex-1 bg-accent hover:bg-accent-glow text-white font-semibold text-sm py-3 rounded-xl transition-all duration-200 ease-out active:scale-[0.97]"
          >
            Save
          </button>
        </div>
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
          <p className="text-text-muted text-[10px] mt-0.5 tabular-nums">
            {formatCurrencyDecimal(dailyCost!)}/day &times; {formatNumber(days)} {days === 1 ? 'day' : 'days'}
          </p>
        </div>
        <button
          onClick={() => { haptic('tap'); setEditing(true) }}
          className="text-text-muted text-[10px] hover:text-text-dim transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-[0.97]"
          aria-label="Edit daily spending amount"
        >
          Edit
        </button>
      </div>
    </div>
  )
}
