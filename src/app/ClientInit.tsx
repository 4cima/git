/**
 * ClientInit - Client component that initializes auth on app load
 * Calls useInitAuth() hook to restore session and listen for auth changes
 */

'use client'

import { useInitAuth } from '@/hooks/useInitAuth'

export function ClientInit() {
  useInitAuth()
  return null
}
