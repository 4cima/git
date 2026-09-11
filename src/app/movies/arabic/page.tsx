import { Metadata } from 'next'
import { executeAll } from '@/lib/db'
import { filterExcludedGenres } from '@/utils/excludedGenres'
import { LISTING_PAGE_SIZE } from '@/lib/listing-config'
import { MoviesPageClient } from '@/components/pages/MoviesPageClient'

export const metadata: Metadata = {
  // بدون «| فور سيما» — template في layout يضيفها تلقائياً
  title: 'أفلام عربي',
  description: 'شاهد أفضل الأفلام العربية بجودة عالية - أحدث الأفلام المصرية والسورية واللبنانية مترجمة',
  keywords: ['أفلام عربي', 'أفلام مصرية', 'أفلام سورية', 'أفلام لبنانية', 'مشاهدة أفلام عربية', 'أفلام عربية 2025', '4cima'],
  alternates: { canonical: 'https://4cima.com/movies/arabic' },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    url: 'https://4cima.com/movies/arabic',
    siteName: '4cima',
    title: 'أفلام عربي | فور سيما',
    description: 'شاهد أفضل الأفلام العربية بجودة عالية - أحدث الأفلام المصرية والسورية واللبنانية مترجمة',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'أفلام عربي' }],
  },
}

export const dynamic = 'force-dynamic' // D1 not available at build time on CI

/**
 * صفحة «أفلام عربي» — قائمة لغة كاملة (وليس شبكة تصنيف 20 وتقف).
 * أول صفحة SSR بنفس استعلام /api/movies?language=ar&sort=popularity&order=desc&page=1
 * حتى يكون تحميل المزيد (نفس الـ API مع language=ar) متسقة بلا تكرار/قفز.
 */
export default async function ArabicMoviesPage() {
  try {
    const rows = await executeAll(
      `SELECT movies.id, movies.tmdb_id, movies.slug, movies.title_ar, movies.title_en,
              movies.poster_path, movies.backdrop_path, movies.vote_average, movies.release_year,
              movies.genres_json, movies.overview_ar, movies.original_language
       FROM movies
       WHERE original_language = 'ar'
         AND (genres_json IS NULL OR NOT EXISTS (
           SELECT 1 FROM json_each(movies.genres_json)
           WHERE json_extract(value, '$.tmdb_id') IN (10767, 10768, 99, 36)
         ))
         AND (movies.filter_status IN ('clean', 'reviewed_approved') OR movies.filter_status IS NULL)
         AND (movies.release_year IS NOT NULL AND movies.release_year >= 2000)
       ORDER BY popularity DESC
       LIMIT ${LISTING_PAGE_SIZE + 1}`,
      []
    )

    // نفس الفلتر اللاحق الذي يطبّقه /api/movies على كل دفعة — يحافظ على تطابق الصف الأول
    const filteredMovies = filterExcludedGenres(rows)

    const hasMore = filteredMovies.length > LISTING_PAGE_SIZE
    if (hasMore) filteredMovies.pop()

    return (
      <MoviesPageClient
        initialMovies={filteredMovies}
        initialHasMore={hasMore}
        forcedLanguage="ar"
        title="أفلام عربي"
      />
    )
  } catch (error) {
    console.error('Error fetching movies/arabic page data:', error)
    // لا نعيد قائمة فاضية على استثناء D1/SSR كي لا تُخبز الصفحة فارغة وقت البناء —
    // الإعادة (throw) تجعل Next يسقط التخزين المسبق ويُصدِّر الصفحة عند الطلب (D1 متاح وقت التشغيل)،
    // وهو نفس نهج صفحات التصنيفات الحقيقية (لا مصفوفات فاضية في مسار الخطأ).
    throw error
  }
}
