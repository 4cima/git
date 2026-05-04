/**
 * 🧭 Direction Hook - LUMEN Design System
 * Cinema Online - اونلاين سينما
 * 
 * @description Provides text direction based on current language
 * @author Cinema Online Team
 * @version 1.0.0
 * 
 * Implements Requirements:
 * - 3.5, 5.1, 5.7: RTL layout support for Arabic
 * - 5.2: Set dir attribute on document root
 * - Native bidirectional layout handling
 */

import { useEffect } from 'react'
import { useLang } from '../state/useLang'

export type Direction = 'ltr' | 'rtl'

/**
 * Hook that returns the current text direction based on language
 * Sets dir attribute on document root element
 * @returns 'rtl' for Arabic, 'ltr' for English
 */
export function useDirection(): Direction {
  const { lang } = useLang()
  const direction = lang === 'ar' ? 'rtl' : 'ltr'
  
  // Set dir attribute on document root (Requirement 5.2)
  useEffect(() => {
    document.documentElement.dir = direction
    document.documentElement.lang = lang
  }, [direction, lang])
  
  return direction
}
