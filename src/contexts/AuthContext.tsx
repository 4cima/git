'use client';

/**
 * src/contexts/AuthContext.tsx
 *
 * Thin wrapper around useAuth (Zustand) for React Context compatibility.
 * Interface kept identical to the previous Supabase-based version.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { useAuth, type Role, type User, type Session, type Profile } from '../hooks/useAuth';

interface AuthContextValue {
  user:           User | null;
  session:        Session | null;
  profile:        Profile | null;
  role:           Role | null;
  loading:        boolean;
  signOut:        () => Promise<void>;
  refreshProfile: (silent?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, session, profile, loading, signOut, refreshProfile } = useAuth();
  const role = (profile?.role as Role) ?? null;

  return (
    <AuthContext.Provider
      value={{ user, session, profile, role, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
