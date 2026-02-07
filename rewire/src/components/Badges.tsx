import { config } from '../config'

interface Props {
  currentDays: number
  longestStreak: number
}

interface Badge {
  day: number
  icon: string
  label: string
}

const BADGES: Badge[] = [
  { day: 1, icon: '\u{1F331}', label: 'Day 1' },
  { day: 3, icon: '\u{1F525}', label: '3 Days' },
  { day: 7, icon: '\u{2B50}', label: '1 Week' },
  { day: 14, icon: '\u{1F31F}', label: '2 Weeks' },
  { day: 30, icon: '\u{1F3C5}', label: '1 Month' },
  { day: 60, icon: '\u{1F48E}', label: '2 Months' },
  { day: 90, icon: '\u{1F451}', label: '90 Days' },
  { day: 100, icon: '\u{1F4AF}', label: '100 Days' },
  { day: 180, icon: '\u{1F985}', label: '6 Months' },
  { day: 365, icon: '\u{1F3C6}', label: '1 Year' },
]

export default function Badges({ currentDays, longestStreak }: Props) {
  const bestStreak = Math.max(currentDays, longestStreak)
  const earned = BADGES.filter(b => bestStreak >= b.day).length

  return (
    <div className="animate-fade-in-delay-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text">Badges</h3>
        <span className="text-text-muted text-xs">{earned}/{BADGES.length} earned</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {BADGES.map((badge) => {
          const unlocked = bestStreak >= badge.day
          return (
            <div
              key={badge.day}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                unlocked
                  ? 'glass-accent'
                  : 'opacity-30'
              }`}
              style={unlocked ? {
                boxShadow: `0 0 12px color-mix(in srgb, ${config.accentColor} 15%, transparent)`,
              } : undefined}
            >
              <span className="text-2xl">
                {badge.icon}
              </span>
              <span className={`text-[9px] font-medium text-center leading-tight ${
                unlocked ? 'text-text-dim' : 'text-text-muted'
              }`}>
                {badge.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
