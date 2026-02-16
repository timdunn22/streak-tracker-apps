import { useState, useRef, useCallback, useEffect } from 'react'
import { config } from '../config'
import { haptic } from '../hooks/useHaptic'
import { formatRelativeDate } from '../utils/format'
import type { JournalEntry } from '../hooks/useStreak'

interface Props {
  entries: JournalEntry[]
  onAdd: (mood: number, text: string, triggers?: string[]) => void
  onDelete: (id: string) => void
  currentDays: number
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void
}

const MOODS = [
  { value: 1, emoji: '😣', label: 'Struggling' },
  { value: 2, emoji: '😔', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '💪', label: 'Strong' },
]

/** Truncates long journal entries (200+ chars) with an expand toggle */
function JournalEntryText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > 200

  if (!isLong) {
    return <p className="text-text-secondary text-xs leading-relaxed break-words">{text}</p>
  }

  return (
    <div>
      <p className="text-text-secondary text-xs leading-relaxed break-words">
        {expanded ? text : `${text.slice(0, 200)}...`}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-accent-glow text-[10px] font-medium mt-1 min-h-[36px] py-1"
        aria-expanded={expanded}
      >
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </div>
  )
}

export default function Journal({ entries, onAdd, onDelete, currentDays, showToast }: Props) {
  const [isWriting, setIsWriting] = useState(false)
  const [mood, setMood] = useState(3)
  const [text, setText] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  // Undo delete: hold onto deleted entry and a timer ref
  const [deletedEntry, setDeletedEntry] = useState<JournalEntry | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Clean up undo timer on unmount to prevent memory leaks and
  // state updates after the component is removed from the tree
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
        undoTimerRef.current = null
      }
    }
  }, [])

  const confirmDelete = useCallback((id: string) => {
    haptic('tap')
    setPendingDeleteId(id)
  }, [])

  const executeDelete = useCallback(() => {
    if (pendingDeleteId) {
      haptic('heavy')
      // Save the entry before deleting so user can undo
      const entry = entries.find(e => e.id === pendingDeleteId)
      if (entry) {
        setDeletedEntry(entry)
        // Clear any previous undo timer
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
        // Auto-clear undo after 5 seconds
        undoTimerRef.current = setTimeout(() => {
          setDeletedEntry(null)
          undoTimerRef.current = null
        }, 5000)
      }
      onDelete(pendingDeleteId)
      setPendingDeleteId(null)
      if (showToast) showToast('Entry deleted. Tap undo to restore.', 'info')
    }
  }, [pendingDeleteId, onDelete, entries, showToast])

  const undoDelete = useCallback(() => {
    if (deletedEntry) {
      haptic('success')
      onAdd(deletedEntry.mood, deletedEntry.text, deletedEntry.triggers)
      setDeletedEntry(null)
      if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null }
      if (showToast) showToast('Entry restored.', 'success')
    }
  }, [deletedEntry, onAdd, showToast])

  const prompts = config.journalPrompts || []
  const todaysPrompt = prompts.length > 0 ? prompts[currentDays % prompts.length] : null

  const hasEntryToday = entries.some(e => {
    const entryDate = new Date(e.date).toDateString()
    return entryDate === new Date().toDateString()
  })

  const submit = () => {
    if (!text.trim()) return
    haptic('success')
    onAdd(mood, text.trim())
    setText('')
    setMood(3)
    setIsWriting(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  const [showAllEntries, setShowAllEntries] = useState(false)
  const reversedEntries = [...entries].reverse()
  const recentEntries = showAllEntries ? reversedEntries : reversedEntries.slice(0, 5)
  const hasMore = reversedEntries.length > 5

  return (
    <div className="w-full max-w-sm">
      {!isWriting ? (
        <button
          onClick={() => { haptic('tap'); setIsWriting(true) }}
          className="w-full glass rounded-2xl p-4 text-left transition-all duration-200 ease-out hover:border-accent/20 active:scale-[0.99] animate-fade-in-delay-2"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-glow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
              </svg>
              <span className="text-text-dim text-sm font-medium">Daily Journal</span>
            </div>
            {hasEntryToday && (
              <span className="text-success text-[10px] font-semibold flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Done today
              </span>
            )}
          </div>
          {todaysPrompt && (
            <p className="text-text-muted text-xs italic">"{todaysPrompt}"</p>
          )}
        </button>
      ) : (
        <div className="glass rounded-2xl p-4 animate-slide-down">
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-dim text-sm font-medium">How are you feeling?</span>
            <button
              onClick={() => { setIsWriting(false); setText('') }}
              className="text-text-muted text-xs hover:text-text-dim transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              Cancel
            </button>
          </div>

          <div className="flex justify-between mb-4" role="radiogroup" aria-label="Select your mood">
            {MOODS.map(m => (
              <button
                key={m.value}
                onClick={() => { haptic('tap'); setMood(m.value) }}
                className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all ${
                  mood === m.value
                    ? 'bg-accent/10 border border-accent/20 scale-110'
                    : 'opacity-50 hover:opacity-75'
                }`}
                role="radio"
                aria-checked={mood === m.value}
                aria-label={`${m.label} mood`}
              >
                <span className="text-xl" aria-hidden="true">{m.emoji}</span>
                <span className="text-[9px] text-text-muted">{m.label}</span>
              </button>
            ))}
          </div>

          {todaysPrompt && (
            <p className="text-accent-glow text-[11px] italic mb-2">Prompt: {todaysPrompt}</p>
          )}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What happened today? Any triggers, wins, or reflections..."
            className="w-full bg-bg-card border border-border rounded-xl p-3 text-text text-sm placeholder:text-text-muted resize-none h-24 focus:outline-none focus:border-accent/30 transition-colors duration-200"
            maxLength={1000}
            autoFocus
            aria-label="Journal entry text"
          />

          <div className="flex items-center justify-between mt-3">
            <span className={`text-[10px] tabular-nums ${text.length > 900 ? 'text-warning' : 'text-text-muted'}`}>{text.length}/1,000</span>
            <button
              onClick={submit}
              disabled={!text.trim()}
              className="bg-accent hover:bg-accent-glow disabled:opacity-30 disabled:active:scale-100 text-white font-semibold text-sm py-2 px-6 rounded-xl transition-all duration-200 ease-out active:scale-[0.97] min-h-[44px]"
            >
              Save Entry
            </button>
          </div>
        </div>
      )}

      {!isWriting && recentEntries.length === 0 && (
        <div className="mt-3 glass rounded-xl p-4 text-center animate-fade-in-delay-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 opacity-50" aria-hidden="true">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
          </svg>
          <p className="text-text-muted text-xs leading-relaxed">
            Your journal is empty. Writing even a few words helps you recognize patterns and build self-awareness.
          </p>
        </div>
      )}

      {recentEntries.length > 0 && !isWriting && (
        <div className="mt-3 space-y-2 animate-fade-in-delay-3">
          {recentEntries.map(entry => (
            <div key={entry.id} className="glass rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{MOODS.find(m => m.value === entry.mood)?.emoji || '😐'}</span>
                  <span className="text-text-muted text-[10px]">{formatRelativeDate(entry.date)}</span>
                </div>
                {pendingDeleteId === entry.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPendingDeleteId(null)}
                      className="text-text-muted text-[10px] py-2 px-3 rounded-lg hover:text-text-dim transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Cancel delete"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeDelete}
                      className="text-danger text-[10px] font-semibold py-2 px-3 rounded-lg bg-danger/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Confirm delete entry"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => confirmDelete(entry.id)}
                    className="text-text-muted hover:text-danger text-[10px] transition-all p-2.5 -mr-2.5 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={`Delete journal entry from ${formatRelativeDate(entry.date)}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
              <JournalEntryText text={entry.text} />
            </div>
          ))}
          {hasMore && !showAllEntries && (
            <button
              onClick={() => { haptic('tap'); setShowAllEntries(true) }}
              className="w-full text-accent-glow text-xs font-semibold py-2.5 rounded-xl bg-accent/5 border border-accent/10 transition-all duration-200 active:scale-[0.99] min-h-[44px]"
            >
              Show all {reversedEntries.length} entries
            </button>
          )}
          {showAllEntries && hasMore && (
            <button
              onClick={() => { haptic('tap'); setShowAllEntries(false) }}
              className="w-full text-text-muted text-xs font-medium py-2.5 rounded-xl transition-all duration-200 active:scale-[0.99] min-h-[44px]"
            >
              Show less
            </button>
          )}
        </div>
      )}

      {/* Undo delete banner */}
      {deletedEntry && !isWriting && (
        <div className="mt-3 animate-slide-down">
          <div className="glass-accent rounded-xl p-3 flex items-center justify-between">
            <span className="text-text-dim text-xs">Entry deleted</span>
            <button
              onClick={undoDelete}
              className="text-accent-glow text-xs font-semibold py-1.5 px-4 rounded-lg bg-accent/10 border border-accent/20 transition-all active:scale-[0.97] min-h-[36px]"
              aria-label="Undo delete journal entry"
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
