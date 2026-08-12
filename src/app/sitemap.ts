import { MetadataRoute } from 'next'
import { turso } from '@/lib/turso'

// Force dynamic generation - sitemap should be generated on-demand, not at build time
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Fetch top movies from Turso (limited to reduce build/generation time)
async function getTopMovies() {
  try {
    const result = await turso.execute({
      sql: 'SELECT slug, updated_at, vote_average FROM movies WHERE filter_status IN (?, ?) ORDER BY popularity DESC LIMIT 10000',
      args: ['clean', 'reviewed_approved']
    })
    return result.rows || []
  } catch (error) {
    console.error('Error fetching movies for sitemap:', error)
    return []
  }
}

// Fetch top series from Turso (limited to reduce build/generation time)
async function getTopSeries() {
  try {
    const result = await turso.execute({
      sql: 'SELECT slug, updated_at, vote_average FROM tv_series WHERE filter_status IN (?, ?) ORDER BY popularity DESC LIMIT 5000',
      args: ['clean', 'reviewed_approved']
    })
    return result.rows || []
  } catch (error) {
    console.error('Error fetching series for sitemap:', error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Hardcoded fallback ensures we never default to wrong domain
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://4cima.com'
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/movies`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/series`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  // Fetch movies and series (limited set for sitemap)
  const [movies, series] = await Promise.all([
    getTopMovies(),
    getTopSeries(),
  ])

  // Movie pages
  const moviePages: MetadataRoute.Sitemap = movies.map((movie: any) => ({
    url: `${baseUrl}/movies/${movie.slug}`,
    lastModified: movie.updated_at ? new Date(movie.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: movie.vote_average >= 7 ? 0.9 : 0.7,
  }))

  // Series pages
  const seriesPages: MetadataRoute.Sitemap = series.map((s: any) => ({
    url: `${baseUrl}/series/${s.slug}`,
    lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: s.vote_average >= 7 ? 0.9 : 0.7,
  }))

  return [...staticPages, ...moviePages, ...seriesPages]
}
