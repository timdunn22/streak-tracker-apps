interface Props {
  currentDays: number
  longestStreak: number
  totalCleanDays: number
  totalResets: number
  streaks: number[]
}

export default function Stats({ currentDays, longestStreak, totalCleanDays, totalResets, streaks }: Props) {
  const isPersonalBest = currentDays > 0 && currentDays >= longestStreak
  const avgStreak = streaks.length > 0
    ? Math.round(streaks.reduce((a, b) => a + b, 0) / streaks.length)
    : 0

  return (
    <div className="px-6 pt-8 pb-8">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h2 className="text-xl font-bold text-text mb-1">Your Stats</h2>
        <p className="text-text-dim text-xs">Every number tells a story of strength.</p>
      </div>

      {/* Primary stat card */}
      <div className="glass-accent rounded-2xl p-6 mb-4 text-center animate-fade-in-delay-1 glow-accent">
        <p className="text-5xl font-bold text-text mb-1">{currentDays}</p>
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

      {/* Streak History */}
      {streaks.length > 0 ? (
        <div className="animate-fade-in-delay-3">
          <h3 className="text-sm font-semibold text-text mb-3">Streak History</h3>
          <div className="flex flex-col gap-2">
            {[...streaks].reverse().slice(0, 10).map((s, i) => {
              const pct = Math.max(10, (s / Math.max(longestStreak, 1)) * 100)
              return (
                <div key={i} className="flex items-center gap-3">
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
    </div>
  )
}
