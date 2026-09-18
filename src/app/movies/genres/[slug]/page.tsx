import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { executeFirst, executeAll } from '@/lib/db'
import { MovieGenrePageClient } from '@/components/pages/MovieGenrePageClient'
import { resolveGenreSlug } from '@/lib/genre-siblings'
import { filterExcludedGenres } from '@/utils/excludedGenres'
import { LISTING_PAGE_SIZE } from '@/lib/listing-config'
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

    /* مصدر الصف: movies_by_genre (partition النوع — جدول مُجمّع يعاد بناؤه بعد كل
       مزامنة، مفلتر مسبقًا: clean/approved + سنة ≥ 2000 + استبعاد التصنيفات الأربعة).
       الـPK (genre_id, popularity, id) ⇒ الاستعلام الداخلي يمشي بترتيب الفهرس العكسي
       ويقف عند LIMIT ⇒ ~26 قراءة بدل استعلام json_each الحي (~410K صف — MULTI-INDEX OR).
       النتيجة مطابقة للاستعلام القديم حرفيًا (نفس فلتر البناء = نفس شروط الحي)،
       وفلتر الحالة/السنة على الصف المنضَم يصحّح أي تجاوز قِدم في اللقطة. */
    const gid = Number(genre.tmdb_id)
    const [initialMoviesRows, listCountRow] = await Promise.all([
      executeAll(
        `SELECT m.id, m.tmdb_id, m.slug, m.title_ar, m.title_en, m.poster_path, m.backdrop_path,
                m.vote_average, m.release_year, m.overview_ar, m.genres_json
         FROM (
           SELECT tmdb_id FROM movies_by_genre
           WHERE genre_id = ?
           ORDER BY popularity DESC, id DESC
           LIMIT ${LISTING_PAGE_SIZE + 1}
         ) g
         JOIN movies m ON m.tmdb_id = g.tmdb_id
         WHERE (m.filter_status IN ('clean', 'reviewed_approved') OR m.filter_status IS NULL)
           AND m.release_year IS NOT NULL AND m.release_year >= 2000
         ORDER BY m.popularity DESC, m.id DESC`,
        [gid]
      ),
      /* عدد أعماق الترقيم الساكن — عضوية النوع كاملة في الـpartition (ISR ساعة) */
      executeFirst<{ n: number }>(
        `SELECT COUNT(*) AS n FROM movies_by_genre WHERE genre_id = ?`,
        [gid]
      ),
    ])
    const initialMovies = initialMoviesRows

    // hasMore من نتيجة SQL (على سقف +1) ثم pop — المعروض بعدها ≤ LISTING_PAGE_SIZE
    const hasMore = initialMovies.length > LISTING_PAGE_SIZE
    if (hasMore) initialMovies.pop()

    // فلتر أمان (طبقة JS): Talk Show + War & Politics + Documentary + History
    const filteredMovies = filterExcludedGenres(initialMovies)

    const genreName = String(plainGenre.name_ar || plainGenre.name_en || 'تصنيف')
    const genrePageUrl = `https://4cima.com/movies/genres/${slug}`

    /* ترقيم ساكن قابل للزحف (مسارات /page/N الثابتة من list_movies_genre) */
    const staticTotalPages = Math.min(12, Math.max(1, Math.ceil(Number(listCountRow?.n || 0) / LISTING_PAGE_SIZE)))

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
            numberOfItems: filteredMovies.slice(0, LISTING_PAGE_SIZE).length,
            itemListElement: filteredMovies.slice(0, LISTING_PAGE_SIZE).map((m: any, i: number) => ({
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
        <MovieGenrePageClient
          genre={plainGenre}
          slug={slug}
          initialMovies={filteredMovies}
          initialHasMore={hasMore}
          staticPagination={{ current: 1, totalPages: staticTotalPages, basePath: `/movies/genres/${slug}` }}
        />
      </>
    )
  } catch { notFound() }
}
