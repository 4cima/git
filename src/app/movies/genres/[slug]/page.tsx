import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { executeFirst, executeAll } from '@/lib/db'
import { MovieGenrePageClient } from '@/components/pages/MovieGenrePageClient'
import { getGenreWithSiblings, buildGenreWhereClause, buildGenreParams, resolveGenreSlug } from '@/lib/genre-siblings'
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
            url: 'https://4cima.com/og-image.png',
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
    const genre = await executeFirst('SELECT * FROM genres WHERE slug = ? LIMIT 1', [resolveGenreSlug(slug)])
    if (!genre) notFound()

    const plainGenre = {
      id: genre.id, tmdb_id: genre.tmdb_id,
      name_en: genre.name_en, name_ar: genre.name_ar, slug: genre.slug
    }

    const genreIds = getGenreWithSiblings(Number(genre.tmdb_id))
    const whereClause = buildGenreWhereClause(genreIds)
    const genreParams = buildGenreParams(genreIds)

    // استبعاد التصنيفات الأربعة (Talk Show + War & Politics + Documentary + History) داخل
    // SQL مباشرة — نفس شرط الـ API تماماً — مع LIMIT 21: hasMore يُحسب من نتيجة SQL
    // (21 صفاً > 20) ويُضمن المعروض ≤ 20 بلا نقص بعد الاستبعاد.
    const initialMovies = await executeAll(
      `SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, backdrop_path,
              vote_average, release_year, overview_ar, genres_json
       FROM movies
       WHERE ${whereClause}
         AND ${EXCLUDED_GENRE_SQL_CLAUSE}
         AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
         AND release_year IS NOT NULL AND release_year >= 2000
       ORDER BY popularity DESC, id DESC
       LIMIT 21`,
      genreParams
    )

    // hasMore من نتيجة SQL (على سقف 21) ثم pop — المعروض بعدها ≤ 20
    const hasMore = initialMovies.length > 20
    if (hasMore) initialMovies.pop()

    // فلتر أمان (طبقة JS): Talk Show + War & Politics + Documentary + History
    const filteredMovies = filterExcludedGenres(initialMovies)

    const genreName = String(plainGenre.name_ar || plainGenre.name_en || 'تصنيف')
    const genrePageUrl = `https://4cima.com/movies/genres/${slug}`

    /* JSON-LD — Breadcrumb + CollectionPage بأول الأعمال الظاهرة (مطابق لنموذج genres/[slug]) */
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://4cima.com/' },
            { '@type': 'ListItem', position: 2, name: 'الأفلام', item: 'https://4cima.com/movies' },
            { '@type': 'ListItem', position: 3, name: genreName, item: genrePageUrl },
          ],
        },
        {
          '@type': 'CollectionPage',
          name: `أفلام ${genreName}`,
          url: genrePageUrl,
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: filteredMovies.slice(0, 20).length,
            itemListElement: filteredMovies.slice(0, 20).map((m: any, i: number) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `https://4cima.com/movies/${m.slug}`,
              name: m.title_ar || m.title_en,
            })),
          },
        },
      ],
    }

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
