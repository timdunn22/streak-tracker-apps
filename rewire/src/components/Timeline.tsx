import { useState } from 'react'
import { config } from '../config'
import { haptic } from '../hooks/useHaptic'
import { formatNumber } from '../utils/format'

interface Props {
  currentDays: number
}

type View = 'milestones' | 'recovery'

export default function Timeline({ currentDays }: Props) {
  const milestones = config.milestones
  const recovery = config.recoveryTimeline || []
  const [view, setView] = useState<View>(recovery.length > 0 ? 'recovery' : 'milestones')

  return (
    <div className="px-6 pt-[max(2rem,calc(env(safe-area-inset-top)+0.5rem))] pb-8" role="region" aria-label="Recovery timeline">
      <div className="mb-6 animate-fade-in">
        <h2 className="text-xl font-bold text-text mb-1">Recovery Timeline</h2>
        <p className="text-text-dim text-xs">See how far you've come and what's ahead.</p>
      </div>

      {recovery.length > 0 && (
        <div className="flex gap-2 mb-6 animate-fade-in" role="tablist" aria-label="Timeline view">
          <button
            onClick={() => { haptic('tap'); setView('recovery') }}
            role="tab"
            id="tab-recovery"
            aria-selected={view === 'recovery'}
            aria-controls="tabpanel-recovery"
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ease-out min-h-[44px] active:scale-[0.97] ${
              view === 'recovery'
                ? 'bg-accent/10 border border-accent/20 text-accent-glow'
                : 'bg-bg-card border border-border text-text-muted'
            }`}
          >
            Your Body
          </button>
          <button
            onClick={() => { haptic('tap'); setView('milestones') }}
            role="tab"
            id="tab-milestones"
            aria-selected={view === 'milestones'}
            aria-controls="tabpanel-milestones"
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ease-out min-h-[44px] active:scale-[0.97] ${
              view === 'milestones'
                ? 'bg-accent/10 border border-accent/20 text-accent-glow'
                : 'bg-bg-card border border-border text-text-muted'
            }`}
          >
            Milestones
          </button>
        </div>
      )}

      {view === 'recovery' && recovery.length > 0 && (
        <div role="tabpanel" id="tabpanel-recovery" aria-labelledby="tab-recovery">
          <RecoveryTimeline currentDays={currentDays} events={recovery} />
        </div>
      )}

      {view === 'milestones' && (
        <div role="tabpanel" id="tabpanel-milestones" aria-labelledby="tab-milestones">
          <MilestoneTimeline currentDays={currentDays} milestones={milestones} />
        </div>
      )}
    </div>
  )
}

