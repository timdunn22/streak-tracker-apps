import { useRef, useCallback } from 'react'

interface SwipeConfig {
  onSwipeLeft: () => void
  onSwipeRight: () => void
  threshold?: number
  maxVerticalRatio?: number
}

/**
 * Detects horizontal swipe gestures for tab navigation.
 * Returns touch event handlers to attach to the swipeable container.
 * Ignores vertical scrolling and respects prefers-reduced-motion.
 */
export function useSwipeNavigation({ onSwipeLeft, onSwipeRight, threshold = 50, maxVerticalRatio = 0.75 }: SwipeConfig) {
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isSwiping = useRef(false)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
    isSwiping.current = true
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isSwiping.current) return
    isSwiping.current = false

    const touch = e.changedTouches[0]
    const diffX = touch.clientX - touchStartX.current
    const diffY = touch.clientY - touchStartY.current

    // Ignore if vertical movement dominates (user is scrolling)
    if (Math.abs(diffY) > Math.abs(diffX) * maxVerticalRatio) return

    // Ignore if below minimum threshold
    if (Math.abs(diffX) < threshold) return

    if (diffX < 0) {
      onSwipeLeft()
    } else {
      onSwipeRight()
    }
  }, [onSwipeLeft, onSwipeRight, threshold, maxVerticalRatio])

  return { onTouchStart, onTouchEnd }
}
