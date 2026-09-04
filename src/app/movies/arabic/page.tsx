import { Metadata } from 'next'
import { executeAll } from '@/lib/db'
import { MovieGenrePageClient } from '@/components/pages/MovieGenrePageClient'
import { filterExcludedGenres } from '@/utils/excludedGenres'

export const metadata: Metadata = {
  title: 'أفلام عربي | فور سيما',
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

export const revalidate = 3600

/**
 * صفحة «أفلام عربي» — كل الأفلام ذات original_language = 'ar'
 * تستخدم نفس عميل صفحة التصنيف (شبكة + ترتيب + تحميل لانهائي)
 * مع مسار API مخصص: /api/listing/arabic?type=movie
 */
export default async function ArabicMoviesPage() {
  try {
    const initialMovies = await executeAll(
      `SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, backdrop_path,
              vote_average, release_year, overview_ar, genres_json
       FROM movies
       WHERE original_language = 'ar'
         AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
         AND slug IS NOT NULL AND tmdb_id IS NOT NULL
       ORDER BY popularity DESC
       LIMIT 21`,
      []
    )

    // فلتر: Talk Show + War & Politics + Documentary + History (نفس فلتر صفحات التصنيفات)
    const filteredMovies = filterExcludedGenres(initialMovies)

    const hasMore = filteredMovies.length > 20
    if (hasMore) filteredMovies.pop()

    return (
      <MovieGenrePageClient
        genre={{ id: 0, tmdb_id: 0, name_en: 'Arabic', name_ar: 'عربي', slug: 'arabic' }}
        slug="arabic"
        initialMovies={filteredMovies}
        initialHasMore={hasMore}
        listingPath="/api/listing/arabic"
      />
    )
  } catch {
    return (
      <MovieGenrePageClient
        genre={{ id: 0, tmdb_id: 0, name_en: 'Arabic', name_ar: 'عربي', slug: 'arabic' }}
        slug="arabic"
        initialMovies={[]}
        initialHasMore={false}
        listingPath="/api/listing/arabic"
      />
    )
  }
}
