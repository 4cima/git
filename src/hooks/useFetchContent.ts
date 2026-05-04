import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type VideoItem = {
  id: string
  title: string
  url: string
  thumbnail?: string | null
  description?: string | null
  views?: number | null
  duration?: number | null
  category?: string | null
  created_at?: string | null
  year?: number | null
  quality?: string | null
}

export type UseCategoryOptions = {
  limit?: number
  orderBy?: 'created_at' | 'views' | 'year'
  ascending?: boolean
  enabled?: boolean
  year?: number
  staleTime?: number
  gcTime?: number
}

export function useCategoryVideos(category: string, options: UseCategoryOptions = {}) {
  const { limit = 20, orderBy = 'created_at', ascending = false, enabled = true, year, staleTime = 300000, gcTime = 1000 * 60 * 30 } = options
  
  return useQuery({
    queryKey: ['videos', category, limit, orderBy, ascending, year],
    queryFn: async () => {
      // Fetch from CockroachDB API
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || ''
      const params = new URLSearchParams({
        category,
        limit: limit.toString(),
        orderBy,
        ascending: ascending.toString()
      })
      
      if (year) {
        params.append('year', year.toString())
      }
      
      const response = await fetch(`${API_BASE}/api/videos?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch videos')
      }
      
      const data = await response.json()
      return (data || []) as VideoItem[]
    },
    enabled,
    staleTime,
    gcTime
  })
}

export function useClassicVideos(options: UseCategoryOptions = {}) {
  const { limit = 20, orderBy = 'created_at', ascending = false, enabled = true, staleTime = 300000, gcTime = 1000 * 60 * 30 } = options
  return useQuery({
    queryKey: ['videos', 'classics', limit, orderBy, ascending],
    queryFn: async () => {
      // Fetch from CockroachDB API (videos table is in CockroachDB)
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || ''
      const params = new URLSearchParams({
        category: 'classic',
        limit: limit.toString(),
        orderBy,
        ascending: ascending.toString()
      })
      
      const response = await fetch(`${API_BASE}/api/videos?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch classic videos')
      }
      
      const data = await response.json()
      return (data || []) as VideoItem[]
    },
    enabled,
    staleTime,
    gcTime
  })
}

// useCachedHomepage removed - no longer using homepage_cache.json
// All data now fetched directly from CockroachDB API
