import { config } from '../config'

interface Props {
  currentDays: number
}

export default function Timeline({ currentDays }: Props) {
  const milestones = config.milestones

  return (
    <div className="px-6 pt-8 pb-8">
      <div className="mb-6 animate-fade-in">
        <h2 className="text-xl font-bold text-text mb-1">Recovery Timeline</h2>
        <p className="text-text-dim text-xs">Your progress. Here's what's happening.</p>
      </div>

      <div className="glass-accent rounded-2xl p-4 mb-6 animate-fade-in-delay-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-accent-glow text-xs font-semibold">
              {milestones.filter(m => currentDays >= m.day).length} of {milestones.length} milestones
            </p>
            <p className="text-text-muted text-[11px] mt-0.5">unlocked</p>
          </div>
          <div className="flex gap-1">
            {milestones.map(m => (
              <div
                key={m.day}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentDays >= m.day ? 'bg-accent' : 'bg-border'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-[18px] top-2 bottom-2 w-[2px] bg-border rounded-full" />
        <div
          className="absolute left-[18px] top-2 w-[2px] bg-accent rounded-full transition-all duration-500"
          style={{
            height: `${Math.min(
              (milestones.filter(m => currentDays >= m.day).length / milestones.length) * 100,
              100
            )}%`,
          }}
        />

        <div className="flex flex-col gap-3">
          {milestones.map((m, i) => {
            const unlocked = currentDays >= m.day
            const isNext = !unlocked && (milestones.findIndex(ms => ms.day > currentDays) === i)
            const daysAway = m.day - currentDays

            return (
              <div
                key={m.day}
                className="relative flex items-start gap-4 pl-11"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div
                  className={`absolute left-2.5 top-3 w-[14px] h-[14px] rounded-full transition-all duration-500 flex items-center justify-center ${
                    unlocked
                      ? 'bg-accent'
                      : isNext
                      ? 'bg-bg border-2 border-accent'
                      : 'bg-bg border-2 border-border'
                  }`}
                  style={{
                    boxShadow: unlocked ? '0 0 10px var(--color-accent), 0 0 3px var(--color-accent)' : 'none',
                  }}
                >
                  {unlocked && (
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                <div
                  className={`rounded-xl p-4 w-full transition-all ${
                    unlocked
                      ? 'glass'
                      : isNext
                      ? 'glass-accent'
                      : 'opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{m.icon}</span>
                      <h3 className={`text-sm font-semibold ${unlocked ? 'text-text' : 'text-text-dim'}`}>
                        {m.label}
                      </h3>
                    </div>
                    <span className={`text-[11px] font-medium ${
                      unlocked ? 'text-success' : isNext ? 'text-accent-glow' : 'text-text-muted'
                    }`}>
                      {unlocked ? 'Day ' + m.day : isNext ? `${daysAway}d away` : `Day ${m.day}`}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed ${unlocked ? 'text-text-secondary' : 'text-text-muted'}`}>
                    {m.message}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
