import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { executeFirst, executeAll } from '@/lib/db'
import { SeriesGenrePageClient } from '@/components/pages/SeriesGenrePageClient'
import { getGenreWithTvSiblings, buildGenreWhereClause, buildGenreParams } from '@/lib/genre-siblings'
import { filterExcludedGenres, EXCLUDED_GENRE_SQL_CLAUSE } from '@/utils/excludedGenres'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const genre = await executeFirst('SELECT name_ar, name_en FROM genres WHERE slug = ? LIMIT 1', [slug])
    if (!genre) return { title: 'تصنيف غير موجود' }
    const genreName = String(genre.name_ar || genre.name_en || 'تصنيف')
    const genreTitle = `مسلسلات ${genreName}`
    const genreDescription = `استكشف أفضل مسلسلات ${genreName} - جودة عالية ومترجم`
    const genrePageUrl = `https://4cima.com/series/genres/${slug}`
    return {
      title: genreTitle,
      description: genreDescription,
      alternates: { canonical: genrePageUrl },
      openGraph: {
        type: 'website',
        locale: 'ar_EG',
        url: genrePageUrl,
        siteName: '4cima',
        title: `${genreTitle} | فور سيما`,
        description: genreDescription,
        images: [
          {
            url: '/og-image.png',
            width: 1200,
            height: 630,
            alt: genreTitle,
          },
        ],
      },
    }
  } catch { return { title: 'تصنيف' } }
}

export const revalidate = 3600

export default async function SeriesGenrePage({ params }: PageProps) {
  const { slug } = await params
  try {
    const genre = await executeFirst('SELECT * FROM genres WHERE slug = ? LIMIT 1', [slug])
    if (!genre) notFound()

    const plainGenre = {
      id: genre.id, tmdb_id: genre.tmdb_id,
      name_en: genre.name_en, name_ar: genre.name_ar, slug: genre.slug
    }

    const genreIds = getGenreWithTvSiblings(Number(genre.tmdb_id))
    const whereClause = buildGenreWhereClause(genreIds)
    const genreParams = buildGenreParams(genreIds)

    const initialSeries = await executeAll(
      `SELECT id, tmdb_id, slug, name_ar, name_en, poster_path, backdrop_path,
              vote_average, first_air_year, overview_ar, genres_json
       FROM tv_series
       WHERE ${whereClause}
         AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
         AND ${EXCLUDED_GENRE_SQL_CLAUSE}
       ORDER BY popularity DESC
       LIMIT 21`,
      genreParams
    )

    // فلتر: Talk Show + War & Politics + Documentary + History
    const filteredSeries = filterExcludedGenres(initialSeries)

    const hasMore = filteredSeries.length > 20
    if (hasMore) filteredSeries.pop()

    // Enhance series data with media_type and isSeries
    const enhancedSeries = filteredSeries.map((show: any) => ({
      ...show,
      media_type: 'tv',
      isSeries: true
    }))

    return (
      <>
        <div className="hidden" aria-hidden="true" data-ssr-content="series">
          {filteredSeries.map((show: any) => (
            <div key={show.id} data-series-title={show.name_ar || show.name_en} />
          ))}
        </div>
        <SeriesGenrePageClient genre={plainGenre} slug={slug} initialSeries={enhancedSeries} initialHasMore={hasMore} />
      </>
    )
  } catch { notFound() }
}
