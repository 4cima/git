import type { MetadataRoute } from 'next'
import { executeAll } from '@/lib/db'

export const revalidate = 86400

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://4cima.com'
  const staticRoutes = [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${baseUrl}/movies`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/series`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
  ]
  
  try {
    const movies = await executeAll(`SELECT slug, updated_at FROM movies WHERE filter_status IS NULL OR filter_status IN ('clean', 'reviewed_approved') ORDER BY updated_at DESC LIMIT 50000`)
    const movieRoutes = movies.map(m => ({
      url: `${baseUrl}/movies/${m.slug}`,
      lastModified: m.updated_at && typeof m.updated_at === 'string' ? new Date(m.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
    
    const series = await executeAll(`SELECT slug, updated_at FROM tv_series WHERE filter_status IS NULL OR filter_status IN ('clean', 'reviewed_approved') ORDER BY updated_at DESC LIMIT 50000`)
    const seriesRoutes = series.map(s => ({
      url: `${baseUrl}/series/${s.slug}`,
      lastModified: s.updated_at && typeof s.updated_at === 'string' ? new Date(s.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
    
    return [...staticRoutes, ...movieRoutes, ...seriesRoutes]
  } catch (error) {
    console.error('Sitemap generation error:', error)
    return staticRoutes
  }
}
