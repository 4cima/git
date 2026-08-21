/**
 * src/hooks/useAuth.ts
 *
 * Auth state using Zustand — reads from /api/auth/me (D1 sessions).
 * Interface kept compatible with previous Supabase-based version
 * so no component needs changing.
 */
import { create } from 'zustand';
import type { AuthUser } from '../lib/auth-server';

export type Role = 'user' | 'admin' | 'supervisor';

// Minimal User shape that satisfies existing component usage
export type User = {
  id: string;
  email: string;
  created_at?: string;
  user_metadata?: { full_name?: string; avatar_url?: string; name?: string };
};

// Minimal Profile shape
export type Profile = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  role: Role;
};

// Minimal Session shape
export type Session = {
  user: User;
};

type AuthState = {
  profile: Profile | null;
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  // actions
  login:          (email: string, password: string) => Promise<void>;
  signOut:        () => Promise<void>;
  refreshProfile: (silent?: boolean) => Promise<void>;
  setProfile:     (p: Profile | null) => void;
  setLoading:     (loading: boolean) => void;
  setSession:     (session: Session | null) => void;
  syncLocalData:  () => Promise<void>;
};

function d1UserToUser(u: AuthUser): User {
  return {
    id: u.id,
    email: u.email,
    user_metadata: { full_name: u.name, avatar_url: u.avatar_url, name: u.name },
  };
}

function d1UserToProfile(u: AuthUser): Profile {
  return {
    id: u.id,
    username: u.name || u.email.split('@')[0],
    avatar_url: u.avatar_url || null,
    role: u.role as Role,
  };
}

export const useAuth = create<AuthState>((set, get) => ({
  profile: null,
  user:    null,
  session: null,
  loading: true,
  error:   null,

  setLoading: (loading) => set({ loading }),

  setSession: (session) => {
    const user = session?.user ?? null;
    set({ session, user });
    if (!user) set({ profile: null });
  },

  async login(email: string, password: string) {
    // Email/password login via Supabase is no longer used.
    // Kept for interface compatibility — throws so callers degrade gracefully.
    throw new Error('Email login not available. Please use Google Sign-In.');
  },

  async signOut() {
    try {
      await fetch('/api/auth/logout');
    } catch {}
    set({ profile: null, user: null, session: null });
  },

  async syncLocalData() {
    // No-op — local data sync was Supabase-specific
  },

  async refreshProfile(silent = false) {
    if (!silent) set({ loading: true, error: null });

    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('auth/me failed: ' + res.status);

      const { user: authUser }: { user: AuthUser | null } = await res.json();

      if (!authUser) {
        set({ profile: null, user: null, session: null, loading: false, error: null });
        return;
      }

      const user    = d1UserToUser(authUser);
      const profile = d1UserToProfile(authUser);
      const session: Session = { user };

      set({ user, session, profile, loading: false, error: null });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      set({ loading: false, error: err });
    }
  },

  setProfile: (p) => set({ profile: p }),
}));
