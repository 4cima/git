/**
 * scripts/services/slug-generator.js — المرحلة 4: نسخة Node/CJS من src/lib/slugGenerator.ts
 * (المصدر الموحّد) لاستخدامها في سكربتات الـingestion فقط.
 *
 * نفس المنطق تمامًا:
 *   - يعرّب (سبايدر → sbaydr) عبر جدول ARABIC_TO_LATIN مع حذف التشكيل
 *   - lowercase → مسافات إلى شرطات → إزالة غير [a-z0-9-] → دمج الشرطات
 *   - ينظّف الشرطات من الأطراف (-x → x، x- → x، -- → -)
 *   - fallback للـCJK: عنوان CJK صِرف يُعاد كسلسلة فارغة (لا 'unknown')
 *   - لا يستخدم Date.now() أبدًا — التفرّد عبر لواحق (سنة/نوع) ثم رقم تسلسلي
 *   - toSlug() يرجع null لو الاسم فاضي (مش string فاضي) — استخدمه مع ||
 *
 * تنبيه أمان: هذه الأداة للسكربتات الجديدة فقط — لا تُعاد كتابة أي slug موجود
 * في D1 (تغيير الـslugs يكسر الفهرسة والروابط المفهرسة).
 */

/* جدول التحويل — منقول حرفيًا من src/lib/slugGenerator.ts */
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

/**
 * toSlug — نفس generateSlug في src/lib/slugGenerator.ts (بدون contentId/maxLength
 * لأن سكربتات الـingestion تتحقق من التفرّد بنفسها وتضيف السنة/النوع).
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

/** نفس isValidSlug في slugGenerator.ts — للتحقق قبل الإدراج. */
function isValidSlug(slug) {
  if (!slug || String(slug).trim() === '') return false
  if (!/^[a-z0-9-]+$/.test(slug)) return false
  if (/--/.test(slug)) return false
  if (/^-|-$/.test(slug)) return false
  return true
}

/**
 * generateUniqueSlug — نفس التوقيع القديم (db أولاً) حتى لا ينكسر 1-fetch-and-enrich.js،
 * لكن بالمنطق الموحّد وبلا Date.now(): base → base-year → base-year-genre → رقم تسلسلي.
 * يجب استدعاؤها داخل db.transaction() كما سابقًا.
 */
function generateUniqueSlug(db, titleEn, releaseYear, genre, table) {
  const base = toSlug(titleEn)
  if (!base) {
    // اسم فاضي/CJK بلا ترجمة → خطأ صريح بدل 'untitled' أو Date.now()
    throw new Error('generateUniqueSlug: عنوان فاضي أو غير قابل للتحويل — أدخل title صالحًا')
  }

  const candidates = [
    base,
    releaseYear ? `${base}-${releaseYear}` : null,
    releaseYear && genre ? `${base}-${releaseYear}-${toSlug(genre)}` : null,
  ].filter(Boolean)

  const checkStmt = db.prepare(`SELECT tmdb_id FROM ${table} WHERE slug = ?`)

  for (const candidate of candidates) {
    if (!checkStmt.get(candidate)) return candidate
  }

  // رقم تسلسلي (نادر) — بديل Date.now()، محدود ومتوقع
  const lastAttempt = candidates[candidates.length - 1] || base
  for (let i = 2; i <= 999; i++) {
    const s = `${lastAttempt}-${i}`
    if (!checkStmt.get(s)) return s
  }

  throw new Error(`generateUniqueSlug: كل الـcandidates محجوزة لـ"${base}" (999 محاولة)`)
}

module.exports = { toSlug, generateUniqueSlug, isValidSlug, transliterateArabic }

