/**
 * 🧪 usePrefersReducedMotion Hook Tests
 * Cinema Online - اونلاين سينما
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePrefersReducedMotion } from '../usePrefersReducedMotion'

describe('usePrefersReducedMotion', () => {
  let mockMatchMedia: any

  beforeEach(() => {
    mockMatchMedia = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn()
    }

    vi.spyOn(window, 'matchMedia').mockReturnValue(mockMatchMedia)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return false when prefers-reduced-motion is not set', () => {
    mockMatchMedia.matches = false
    
    const { result } = renderHook(() => usePrefersReducedMotion())
    
    expect(result.current).toBe(false)
  })

  it('should return true when prefers-reduced-motion is enabled', () => {
    mockMatchMedia.matches = true
    
    const { result } = renderHook(() => usePrefersReducedMotion())
    
    expect(result.current).toBe(true)
  })

  it('should update when media query changes', () => {
    mockMatchMedia.matches = false
    
    const { result } = renderHook(() => usePrefersReducedMotion())
    
    expect(result.current).toBe(false)
    
    // Simulate media query change
    act(() => {
      const changeHandler = mockMatchMedia.addEventListener.mock.calls[0][1]
      changeHandler({ matches: true })
    })
    
    expect(result.current).toBe(true)
  })

  it('should use addListener fallback for older browsers', () => {
    mockMatchMedia.addEventListener = undefined
    
    renderHook(() => usePrefersReducedMotion())
    
    expect(mockMatchMedia.addListener).toHaveBeenCalled()
  })

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = renderHook(() => usePrefersReducedMotion())
    
    unmount()
    
    expect(mockMatchMedia.removeEventListener).toHaveBeenCalled()
  })

  it('should handle missing matchMedia gracefully', () => {
    const originalMatchMedia = window.matchMedia
    // @ts-expect-error - testing missing matchMedia
    delete window.matchMedia
    
    const { result } = renderHook(() => usePrefersReducedMotion())
    
    expect(result.current).toBe(false)
    
    // Restore
    window.matchMedia = originalMatchMedia
  })
})
