const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator
const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function haptic(type: 'tap' | 'success' | 'warning' | 'heavy' = 'tap') {
  if (!canVibrate || prefersReducedMotion) return

  switch (type) {
    case 'tap':
      navigator.vibrate(8)
      break
    case 'success':
      navigator.vibrate([10, 50, 10, 50, 20])
      break
    case 'warning':
      navigator.vibrate(30)
      break
    case 'heavy':
      navigator.vibrate([20, 40, 40])
      break
  }
}
