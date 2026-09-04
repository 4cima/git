/**
 * Shared genre utilities using precomputed genre_counts table
 * Used by both /api/genres route handler and /genres page
 *
 * NOTE: genre_counts table must be updated after ingestion runs.
 * Run populate-genre-counts.js after sync to keep counts accurate.
 */

import { executeAll } from '@/lib/db'

/** الـ genre IDs الممنوعة من الظهور في قوائم التصنيفات */
const EXCLUDED_GENRE_TMDB_IDS = [10767, 10768, 99, 36]

/* ------------------------------------------------------------
   عدّادات كتالوج كاملة من جدول genre_counts المحسوب مسبقًا (سريع جدًا).

   الجدول يُعبَّأ أثناء خطوط الإدخال ويحتوي على إجمالي الأفلام والمسلسلات
   لكل تصنيف — أرقام حقيقية (لا حدّ أقصى كما في جداول list_* التي تحتفظ
   بأفضل 300 فقط). والصفحات الفرعية تُصفح الكتالوج كاملاً عبر استعلامات حية،
   لذا العدّاد الكامل مطابق لما يمكن الوصول إليه فعلًا.

   نستبعد التصنيفات الممنوعة (حواري/وثائقي/حرب وسياسة/تاريخي) نهائيًا
   حتى لا يظهر كارت يعرض صفحة فارغة، مع cache 60 ثانية.
   ------------------------------------------------------------ */
let cachedCounts: { at: number; data: any[] } | null = null
const COUNTS_TTL_MS = 60_000

async function computeVisibleGenreCounts() {
  if (cachedCounts && Date.now() - cachedCounts.at < COUNTS_TTL_MS) {
    return cachedCounts.data
  }

  const rows = await executeAll(
    `SELECT g.*, COALESCE(gc.movie_count, 0) AS movie_count, COALESCE(gc.series_count, 0) AS series_count
     FROM genres g
     LEFT JOIN genre_counts gc ON gc.genre_id = g.tmdb_id`,
    []
  )

  const visible = rows
    .map((g: any) => {
      const id = Number(g.tmdb_id)
      if (EXCLUDED_GENRE_TMDB_IDS.includes(id)) return null
      const movie_count = Number(g.movie_count || 0)
      const series_count = Number(g.series_count || 0)
      return {
        ...g,
        movie_count,
        series_count,
        total_count: movie_count + series_count,
      }
    })
    .filter((g: any) => g && g.total_count > 0)
    .sort((a: any, b: any) => b.total_count - a.total_count)

  cachedCounts = { at: Date.now(), data: visible }
  return visible
}

export async function getGenresWithCounts(type?: 'movie' | 'tv') {
  const all = await computeVisibleGenreCounts()
  if (type === 'movie') return all.filter((g: any) => g.movie_count > 0)
  if (type === 'tv') return all.filter((g: any) => g.series_count > 0)
  return all
}
