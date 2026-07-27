/**
 * Home Data Utilities for 4cima
 * Helper functions for processing movie/series data
 */

export interface MediaItem {
  id: number
  slug: string
  title_ar?: string
  title_en?: string
  name_ar?: string
  name_en?: string
  poster_path?: string
  vote_average?: number
  overview_ar?: string
  year?: number
  genres_json?: string
  media_type?: 'movie' | 'tv'
}

export interface ProcessedMediaItem {
  id: number
  slug: string
  title: string
  title_ar: string
  title_en: string
  media_type: 'movie' | 'tv'
  poster_path: string
  vote_average: number
  overview_ar?: string
  release_year?: number
  first_air_year?: number
  year?: number
  primary_genre?: string
}

/**
 * Extract the first genre from genres_json
 */
export function extractGenre(genresJson: string | undefined | null): string | null {
  if (!genresJson) return null
  
  try {
    const genres = typeof genresJson === 'string' ? JSON.parse(genresJson) : genresJson
    return Array.isArray(genres) ? genres[0]?.name_ar || null : null
  } catch {
    return null
  }
}

/**
 * Map raw API items to processed format
 */
export function mapItems(items: MediaItem[], mediaType: 'movie' | 'tv'): ProcessedMediaItem[] {
  return (items || []).map((i) => ({
    id: i.id,
    slug: i.slug,
    title: i.title_ar || i.title_en || i.name_ar || i.name_en || '',
    title_ar: i.title_ar || i.name_ar || '',
    title_en: i.title_en || i.name_en || '',
    media_type: mediaType,
    poster_path: i.poster_path || '',
    vote_average: Number(i.vote_average) || 0,
    overview_ar: i.overview_ar,
    release_year: i.year,
    first_air_year: i.year,
    year: i.year,
    primary_genre: extractGenre(i.genres_json) || undefined
  }))
}

/**
 * Fetch home data from API
 */
export async function getHomeData() {
  try {
    const res = await fetch('/api/home', { 
      next: { revalidate: 3600 },
      cache: 'force-cache'
    })
    
    if (!res.ok) {
      throw new Error('Failed to fetch home data')
    }
    
    return await res.json()
  } catch (error) {
    console.error('Error fetching home data:', error)
    return {
      trendingMovies: [],
      trendingSeries: [],
      latest: [],
      topRated: [],
      series: []
    }
  }
}

/**
 * Create hero items by alternating movies and series
 */
export function createHeroItems(
  movies: ProcessedMediaItem[], 
  series: ProcessedMediaItem[], 
  maxItems: number = 10
): ProcessedMediaItem[] {
  const heroMix: ProcessedMediaItem[] = []
  const maxLength = Math.ceil(maxItems / 2)
  
  for (let i = 0; i < maxLength; i++) {
    if (movies[i]) heroMix.push(movies[i])
    if (series[i]) heroMix.push(series[i])
  }
  
  return heroMix.slice(0, maxItems)
}
