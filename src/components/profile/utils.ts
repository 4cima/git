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

/** تنسيق تاريخ عربي — يُستخدم داخل مكونات client فقط (لا خطر hydration) */
export function formatDateAr(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('ar', { year: 'numeric', month: 'long', day: 'numeric' }).format(d)
}

/** «منذ...» تقريبي للنشاط */
export function timeAgoAr(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} ساعة`
  const days = Math.floor(hours / 24)
  if (days < 30) return `منذ ${days} يوم`
  return formatDateAr(iso)
}
