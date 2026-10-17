/**
 * src/lib/slug-resolve.ts — المرحلة 2 بند 3: حلّ أي صيغة سلاج إلى السلاج القانوني.
 *
 * تُستخدم في مسارات API (الممثلون/المواسم/الحلقات) بحيث تقبل أي صيغة:
 *   {السلاج الحالي} | {tmdb_id} | w-{id}-{year} | {كلمات}-{id}
 * ثم تُمرَّر السلاج المخزّن للـ worker بدل الأصل — فلا يفشل مشغّل 4cima.stream
 * (404) بعد تغيير السلاج.
 */

import { executeFirst } from '@/lib/db'
import { extractTmdbIdFromSlug } from '@/lib/slugGenerator'

export type DetailsTable = 'movies' | 'tv_series'

/** بوابات العرض نفسها المستخدمة في الصفحات (clean/approved + سنة ≥ 2000) */
function qualityGate(table: DetailsTable): string {
  return table === 'movies'
    ? `AND release_year IS NOT NULL AND release_year >= 2000`
    : `AND first_air_year IS NOT NULL AND first_air_year >= 2000`
}

/**
 * resolveCanonicalSlug — يُرجع السلاج المخزّن للعمل أو null.
 * يقبل أي صيغة: slug مباشر، رقم tmdb_id، w-{id}-{year}، أو {كلمات}-{id}.
 */
export async function resolveCanonicalSlug(
  slug: string,
  table: DetailsTable
): Promise<string | null> {
  const tmdbId = extractTmdbIdFromSlug(slug)
  const row = await executeFirst<{ slug: string }>(
    `SELECT slug FROM ${table}
     WHERE (slug = ? OR tmdb_id = ?)
       AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
       ${qualityGate(table)}
     LIMIT 1`,
    [slug, tmdbId ?? -1]
  )
  return row?.slug ?? null
}
