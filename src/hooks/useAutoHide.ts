import { useEffect, useRef } from 'react'
import { useQuranPlayerStore } from '../state/useQuranPlayerStore'
import { PlayerMode } from '../types/quran-player'

/**
 * useAutoHide Hook
 * 
 * Implements auto-hide logic for player:
 * - Auto-hides player after 2 seconds of inactivity
 * - Restores full opacity on user interaction
 * 
 * Rules:
 * - Only works in MINI mode
 * - Reset timer on user interaction (mouse move, touch, keyboard)
 * - Restore full opacity immediately on hover
 */
export const useAutoHide = () => {
  const playerMode = useQuranPlayerStore((s) => s.playerMode)
  const opacity = useQuranPlayerStore((s) => s.opacity)
  const setOpacity = useQuranPlayerStore((s) => s.setOpacity)
  
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastInteractionRef = useRef<number>(Date.now())

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    lastInteractionRef.current = Date.now()
    
    // Restore full opacity
    if (opacity !== 1) {
      setOpacity(1)
    }
    
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
    
    // Only set timer in MINI mode
    if (playerMode === PlayerMode.MINI) {
      // Start new timer for opacity reduction after 2 seconds
      inactivityTimerRef.current = setTimeout(() => {
        setOpacity(0.5)
      }, 2000)
    }
  }

  // Handle user interactions
  useEffect(() => {
    if (playerMode !== PlayerMode.MINI) return

    const handleInteraction = () => {
      resetInactivityTimer()
    }

    // Listen for user interactions
    window.addEventListener('mousemove', handleInteraction)
    window.addEventListener('touchstart', handleInteraction)
    window.addEventListener('keydown', handleInteraction)
    
    // Initial timer
    resetInactivityTimer()

    return () => {
      window.removeEventListener('mousemove', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
    }
  }, [playerMode])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [])
}
