import { useQuery } from '@tanstack/react-query'
import type { GenreOption, GenreResponse } from '../types/genre'
import { getFallbackGenres } from '../lib/genre-utils'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || ''

async function fetchGenres(contentType: string): Promise<GenreResponse> {
  const res = await fetch(`${API_BASE}/api/genres/${contentType}`)
  if (!res.ok) throw new Error(`Failed to fetch genres: ${res.status}`)
  return res.json()
}

export function useGenres(contentType: string, lang: 'ar' | 'en' = 'ar') {
  const query = useQuery<GenreResponse, Error>({
    queryKey: ['genres', contentType],
    queryFn: () => fetchGenres(contentType),
    staleTime: 3600000,   // 1 hour
    gcTime: 7200000,      // 2 hours
    retry: 2,
    enabled: !!contentType,
  })

  const genres: GenreOption[] = query.data?.genres ?? (
    query.isError ? getFallbackGenres(contentType, lang) : []
  )

  return {
    genres,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
