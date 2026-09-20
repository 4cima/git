import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { executeFirst, executeAll } from '@/lib/db'
import { SeriesGenrePageClient } from '@/components/pages/SeriesGenrePageClient'
import { buildTvGenreClause, getTvGenreIds, TV_DISAMBIGUATED_GENRES, resolveGenreSlug } from '@/lib/genre-siblings'
import { filterExcludedGenres } from '@/utils/excludedGenres'
import { LISTING_PAGE_SIZE } from '@/lib/listing-config'
import { safeJsonLd } from '@/lib/jsonld';

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const genre = await executeFirst('SELECT tmdb_id, name_ar, name_en FROM genres WHERE slug = ? LIMIT 1', [resolveGenreSlug(slug)])
    if (!genre) return { title: 'تصنيف غير موجود' }
    /* جولة التفريق: الاسم الظاهر = اسم التصنيف كما هو (أكشن / مغامرة) — لا توحيد */
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

export default async function SeriesGenrePage({ params }: PageProps) {
  const { slug } = await params
  try {
    const genre = await executeFirst('SELECT * FROM genres WHERE slug = ? LIMIT 1', [resolveGenreSlug(slug)])
    if (!genre) notFound()

    const plainGenre = {
      id: genre.id, tmdb_id: genre.tmdb_id,
      name_en: genre.name_en, name_ar: genre.name_ar, slug: genre.slug
    }

    /* جولة التفريق: صفحة التصنيف تبقى على سلاجها واسمها الأصليين — أكشن / مغامرة.
       مصدر الصف: series_by_genre (partition النوع بمعرّفات getTvGenreIds — يعاد بناؤه
       بعد كل مزامنة، مفلتر مسبقًا: clean/approved + سنة ≥ 2000 + استبعاد التصنيفات
       الأربعة) ⇒ قراءات محدودة بدل استعلام json_each الحي (~101K صف — MULTI-INDEX OR).
       للأنواع ذات قواعد تفريق (28/12/27/14/878) يُطبَّق buildTvGenreClause على الصفوف
       المنضَمة من الحي — الـpartition وحده لا يكفيها. لغيرها مطابقة الـID مضمونة بالبناء. */
    const displayGenre = plainGenre

    const gid = Number(genre.tmdb_id)
    /* معرّفات الكاش المُجمّع (جولة التفريق: 28/12→10759، 53→9648+80، 10752→10768) */
    const genreIds = getTvGenreIds(gid)
    const isSpecial = TV_DISAMBIGUATED_GENRES.has(gid)
    /* الأنواع الخاصة تحتاج مخزون أوسع قبل الفلترة على الحي؛ لغيرها الـpartition حاسم */
    const buffer = isSpecial ? 1000 : LISTING_PAGE_SIZE + 1

    /* الدمج لمعرّفات متعددة (53→9648+80) بإزالة تكرار العمل الواحد عبر GROUP BY،
       والأحادي يمشي بترتيب الـPK (genre_id, popularity, id) ويقف عند LIMIT */
    const idPlaceholders = genreIds.map(() => '?').join(',')
    const inner = genreIds.length > 1
      ? `SELECT tmdb_id, MAX(popularity) AS pop FROM series_by_genre
         WHERE genre_id IN (${idPlaceholders})
         GROUP BY tmdb_id
         ORDER BY pop DESC
         LIMIT ${buffer}`
      : `SELECT tmdb_id, popularity AS pop FROM series_by_genre
         WHERE genre_id = ?
         ORDER BY popularity DESC, id DESC
         LIMIT ${buffer}`

    const tvClause = isSpecial ? buildTvGenreClause(gid) : null
    const initialSeriesRows = await executeAll(
      `SELECT ts.id, ts.tmdb_id, ts.slug, ts.name_ar, ts.name_en, ts.poster_path, ts.backdrop_path,
              ts.vote_average, ts.first_air_year, ts.overview_ar, ts.genres_json, g.pop
       FROM (${inner}) g
       JOIN tv_series ts ON ts.tmdb_id = g.tmdb_id
       WHERE (ts.filter_status IN ('clean', 'reviewed_approved') OR ts.filter_status IS NULL)
         AND ts.first_air_year IS NOT NULL AND ts.first_air_year >= 2000
         ${tvClause ? `AND ${tvClause.sql}` : ''}
       ORDER BY g.pop DESC, ts.id DESC
       LIMIT ${LISTING_PAGE_SIZE + 1}`,
      [...genreIds, ...(tvClause ? tvClause.params : [])]
    )
    const initialSeries = initialSeriesRows

    /* عدد أعماق الترقيم الساكن — عضوية النوع في الـpartition (قراءة مغطاة — ISR ساعة) */
    const listCountRow = await executeFirst<{ n: number }>(
      `SELECT COUNT(*) AS n FROM series_by_genre WHERE genre_id IN (${idPlaceholders})`,
      genreIds
    )

    // hasMore من نتيجة SQL (على سقف +1) ثم pop — المعروض بعدها ≤ LISTING_PAGE_SIZE
    const hasMore = initialSeries.length > LISTING_PAGE_SIZE
    if (hasMore) initialSeries.pop()

    // فلتر أمان (طبقة JS): Talk Show + War & Politics + Documentary + History
    const filteredSeries = filterExcludedGenres(initialSeries)

    // Enhance series data with media_type and isSeries
    const enhancedSeries = filteredSeries.map((show: any) => ({
      ...show,
      media_type: 'tv',
      isSeries: true
    }))

    const genreName = String(displayGenre.name_ar || displayGenre.name_en || 'تصنيف')
    const genrePageUrl = `https://4cima.com/series/genres/${slug}`

    /* ترقيم ساكن قابل للزحف (مسارات /page/N الثابتة من list_series_genre) */
    const staticTotalPages = Math.min(12, Math.max(1, Math.ceil(Number(listCountRow?.n || 0) / LISTING_PAGE_SIZE)))

    /* JSON-LD — Breadcrumb + CollectionPage بأول الأعمال الظاهرة (مطابق لنموذج genres/[slug]) */
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://4cima.com/' },
            { '@type': 'ListItem', position: 2, name: 'المسلسلات', item: 'https://4cima.com/series' },
            { '@type': 'ListItem', position: 3, name: genreName, item: genrePageUrl },
          ],
        },
        {
          '@type': 'CollectionPage',
          name: `مسلسلات ${genreName}`,
          url: genrePageUrl,
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: filteredSeries.slice(0, LISTING_PAGE_SIZE).length,
            itemListElement: filteredSeries.slice(0, LISTING_PAGE_SIZE).map((s: any, i: number) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `https://4cima.com/series/${s.slug}`,
              name: s.name_ar || s.name_en,
            })),
          },
        },
      ],
    }

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
        <div className="hidden" aria-hidden="true" data-ssr-content="series">
          {filteredSeries.map((show: any) => (
            <div key={show.id} data-series-title={show.name_ar || show.name_en} />
          ))}
        </div>
        <SeriesGenrePageClient
          genre={displayGenre}
          slug={slug}
          initialSeries={enhancedSeries}
          initialHasMore={hasMore}
          staticPagination={{ current: 1, totalPages: staticTotalPages, basePath: `/series/genres/${slug}` }}
        />
      </>
    )
  } catch { notFound() }
}
