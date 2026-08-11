import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useInitAuth() {
  const refreshProfile = useAuth(s => s.refreshProfile)
  const setSession = useAuth(s => s.setSession)
  const loading = useAuth(s => s.loading)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        // First try to restore session from storage
        const { data: { session } } = await supabase.auth.getSession()
        if (session && mounted) {
          setSession(session)
          useAuth.getState().setLoading(false)
          // Profile will be refreshed in the background or via event
        }
        
        // Force timeout for initial auth check to prevent white screen
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        )
        await Promise.race([refreshProfile(), timeoutPromise])
      } catch (e: any) {
        // Ignore AbortError and other non-critical errors during init
        if (mounted) {
          // Ensure we stop loading state if timeout occurs or any error happens
          useAuth.getState().setLoading(false)
        }
      }
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      if (event === 'SIGNED_OUT') {
        setSession(null)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session) {
          setSession(session)
          try {
            // Profile is refreshed but doesn't block UI anymore
            await refreshProfile(true) 
          } catch {
            // ignore profile refresh errors
          }
        }
      } else if (event === 'INITIAL_SESSION') {
        if (session) setSession(session)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [refreshProfile, setSession])

  return { loading }
}
