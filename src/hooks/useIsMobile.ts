/**
 * 🎯 useIsMobile Hook - LUMEN Design System
 * Cinema Online - اونلاين سينما
 * 
 * @description Detects if the device is mobile based on screen width
 * @author Cinema Online Team
 * @version 1.0.0
 * 
 * Implements Requirements:
 * - 5.4: Responsive breakpoints at 768px (tablet) and 1024px (desktop)
 * - 5.5: Reduce shader complexity on mobile for 60 FPS
 */

import { useState, useEffect } from 'react'

/**
 * Hook to detect if the current device is mobile (< 768px)
 * Uses matchMedia for efficient responsive detection
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    // Initial check on mount
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })

  useEffect(() => {
    // Use matchMedia for efficient responsive detection
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    
    // Update state based on media query
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches)
    }

    // Set initial value
    handleChange(mediaQuery)

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return isMobile
}

/**
 * Hook to detect if the current device is tablet (768px - 1023px)
 */
export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window === 'undefined') return false
    const width = window.innerWidth
    return width >= 768 && width < 1024
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)')
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsTablet(e.matches)
    }

    handleChange(mediaQuery)
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return isTablet
}

/**
 * Hook to detect if the current device is desktop (>= 1024px)
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth >= 1024
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktop(e.matches)
    }

    handleChange(mediaQuery)
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return isDesktop
}
