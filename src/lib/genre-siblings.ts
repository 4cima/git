/**
 * Genre sibling mapping — جولة تفريق التصنيفات (لا توحيد أسماء ظاهرة)
 *
 * قواعد التفريق (مطابقة ID حدّي عبر json_each — ممنوع LIKE على كلمات):
 *
 * أفلام (type=movie): مطابقة ID صافية — كل slug على معرّفه الوحيد.
 *   action=28، adventure=12، fantasy=14، sci-fi=878، horror=27 …
 *
 * مسلسلات (type=tv) — TMDB لا يوسم المسلسلات بـ 28/12، فالأساس 10759:
 *   action (TV):    يملك 10759 ولا يملك 53 ولا 10765 ولا 14 ولا 878
 *                   (= 10759 AND NOT 10765 عملياً — كما هو من الجولة السابقة)
 *   adventure (TV): جولة التفريق: يملك 10765 ويملك 10759 ولا يملك 16 (رسوم)
 *                   (حي: صراع العروش 1399 / آل التنين 94954 — COUNT(D1)=644)
 *   fantasy (TV):   جولة التفريق: يملك 10765 ويملك 16 (رسوم SFF: ريك ومورتي / موشوكو تينسي)
 *                   (COUNT(D1)=2122)
 *   sci-fi (TV):    جولة التفريق: يملك 878 OR (يملك 10765 ولا يملك 10759 ولا يملك 16)
 *                   (حي بلا مغامرة: Silo 125988 — COUNT(D1)=1555)
 *   ⇒ الأربع صفحات action/adventure/fantasy/science-fiction مفروزة بالبناء: أي صف
 *     يملك 10765 يذهب لواحدة فقط من {fantasy(مع16) / adventure(10759 بلا16) / sci-fi(بلا10759 بلا16)}،
 *     وأي صف بلا 10765 وله 10759 يذهب للأكشن. صفر تكرار رياضياً بين الأربع.
 *   horror (TV):    جولة الفجوات: n(27)=0 → يملك 9648 ويملك 10765 معاً (تداخل متعدد
 *                   تصنيفات مسموح ما دامت القائمة ≠ قائمة أخرى)
 *   sci-fi-&-fantasy: slug منفصل على tmdb_id=10765 — الشرط = 10765 فقط (صفحة الأب الحقيقية؛
 *                   تداخل أب/ابن مسموح ما دامت أول 100 ليست نسخة حرفية من ابن واحد)
 *   thriller (TV):  ترجمان قديم محفوظ → Mystery(9648) + Crime(80)
 *   war (TV):       10752 → War & Politics(10768)
 */

export const GENRE_SIBLINGS: Record<number, number[]> = {}

/**
 * توافق: مطابقة أفلام صافية — كل slug على معرّفه الوحيد (لا أشقاء بعد الجولة).
 */
export function getGenreWithSiblings(genreId: number): number[] {
  return [genreId]
}

/** توافق: نفس الأشقاء التلفزيونيين فقط (سلوك قديم محفوظ لthriller/war) */
export function getGenreWithTvSiblings(genreId: number): number[] {
  return getTvGenreIds(genreId)
}

/**
 * جولة ساي-فاي 404: alias سلاج — طلب sci-fi يخدم نفس معرّف science-fiction (878)
 * بدون حذف أي سلاج وبدون تغيير الاسم الظاهر لصفحة science-fiction.
 */
export const GENRE_SLUG_ALIASES: Record<string, string> = {
  'sci-fi': 'science-fiction',
  'scifi': 'science-fiction',
}

/** يحوّل السلاج عبر جدول الـalias إن وُجد — يستخدم قبل استعلام جدول genres */
export function resolveGenreSlug(slug: string): string {
  return GENRE_SLUG_ALIASES[slug] ?? slug
}

/**
 * قاعدة 6.2 — تحويل أساس ID فقط للمسلسلات (لا يغيّر الاسم الظاهر ولا السلاج):
 * 28→10759 و 12→10759 لأن أعمال TV أصلها 10759. التفريق بين الصفحتين يتم
 * في buildTvGenreClause أدناه وليس هنا.
 */
export const TV_UNIFIED_GENRE: Record<number, number> = {
  28: 10759, // Action → Action & Adventure (أساس ID فقط)
  12: 10759, // Adventure → Action & Adventure (أساس ID فقط)
}

/** معرّفات التصنيف الأساسية للمسلسلات (بدون استبعادات — التفريق في القاعدة أدناه) */
export function getTvGenreIds(genreId: number): number[] {
  const unified = TV_UNIFIED_GENRE[genreId]
  if (unified) return [unified]
  if (genreId === 53) return [9648, 80]   // thriller → Mystery + Crime (سلوك قديم محفوظ)
  if (genreId === 10752) return [10768]   // war → War & Politics
  return [genreId]
}

