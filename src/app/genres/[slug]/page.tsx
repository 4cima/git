import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { executeFirst, executeAll } from '@/lib/db'
import { GenreOverviewPageClient } from '@/components/pages/GenreOverviewPageClient'
import { getGenreWithSiblings, buildGenreWhereClause, buildGenreParams } from '@/lib/genre-siblings'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const genre = await executeFirst('SELECT name_ar, name_en FROM genres WHERE slug = ? LIMIT 1', [slug])
    if (!genre) return { title: 'تصنيف غير موجود' }
    const genreName = String(genre.name_ar || genre.name_en || 'تصنيف')
    return {
      title: `أفلام ومسلسلات ${genreName}`,
      description: `استكشف أفضل أفلام ومسلسلات ${genreName} - جودة عالية ومترجم`
    }
  } catch { return { title: 'تصنيف' } }
}

export const revalidate = 3600

export default async function GenreOverviewPage({ params }: PageProps) {
  const { slug } = await params
  try {
    const genre = await executeFirst('SELECT * FROM genres WHERE slug = ? LIMIT 1', [slug])
    if (!genre) notFound()

    const genreIds = getGenreWithSiblings(genre.tmdb_id)
    const whereClause = buildGenreWhereClause(genreIds)
    const genreParams = buildGenreParams(genreIds)

    const [topMovies, topSeries] = await Promise.all([
      executeAll(
        `SELECT id, slug, title_ar, title_en, poster_path, vote_average, release_year
         FROM movies
         WHERE ${whereClause}
           AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
           AND poster_path IS NOT NULL
         ORDER BY popularity DESC LIMIT 12`,
        genreParams
      ),
      executeAll(
        `SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, vote_average, first_air_year as release_year
         FROM tv_series
         WHERE ${whereClause}
           AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
           AND poster_path IS NOT NULL
         ORDER BY popularity DESC LIMIT 12`,
        genreParams
      )
    ])

    return (
      <GenreOverviewPageClient genre={genre} slug={slug} topMovies={topMovies} topSeries={topSeries} />
    )
  } catch { notFound() }
}
