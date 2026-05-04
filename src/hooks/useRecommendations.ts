import { useQuery } from '@tanstack/react-query'
import { getUserPreferences } from '../lib/supabase'
import { useAuth } from './useAuth'
import axios from 'axios'

type ContentItem = {
  id: number
  title?: string
  name?: string
  media_type: 'movie' | 'tv'
  genre_ids?: number[]
  poster_path?: string
  vote_average?: number
  release_date?: string
  first_air_date?: string
  overview?: string
}

// Helper to fetch details for history/watchlist items to get genres
async function fetchContentDetails(items: { external_id: string; content_type: string }[]) {
  // We'll just take the last 5 distinct items to form a preference profile
  // Using CockroachDB API to get details including genres
  const distinctItems = Array.from(new Set(items.map(i => `${i.content_type}:${i.external_id}`)))
    .slice(0, 5)
    .map(s => {
      const [type, id] = s.split(':')
      return { type: type as 'movie' | 'tv', id: Number(id) }
    })

  const details = await Promise.all(
    distinctItems.map(async (item) => {
      try {
        const endpoint = item.type === 'movie' ? `/api/movies/${item.id}` : `/api/tv/${item.id}`
        const { data } = await axios.get(endpoint)
        return {
          ...data,
          media_type: item.type
        }
      } catch (e: any) {
        return null
      }
    })
  )

  return details.filter(Boolean)
}

export function useRecommendations() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['recommendations', user?.id],
    queryFn: async () => {
      if (!user) return []

      // 1. Data Collector
      const prefs = await getUserPreferences(user.id)
      const allItems = [...prefs.history, ...prefs.watchlist]

      if (allItems.length === 0) return []

      // 2. Build Preference Profile (Genres & Cast)
      const details = await fetchContentDetails(allItems)
      
      const genreCounts: Record<number, number> = {}
      const castCounts: Record<number, number> = {}

      details.forEach((item: any) => {
        // Count Genres - parse from JSON string if needed
        const genres = typeof item.genres === 'string' ? JSON.parse(item.genres) : item.genres
        genres?.forEach((g: any) => {
          const genreId = typeof g === 'object' ? g.id : g
          genreCounts[genreId] = (genreCounts[genreId] || 0) + 1
        })
        
        // Count Cast (top 3 billed actors) - parse from JSON string if needed
        const castData = typeof item.cast_data === 'string' ? JSON.parse(item.cast_data) : item.cast_data
        if (castData && Array.isArray(castData)) {
          castData.slice(0, 3).forEach((actor: any) => {
            castCounts[actor.id] = (castCounts[actor.id] || 0) + 1
          })
        }
      })

      // Sort genres by frequency
      const topGenres = Object.entries(genreCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([id]) => id)
        
      // Sort cast by frequency
      const topCast = Object.entries(castCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([id]) => id)

      if (topGenres.length === 0 && topCast.length === 0) return []

      // 3. Similarity Algorithm: Fetch recommendations based on top genres & cast
      // We'll use CockroachDB API for this to get high quality recommendations
      const recommendations: ContentItem[] = []
      
      // Strategy: 
      // 1. Fetch by Genre (broad match)
      // 2. Fetch by Cast (if available, for variety)
      
      // Fetch for top genre (Movie)
      try {
        const { data: movies } = await axios.get('/api/movies', {
          params: {
            genres: topGenres.join(','),
            limit: 20
          }
        })
        // Add media_type
        const movieResults = movies.results?.map((m: any) => ({ ...m, media_type: 'movie' })) || []
        recommendations.push(...movieResults)
      } catch (e: any) {
        // Ignore error
      }

      // Fetch for top genre (TV)
      try {
        const { data: tv } = await axios.get('/api/tv', {
          params: {
            genres: topGenres.join(','),
            limit: 20
          }
        })
        const tvResults = tv.results?.map((t: any) => ({ ...t, media_type: 'tv' })) || []
        recommendations.push(...tvResults)
      } catch (e: any) {
        // Ignore error
      }

      // 4. Filter out watched/watchlist items
      // Create a set of "type:id" strings for quick lookup
      const watchedSet = new Set(allItems.map(i => `${i.content_type}:${i.external_id}`))
      
      const filtered = recommendations.filter(item => 
        !watchedSet.has(`${item.media_type}:${item.id}`)
      )

      // Shuffle and slice
      // Simple shuffle
      const shuffled = filtered.sort(() => Math.random() - 0.5)
      
      return shuffled.slice(0, 12)
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}
