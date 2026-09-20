import { Metadata } from 'next'
import { executeAll } from '@/lib/db'
import { filterExcludedGenres } from '@/utils/excludedGenres'
import { LISTING_PAGE_SIZE } from '@/lib/listing-config'
import { SeriesPageClient } from '@/components/pages/SeriesPageClient'
import { safeJsonLd } from '@/lib/jsonld';

export const metadata: Metadata = {
  title: 'المسلسلات المترجمة',
  description: 'استكشف آلاف المسلسلات المترجمة بجودة عالية - دراما، أكشن، كوميديا، وأكثر',
  keywords: ['مسلسلات', 'مسلسلات مترجمة', 'مشاهدة مسلسلات أونلاين', 'مسلسلات 2025', 'مسلسلات تركية', 'مسلسلات كورية', 'مسلسلات أجنبية', '4cima'],
  alternates: { canonical: 'https://4cima.com/series' },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    url: 'https://4cima.com/series',
    siteName: '4cima',
    title: 'المسلسلات المترجمة | فور سيما',
    description: 'استكشف آلاف المسلسلات المترجمة بجودة عالية - دراما، أكشن، كوميديا، وأكثر',
    images: [
      {
        url: 'https://4cima.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'المسلسلات المترجمة',
      },
    ],
  },
}

export const dynamic    = 'force-dynamic' // D1 not available at build time on CI

async function getInitialSeries() {
  try {
    /* ===== (E-3) مصدر واحد: أول صفحة SSR بنفس استعلام /api/series حرفياً =====
       نفس الجدول الحي tv_series + نفس البوابات + نفس الترتيب:
         • استبعاد التصنيفات الأربعة في SQL (10767/10768/99/36) + فلتر JS كطبقة أمان
         • بوابة الإخفاء (filter_status) + بوابة سنة العرض الأول (first_air_year >= 2000)
         • ORDER BY popularity DESC, tv_series.id DESC — نفس ترتيب الـAPI بالحرف
       لماذا لا جدول الكاش list_series_popular: ترتيبه بـ`rank` مختلف عن `popularity`،
       و«تحميل المزيد» يجلب من tv_series بدءاً من OFFSET 20 ⇒ أعمال الصفحة الأولى
       كانت تعود في الصفحة التالية = تكرار، وid من جدول آخر كان يكسر dedupe/مفاتيح الحالة.
       نفس مبدأ صفحتي /series/lang/* و /series/genres/* — تستخدمان tv_series الحيّ من الأصل. */
    const rows = await executeAll(
      `SELECT tv_series.id, tv_series.tmdb_id, tv_series.slug, tv_series.name_ar, tv_series.name_en,
              tv_series.poster_path, tv_series.vote_average, tv_series.first_air_year,
              tv_series.genres_json, tv_series.overview_ar, tv_series.country_of_origin
       FROM tv_series
       LEFT JOIN excluded_genre_series_ids es ON es.tmdb_id = tv_series.tmdb_id
       WHERE (tv_series.genres_json IS NULL OR es.tmdb_id IS NULL)
         AND (IFNULL(tv_series.filter_status, 'clean') IN ('clean', 'reviewed_approved'))
         AND (tv_series.first_air_year IS NOT NULL AND tv_series.first_air_year >= 2000)
       ORDER BY popularity DESC, tv_series.id DESC
       LIMIT ${LISTING_PAGE_SIZE + 1}`,
      []
    )
    const filtered = filterExcludedGenres(rows)
    const hasMore = filtered.length > LISTING_PAGE_SIZE
    if (hasMore) filtered.pop()
    return { items: filtered, hasMore }
  } catch (error) {
    console.error('Error fetching initial series:', error)
    return { items: [], hasMore: false }
  }
}

export default async function SeriesPage() {
  const { items: initialSeries, hasMore: initialHasMore } = await getInitialSeries()

  // Structured data — helps search engines understand the catalog listing
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'المسلسلات المترجمة',
    numberOfItems: initialSeries.length,
    itemListElement: initialSeries.slice(0, 20).map((s: any, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://4cima.com/series/${s.slug}`,
      name: s.name_ar || s.name_en,
      image: s.poster_path ? `https://image.tmdb.org/t/p/w342${s.poster_path}` : undefined,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <SeriesPageClient initialSeries={initialSeries} initialHasMore={initialHasMore} />
    </>
  )
}
