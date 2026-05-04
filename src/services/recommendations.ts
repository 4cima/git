import { getHistory, getContinueWatching } from '../lib/supabase'
import { tmdb } from '../lib/tmdb'
import { logger } from '../lib/logger'

export type RecommendationItem = {
  id: number
  title?: string
  name?: string
  media_type: 'movie' | 'tv'
  poster_path?: string | null
  backdrop_path?: string | null
  popularity?: number
  vote_average?: number
  release_date?: string
  first_air_date?: string
  slug?: string | null
}

function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const obj = JSON.parse(raw) as { exp?: number; val?: T }
    if (obj.exp && Date.now() > obj.exp) return null
    return obj.val ?? null
  } catch { return null }
}
function cacheSet<T>(key: string, val: T, ttlMs = 6 * 60 * 60 * 1000) {
  try {
    localStorage.setItem(key, JSON.stringify({ val, exp: Date.now() + ttlMs }))
  } catch { }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
) {
  const out = new Array<R>(items.length)
  let index = 0
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
    while (index < items.length) {
      const currentIndex = index++
      out[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  })
  await Promise.all(workers)
  return out
}

/** Fallback: Use Turso API when Groq API is unavailable */
async function tmdbFallback(userId: string): Promise<RecommendationItem[]> {
  const seen = new Set<string>()
  const results: RecommendationItem[] = []

  // 1. Get genres from history using Turso API
  const hist = await getHistory(userId)
  const counts: Record<string, number> = {}

  const histDetails = await mapWithConcurrency(hist.slice(0, 8), 4, async (h) => {
    try {
      const endpoint = h.content_type === 'movie' ? `/api/movies/${h.external_id}` : `/api/tv/${h.external_id}`
      const res = await fetch(endpoint)
      if (res.ok) {
        const data = await res.json()
        return data.genres ? (typeof data.genres === 'string' ? JSON.parse(data.genres) : data.genres) : []
      }
      return []
    } catch {
      return []
    }
  })

  for (const genres of histDetails) {
    for (const g of genres) {
      const genreName = typeof g === 'string' ? g : g.name
      counts[genreName] = (counts[genreName] || 0) + 1
    }
  }
  const topGenres = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k)

  // 2. Fetch trending content from Turso with genre filtering
  try {
    const [moviesRes, tvRes] = await Promise.all([
      fetch('/api/trending?type=movie&limit=30'),
      fetch('/api/trending?type=tv&limit=30')
    ])

    if (moviesRes.ok) {
      const movies = await moviesRes.json()
      for (const m of movies) {
        const key = `movie-${m.id}`
        if (!seen.has(key) && m.poster_path && m.slug) {
          seen.add(key)
          results.push({
            ...m,
            media_type: 'movie' as const,
            title: m.title,
            name: m.title
          })
        }
      }
    }

    if (tvRes.ok) {
      const tvShows = await tvRes.json()
      for (const t of tvShows) {
        const key = `tv-${t.id}`
        if (!seen.has(key) && t.poster_path && t.slug) {
          seen.add(key)
          results.push({
            ...t,
            media_type: 'tv' as const,
            title: t.name,
            name: t.name
          })
        }
      }
    }
  } catch (err: any) {
    logger.error('Error fetching from Turso', err)
  }

  // 3. If still not enough, get random content
  if (results.length < 10) {
    try {
      const [randomMovies, randomTV] = await Promise.all([
        fetch('/api/movies?sort=random&limit=10&min_rating=6.0'),
        fetch('/api/tv?sort=random&limit=10&min_rating=6.0')
      ])

      if (randomMovies.ok) {
        const movies = await randomMovies.json()
        for (const m of movies) {
          const key = `movie-${m.id}`
          if (!seen.has(key) && m.poster_path && m.slug) {
            seen.add(key)
            results.push({
              ...m,
              media_type: 'movie' as const,
              title: m.title,
              name: m.title
            })
          }
        }
      }

      if (randomTV.ok) {
        const tvShows = await randomTV.json()
        for (const t of tvShows) {
          const key = `tv-${t.id}`
          if (!seen.has(key) && t.poster_path && t.slug) {
            seen.add(key)
            results.push({
              ...t,
              media_type: 'tv' as const,
              title: t.name,
              name: t.name
            })
          }
        }
      }
    } catch (err: any) {
      logger.error('Error fetching random content', err)
    }
  }

  return results.slice(0, 15)
}

