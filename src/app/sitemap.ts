import { MetadataRoute } from 'next'
import { turso } from '@/lib/turso'

export const dynamic = 'force-static'
export const revalidate = 86400

// Fetch all movies from Turso
async function getAllMovies() {
  try {
    const result = await turso.execute({
      sql: 'SELECT slug, updated_at, vote_average FROM movies WHERE is_filtered = 0 LIMIT 10000',
      args: []
    })
    return result.rows || []
  } catch (error) {
    console.error('Error fetching movies for sitemap:', error)
    return []
  }
}

// Fetch all series from Turso
async function getAllSeries() {
  try {
    const result = await turso.execute({
      sql: 'SELECT slug, updated_at, vote_average FROM series WHERE is_filtered = 0 LIMIT 10000',
      args: []
    })
    return result.rows || []
  } catch (error) {
    console.error('Error fetching series for sitemap:', error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://4cima.online'
  
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

  // Fetch movies and series
  const [movies, series] = await Promise.all([
    getAllMovies(),
    getAllSeries(),
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
