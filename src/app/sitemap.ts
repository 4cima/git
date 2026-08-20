import { MetadataRoute } from 'next'
import { executeAll } from '@/lib/db'

// Generate sitemap once daily instead of on every request
export const dynamic = 'force-static'
export const revalidate = 86400

async function getTopMovies() {
  try {
    return await executeAll(
      `SELECT slug, updated_at, vote_average
       FROM movies INDEXED BY idx_movies_filter
       WHERE filter_status IN (?, ?)
       ORDER BY popularity DESC LIMIT 10000`,
      ['clean', 'reviewed_approved']
    )
  } catch { return [] }
}

async function getTopSeries() {
  try {
    return await executeAll(
      `SELECT slug, updated_at, vote_average
       FROM tv_series INDEXED BY idx_tv_filter
       WHERE filter_status IN (?, ?)
       ORDER BY popularity DESC LIMIT 5000`,
      ['clean', 'reviewed_approved']
    )
  } catch { return [] }
}

async function getGenres() {
  try {
    return await executeAll('SELECT slug FROM genres ORDER BY name_ar ASC', [])
  } catch { return [] }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://4cima.com'
  
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl,                  lastModified: new Date(), changeFrequency: 'daily',  priority: 1   },
    { url: `${baseUrl}/movies`,      lastModified: new Date(), changeFrequency: 'daily',  priority: 0.9 },
    { url: `${baseUrl}/series`,      lastModified: new Date(), changeFrequency: 'daily',  priority: 0.9 },
    { url: `${baseUrl}/genres`,      lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  ]

  const [movies, series, genres] = await Promise.all([getTopMovies(), getTopSeries(), getGenres()])

  const moviePages: MetadataRoute.Sitemap = movies.map((m: any) => ({
    url: `${baseUrl}/movies/${m.slug}`,
    lastModified: m.updated_at ? new Date(m.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: m.vote_average >= 7 ? 0.9 : 0.7,
  }))

  const seriesPages: MetadataRoute.Sitemap = series.map((s: any) => ({
    url: `${baseUrl}/series/${s.slug}`,
    lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: s.vote_average >= 7 ? 0.9 : 0.7,
  }))

  const genrePages: MetadataRoute.Sitemap = []
  genres.forEach((g: any) => {
    genrePages.push({ url: `${baseUrl}/genres/${g.slug}`,         lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 })
    genrePages.push({ url: `${baseUrl}/movies/genres/${g.slug}`,  lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 })
    genrePages.push({ url: `${baseUrl}/series/genres/${g.slug}`,  lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 })
  })

  return [...staticPages, ...moviePages, ...seriesPages, ...genrePages]
}
