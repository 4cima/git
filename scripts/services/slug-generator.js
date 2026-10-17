/**
 * scripts/services/slug-generator.js — نسخة Node/CJS من src/lib/slugGenerator.ts
 * (المصدر الموحّد) لاستخدامها في سكربتات الـingestion فقط.
 *
 * النظام الرقمي الصريح (2026-10): السلاج القياسي لأي عمل هو `String(tmdb_id)` فقط —
 *   بلا حروف إنجليزية ولا بادئات w- (مثال: /movies/190859 و /series/1396).
 *   مسارات API الموقع تطابق (slug = ? OR tmdb_id = ?) فلا ينكسر مشغّل 4cima.stream.
 *   - التفرّد عبر tmdb_id — بلا Date.now() ولا عشوائية.
 */

/* جدول التحويل — منقول حرفيًا من src/lib/slugGenerator.ts (يُستخدم في toSlug الاحتياطي فقط) */
const ARABIC_TO_LATIN = {
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

function transliterateArabic(text) {
  if (!text) return ''
  return text.split('').map((c) => ARABIC_TO_LATIN[c] || c).join('')
}

/** نطاق الحروف العربية (نفس src/lib/slugGenerator.ts) */
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F]/

function hasArabicScript(text) {
  return ARABIC_RE.test(String(text ?? ''))
}

/**
 * toSlug — نفس toSlug في src/lib/slugGenerator.ts (بدون contentId/maxLength
 * لأن سكربتات الـingestion تتحقق من التفرّد بنفسها).
 * @returns {string|null} slug أو null لو الاسم فاضي/الناتج فاضي (CJK بدون id)
 */
function toSlug(text, contentId) {
  if (text == null || String(text).trim() === '') return null

  let slug = transliterateArabic(String(text))
  slug = slug.toLowerCase()
  slug = slug.replace(/\s+/g, '-')
  slug = slug.replace(/[^a-z0-9-]/g, '')
  slug = slug.replace(/-+/g, '-')
  slug = slug.replace(/^-+|-+$/g, '')

  // fallback للـCJK: عنوان CJK صِرف بعد التحويل = فارغ
  if (!slug || slug === '') {
    return contentId !== undefined && contentId !== null ? `${contentId}` : null
  }
  return slug
}

/** نفس isValidSlug في slugGenerator.ts — للتحقق قبل الإدراج (الأرقام صالحة). */
function isValidSlug(slug) {
  if (!slug || String(slug).trim() === '') return false
  if (!/^[a-z0-9-]+$/.test(slug)) return false
  if (/--/.test(slug)) return false
  if (/^-|-$/.test(slug)) return false
  return true
}

/** سنة صالحة للسلاج — لم تعد تُستخدم في التوليد (بقيت للتوافق مع الاستدعاءات). */
function safeYear(releaseYear) {
  const y = Number(releaseYear)
  return Number.isFinite(y) && y >= 1900 && y <= 2100 ? y : 2026
}

/**
 * buildStealthSlug — النظام الرقمي الصريح (2026-10):
 * السلاج القياسي = String(tmdb_id) فقط — بلا حروف ولا بادئات.
 * التوقيع القديم (titleAr, tmdbId, releaseYear) محفوظ للتوافق مع الاستدعاءات.
 */
function buildStealthSlug(titleAr, tmdbId, releaseYear) {
  const id = Number(tmdbId)
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('buildStealthSlug: tmdb_id غير صالح — لا يمكن توليد سلاج رقمي')
  }
  return String(id)
}

/**
 * generateUniqueSlug — التوقيع الجديد: (db, titleAr, tmdbId, releaseYear, table).
 * يولّد السلاج الرقمي `String(tmdb_id)` ويتحقق من التفرّد في القاعدة (نظريًا
 * مستحيل الاصطدام لأن tmdb_id فريد لكل صف، لكن الحارس يبقى دفاعًا).
 * يجب استدعاؤها داخل db.transaction().
 */
function generateUniqueSlug(db, titleAr, tmdbId, releaseYear, table) {
  const base = buildStealthSlug(titleAr, tmdbId, releaseYear)
  if (!base || !/^[a-z0-9-]+$/.test(base)) {
    throw new Error('generateUniqueSlug: تعذّر توليد سلاج صالح — تأكد من tmdb_id')
  }

  const checkStmt = db.prepare(`SELECT tmdb_id FROM ${table} WHERE slug = ?`)
  if (!checkStmt.get(base)) return base

  // اصطدام شبه مستحيل (tmdb_id مضمّن) — لاحقة تسلسلية دفاعية بلا Date.now()
  for (let i = 2; i <= 999; i++) {
    const s = `${base}-${i}`
    if (!checkStmt.get(s)) return s
  }
  throw new Error(`generateUniqueSlug: كل الـcandidates محجوزة لـ"${base}" (999 محاولة)`)
}

module.exports = {
  toSlug,
  generateUniqueSlug,
  isValidSlug,
  transliterateArabic,
  hasArabicScript,
  buildStealthSlug,
  safeYear,
}
