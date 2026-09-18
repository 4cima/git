import { executeFirst, executeAll } from '@/lib/db'
import { filterExcludedGenres } from '@/utils/excludedGenres'

/**
 * قسم «قد يعجبك أيضاً» — SSR من جداول الكاش المُحسوبة مسبقًا (similar-cache).
 *
 * التكلفة: قراءة صف واحد بالـPK (recommended_ids) + probes بالـPK لمعرفات
 * الكروت (~12-15 صفًا إجمالًا) — بدل استعلام الـAPI القديم
 * IN(50) + ORDER BY CASE الذي كان يقرأ ~145 ألف صفًا لكل نداء.
 * الترتيب يُعاد في JS وفق ترتيب recommended_ids — بلا ORDER BY CASE إطلاقًا.
 * تُستدعى من صفحات التفاصيل (revalidate = 60) فتُكاش النتيجة مع الـHTML.
 */

const SIMILAR_LIMIT = 12

/** نفس حقول كروت الـAPI القديم حرفيًا (توافق كامل مع MovieCard) */
const MOVIE_FIELDS = `id, tmdb_id, slug, title_ar, title_en, poster_path, vote_average, release_date, genres_json`
const SERIES_FIELDS = `id, tmdb_id, slug, name_ar, name_en, poster_path, vote_average, first_air_date, genres_json`

export async function getSimilarMovies(tmdbId: number): Promise<any[]> {
  return getSimilar('movie', tmdbId)
}

export async function getSimilarSeries(tmdbId: number): Promise<any[]> {
  return getSimilar('tv', tmdbId)
}

async function getSimilar(type: 'movie' | 'tv', tmdbId: number): Promise<any[]> {
  try {
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) return []
    const cacheTable = type === 'movie' ? 'movie_similar_cache' : 'series_similar_cache'
    const cached = await executeFirst<{ recommended_ids: string }>(
      `SELECT recommended_ids FROM ${cacheTable} WHERE tmdb_id = ?`,
      [tmdbId]
    )
    if (!cached || !cached.recommended_ids) return []

    const ids: number[] = JSON.parse(String(cached.recommended_ids))
    const queryIds = ids.filter((n) => Number.isFinite(n)).slice(0, SIMILAR_LIMIT)
    if (queryIds.length === 0) return []

    const placeholders = queryIds.map(() => '?').join(',')

    /* صيغة IFNULL بدل (X IS NULL OR X IN ...): صيغة الـOR بتخلّي مخطط SQLite
       يشغّل MULTI-INDEX OR على فهرس filter_status (مسح الكتالوج النظيف مرتين،
       ~145 ألف صفًا مقاسة) ويتجاهل فهرس tmdb_id الفريد — D1 من غير sqlite_stat1
       فتقديراته بايظة. الصياغة هنا (نفس منطق الفهارس الجزئية idx_*_listing)
       بتخلّي الخطة SEARCH بالـtmdb_id = ~12-24 صفًا. المعنى منطقيًا مطابق حرفيًا. */
    const rows =
      type === 'movie'
        ? await executeAll<any>(
            `SELECT ${MOVIE_FIELDS}
             FROM movies
             WHERE tmdb_id IN (${placeholders})
               AND IFNULL(filter_status, 'clean') IN ('clean', 'reviewed_approved')
               AND (release_year IS NOT NULL AND release_year >= 2000)`,
            queryIds
          )
        : await executeAll<any>(
            `SELECT ${SERIES_FIELDS}
             FROM tv_series
             WHERE tmdb_id IN (${placeholders})
               AND IFNULL(filter_status, 'clean') IN ('clean', 'reviewed_approved')
               AND (first_air_year IS NOT NULL AND first_air_year >= 2000)`,
            queryIds
          )

    /* إعادة الترتيب في JS وفق ترتيب recommended_ids (المحسوب بالشعبية/تشابه النوع) */
    const order = new Map(queryIds.map((id, i) => [Number(id), i]))
    const ordered = rows
      .filter((r: any) => order.has(Number(r.tmdb_id)))
      .sort((a: any, b: any) => (order.get(Number(a.tmdb_id)) ?? 0) - (order.get(Number(b.tmdb_id)) ?? 0))
      .slice(0, SIMILAR_LIMIT)

    /* فلتر أمان JS: Talk Show + War & Politics + Documentary + History — كما في الـAPI القديم */
    return filterExcludedGenres(ordered)
  } catch {
    return []
  }
}
