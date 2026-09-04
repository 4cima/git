/**
 * أدوات مشتركة لأقسام الصفحة الرئيسية — تفصل بين استيراد HomePageClient
 * وHomeTrendingSections لتفادي الاستيراد الدائري بينهما.
 */
import { filterExcludedGenres } from '@/utils/excludedGenres'
import type { MediaItem } from './HomeTrendingSections'

/** أقل سنة مسموحة — لا يُعرض عمل أقدم من 10 سنوات */
export const HOME_MIN_YEAR = new Date().getFullYear() - 10

/**
 * تحويل صفوف DB الخام إلى شكل MediaItem الموحّد (يُستخدم للرائج والأقسام الإضافية).
 * يطبّق فلتر الاستبعاد المركزي + فلتر السنوات (آخر 10 سنوات فقط).
 */
export function mapItems(items: unknown[] | undefined, type: 'movie' | 'tv'): MediaItem[] {
  return filterExcludedGenres((items as any[]) || [])
    .map((item: any) => {
      let primaryGenre = null
      try {
        const genres = JSON.parse(item.genres_json || '[]')
        primaryGenre = genres?.[0]?.name_ar || genres?.[0]?.name || null
      } catch {
        // Silent error handling
      }

      // Extract year from various possible fields
      let year = item.year || item.release_year || item.first_air_year
      if (!year && item.release_date && typeof item.release_date === 'string' && /^\d{4}/.test(item.release_date)) {
        year = parseInt(item.release_date.substring(0, 4), 10)
      }
      if (!year && item.first_air_date && typeof item.first_air_date === 'string' && /^\d{4}/.test(item.first_air_date)) {
        year = parseInt(item.first_air_date.substring(0, 4), 10)
      }

      return {
        id: item.id,
        tmdb_id: item.tmdb_id && Number(item.tmdb_id) > 0 ? Number(item.tmdb_id) : undefined,
        slug: item.slug,
        title: item.title_ar || item.title_en || item.name_ar || item.name,
        title_ar: item.title_ar || item.name_ar || item.title || item.name,
        title_en: item.title_en || item.name_en || item.title_en,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        vote_average: Number(item.vote_average) || 0,
        overview_ar: item.overview_ar || item.overview,
        year: year,
        media_type: item.media_type === 'movie' ? 'movie' : item.media_type === 'tv' ? 'tv' : type,
        primary_genre: primaryGenre,
      }
    })
    // لا يُعرض أبداً أي عمل سنة إنتاجه أقدم من 10 سنوات (وغير المعروف سنته لا يُستبعد)
    .filter((m) => !m.year || m.year >= HOME_MIN_YEAR)
}

/**
 * تداخل الأفلام والمسلسلات: movie[0], series[0], movie[1], series[1]...
 * + إزالة التكرار: نفس العمل ممكن يرجع مرتين لو مسجّل تحت أكثر من تصنيف
 * (مثلاً «جريمة» و«غموض» معاً) — نُبقي أول ظهور فقط (key فريد لكل كارت).
 */
export const interleave = (items: MediaItem[]): MediaItem[] => {
  const seen = new Set<string>()
  const unique = items.filter((i) => {
    const key = `${i.media_type}-${i.tmdb_id || i.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const movies = unique.filter((i) => i.media_type === 'movie')
  const series = unique.filter((i) => i.media_type === 'tv')
  const result: MediaItem[] = []
  const maxLen = Math.max(movies.length, series.length)
  for (let i = 0; i < maxLen; i++) {
    if (movies[i]) result.push(movies[i])
    if (series[i]) result.push(series[i])
  }
  return result
}
