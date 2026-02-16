import { useState, useEffect, useRef, useCallback, Component, type ReactNode } from 'react'
import { useStreak } from './hooks/useStreak'
import { useMilestoneAlert } from './hooks/useMilestoneAlert'
import { useSwipeNavigation } from './hooks/useSwipeNavigation'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { config } from './config'
import { haptic } from './hooks/useHaptic'
import StreakCounter from './components/StreakCounter'
import Timeline from './components/Timeline'
import Stats from './components/Stats'
import ShareCard from './components/ShareCard'
import MilestoneModal from './components/MilestoneModal'
import BreathingExercise from './components/BreathingExercise'
import Toast from './components/Toast'

// Error Boundary: catches render errors and shows a recovery UI instead of white-screening
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-bg px-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p className="text-xl font-bold text-text mb-2">Something went wrong</p>
          <p className="text-text-dim text-sm mb-6 max-w-xs leading-relaxed">
            The app encountered an unexpected error. Your streak data is safe in local storage.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="bg-accent hover:bg-accent-glow text-white font-semibold py-3 px-8 rounded-2xl transition-all mb-3 min-h-[44px] active:scale-[0.97]"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="text-text-muted text-xs hover:text-text-dim transition-colors py-3 px-6 min-h-[44px]"
          >
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

type Tab = 'home' | 'timeline' | 'stats' | 'share'
const TAB_ORDER: Tab[] = ['home', 'timeline', 'stats', 'share']

function App() {
  const { currentDays, longestStreak, totalCleanDays, totalResets, isActive, startStreak, resetStreak, startDate, data, freezesAvailable, useFreeze, dailyCost, setDailyCost, moneySaved, addJournalEntry, deleteJournalEntry, exportData, importData } = useStreak()
  const [tab, setTab] = useState<Tab>('home')
  const [slideDir, setSlideDir] = useState<'left' | 'right' | 'none'>('none')
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null)
  const [showBreathing, setShowBreathing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const prevTabRef = useRef<Tab>('home')
  const scrollRef = useRef<HTMLDivElement>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
  }, [])

  const handleExport = useCallback(() => {
    exportData()
    showToast('Backup exported successfully')
  }, [exportData, showToast])

  const handleImport = useCallback(async (file: File) => {
    const success = await importData(file)
    if (success) {
      showToast('Data imported successfully')
    }
  }, [importData, showToast])

  const isOnline = useOnlineStatus()

  useMilestoneAlert(currentDays, setActiveMilestone)

  const switchTab = useCallback((next: Tab) => {
    if (next === tab) return
    haptic('tap')
    const prevIdx = TAB_ORDER.indexOf(prevTabRef.current)
    const nextIdx = TAB_ORDER.indexOf(next)
    setSlideDir(nextIdx > prevIdx ? 'left' : 'right')
    prevTabRef.current = next
    setTab(next)
    // Reset scroll position when switching tabs
    scrollRef.current?.scrollTo({ top: 0 })
  }, [tab])

  // Swipe gesture navigation between tabs
  const swipeHandlers = useSwipeNavigation({
    onSwipeLeft: useCallback(() => {
      const currentIdx = TAB_ORDER.indexOf(tab)
      if (currentIdx < TAB_ORDER.length - 1) {
        switchTab(TAB_ORDER[currentIdx + 1])
      }
    }, [tab, switchTab]),
    onSwipeRight: useCallback(() => {
      const currentIdx = TAB_ORDER.indexOf(tab)
      if (currentIdx > 0) {
        switchTab(TAB_ORDER[currentIdx - 1])
      }
    }, [tab, switchTab]),
  })

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
    // Sanitize values to prevent SVG injection (defense-in-depth; config is developer-controlled)
    const safeColor = (c: string) => /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : '#888'
    const safeLetter = (config.name[0] || 'A').replace(/[<>"'&]/g, '')
    const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${safeColor(config.accentColor)}"/><stop offset="100%" style="stop-color:${safeColor(config.accentGlow)}"/></linearGradient></defs><circle cx="50" cy="50" r="48" fill="url(#g)"/><text x="50" y="66" text-anchor="middle" font-size="50" font-family="Arial" font-weight="bold" fill="white">${safeLetter}</text></svg>`
    const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    if (link) link.href = `data:image/svg+xml,${encodeURIComponent(svgFavicon)}`

    // Request persistent storage to prevent data eviction
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist()
    }
  }, [])

  return (
    <div className="flex flex-col min-h-full bg-bg">
      {/* Toast notifications */}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-warning/15 border-b border-warning/25 backdrop-blur-xl" role="alert" aria-live="assertive">
          <div className="flex items-center justify-center gap-2 py-2 px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
              <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
              <line x1="12" y1="20" x2="12.01" y2="20"/>
            </svg>
            <span className="text-warning text-xs font-medium">You're offline. Your data is saved locally.</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-20" {...swipeHandlers}>
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
              totalCleanDays={totalCleanDays}
              onStart={startStreak}
              onReset={resetStreak}
              freezesAvailable={freezesAvailable}
              onUseFreeze={useFreeze}
              dailyCost={dailyCost}
              moneySaved={moneySaved}
              onSetDailyCost={setDailyCost}
              onShowBreathing={() => setShowBreathing(true)}
              journal={data.journal}
              onAddJournal={addJournalEntry}
              onDeleteJournal={deleteJournalEntry}
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
              journal={data.journal}
              onExport={handleExport}
              onImport={handleImport}
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
      {/* Breathing exercise modal */}
      {showBreathing && <BreathingExercise onClose={() => setShowBreathing(false)} />}
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
      className={`relative flex flex-col items-center gap-0.5 px-5 py-2 rounded-2xl transition-all duration-200 min-w-[44px] min-h-[44px] ${
        active
          ? 'text-accent-glow'
          : 'text-text-muted hover:text-text-dim active:scale-95'
      }`}
    >
      {/* Subtle background glow when active */}
      {active && (
        <div className="absolute inset-0 rounded-2xl bg-accent/8 transition-opacity duration-300" aria-hidden="true" />
      )}
      <div className={`relative transition-all duration-200 ${active ? 'scale-110 -translate-y-0.5' : ''}`}>
        {icon}
      </div>
      <span className={`relative text-[10px] font-semibold tracking-wide transition-all duration-200 ${active ? '-translate-y-0.5' : ''}`}>{label}</span>
      {active && (
        <div className="relative w-4 h-1 rounded-full bg-accent-glow mt-0.5 transition-all duration-300" aria-hidden="true" />
      )}
    </button>
  )
}

function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}

export default AppWithErrorBoundary
