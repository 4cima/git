import { useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook for Intersection Observer
 * Used to detect when an element enters the viewport (for infinite scroll)
 */
export function useIntersectionObserver(
  callback: () => void,
  options: IntersectionObserverInit = {}
) {
  const targetRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const callbackRef = useRef(callback)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    const target = targetRef.current
    if (!target) {
      return
    }

    // Create observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          callbackRef.current()
        }
      },
      {
        root: null, // viewport
        rootMargin: options.rootMargin || '200px', // Trigger 200px before reaching the element
        threshold: options.threshold || 0.1, // Trigger when 10% of the element is visible
      }
    )

    // Start observing
    observerRef.current.observe(target)

    // Cleanup
    return () => {
      if (observerRef.current && target) {
        observerRef.current.unobserve(target)
        observerRef.current.disconnect()
      }
    }
  }, [options.rootMargin, options.threshold])

  return targetRef
}