async function summarizeGenres(userId: string): Promise<string[]> {
  const last = await getHistory(userId)
  const items = last.slice(0, 10)
  const counts: Record<string, number> = {}

  const details = await mapWithConcurrency(items, 4, async (it) => {
    try {
      // Use Turso API instead of TMDB
      const endpoint = it.content_type === 'movie' ? `/api/movies/${it.external_id}` : `/api/tv/${it.external_id}`
      const res = await fetch(endpoint)
      if (!res.ok) return []

      const data = await res.json()
      // Parse genres if it's a JSON string
      const genres = data.genres ? (typeof data.genres === 'string' ? JSON.parse(data.genres) : data.genres) : []
      return genres
    } catch {
      return []
    }
  })

  for (const genres of details) {
    for (const g of genres) {
      // Handle both string and object formats
      const genreName = typeof g === 'string' ? g : g.name
      counts[genreName] = (counts[genreName] || 0) + 1
    }
  }

  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k)
}

async function generateTitles(genres: string[], userId: string): Promise<string[]> {
  try {
    // Get last 5 history items to give AI more context
    const lastItems = await getHistory(userId)
    const context = await mapWithConcurrency(lastItems.slice(0, 5), 3, async (h) => {
      try {
        // Use Turso API instead of TMDB
        const endpoint = h.content_type === 'movie' ? `/api/movies/${h.external_id}` : `/api/tv/${h.external_id}`
        const res = await fetch(endpoint)
        if (!res.ok) return null

        const data = await res.json()
        return `${h.content_type === 'movie' ? 'Movie' : 'TV'}: ${data.title || data.name}`
      } catch {
        return null
      }
    })
    const validContext = context.filter(Boolean)

    // Call Groq backend endpoint (llama-3.3-70b - 283ms avg, ultra-fast)
    const res = await fetch('/api/groq-recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        genres,
        history: validContext
      })
    })

    if (!res.ok) throw new Error('ai_api_error')

    const data = await res.json() as { titles?: string[] }
    const titles = data.titles || []

    if (titles.length === 0) throw new Error('no_titles_returned')

    return titles.slice(0, 8)
  } catch (err: any) {
    logger.warn('[Recommendations] AI failed, falling back to Turso genres', err)
    return []
  }
}

async function searchTitles(titles: string[]): Promise<RecommendationItem[]> {
  const rows = await mapWithConcurrency(titles, 4, async (t) => {
    try {
      // Use Turso search API instead of TMDB
      const res = await fetch(`/api/search?q=${encodeURIComponent(t)}&limit=5`)
      if (!res.ok) return null

      const results = await res.json()
      if (!results || results.length === 0) return null

      // Get the top result by popularity
      const top = results.sort((a: { popularity?: number }, b: { popularity?: number }) =>
        (b.popularity || 0) - (a.popularity || 0)
      )[0]

      if (!top || !top.slug) return null

      return {
        ...top,
        title: top.name || top.title,
        name: top.name || top.title,
        media_type: top.media_type || (top.title ? 'movie' : 'tv')
      } as RecommendationItem
    } catch {
      return null
    }
  })
  return rows.filter((r): r is RecommendationItem => r !== null)
}

export async function getRecommendations(userId: string): Promise<RecommendationItem[]> {
  const key = `recs:${userId}`
  const cached = cacheGet<RecommendationItem[]>(key)
  if (cached?.length) return cached

  const genres = await summarizeGenres(userId)
  if (genres.length > 0) {
    const titles = await generateTitles(genres, userId)
    if (titles.length > 0) {
      const items = await searchTitles(titles)
      if (items.length > 0) {
        cacheSet(key, items)
        return items
      }
    }
  }

  // Fallback if AI fails or no history
  const fallback = await tmdbFallback(userId)
  if (fallback.length > 0) {
    cacheSet(key, fallback)
    return fallback
  }

  // Ultimate fallback: Turso trending
  try {
    const [moviesRes, tvRes] = await Promise.all([
      fetch('/api/trending?type=movie&limit=10'),
      fetch('/api/trending?type=tv&limit=10')
    ])

    const items: RecommendationItem[] = []

    if (moviesRes.ok) {
      const movies = await moviesRes.json()
      items.push(...movies.map((m: any) => ({
        ...m,
        media_type: 'movie' as const,
        title: m.title,
        name: m.title
      })))
    }

    if (tvRes.ok) {
      const tvShows = await tvRes.json()
      items.push(...tvShows.map((t: any) => ({
        ...t,
        media_type: 'tv' as const,
        title: t.name,
        name: t.name
      })))
    }

    // Filter items with valid slugs
    const validItems = items.filter(item => item.slug && item.slug.trim() !== '' && item.slug !== 'content')

    cacheSet(key, validItems.slice(0, 10))
    return validItems.slice(0, 10)
  } catch {
    return []
  }
}
