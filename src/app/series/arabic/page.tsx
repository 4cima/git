import { Metadata } from 'next'
import { executeAll } from '@/lib/db'
import { filterExcludedGenres } from '@/utils/excludedGenres'
import { LISTING_PAGE_SIZE } from '@/lib/listing-config'
import { SeriesPageClient } from '@/components/pages/SeriesPageClient'

export const metadata: Metadata = {
  // بدون «| فور سيما» — template في layout يضيفها تلقائياً
  title: 'مسلسلات عربي',
  description: 'شاهد أفضل المسلسلات العربية بجودة عالية - أحدث المسلسلات المصرية والسورية واللبنانية مترجمة',
  keywords: ['مسلسلات عربي', 'مسلسلات مصرية', 'مسلسلات سورية', 'مسلسلات لبنانية', 'مسلسلات رمضان', 'مشاهدة مسلسلات عربية', '4cima'],
  alternates: { canonical: 'https://4cima.com/series/arabic' },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    url: 'https://4cima.com/series/arabic',
    siteName: '4cima',
    title: 'مسلسلات عربي | فور سيما',
    description: 'شاهد أفضل المسلسلات العربية بجودة عالية - أحدث المسلسلات المصرية والسورية واللبنانية مترجمة',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'مسلسلات عربي' }],
  },
}

export const dynamic = 'force-dynamic' // D1 not available at build time on CI

/**
 * صفحة «مسلسلات عربي» — قائمة لغة كاملة (وليس شبكة تصنيف 20 وتقف).
 * أول صفحة SSR بنفس استعلام /api/series?language=ar&sort=popularity&order=desc&page=1
 * حتى يكون تحميل المزيد (نفس الـ API مع language=ar) متسقة بلا تكرار/قفز.
 */
export default async function ArabicSeriesPage() {
  try {
    const rows = await executeAll(
      `SELECT tv_series.id, tv_series.tmdb_id, tv_series.slug,
              tv_series.name_ar AS title_ar, tv_series.name_en AS title_en,
              tv_series.poster_path, tv_series.backdrop_path, tv_series.vote_average, tv_series.first_air_year,
              tv_series.genres_json, tv_series.overview_ar
       FROM tv_series
       WHERE original_language = 'ar'
         AND (genres_json IS NULL OR NOT EXISTS (
           SELECT 1 FROM json_each(tv_series.genres_json)
           WHERE json_extract(value, '$.tmdb_id') IN (10767, 10768, 99, 36)
         ))
         AND (tv_series.filter_status IN ('clean', 'reviewed_approved') OR tv_series.filter_status IS NULL)
         AND (tv_series.first_air_year IS NOT NULL AND tv_series.first_air_year >= 2000)
       ORDER BY popularity DESC
       LIMIT ${LISTING_PAGE_SIZE + 1}`,
      []
    )

    // نفس الفلتر اللاحق الذي يطبّقه /api/series على كل دفعة — يحافظ على تطابق الصف الأول
    const filteredSeries = filterExcludedGenres(rows)

    const hasMore = filteredSeries.length > LISTING_PAGE_SIZE
    if (hasMore) filteredSeries.pop()

    return (
      <SeriesPageClient
        initialSeries={filteredSeries}
        initialHasMore={hasMore}
        forcedLanguage="ar"
        title="مسلسلات عربي"
      />
    )
  } catch (error) {
    console.error('Error fetching series/arabic page data:', error)
    // لا نعيد قائمة فاضية على استثناء D1/SSR كي لا تُخبز الصفحة فارغة وقت البناء —
    // الإعادة (throw) تجعل Next يسقط التخزين المسبق ويُصدِّر الصفحة عند الطلب (D1 متاح وقت التشغيل)،
    // وهو نفس نهج صفحات التصنيفات الحقيقية (لا مصفوفات فاضية في مسار الخطأ).
    throw error
  }
}
