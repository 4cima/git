import { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { executeFirst, executeAll } from '@/lib/db'
import { SeriesGenrePageClient } from '@/components/pages/SeriesGenrePageClient'
import { getTvGenreIds, resolveGenreSlug } from '@/lib/genre-siblings'
import { filterExcludedGenres } from '@/utils/excludedGenres'
import { LISTING_PAGE_SIZE } from '@/lib/listing-config'
import { paginationHref } from '@/components/pages/ListingPagination'

/**
 * صفحات ترقيم ساكنة قابلة للزحف لصفحات تصنيفات المسلسلات — /series/genres/{slug}/page/{N}
 *
 * المصدر: list_series_genre (كاش مُجمّع — أعلى ~300/نوع بترتيب popularity)
 * ⇒ قراءة مغطاة ~24 صفًا/صفحة بدل استعلام json_each الحي.
 * معرّفات التصنيف عبر getTvGenreIds (جولة التفريق: 28/12→10759، 53→9648+80، 10752→10768).
 * بلا searchParams ⇒ ISR ثابت (revalidate 3600) — لا dynamic opt-in.
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
    const genreTitle = `مسلسلات ${genreName} — صفحة ${pageNum}`
    const genreDescription = `استكشف مسلسلات ${genreName} — الصفحة ${pageNum} — جودة عالية ومترجم`
    const canonical = `https://4cima.com/series/genres/${slug}/page/${pageNum}`
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

export default async function SeriesGenrePaginatedPage({ params }: PageProps) {
  const { slug, page } = await params
  const pageNum = parseInt(page, 10)
  if (!Number.isFinite(pageNum) || pageNum < 1 || pageNum > MAX_PAGES) notFound()
  if (pageNum === 1) permanentRedirect(`/series/genres/${slug}`)

  try {
    const genre = await executeFirst('SELECT * FROM genres WHERE slug = ? LIMIT 1', [resolveGenreSlug(slug)])
    if (!genre) notFound()

    const genreIds = getTvGenreIds(Number(genre.tmdb_id))
    const idPlaceholders = genreIds.map(() => '?').join(',')
    const offset = (pageNum - 1) * LISTING_PAGE_SIZE

    const [rows, countRows] = await Promise.all([
      executeAll(
        `SELECT id, tmdb_id, slug, name_ar, name_en, poster_path, backdrop_path,
                vote_average, first_air_year, overview_ar, genres_json
         FROM list_series_genre
         WHERE genre_tmdb_id IN (${idPlaceholders})
         ORDER BY popularity DESC, rank ASC
         LIMIT ${LISTING_PAGE_SIZE} OFFSET ${offset}`,
        genreIds
      ),
      executeFirst<{ n: number }>(
        `SELECT COUNT(*) AS n FROM list_series_genre WHERE genre_tmdb_id IN (${idPlaceholders})`,
        genreIds
      ),
    ])

    const filtered = filterExcludedGenres(rows)
    if (filtered.length === 0) notFound()

    /* نفس تحسينات الصفحة الأب: media_type + isSeries لكروت المسلسلات */
    const enhanced = filtered.map((show: any) => ({ ...show, media_type: 'tv', isSeries: true }))

    const totalPages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(Number(countRows?.n || 0) / LISTING_PAGE_SIZE)))
    const genreName = String(genre.name_ar || genre.name_en || 'تصنيف')
    const basePath = `/series/genres/${slug}`

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `مسلسلات ${genreName} — صفحة ${pageNum}`,
      url: `https://4cima.com${paginationHref(basePath, pageNum)}`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: enhanced.length,
        itemListElement: enhanced.map((s: any, i: number) => ({
          '@type': 'ListItem',
          position: offset + i + 1,
          url: `https://4cima.com/series/${s.slug}`,
          name: s.name_ar || s.name_en,
        })),
      },
    }

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="hidden" aria-hidden="true" data-ssr-content="series">
          {enhanced.map((show: any) => (
            <div key={show.id} data-series-title={show.name_ar || show.name_en} />
          ))}
        </div>
        <SeriesGenrePageClient
          genre={{
            id: genre.id, tmdb_id: genre.tmdb_id,
            name_en: genre.name_en, name_ar: genre.name_ar, slug: genre.slug,
          }}
          slug={slug}
          initialSeries={enhanced}
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
