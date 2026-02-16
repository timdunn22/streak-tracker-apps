/**
 * Locale-aware number and date formatting utilities.
 * Used across the app for consistent, polished display of numbers, currency, and dates.
 */

const userLocale = typeof navigator !== 'undefined' ? navigator.language : 'en-US'

// Cache formatters for performance
const intFormatter = new Intl.NumberFormat(userLocale, { maximumFractionDigits: 0 })
const currencyFormatter = new Intl.NumberFormat(userLocale, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})
const currencyDecimalFormatter = new Intl.NumberFormat(userLocale, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const dateShortFormatter = new Intl.DateTimeFormat(userLocale, { month: 'short', day: 'numeric' })
const dateFullFormatter = new Intl.DateTimeFormat(userLocale, { month: 'short', day: 'numeric', year: 'numeric' })

/** Format an integer with locale-appropriate thousand separators (e.g. 1,234) */
export function formatNumber(n: number): string {
  return intFormatter.format(n)
}

/** Format currency as whole dollars (e.g. $1,234) */
export function formatCurrency(n: number): string {
  return currencyFormatter.format(n)
}

/** Format currency with cents (e.g. $7.50) */
export function formatCurrencyDecimal(n: number): string {
  return currencyDecimalFormatter.format(n)
}

/** Format a date as a short locale string (e.g. "Feb 13") */
export function formatDateShort(date: Date): string {
  return dateShortFormatter.format(date)
}

/** Format a date as a full locale string with year (e.g. "Feb 13, 2026") */
export function formatDateFull(date: Date): string {
  return dateFullFormatter.format(date)
}

/** Format an ISO date string as a relative time or locale date.
 *  - Today → "Today"
 *  - Yesterday → "Yesterday"
 *  - 2-6 days → "N days ago"
 *  - 7+ days → locale short date (e.g. "Feb 7")
 */
export function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Unknown'
  const now = new Date()
  // Use local-date-only comparison (midnight-to-midnight) so "Today" and
  // "Yesterday" are correct across midnight boundaries regardless of time
  const entryDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((today.getTime() - entryDay.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays > 0 && diffDays < 7) return `${diffDays} days ago`
  return formatDateShort(d)
}

/**
 * Pluralize a word based on count. Returns "1 day", "2 days", etc.
 */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`
}
