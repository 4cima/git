/**
 * ♿ Prefers Reduced Motion Hook - LUMEN Design System
 * Cinema Online - اونلاين سينما
 * 
 * @description Detects user's motion preference for accessibility
 * @author Cinema Online Team
 * @version 1.0.0
 * 
 * Implements Requirements:
 * - 7.4, 9.7: Respect prefers-reduced-motion preference
 * - Disable non-essential animations for accessibility
 */

import { useEffect, useState } from 'react'

/**
 * Hook that detects if user prefers reduced motion
 * @returns true if user prefers reduced motion, false otherwise
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })
  
  useEffect(() => {
    if (!window.matchMedia) {
      return
    }
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    
    // Fallback for older browsers
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])
  
  return prefersReducedMotion
}