/** قاعدة التفريق الكاملة لمسلسل genreId — تُرجع SQL جاهز بمعاملات مربوطة (?) */
export function buildTvGenreClause(genreId: number, tableAlias: string = ''): { sql: string; params: number[] } {
  const p = tableAlias ? (tableAlias.endsWith('.') ? tableAlias : `${tableAlias}.`) : ''
  const col = `${p}genres_json`
  const has = (ids: number[]) => {
    const ph = ids.map(() => '?').join(',')
    return `EXISTS (SELECT 1 FROM json_each(${col}) WHERE json_extract(value, '$.tmdb_id') IN (${ph}))`
  }
  const hasNot = (ids: number[]) => `NOT ${has(ids)}`

  // أكشن (TV): 10759 بلا 53/10765/14/878 — كما هو (جولة التفريق لم تغيّره)
  if (genreId === 28) {
    const ADVENTURE_TRIGGERS = [53, 10765, 14, 878]
    return { sql: `(${has([10759])} AND ${hasNot(ADVENTURE_TRIGGERS)})`, params: [10759, ...ADVENTURE_TRIGGERS] }
  }

  // مغامرة (TV) — جولة التفريق: يملك 10765 ويملك 10759 ولا يملك 16 (رسوم)
  // حي: صراع العروش (1399) / آل التنين (94954) — COUNT(D1) بقاعدة الجديدة = 644
  if (genreId === 12) {
    return { sql: `(${has([10765])} AND ${has([10759])} AND ${hasNot([16])})`, params: [10765, 10759, 16] }
  }

  // رعب (TV) — جولة الفجوات: n(27)=0 محلياً وعلى D1، لذا البديل المصرّح:
  // يملك 9648 (Mystery) ويملك 10765 (Sci-Fi & Fantasy) معاً.
  // القاعدة 27 OR name='Horror' لم تعد مطبقة (لا صفوف تلبيها).
  // قبول: Supernatural(1622) داخل — Desperate Housewives(693) خارج (بلا 10765) —
  // TNG(655) خارج صفوف الزائر (1987). COUNT(D1) بقاعدة الجديد = 624.
  if (genreId === 27) {
    return { sql: `(${has([9648])} AND ${has([10765])})`, params: [9648, 10765] }
  }

  // فانتازيا (TV) — جولة التفريق: يملك 10765 ويملك 16 (رسوم SFF)
  // حي: ريك ومورتي (60625) / موشوكو تينسي (94664) — COUNT(D1) بقاعدة الجديدة = 2122
  // حرفياً 10765 AND 16 (بلا بادئة 14) حتى يبقى التفريق مع مغامرة/خيال-علمي صفراً بالبناء
  // (n(14)=0 على TV حالياً؛ إن ظهر 14 مستقبلاً يُعاد النظر بقاعدة مصرّحة)
  if (genreId === 14) {
    return { sql: `(${has([10765])} AND ${has([16])})`, params: [10765, 16] }
  }

  // خيال علمي (TV) — جولة التفريق: 878 OR (10765 AND NOT 10759 AND NOT 16)
  // أبقِ 878 إن ظهر مستقبلاً؛ حي بلا مغامرة/رسوم: Silo (125988) — COUNT(D1) = 1555
  if (genreId === 878) {
    return { sql: `(${has([878])} OR (${has([10765])} AND ${hasNot([10759])} AND ${hasNot([16])}))`, params: [878, 10765, 10759, 16] }
  }

  // بقية الأنواع: مطابقة ID حدّي على getTvGenreIds (thriller/war ترجمان محفوظ)
  const ids = getTvGenreIds(genreId)
  return { sql: has(ids), params: ids }
}

/**
 * مطابقة ID عبر json_each (ممنوع LIKE '%action%' وكلمات) — EXISTS بدل النمط النصي.
 * توافق مع call-sites القديمة: نفس توقيع buildGenreWhereClause/buildGenreParams.
 */
export function buildGenreWhereClause(genreIds: number[], tableAlias: string = ''): string {
  const col = `${tableAlias ? `${tableAlias}.` : ''}genres_json`
  const placeholders = genreIds.map(() => '?').join(',')
  return `EXISTS (SELECT 1 FROM json_each(${col}) WHERE json_extract(value, '$.tmdb_id') IN (${placeholders}))`
}

/** Parameters for buildGenreWhereClause — معرّفات صافية (لا أنماط نصية) */
export function buildGenreParams(genreIds: number[]): number[] {
  return [...genreIds]
}

/**
 * Build SQL clause excluding rows whose genres_json contains any of excludedIds
 * (ID حدّي عبر json_each — لا LIKE نصي).
 */
export function buildGenreExclusionClause(excludedIds: number[], tableAlias: string = ''): string {
  if (excludedIds.length === 0) return '1=1'
  return `NOT ${buildGenreWhereClause(excludedIds, tableAlias)}`
}

/** Parameters for buildGenreExclusionClause */
export function buildGenreExclusionParams(excludedIds: number[]): number[] {
  return [...excludedIds]
}
