// src/contexts/AuthContext.tsx
// Thin wrapper around useAuth (Zustand) for React Context compatibility
// The actual auth logic lives in src/hooks/useAuth.ts
import { createContext, useContext, type ReactNode } from 'react';
import { useAuth, type Role } from '../hooks/useAuth';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: any;
  role: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: (silent?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, session, profile, loading, signOut, refreshProfile } = useAuth();
  const role = (profile?.role as any) ?? null;

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
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return ctx;
}
