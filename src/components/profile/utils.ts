/**
 * src/components/profile/utils.ts
 * أدوات مشتركة — أهمها دالة توليد روابط البطاقات (القاعدة الذهبية).
 */
import type { MediaType } from './types'

/** توحيد النوع: أي شيء غير 'movie' يُعامل كـ tv (الـAPIs نفسها توحّد series → tv) */
export function normalizeType(t: unknown): MediaType {
  return String(t ?? '').toLowerCase() === 'movie' ? 'movie' : 'tv'
}

/**
 * القاعدة الذهبية — توليد رابط البطاقة.
 *
 * المسارات منسوخة حرفياً من صفحات التفاصيل الفعلية:
 *   فيلم  → src/app/movies/[slug]/page.tsx  → /movies/[slug]
 *   مسلسل → src/app/series/[slug]/page.tsx  → /series/[slug]
 *
 * slug فاضي → null: البطاقة تظهر عادي (بوستر + عنوان + سنة) لكنها غير قابلة للنقر
 * مع شارة رمادية «غير متوفر مؤقتاً». ممنوع أي fallback رقمي — والـAPIs نفسها
 * (favorites/completed/reviews/continue-watching/activity) تُرجع slug=null للقيم الرقمية.
 */
export function mediaHref(
  item: { content_type?: unknown; media_type?: unknown; slug?: unknown }
): string | null {
  const slug = typeof item.slug === 'string' ? item.slug.trim() : ''
  if (!slug) return null
  const type = normalizeType(item.content_type ?? item.media_type)
  return type === 'movie' ? `/movies/${slug}` : `/series/${slug}`
}

/** أفضل عنوان متاح للعرض */
export function displayTitle(item: {
  title_ar?: string | null
  title_en?: string | null
  title?: string | null
}): string {
  return item.title_ar || item.title_en || item.title || 'بدون عنوان'
}

/** سنة الإصدار إن وُجدت */
export function yearOf(item: { release_year?: number | null }): number | null {
  const y = Number(item.release_year)
  return Number.isFinite(y) && y > 1900 ? y : null
}

/** تقييم رقمي آمن للعرض */
export function safeRating(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : null
}

/**
 * تحويل طابع زمني قادم من قاعدة البيانات/الـAPI إلى Date بتوقيت صحيح (UTC).
 *
 * جذر المشكلة: SQLite يخزّن `datetime('now')` و`CURRENT_TIMESTAMP` بصيغة «YYYY-MM-DD HH:MM:SS»
 * بتوقيت **UTC** لكن بلا أي دلالة منطقة زمنية (لا Z ولا +HH:MM)، وJavaScript يفسّر هذه الصيغة
 * (المفصولة بمسافة) كتوقيت **محلي** ⇒ لمستخدم UTC+3 يظهر نشاط سُجِّل الآن كأنه «منذ 3 ساعات».
 * الحل: عند غياب دلالة المنطقة الزمنية نُطبّع الصيغة إلى ISO 8601 مع Z: "10:00:00" → "T10:00:00Z".
 * السلاسل التي تحمل منطقتها بالفعل (Z أو UTC/GMT أو +HH:MM) تُترك كما هي.
 */
export function parseDbDate(value?: string | null): Date | null {
  if (value == null) return null
  const raw = String(value).trim()
  if (!raw) return null

  const hasZone = /(?:Z|UTC|GMT|[+-]\d{2}:?\d{2})$/i.test(raw)
  const hasTime = /\d{1,2}:\d{2}/.test(raw)
  const normalized = hasZone || !hasTime ? raw : `${raw.replace(' ', 'T')}Z`

  const attempt = (s: string): Date | null => {
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d
  }
  // محاولة أولى بالصيغة المطبَّعة، ثم بالنص الأصلي كشبكة أمان لأي صيغة غير متوقعة
  return attempt(normalized) ?? attempt(raw)
}

/** تنسيق تاريخ عربي — يُستخدم داخل مكونات client فقط (لا خطر hydration) */
export function formatDateAr(value?: string | null): string {
  const d = parseDbDate(value)
  if (!d) return ''
  return new Intl.DateTimeFormat('ar', { year: 'numeric', month: 'long', day: 'numeric' }).format(d)
}

/** تاريخ مختصر بالعربي (يوم + شهر فقط) — للسطر الثانوي في خط النشاطات */
export function shortDateAr(value?: string | null): string {
  const d = parseDbDate(value)
  if (!d) return ''
  return new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long' }).format(d)
}

/**
 * صياغة عربية سليمة للعدد: 1 → مفرد، 2 → مثنى، 3-10 → جمع، 11+ → تمييز مفرد.
 * (كان النص السابق «منذ 3 ساعة» وهو خطأ نحوي؛ الصحيح «منذ 3 ساعات».)
 */
function arCount(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one
  if (n === 2) return two
  if (n >= 3 && n <= 10) return `${n} ${few}`
  return `${n} ${many}`
}

/** «منذ...» تقريبي للنشاط — يقرأ الطابع الزمني كـUTC ثم يقارنه بساعة الجهاز */
export function timeAgoAr(value?: string | null): string {
  const d = parseDbDate(value)
  if (!d) return ''

  const diff = Date.now() - d.getTime()
  // فرق سالب = ساعة الجهاز متأخرة عن السيرفر (أو تسجيل في نفس اللحظة) → «الآن»
  if (diff < 5_000) return 'منذ ثوانٍ'

  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `منذ ${arCount(secs, 'ثانية واحدة', 'ثانيتين', 'ثوانٍ', 'ثانية')}`

  const mins = Math.floor(secs / 60)
  if (mins < 60) return `منذ ${arCount(mins, 'دقيقة واحدة', 'دقيقتين', 'دقائق', 'دقيقة')}`

  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${arCount(hours, 'ساعة واحدة', 'ساعتين', 'ساعات', 'ساعة')}`

  const days = Math.floor(hours / 24)
  if (days < 30) return `منذ ${arCount(days, 'يوم واحد', 'يومين', 'أيام', 'يوماً')}`

  const months = Math.floor(days / 30)
  if (months < 12) return `منذ ${arCount(months, 'شهر واحد', 'شهرين', 'أشهر', 'شهراً')}`

  return formatDateAr(value)
}
