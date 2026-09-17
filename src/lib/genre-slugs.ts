/**
 * خريطة tmdb_id → slug لتحويل شارات التصنيفات في صفحات التفاصيل إلى روابط
 * داخلية حقيقية (/movies/genres/[slug] — /series/genres/[slug]).
 * انسخ من جدول genres في D1 (2026-09-17) — معرّفات TMDB ثابتة؛
 * لو تغيّر سلاج في القاعدة يُحدَّث هنا. المعرّفات الممنوعة (10767/10768/99/36)
 * تبقى شارات نصية بلا روابط — صفحاتها مُستبعدة من القوائم أصلًا.
 */

const GENRE_TMDB_SLUGS: Record<number, string> = {
  12: 'adventure',
  14: 'fantasy',
  16: 'animation',
  18: 'drama',
  27: 'horror',
  28: 'action',
  35: 'comedy',
  36: 'history',
  37: 'western',
  53: 'thriller',
  80: 'crime',
  99: 'documentary',
  878: 'science-fiction',
  9648: 'mystery',
  10402: 'music',
  10749: 'romance',
  10751: 'family',
  10752: 'war',
  10759: 'action-adventure',
  10762: 'kids',
  10763: 'news',
  10764: 'reality',
  10765: 'sci-fi-fantasy',
  10766: 'soap',
  10767: 'talk',
  10768: 'war-politics',
  10770: 'tv-movie',
}

/** سلاج التصنيف من معرّف TMDB — null لو غير معروف أو ممنوع من الظهور */
export function genreSlugById(id: unknown): string | null {
  const n = Number(id)
  if (!Number.isFinite(n)) return null
  const EXCLUDED = [10767, 10768, 99, 36]
  if (EXCLUDED.includes(n)) return null
  return GENRE_TMDB_SLUGS[n] ?? null
}