function RecoveryTimeline({ currentDays, events }: { currentDays: number; events: typeof config.recoveryTimeline & {} }) {
  // Find the current recovery phase
  const currentEventIdx = events.findIndex(e => e.day > currentDays)
  const activeIdx = currentEventIdx === -1 ? events.length - 1 : Math.max(0, currentEventIdx - 1)

  return (
    <>
      {/* Current status card */}
      <div className="glass-accent rounded-2xl p-4 mb-6 animate-fade-in-delay-1 glow-accent">
        <p className="text-accent-glow text-[10px] font-semibold tracking-widest uppercase mb-1">What's Happening Now</p>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{events[activeIdx].icon}</span>
          <div>
            <h3 className="text-text text-sm font-semibold">{events[activeIdx].title}</h3>
            <p className="text-text-secondary text-xs leading-relaxed mt-0.5">{events[activeIdx].description}</p>
          </div>
        </div>
        {currentEventIdx > 0 && currentEventIdx < events.length && (() => {
          const range = events[currentEventIdx].day - events[activeIdx].day
          const pct = range > 0 ? Math.min(100, ((currentDays - events[activeIdx].day) / range) * 100) : 0
          return (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-text-muted text-[10px]">Next: {events[currentEventIdx].title}</span>
              <span className="text-accent-glow text-[10px] font-semibold tabular-nums">{formatNumber(events[currentEventIdx].day - currentDays)} {events[currentEventIdx].day - currentDays === 1 ? 'day' : 'days'} away</span>
            </div>
            <div className="w-full h-1 bg-border rounded-full mt-1.5 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to ${events[currentEventIdx].title}`}>
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                }}
              />
            </div>
          </div>)
        })()
        )}
      </div>

      {/* Full timeline */}
      <div className="relative">
        <div className="absolute left-[18px] top-2 bottom-2 w-[2px] bg-border rounded-full" />
        <div
          className="absolute left-[18px] top-2 w-[2px] bg-accent rounded-full transition-all duration-500"
          style={{
            height: `${events.length > 0 ? Math.min(
              (events.filter(e => currentDays >= e.day).length / events.length) * 100,
              100
            ) : 0}%`,
          }}
        />

        <div className="flex flex-col gap-3">
          {events.map((event, i) => {
            const unlocked = currentDays >= event.day
            const isActive = i === activeIdx && currentDays >= event.day
            const isNext = !unlocked && (events.findIndex(e => e.day > currentDays) === i)

            return (
              <div
                key={event.day}
                className="relative flex items-start gap-4 pl-11"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div
                  className={`absolute left-2.5 top-3 w-[14px] h-[14px] rounded-full transition-all duration-500 flex items-center justify-center ${
                    isActive
                      ? 'bg-accent animate-breathe'
                      : unlocked
                      ? 'bg-accent'
                      : isNext
                      ? 'bg-bg border-2 border-accent'
                      : 'bg-bg border-2 border-border'
                  }`}
                  style={{
                    boxShadow: isActive
                      ? '0 0 12px var(--color-accent), 0 0 4px var(--color-accent)'
                      : unlocked
                      ? '0 0 10px var(--color-accent), 0 0 3px var(--color-accent)'
                      : 'none',
                  }}
                >
                  {unlocked && (
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                <div
                  className={`rounded-xl p-4 w-full transition-all ${
                    isActive
                      ? 'glass-accent glow-accent'
                      : unlocked
                      ? 'glass'
                      : isNext
                      ? 'glass-accent'
                      : 'opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{event.icon}</span>
                      <h3 className={`text-sm font-semibold ${isActive || unlocked ? 'text-text' : 'text-text-dim'}`}>
                        {event.title}
                      </h3>
                    </div>
                    <span className={`text-[11px] font-medium ${
                      isActive ? 'text-accent-glow' : unlocked ? 'text-success' : isNext ? 'text-accent-glow' : 'text-text-muted'
                    }`}>
                      {isActive ? 'You are here' : unlocked ? `Day ${formatNumber(event.day)}` : isNext ? `${formatNumber(event.day - currentDays)} ${event.day - currentDays === 1 ? 'day' : 'days'} away` : `Day ${formatNumber(event.day)}`}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isActive || unlocked ? 'text-text-secondary' : 'text-text-muted'}`}>
                    {event.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function MilestoneTimeline({ currentDays, milestones }: { currentDays: number; milestones: typeof config.milestones }) {
  return (
    <>
      <div className="glass-accent rounded-2xl p-4 mb-6 animate-fade-in-delay-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-accent-glow text-xs font-semibold">
              {milestones.filter(m => currentDays >= m.day).length} of {milestones.length} milestones
            </p>
            <p className="text-text-muted text-[11px] mt-0.5">unlocked</p>
          </div>
          <div className="flex gap-1" aria-hidden="true">
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
            height: `${milestones.length > 0 ? Math.min(
              (milestones.filter(m => currentDays >= m.day).length / milestones.length) * 100,
              100
            ) : 0}%`,
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
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none" aria-hidden="true">
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
                      {unlocked ? `Day ${formatNumber(m.day)}` : isNext ? `${formatNumber(daysAway)} ${daysAway === 1 ? 'day' : 'days'} away` : `Day ${formatNumber(m.day)}`}
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
    </>
  )
}
