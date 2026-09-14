'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ActivityItem, LibraryItem, MyReview, ProfileStats, ResumeItem } from '@/components/profile/types';

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function useProfileStats() {
  return useQuery({
    queryKey: ['profile', 'stats'],
    queryFn: async () => {
      const json = await getJSON<{ ok: boolean; stats: ProfileStats }>('/api/profile/stats');
      return json.stats;
    },
    staleTime: 60 * 1000,
  });
}

export function useResumeList(enabled: boolean) {
  return useQuery({
    queryKey: ['profile', 'resume'],
    queryFn: async () => {
      const json = await getJSON<{ ok: boolean; items: ResumeItem[] }>('/api/continue-watching?limit=30');
      return json.items || [];
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useLibraryList(kind: 'favorites' | 'completed', enabled: boolean) {
  return useQuery({
    queryKey: ['profile', 'library', kind],
    queryFn: async () => {
      const json = await getJSON<{ ok: boolean; items: LibraryItem[] }>(
        kind === 'favorites' ? '/api/user/favorites' : '/api/user/completed'
      );
      return json.items || [];
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useActivityFeed(kind: 'all' | 'watch_history' | 'favorites' | 'reviews', enabled: boolean) {
  return useQuery({
    queryKey: ['profile', 'activity', kind],
    queryFn: async () => {
      const json = await getJSON<{ ok: boolean; activities: ActivityItem[] }>(
        `/api/profile/activity?type=${kind}&limit=30`
      );
      return json.activities || [];
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useMyReviews(enabled: boolean) {
  return useQuery({
    queryKey: ['profile', 'reviews'],
    queryFn: async () => {
      const json = await getJSON<{ ok: boolean; items: MyReview[] }>('/api/user/reviews?limit=50');
      return json.items || [];
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useInvalidateProfile() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['profile'] });
    qc.invalidateQueries({ queryKey: ['continue-watching'] });
  };
}
