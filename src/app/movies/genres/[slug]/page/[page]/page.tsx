import { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { executeFirst, executeAll } from '@/lib/db'
import { MovieGenrePageClient } from '@/components/pages/MovieGenrePageClient'
import { resolveGenreSlug } from '@/lib/genre-siblings'
import { filterExcludedGenres } from '@/utils/excludedGenres'
import { LISTING_PAGE_SIZE } from '@/lib/listing-config'
import { paginationHref } from '@/components/pages/ListingPagination'

/**
 * صفحات ترقيم ساكنة قابلة للزحف لصفحات تصنيفات الأفلام — /movies/genres/{slug}/page/{N}
 *
 * المصدر: list_movies_genre (كاش مُجمّع — أعلى ~300/نوع بترتيب popularity)
 * ⇒ قراءة مغطاة ~24 صفًا/صفحة بدل استعلام json_each الحي (~410K صف).
 * بلا searchParams ⇒ ISR ثابت (revalidate 3600) — لا dynamic opt-in.
 * الصفحة 1 تبقى على المسار الأصلي مع سكرول لانهائي؛ هذه الصفحات (2..12)
 * شبكة ساكنة + شريط ترقيم <a> يفتح أعماق الكتالوج لمحركات البحث.
 */

export const revalidate = 3600

/** سقف الترقيم: أعلى 300 عمل/نوع في جدول الكاش ÷ 24 */
const MAX_PAGES = 12

interface PageProps {
  params: Promise<{ slug: string; page: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, page } = await params
  const pageNum = parseInt(page, 10)
  try {
    const genre = await executeFirst('SELECT name_ar, name_en FROM genres WHERE slug = ? LIMIT 1', [resolveGenreSlug(slug)])
    if (!genre) return { title: 'تصنيف غير موجود' }
    const genreName = String(genre.name_ar || genre.name_en || 'تصنيف')
    const genreTitle = `أفلام ${genreName} — صفحة ${pageNum}`
    const genreDescription = `استكشف أفلام ${genreName} — الصفحة ${pageNum} — جودة عالية ومترجم`
    const canonical = `https://4cima.com/movies/genres/${slug}/page/${pageNum}`
    return {
      title: genreTitle,
      description: genreDescription,
      alternates: { canonical },
      openGraph: {
        type: 'website',
        locale: 'ar_EG',
        url: canonical,
        siteName: '4cima',
        title: `${genreTitle} | فور سيما`,
        description: genreDescription,
      },
    }
  } catch { return { title: 'تصنيف' } }
}

export default async function MovieGenrePaginatedPage({ params }: PageProps) {
  const { slug, page } = await params
  const pageNum = parseInt(page, 10)
  if (!Number.isFinite(pageNum) || pageNum < 1 || pageNum > MAX_PAGES) notFound()
  if (pageNum === 1) permanentRedirect(`/movies/genres/${slug}`)

  try {
    const genre = await executeFirst('SELECT * FROM genres WHERE slug = ? LIMIT 1', [resolveGenreSlug(slug)])
    if (!genre) notFound()

    const offset = (pageNum - 1) * LISTING_PAGE_SIZE
    const [rows, countRows] = await Promise.all([
      executeAll(
        `SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, backdrop_path,
                vote_average, release_year, overview_ar, genres_json
         FROM list_movies_genre
         WHERE genre_tmdb_id = ?
         ORDER BY popularity DESC, rank ASC
         LIMIT ${LISTING_PAGE_SIZE} OFFSET ${offset}`,
        [Number(genre.tmdb_id)]
      ),
      executeFirst<{ n: number }>(
        `SELECT COUNT(*) AS n FROM list_movies_genre WHERE genre_tmdb_id = ?`,
        [Number(genre.tmdb_id)]
      ),
    ])

    const filtered = filterExcludedGenres(rows)
    if (filtered.length === 0) notFound()

    const totalPages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(Number(countRows?.n || 0) / LISTING_PAGE_SIZE)))
    const genreName = String(genre.name_ar || genre.name_en || 'تصنيف')
    const basePath = `/movies/genres/${slug}`

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `أفلام ${genreName} — صفحة ${pageNum}`,
      url: `https://4cima.com${paginationHref(basePath, pageNum)}`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: filtered.length,
        itemListElement: filtered.map((m: any, i: number) => ({
          '@type': 'ListItem',
          position: offset + i + 1,
          url: `https://4cima.com/movies/${m.slug}`,
          name: m.title_ar || m.title_en,
        })),
      },
    }

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="hidden" aria-hidden="true" data-ssr-content="movies">
          {filtered.map((movie: any) => (
            <div key={movie.id} data-movie-title={movie.title_ar || movie.title_en} />
          ))}
        </div>
        <MovieGenrePageClient
          genre={{
            id: genre.id, tmdb_id: genre.tmdb_id,
            name_en: genre.name_en, name_ar: genre.name_ar, slug: genre.slug,
          }}
          slug={slug}
          initialMovies={filtered}
          initialHasMore={false}
          staticPagination={{ current: pageNum, totalPages, basePath }}
        />
      </>
    )
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in (error as any)) throw error
    notFound()
  }
}
