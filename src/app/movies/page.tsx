import { Metadata } from 'next'
import { executeAll } from '@/lib/db'
import { filterExcludedGenres } from '@/utils/excludedGenres'
import { LISTING_PAGE_SIZE } from '@/lib/listing-config'
import { MoviesPageClient } from '@/components/pages/MoviesPageClient'

export const metadata: Metadata = {
  title: 'الأفلام المترجمة',
  description: 'استكشف آلاف الأفلام المترجمة بجودة عالية - أفلام أكشن، كوميديا، دراما، رعب، وأكثر',
  keywords: ['أفلام', 'أفلام مترجمة', 'مشاهدة أفلام أونلاين', 'أفلام 2025', 'أفلام أكشن', 'أفلام كوميديا', 'أفلام أجنبية', '4cima'],
  alternates: { canonical: 'https://4cima.com/movies' },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    url: 'https://4cima.com/movies',
    siteName: '4cima',
    title: 'الأفلام المترجمة | فور سيما',
    description: 'استكشف آلاف الأفلام المترجمة بجودة عالية - أفلام أكشن، كوميديا، دراما، رعب، وأكثر',
    images: [
      {
        url: 'https://4cima.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'الأفلام المترجمة',
      },
    ],
  },
}

export const dynamic = 'force-dynamic' // D1 not available at build time on CI

async function getInitialMovies() {
  try {
    /* ===== (E-3) مصدر واحد: أول صفحة SSR بنفس استعلام /api/movies حرفياً =====
       نفس الجدول الحي movies + نفس البوابات + نفس الترتيب:
         • استبعاد التصنيفات الأربعة في SQL (10767/10768/99/36) + فلتر JS كطبقة أمان
         • بوابة الإخفاء (filter_status) + بوابة السنة (release_year >= 2000)
         • ORDER BY popularity DESC, movies.id DESC — نفس ترتيب الـAPI بالحرف
           (/api/movies: ORDER BY ${sortColumn} ${sortOrder}, movies.id ${sortOrder})
       لماذا لا جدول الكاش list_movies_popular: ترتيبه بـ`rank` مختلف عن `popularity`،
       و«تحميل المزيد» في الـclient يجلب من movies بدءاً من OFFSET 20 ⇒ أعمال الصفحة
       الأولى كانت تعود في الصفحة الثانية = تكرار. كذلك id من جدول آخر كان يكسر
       مناعة الدمج (dedupe by id) ومفاتيح حالة الكروت (tmdb_id) في الـclient.
       نفس مبدأ صفحتي /movies/lang/* و /movies/genres/* — تستخدمان movies الحيّ من الأصل. */
    const rows = await executeAll(
      `SELECT movies.id, movies.tmdb_id, movies.slug, movies.title_ar, movies.title_en,
              movies.poster_path, movies.backdrop_path, movies.vote_average, movies.release_year,
              movies.genres_json, movies.overview_ar, movies.original_language
       FROM movies
       WHERE (genres_json IS NULL OR NOT EXISTS (
         SELECT 1 FROM json_each(movies.genres_json)
         WHERE json_extract(value, '$.tmdb_id') IN (10767, 10768, 99, 36)
       ))
         AND (IFNULL(movies.filter_status, 'clean') IN ('clean', 'reviewed_approved'))
         AND (movies.release_year IS NOT NULL AND movies.release_year >= 2000)
       ORDER BY popularity DESC, movies.id DESC
       LIMIT ${LISTING_PAGE_SIZE + 1}`,
      []
    )
    const filtered = filterExcludedGenres(rows)
    const hasMore = filtered.length > LISTING_PAGE_SIZE
    if (hasMore) filtered.pop()
    return { items: filtered, hasMore }
  } catch (error) {
    console.error('Error fetching initial movies:', error)
    return { items: [], hasMore: false }
  }
}

export default async function MoviesPage() {
  const { items: initialMovies, hasMore: initialHasMore } = await getInitialMovies()

  // Structured data — helps search engines understand the catalog listing
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'الأفلام المترجمة',
    numberOfItems: initialMovies.length,
    itemListElement: initialMovies.slice(0, 20).map((m: any, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://4cima.com/movies/${m.slug}`,
      name: m.title_ar || m.title_en,
      image: m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : undefined,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MoviesPageClient initialMovies={initialMovies} initialHasMore={initialHasMore} />
    </>
  )
}
