import { useState, useEffect, useRef } from 'react'
import { useStreak } from './hooks/useStreak'
import { useMilestoneAlert } from './hooks/useMilestoneAlert'
import { config } from './config'
import { haptic } from './hooks/useHaptic'
import StreakCounter from './components/StreakCounter'
import Timeline from './components/Timeline'
import Stats from './components/Stats'
import ShareCard from './components/ShareCard'
import MilestoneModal from './components/MilestoneModal'

type Tab = 'home' | 'timeline' | 'stats' | 'share'
const TAB_ORDER: Tab[] = ['home', 'timeline', 'stats', 'share']

function App() {
  const { currentDays, longestStreak, totalCleanDays, totalResets, isActive, startStreak, resetStreak, startDate, data, freezesAvailable, useFreeze, dailyCost, setDailyCost, moneySaved } = useStreak()
  const [tab, setTab] = useState<Tab>('home')
  const [slideDir, setSlideDir] = useState<'left' | 'right' | 'none'>('none')
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null)
  const prevTabRef = useRef<Tab>('home')

  useMilestoneAlert(currentDays, setActiveMilestone)

  const switchTab = (next: Tab) => {
    if (next === tab) return
    haptic('tap')
    const prevIdx = TAB_ORDER.indexOf(prevTabRef.current)
    const nextIdx = TAB_ORDER.indexOf(next)
    setSlideDir(nextIdx > prevIdx ? 'left' : 'right')
    prevTabRef.current = next
    setTab(next)
  }

  // Apply dynamic theme colors from config + request persistent storage
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--color-accent', config.accentColor)
    root.style.setProperty('--color-accent-glow', config.accentGlow)
    root.style.setProperty('--color-accent-dim', config.accentDim)
    root.style.setProperty('--color-glow-purple', config.accentColor + '1f')
    root.style.setProperty('--color-border-accent', config.accentColor + '33')
    document.title = `${config.name} — ${config.tagline}`

    // Dynamic favicon from config colors
    const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${config.accentColor}"/><stop offset="100%" style="stop-color:${config.accentGlow}"/></linearGradient></defs><circle cx="50" cy="50" r="48" fill="url(#g)"/><text x="50" y="66" text-anchor="middle" font-size="50" font-family="Arial" font-weight="bold" fill="white">${config.name[0]}</text></svg>`
    const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    if (link) link.href = `data:image/svg+xml,${encodeURIComponent(svgFavicon)}`

    // Request persistent storage to prevent data eviction
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist()
    }
  }, [])

  return (
    <div className="flex flex-col min-h-full bg-bg">
      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div
          className={slideDir === 'left' ? 'tab-slide-left' : slideDir === 'right' ? 'tab-slide-right' : 'tab-content'}
          key={tab}
        >
          {tab === 'home' && (
            <StreakCounter
              days={currentDays}
              isActive={isActive}
              startDate={startDate}
              longestStreak={longestStreak}
              totalResets={totalResets}
              onStart={startStreak}
              onReset={resetStreak}
              freezesAvailable={freezesAvailable}
              onUseFreeze={useFreeze}
              dailyCost={dailyCost}
              moneySaved={moneySaved}
              onSetDailyCost={setDailyCost}
            />
          )}
          {tab === 'timeline' && <Timeline currentDays={currentDays} />}
          {tab === 'stats' && (
            <Stats
              currentDays={currentDays}
              longestStreak={longestStreak}
              totalCleanDays={totalCleanDays}
              totalResets={totalResets}
              streaks={data.streaks}
              startDate={startDate}
              moneySaved={moneySaved}
              dailyCost={dailyCost}
            />
          )}
          {tab === 'share' && <ShareCard days={currentDays} longestStreak={longestStreak} />}
        </div>
      </div>

      {/* Bottom Navigation — always visible so users can access stats/timeline after reset */}
      <nav className="fixed bottom-0 left-0 right-0 bg-bg/80 backdrop-blur-xl border-t border-border z-50" aria-label="App navigation">
        <div className="flex justify-around items-center max-w-lg mx-auto py-2 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <NavItem
            label="Streak"
            active={tab === 'home'}
            onClick={() => switchTab('home')}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            }
          />
          <NavItem
            label="Timeline"
            active={tab === 'timeline'}
            onClick={() => switchTab('timeline')}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="20" x2="12" y2="4"/>
                <polyline points="6 10 12 4 18 10"/>
              </svg>
            }
          />
          <NavItem
            label="Stats"
            active={tab === 'stats'}
            onClick={() => switchTab('stats')}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="12" width="4" height="8" rx="1"/>
                <rect x="10" y="8" width="4" height="12" rx="1"/>
                <rect x="17" y="4" width="4" height="16" rx="1"/>
              </svg>
            }
          />
          <NavItem
            label="Share"
            active={tab === 'share'}
            onClick={() => switchTab('share')}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            }
          />
        </div>
      </nav>
      {/* Milestone celebration modal */}
      <MilestoneModal milestone={activeMilestone} onClose={() => setActiveMilestone(null)} />
    </div>
  )
}

function NavItem({ label, active, onClick, icon }: {
  label: string
  active: boolean
  onClick: () => void
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center gap-0.5 px-5 py-2 rounded-2xl transition-all duration-200 ${
        active
          ? 'text-accent-glow'
          : 'text-text-muted hover:text-text-dim'
      }`}
    >
      <div className={`transition-all duration-200 ${active ? 'scale-110' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-semibold tracking-wide">{label}</span>
      {active && (
        <div className="w-1 h-1 rounded-full bg-accent-glow mt-0.5" aria-hidden="true" />
      )}
    </button>
  )
}

export default App
