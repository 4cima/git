import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { executeFirst, executeAll } from '@/lib/db'
import { SeriesGenrePageClient } from '@/components/pages/SeriesGenrePageClient'
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
      title: `مسلسلات ${genreName}`,
      description: `استكشف أفضل مسلسلات ${genreName} - جودة عالية ومترجم`
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

    const genreIds = getGenreWithSiblings(genre.tmdb_id)
    const whereClause = buildGenreWhereClause(genreIds)
    const genreParams = buildGenreParams(genreIds)

    const initialSeries = await executeAll(
      `SELECT id, slug, name_ar, name_en, poster_path, backdrop_path,
              vote_average, first_air_year, overview_ar, genres_json
       FROM tv_series
       WHERE ${whereClause}
       ORDER BY popularity DESC
       LIMIT 21`,
      genreParams
    )

    const hasMore = initialSeries.length > 20
    if (hasMore) initialSeries.pop()

    return (
      <>
        <div className="hidden" aria-hidden="true" data-ssr-content="series">
          {initialSeries.map((show: any) => (
            <div key={show.id} data-series-title={show.name_ar || show.name_en} />
          ))}
        </div>
        <SeriesGenrePageClient genre={plainGenre} slug={slug} initialSeries={initialSeries} initialHasMore={hasMore} />
      </>
    )
  } catch { notFound() }
}
