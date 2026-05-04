/**
 * 🧪 useDirection Hook Tests
 * Cinema Online - اونلاين سينما
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDirection } from '../useDirection'
import { useLang } from '../../state/useLang'

describe('useDirection', () => {
  beforeEach(() => {
    // Reset language state
    useLang.setState({ lang: 'ar' })
  })

  afterEach(() => {
    // Clean up document attributes
    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('lang')
  })

  it('should return rtl for Arabic language', () => {
    useLang.setState({ lang: 'ar' })
    
    const { result } = renderHook(() => useDirection())
    
    expect(result.current).toBe('rtl')
  })

  it('should return ltr for English language', () => {
    useLang.setState({ lang: 'en' })
    
    const { result } = renderHook(() => useDirection())
    
    expect(result.current).toBe('ltr')
  })

  it('should update when language changes', () => {
    const { result, rerender } = renderHook(() => useDirection())
    
    expect(result.current).toBe('rtl')
    
    useLang.setState({ lang: 'en' })
    rerender()
    
    expect(result.current).toBe('ltr')
  })

  it('should set dir attribute on document root', () => {
    useLang.setState({ lang: 'ar' })
    renderHook(() => useDirection())
    
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('ar')
  })

  it('should update dir attribute when language changes', () => {
    const { rerender } = renderHook(() => useDirection())
    
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('ar')
    
    useLang.setState({ lang: 'en' })
    rerender()
    
    expect(document.documentElement.dir).toBe('ltr')
    expect(document.documentElement.lang).toBe('en')
  })
})
