/**
 * src/lib/slugGenerator.ts — المصدر الموحّد لتوليد السلاج (النظام الرقمي الصريح).
 *
 * القاعدة (2026-10): السلاج القياسي لأي فيلم أو مسلسل هو `String(tmdb_id)` فقط —
 *   بلا حروف إنجليزية ولا بادئات w- ولا تعريب (مثال: /movies/190859 و /series/1396).
 *   الصفحات ومسارات الـAPI تقبل أيضًا الصيغ القديمة عبر extractTmdbIdFromSlug
 *   (WHERE slug = ? OR tmdb_id = ?) حتى لا تنكسر الروابط القديمة.
 *
 * التفرّد مضمون بـ tmdb_id (فريد لكل صف) — لا Date.now() ولا عشوائية.
 */

export const ARABIC_TO_LATIN: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a',
  'ب': 'b',
  'ت': 't', 'ة': 'h',
  'ث': 'th',
  'ج': 'j',
  'ح': 'h',
  'خ': 'kh',
  'د': 'd',
  'ذ': 'dh',
  'ر': 'r',
  'ز': 'z',
  'س': 's',
  'ش': 'sh',
  'ص': 's',
  'ض': 'd',
  'ط': 't',
  'ظ': 'z',
  'ع': 'a',
  'غ': 'gh',
  'ف': 'f',
  'ق': 'q',
  'ك': 'k',
  'ل': 'l',
  'م': 'm',
  'ن': 'n',
  'ه': 'h',
  'و': 'w', 'ؤ': 'w',
  'ي': 'y', 'ى': 'y', 'ئ': 'y',
  '\u064B': '', '\u064C': '', '\u064D': '', '\u064E': '', '\u064F': '',
  '\u0650': '', '\u0651': '', '\u0652': '', '\u0653': '', '\u0654': '',
  '\u0655': '', '\u0656': '', '\u0657': '', '\u0658': '', '\u0659': '',
  '\u065A': '', '\u065B': '', '\u065C': '', '\u065D': '', '\u065E': '',
  '\u065F': '',
}

/** نطاق الحروف العربية (يغطي الأساسية + Extensions A للنادر) */
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F]/

export function hasArabicScript(text: unknown): boolean {
  return ARABIC_RE.test(String(text ?? ''))
}

export function transliterateArabic(text: unknown): string {
  if (!text) return ''
  return String(text).split('').map((c) => ARABIC_TO_LATIN[c] || c).join('')
}

/**
 * toSlug — تعريب + lowercase + شرطات + تنظيف. يُرجع '' لو الناتج فارغ (CJK صِرف).
 * (يبقى متاحًا للاستدعاءات القديمة — لم يعد يُستخدم في توليد السلاج القياسي).
 */
export function toSlug(text: unknown): string {
  if (text == null || String(text).trim() === '') return ''
  let slug = transliterateArabic(String(text))
  slug = slug.toLowerCase()
  slug = slug.replace(/\s+/g, '-')
  slug = slug.replace(/[^a-z0-9-]/g, '')
  slug = slug.replace(/-+/g, '-')
  slug = slug.replace(/^-+|-+$/g, '')
  return slug
}

export function isValidSlug(slug: unknown): boolean {
  const s = String(slug ?? '')
  if (!s.trim()) return false
  if (!/^[a-z0-9-]+$/.test(s)) return false
  if (s.includes('--')) return false
  if (/^-|-$/.test(s)) return false
  return true
}

/** سنة صالحة للسلاج — لم تعد تُستخدم في التوليد (بقيت للتوافق مع الاستدعاءات). */
export function safeYear(releaseYear: unknown): number {
  const y = Number(releaseYear)
  return Number.isFinite(y) && y >= 1900 && y <= 2100 ? y : 2026
}

/**
 * buildStealthSlug — النظام الرقمي الصريح (2026-10):
 * السلاج القياسي = `String(tmdb_id)` فقط — بلا حروف ولا بادئات.
 * التوقيع القديم (titleAr, tmdbId, releaseYear) محفوظ للتوافق مع الاستدعاءات.
 */
export function buildStealthSlug(
  titleAr: unknown,
  tmdbId: unknown,
  releaseYear?: unknown
): string {
  const id = Number(tmdbId)
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('buildStealthSlug: tmdb_id غير صالح — لا يمكن توليد سلاج رقمي')
  }
  return String(id)
}

/**
 * extractTmdbIdFromSlug — استخراج tmdb_id من أي صيغة سلاج (للجلب الاحتياطي):
 *   '190859'             → 190859 (رقم صريح — السلاج القياسي الجديد)
 *   'w-190859-2014'      → 190859
 *   'alqnas-alamryky-190859' → 190859 (ينتهي بـ-{id})
 *   'american-sniper'    → null
 */
export function extractTmdbIdFromSlug(slug: unknown): number | null {
  const s = String(slug ?? '').trim()
  if (!s || s.length > 200) return null
  // رقم صريح
  if (/^\d{2,}$/.test(s)) {
    const n = Number(s)
    return Number.isSafeInteger(n) && n > 0 ? n : null
  }
  // ينتهي بـ-{id}: w-{id}-{year} أو {كلمات}-{id}
  const m = s.match(/-(\d{2,})$/)
  if (m) {
    const n = Number(m[1])
    if (Number.isSafeInteger(n) && n > 0) return n
  }
  return null
}
