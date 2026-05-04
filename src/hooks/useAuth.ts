import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, getProfile } from '../lib/supabase';
import { logAuthError } from '../services/errorLogging';
import type { Profile } from '../types/database';

export type Role = 'user' | 'admin' | 'supervisor';

type AuthState = {
  profile: Profile | null;
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: (silent?: boolean) => Promise<void>;
  setProfile: (p: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setSession: (session: Session | null) => void;
  syncLocalData: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  profile: null,
  user: null,
  session: null,
  loading: true,
  error: null,
  setLoading: (loading) => set({ loading }),
  setSession: (session) => {
    const user = session?.user ?? null;
    set({ session, user });
    if (!user) set({ profile: null });
  },
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      await get().refreshProfile();
    }
  },
  async signOut() {
    await supabase.auth.signOut();
    set({ profile: null, user: null, session: null });
  },
  async syncLocalData() {
    const user = get().user;
    if (!user) return;

    // Sync Guest Progress
    try {
      const guestProgress = localStorage.getItem('guest_progress');
      if (guestProgress) {
        const progressMap = JSON.parse(guestProgress);
        const updates = Object.values(progressMap).map((item: any) => ({
          user_id: user.id,
          content_id: item.contentId,
          content_type: item.contentType,
          season_number: item.season,
          episode_number: item.episode,
          progress_seconds: item.progress,
          updated_at: new Date().toISOString(),
        }));

        if (updates.length > 0) {
          await supabase
            .from('continue_watching')
            .upsert(updates, { onConflict: 'user_id,content_id,content_type' });
          localStorage.removeItem('guest_progress');
        }
      }
    } catch (e: any) {
      logAuthError('Failed to sync local data', e);
    }
  },
  async refreshProfile(silent = false) {
    // Dedupe concurrent refresh requests to prevent race conditions and duplicate toasts
    if (refreshPromise) {
      try {
        await refreshPromise;
        return;
      } catch (e: any) {
        if (!silent) set({ loading: false });
        return;
      }
    }

    refreshPromise = (async () => {
      if (!silent) set({ loading: true, error: null });
      const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('auth_timeout')), timeoutMs);
        });
        try {
          return await Promise.race([promise, timeoutPromise]);
        } finally {
          if (timer) clearTimeout(timer);
        }
      };

      const { data: sessionData } = await withTimeout(supabase.auth.getSession(), 5000);
      const session = sessionData?.session ?? null;
      const user = session?.user ?? null;

      // تحديث الحالة فوراً إذا وجدنا مستخدماً، حتى لو فشل جلب البروفايل لاحقاً
      if (user) {
        if (!silent) set({ user, session, loading: true, error: null });
        else set({ user, session });
      } else {
        set({ profile: null, user: null, session: null, loading: false, error: null });
        return;
      }

      try {
        // Use getProfile helper which handles RLS errors via admin proxy
        const data = await withTimeout(getProfile(user.id), 6000);

        if (!data) {
          // محاولة إنشاء بروفايل جديد
          const username = user.email?.split('@')[0] || 'user';
          const { data: inserted, error: insertError } = await supabase
            .from('profiles')
            .insert({ id: user.id, username, role: 'user' })
            .select('id, username, avatar_url, role')
            .single();

          if (insertError) {
            // If profile already exists (race condition), try fetching it again
            if (insertError.code === '23505') {
              // unique_violation
              const retryData = await withTimeout(getProfile(user.id), 4000);
              if (retryData) {
                set({ profile: retryData as Profile, loading: false, error: null });
                return;
              }
            }

            const err = new Error(insertError.message || 'Failed to create profile');
            logAuthError('Failed to create profile', insertError, user.id);
            set({ error: err, loading: false }); // Ensure loading is turned off
          } else {
            set({ profile: inserted as Profile, loading: false, error: null });
          }
        } else {
          set({ profile: data as Profile, loading: false, error: null });
        }
      } catch (e: any) {
        const err = e instanceof Error ? e : new Error(e.message || 'Auth refresh error');
        logAuthError('Auth refresh error', e);
        set({ loading: false, error: err });
        return;
      }
    })();

    try {
      await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  },
  setProfile: (p) => set({ profile: p }),
}));

// Module-level variable to track ongoing refresh request
let refreshPromise: Promise<void> | null = null;
