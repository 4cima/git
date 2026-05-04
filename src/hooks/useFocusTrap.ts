/**
 * 🎬 useFocusTrap Hook - LUMEN Design System
 * Cinema Online - اونلاين سينما
 * 
 * @description Custom hook for trapping focus within a container (modals, dropdowns)
 * @author Cinema Online Team
 * @version 1.0.0
 * 
 * Implements Requirements:
 * - 7.7: Focus trap within modal
 * - 15.3: Trap focus within modal and prevent background interaction
 */

import { useEffect, useRef } from 'react'

interface UseFocusTrapOptions {
  /** Whether the focus trap is active */
  isActive: boolean
  /** Callback when escape key is pressed */
  onEscape?: () => void
  /** Whether to restore focus to the trigger element on deactivation */
  restoreFocus?: boolean
}

const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
]

export function useFocusTrap(options: UseFocusTrapOptions) {
  const { isActive, onEscape, restoreFocus = true } = options
  const containerRef = useRef<HTMLElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive) return

    // Store the element that had focus before the trap was activated
    previousActiveElement.current = document.activeElement as HTMLElement

    const container = containerRef.current
    if (!container) return

    // Get all focusable elements within the container
    const getFocusableElements = (): HTMLElement[] => {
      const elements = container.querySelectorAll<HTMLElement>(
        FOCUSABLE_ELEMENTS.join(',')
      )
      return Array.from(elements).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
      )
    }

    // Focus the first focusable element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    // Handle tab key to trap focus
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle escape key
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault()
        onEscape()
        return
      }

      // Handle tab key
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements()
        if (focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (event.shiftKey) {
          // Shift + Tab: move focus backwards
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement.focus()
          }
        } else {
          // Tab: move focus forwards
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown)

      // Restore focus to the previous element
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [isActive, onEscape, restoreFocus])

  return containerRef
}
