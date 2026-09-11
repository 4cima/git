import { Metadata } from 'next'
import { executeAll } from '@/lib/db'
import { SeriesGenrePageClient } from '@/components/pages/SeriesGenrePageClient'
import { filterExcludedGenres } from '@/utils/excludedGenres'

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
 * صفحة «مسلسلات عربي» — كل المسلسلات ذات original_language = 'ar'
 * تستخدم نفس عميل صفحة التصنيف (شبكة + ترتيب + تحميل لانهائي)
 * مع مسار API مخصص: /api/listing/arabic?type=tv
 */
export default async function ArabicSeriesPage() {
  try {
    const initialSeries = await executeAll(
      `SELECT id, tmdb_id, slug, name_ar as title_ar, name_en as title_en,
              poster_path, backdrop_path,
              vote_average, first_air_year, overview_ar, genres_json
       FROM tv_series
       WHERE original_language = 'ar'
         AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
         AND slug IS NOT NULL AND tmdb_id IS NOT NULL
       ORDER BY popularity DESC
       LIMIT 21`,
      []
    )

    // فلتر: Talk Show + War & Politics + Documentary + History (نفس فلتر صفحات التصنيفات)
    const filteredSeries = filterExcludedGenres(initialSeries)

    const hasMore = filteredSeries.length > 20
    if (hasMore) filteredSeries.pop()

    return (
      <SeriesGenrePageClient
        genre={{ id: 0, tmdb_id: 0, name_en: 'Arabic', name_ar: 'عربي', slug: 'arabic' }}
        slug="arabic"
        initialSeries={filteredSeries}
        initialHasMore={hasMore}
        listingPath="/api/listing/arabic"
        moviesHref="/movies/arabic"
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
