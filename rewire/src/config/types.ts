export interface Phase {
  maxDay: number
  label: string
  color: string
}

export interface Milestone {
  day: number
  label: string
  icon: string
  message: string
}

export interface AppConfig {
  id: string
  name: string
  tagline: string
  description: string
  accentColor: string
  accentGlow: string
  accentDim: string
  successColor: string
  unitLabel: string
  unitLabelSingular: string
  phases: Phase[]
  milestones: Milestone[]
  quotes: string[]
  weeklyMessages: { maxWeek: number; message: string }[]
  goalDays: number
}
