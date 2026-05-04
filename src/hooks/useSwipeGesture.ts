import { useEffect, useRef } from 'react'

interface SwipeGestureOptions {
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number // Minimum distance for swipe (default: 50px)
}

/**
 * useSwipeGesture Hook
 * 
 * Detects swipe gestures on touch devices.
 * Used for mobile interactions like:
 * - Swipe down: Minimize player (FULL → MINI)
 * - Swipe up: Expand player (MINI → FULL)
 */
export const useSwipeGesture = (options: SwipeGestureOptions) => {
  const {
    onSwipeUp,
    onSwipeDown,
    onSwipeLeft,
    onSwipeRight,
    threshold = 50
  } = options

  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const touchEndRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchEndRef.current = null
      touchStartRef.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      touchEndRef.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY
      }
    }

    const handleTouchEnd = () => {
      if (!touchStartRef.current || !touchEndRef.current) return

      const deltaX = touchEndRef.current.x - touchStartRef.current.x
      const deltaY = touchEndRef.current.y - touchStartRef.current.y

      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      // Determine if swipe is horizontal or vertical
      if (absX > absY) {
        // Horizontal swipe
        if (absX > threshold) {
          if (deltaX > 0) {
            onSwipeRight?.()
          } else {
            onSwipeLeft?.()
          }
        }
      } else {
        // Vertical swipe
        if (absY > threshold) {
          if (deltaY > 0) {
            onSwipeDown?.()
          } else {
            onSwipeUp?.()
          }
        }
      }

      // Reset
      touchStartRef.current = null
      touchEndRef.current = null
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight, threshold])
}
