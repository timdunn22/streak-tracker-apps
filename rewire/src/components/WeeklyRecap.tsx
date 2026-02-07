import { config } from '../config'

interface Props {
  currentDays: number
  longestStreak: number
  totalResets: number
}

export default function WeeklyRecap({ currentDays, longestStreak, totalResets }: Props) {
  const currentWeek = Math.floor(currentDays / 7)

  const showRecap = currentDays > 0 && (currentDays % 7 === 0 || (currentDays >= 3 && currentDays < 7))

  if (!showRecap) return null

  const isFirstWeek = currentDays < 7

  if (isFirstWeek) {
    return (
      <div className="glass-accent rounded-2xl p-5 w-full max-w-sm animate-fade-in-delay-2 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">{config.milestones[0]?.icon || '\u{1F4AA}'}</span>
          <h3 className="text-sm font-semibold text-text">Keep Going</h3>
        </div>
        <p className="text-text-secondary text-xs leading-relaxed">
          {currentDays} days in. The first week is the hardest — you're making real progress.
          {7 - currentDays} more days to complete your first full week.
        </p>
      </div>
    )
  }

  const weekLabel = currentWeek === 1 ? '1 Week'
    : currentWeek === 2 ? '2 Weeks'
    : currentWeek === 4 ? '1 Month'
    : currentWeek === 8 ? '2 Months'
    : currentWeek === 12 ? '3 Months'
    : `Week ${currentWeek}`

  const getMessage = () => {
    for (const msg of config.weeklyMessages) {
      if (currentWeek <= msg.maxWeek) return msg.message
    }
    return config.weeklyMessages[config.weeklyMessages.length - 1].message
  }

  const isPersonalBest = currentDays >= longestStreak && totalResets > 0

  return (
    <div className="glass-accent rounded-2xl p-5 w-full max-w-sm animate-fade-in-delay-2 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{'\u{1F4C5}'}</span>
          <h3 className="text-sm font-semibold text-text">Weekly Recap</h3>
        </div>
        <span className="text-accent-glow text-xs font-semibold">{weekLabel}</span>
      </div>

      <p className="text-text-secondary text-xs leading-relaxed mb-3">
        {getMessage()}
      </p>

      <div className="flex gap-3">
        <div className="flex-1 bg-bg-card rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-text tabular-nums">{currentDays}</p>
          <p className="text-text-muted text-[10px]">days</p>
        </div>
        <div className="flex-1 bg-bg-card rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-text tabular-nums">{currentWeek}</p>
          <p className="text-text-muted text-[10px]">weeks</p>
        </div>
        <div className="flex-1 bg-bg-card rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-text tabular-nums">{Math.round((currentDays / config.goalDays) * 100)}%</p>
          <p className="text-text-muted text-[10px]">to goal</p>
        </div>
      </div>

      {isPersonalBest && (
        <div className="mt-3 bg-success/10 border border-success/20 rounded-xl px-3 py-2 text-center">
          <p className="text-success text-xs font-semibold">This is your longest streak ever!</p>
        </div>
      )}
    </div>
  )
}
