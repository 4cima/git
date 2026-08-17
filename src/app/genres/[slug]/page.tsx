import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { turso } from '@/lib/turso'
import { GenreOverviewPageClient } from '@/components/pages/GenreOverviewPageClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  
  try {
    const response = await turso.execute({
      sql: 'SELECT * FROM genres WHERE slug = ? LIMIT 1',
      args: [slug]
    })
    
    if (!response.rows || response.rows.length === 0) {
      return {
        title: 'تصنيف غير موجود | 4cima'
      }
    }
    
    const genre = response.rows[0]
    const genreName = genre.name_ar || genre.name_en || 'تصنيف'
    
    return {
      title: `أفلام ومسلسلات ${genreName} | 4cima`,
      description: `استكشف أفضل أفلام ومسلسلات ${genreName} - جودة عالية ومترجم`
    }
  } catch (error) {
    return {
      title: 'تصنيف | 4cima'
    }
  }
}

export const revalidate = 3600

export default async function GenreOverviewPage({ params }: PageProps) {
  const { slug } = await params
  
  try {
    // Fetch genre info
    const genreResult = await turso.execute({
      sql: 'SELECT * FROM genres WHERE slug = ? LIMIT 1',
      args: [slug]
    })
    
    if (!genreResult.rows || genreResult.rows.length === 0) {
      notFound()
    }
    
    const genre = genreResult.rows[0]
    
    // Fetch top 12 movies for this genre (server-rendered sample)
    const moviesResult = await turso.execute({
      sql: `
        SELECT id, slug, title_ar, title_en, poster_path, vote_average, release_year
        FROM movies
        WHERE genres_json LIKE ?
          AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
          AND poster_path IS NOT NULL
        ORDER BY popularity DESC
        LIMIT 12
      `,
      args: [`%"slug":"${slug}"%`]
    })
    
    // Fetch top 12 series for this genre (server-rendered sample)
    const seriesResult = await turso.execute({
      sql: `
        SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, vote_average, first_air_year as release_year
        FROM tv_series
        WHERE genres_json LIKE ?
          AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
          AND poster_path IS NOT NULL
        ORDER BY popularity DESC
        LIMIT 12
      `,
      args: [`%"slug":"${slug}"%`]
    })
    
    return (
      <GenreOverviewPageClient
        genre={genre}
        slug={slug}
        topMovies={moviesResult.rows || []}
        topSeries={seriesResult.rows || []}
      />
    )
  } catch (error) {
    notFound()
  }
}
