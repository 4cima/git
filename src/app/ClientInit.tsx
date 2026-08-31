/**
 * ClientInit - Client component that initializes auth on app load
 * Calls useInitAuth() hook to restore session and listen for auth changes
 */

'use client'

import { useEffect } from 'react'
import { useInitAuth } from '@/hooks/useInitAuth'
import { preparePopunder } from '@/components/features/system/adsClick'

export function ClientInit() {
  useInitAuth()
  // Popunder script is injected from the LAYOUT on every page (home, movies,
  // series, details, search…) so Monetag captures clicks everywhere — not
  // only on details pages. Loaded directly from the network host (no proxy).
  useEffect(() => {
    preparePopunder()
  }, [])
  return null
}
