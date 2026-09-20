import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { executeFirst, executeAll } from '@/lib/db'
import { GenreOverviewPageClient } from '@/components/pages/GenreOverviewPageClient'
import { buildTvGenreClause, getTvGenreIds, TV_DISAMBIGUATED_GENRES, resolveGenreSlug } from '@/lib/genre-siblings'
import { filterExcludedGenres } from '@/utils/excludedGenres'
import { safeJsonLd } from '@/lib/jsonld';

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const genre = await executeFirst('SELECT name_ar, name_en FROM genres WHERE slug = ? LIMIT 1', [resolveGenreSlug(slug)])
    if (!genre) return { title: 'تصنيف غير موجود' }
    const genreName = String(genre.name_ar || genre.name_en || 'تصنيف')
    // بدون «| فور سيما» — template في layout يضيفها تلقائياً
    const title = `أفلام ومسلسلات ${genreName} — تصفح كامل التصنيف`
    const description = `استكشف أفضل أفلام ومسلسلات ${genreName} المترجمة بجودة عالية — مقسّمة لقسمين: أفلام ${genreName} ومسلسلات ${genreName} مع ترتيب حسب الشهرة والتقييم والحدث.`
    const url = `https://4cima.com/genres/${slug}`
    return {
      title,
      description,
      keywords: [
        `أفلام ${genreName}`, `مسلسلات ${genreName}`, `أفلام ${genreName} مترجمة`,
        `مسلسلات ${genreName} مترجمة`, `تصنيف ${genreName}`, 'أفلام ومسلسلات', '4cima',
      ],
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        siteName: '4cima',
        type: 'website',
        locale: 'ar_EG',
        images: [{ url: '/og-image.png', width: 1200, height: 630, alt: title }],
      },
    }
  } catch { return { title: 'تصنيف' } }
}

export const revalidate = 3600

export default async function GenreOverviewPage({ params }: PageProps) {
  const { slug } = await params
  try {
    const genre = await executeFirst('SELECT * FROM genres WHERE slug = ? LIMIT 1', [resolveGenreSlug(slug)])
    if (!genre) notFound()

    /* مصدر الصف: partitions الأنواع المُجمّعة (movies_by_genre / series_by_genre) —
       تعاد بناؤها بعد كل مزامنة ومفلترة مسبقًا بنفس شروط الحي ⇒ قراءات محدودة
       (~عشرات الصفوف) بدل استعلامات json_each الحية (~410K + ~101K صف/نداء بارد).
       فلتر poster_path يُطبَّق على الصف المنضَم بمخزون أكبر من الـ12 المطلوبة. */
    const gid = Number(genre.tmdb_id)
    const tvIds = getTvGenreIds(gid)
    const isSpecial = TV_DISAMBIGUATED_GENRES.has(gid)
    const tvBuffer = isSpecial ? 1000 : 60
    const tvClause = isSpecial ? buildTvGenreClause(gid) : null
    const tvPlaceholders = tvIds.map(() => '?').join(',')
    const tvInner = tvIds.length > 1
      ? `SELECT tmdb_id, MAX(popularity) AS pop FROM series_by_genre
         WHERE genre_id IN (${tvPlaceholders})
         GROUP BY tmdb_id
         ORDER BY pop DESC
         LIMIT ${tvBuffer}`
      : `SELECT tmdb_id, popularity AS pop FROM series_by_genre
         WHERE genre_id = ?
         ORDER BY popularity DESC, id DESC
         LIMIT ${tvBuffer}`

    const [topMovies, topSeries] = await Promise.all([
      executeAll(
        `SELECT m.id, m.tmdb_id, m.slug, m.title_ar, m.title_en, m.poster_path, m.vote_average, m.release_year, m.overview_ar, m.genres_json
         FROM (
           SELECT tmdb_id FROM movies_by_genre
           WHERE genre_id = ?
           ORDER BY popularity DESC, id DESC
           LIMIT 60
         ) g
         JOIN movies m ON m.tmdb_id = g.tmdb_id
         WHERE (m.filter_status IN ('clean', 'reviewed_approved') OR m.filter_status IS NULL)
           AND m.release_year IS NOT NULL AND m.release_year >= 2000
           AND m.poster_path IS NOT NULL
         ORDER BY m.popularity DESC, m.id DESC
         LIMIT 12`,
        [gid]
      ),
      executeAll(
        `SELECT ts.id, ts.tmdb_id, ts.slug, ts.name_ar as title_ar, ts.name_en as title_en, ts.poster_path, ts.vote_average, ts.first_air_year as release_year, ts.overview_ar, ts.genres_json
         FROM (${tvInner}) g
         JOIN tv_series ts ON ts.tmdb_id = g.tmdb_id
         WHERE (ts.filter_status IN ('clean', 'reviewed_approved') OR ts.filter_status IS NULL)
           AND ts.first_air_year IS NOT NULL AND ts.first_air_year >= 2000
           AND ts.poster_path IS NOT NULL
           ${tvClause ? `AND ${tvClause.sql}` : ''}
         ORDER BY g.pop DESC, ts.id DESC
         LIMIT 12`,
        [...tvIds, ...(tvClause ? tvClause.params : [])]
      ),
    ])

    // فلتر: Talk Show + War & Politics + Documentary + History
    const filteredMovies = filterExcludedGenres(topMovies)
    const filteredSeries = filterExcludedGenres(topSeries)

    const genreName = String(genre.name_ar || genre.name_en || 'تصنيف')

    /* JSON-LD — Breadcrumb + CollectionPage بكل الأعمال الظاهرة (SEO) */
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://4cima.com/' },
            { '@type': 'ListItem', position: 2, name: 'التصنيفات', item: 'https://4cima.com/genres' },
            { '@type': 'ListItem', position: 3, name: genreName, item: `https://4cima.com/genres/${slug}` },
          ],
        },
        {
          '@type': 'CollectionPage',
          name: `أفلام ومسلسلات ${genreName}`,
          url: `https://4cima.com/genres/${slug}`,
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: filteredMovies.length + filteredSeries.length,
            itemListElement: [
              ...filteredMovies.slice(0, 10).map((m: any, i: number) => ({
                '@type': 'ListItem', position: i + 1,
                url: `https://4cima.com/movies/${m.slug}`,
                name: m.title_ar || m.title_en,
              })),
              ...filteredSeries.slice(0, 10).map((s: any, i: number) => ({
                '@type': 'ListItem', position: filteredMovies.slice(0, 10).length + i + 1,
                url: `https://4cima.com/series/${s.slug}`,
                name: s.title_ar || s.title_en,
              })),
            ],
          },
        },
      ],
    }

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
        <GenreOverviewPageClient genre={genre} slug={slug} topMovies={filteredMovies} topSeries={filteredSeries} />
      </>
    )
  } catch { notFound() }
}
