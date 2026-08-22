/**
 * src/hooks/useInitAuth.ts
 *
 * Initialises auth state on app load by calling refreshProfile().
 * Polls /api/auth/me — no Supabase dependency.
 */
import { useEffect } from 'react';
import { useAuth } from './useAuth';

export function useInitAuth() {
  const refreshProfile = useAuth(s => s.refreshProfile);
  const loading        = useAuth(s => s.loading);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        );
        await Promise.race([refreshProfile(), timeout]);
      } catch {
        if (mounted) useAuth.getState().setLoading(false);
      }
    };

    init();

    return () => { mounted = false; };
  }, []);

  return { loading };
}
