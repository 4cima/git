import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { executeFirst, executeAll } from '@/lib/db'
import { MovieGenrePageClient } from '@/components/pages/MovieGenrePageClient'
import { getGenreWithSiblings, buildGenreWhereClause, buildGenreParams } from '@/lib/genre-siblings'
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
    const genreTitle = `أفلام ${genreName}`
    const genreDescription = `استكشف أفضل أفلام ${genreName} - جودة عالية ومترجم`
    const genrePageUrl = `https://4cima.com/movies/genres/${slug}`
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

export default async function MovieGenrePage({ params }: PageProps) {
  const { slug } = await params
  try {
    const genre = await executeFirst('SELECT * FROM genres WHERE slug = ? LIMIT 1', [slug])
    if (!genre) notFound()

    const plainGenre = {
      id: genre.id, tmdb_id: genre.tmdb_id,
      name_en: genre.name_en, name_ar: genre.name_ar, slug: genre.slug
    }

    const genreIds = getGenreWithSiblings(Number(genre.tmdb_id))
    const whereClause = buildGenreWhereClause(genreIds)
    const genreParams = buildGenreParams(genreIds)

    const initialMovies = await executeAll(
      `SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, backdrop_path,
              vote_average, release_year, overview_ar, genres_json
       FROM movies
       WHERE ${whereClause}
         AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
         AND ${EXCLUDED_GENRE_SQL_CLAUSE}
       ORDER BY popularity DESC
       LIMIT 21`,
      genreParams
    )

    // فلتر: Talk Show + War & Politics + Documentary + History
    const filteredMovies = filterExcludedGenres(initialMovies)

    const hasMore = filteredMovies.length > 20
    if (hasMore) filteredMovies.pop()

    return (
      <>
        <div className="hidden" aria-hidden="true" data-ssr-content="movies">
          {filteredMovies.map((movie: any) => (
            <div key={movie.id} data-movie-title={movie.title_ar || movie.title_en} />
          ))}
        </div>
        <MovieGenrePageClient genre={plainGenre} slug={slug} initialMovies={filteredMovies} initialHasMore={hasMore} />
      </>
    )
  } catch { notFound() }
}
