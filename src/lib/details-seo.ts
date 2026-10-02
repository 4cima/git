/**
 * قوالب العنوان والوصف لصفحات التفاصيل (فيلم/مسلسل) — المرحلة 1 بند 3+4.
 *
 * العنوان:  «فيلم {عربي} ({سنة}) {إنجليزي} – القصة والأبطال والتريلر | فور سيما»
 *           السنة لا تُحذف أبدًا (كانت مفقودة في القالب القديم)، وأسماء العناوين القصيرة
 *           الغامضة (مثل «من») تحتفظ طبيعيًا بالعنوان الإنجليزي والسنة لأنها لا تُقتطع.
 * الوصف:    يبدأ بالقصة مباشرة (بدلاً من «نوع · نوع · سنة — …»)، ويُقتطع عند حد جملة
 *           ثم حد كلمة ضمن ~150-160 حرفًا بلا قطع وسط كلمة، مع قالب احتياطي فريد
 *           مبني من بيانات حقيقية (اسم/سنة/تصنيفات) لعدم تكرار الوصف بين الصفحات.
 */

const BRAND_SUFFIX = ' | فور سيما'
const TITLE_CAP = 70
const DESC_CAP = 158

export function buildDetailsTitle(opts: {
  typePrefix: string // «فيلم» أو «مسلسل»
  nameAr: string
  nameEn?: string | null
  year?: number | string | null
  intent: string // مثال: « – القصة والأبطال والتريلر»
}): string {
  const yearPart = opts.year ? ` (${opts.year})` : ''
  const en = (opts.nameEn || '').trim()
  const enPart = en && en !== opts.nameAr ? ` ${en}` : ''
  const full = `${opts.typePrefix} ${opts.nameAr}${yearPart}${enPart}${opts.intent}${BRAND_SUFFIX}`
  if (full.length <= TITLE_CAP) return full

  // 1) شيل نية البحث
  const noIntent = `${opts.typePrefix} ${opts.nameAr}${yearPart}${enPart}${BRAND_SUFFIX}`
  if (noIntent.length <= TITLE_CAP) return noIntent

  // 2) شيل العنوان الإنجليزي (السنة تبقى دائمًا)
  const noEn = `${opts.typePrefix} ${opts.nameAr}${yearPart}${BRAND_SUFFIX}`
  if (noEn.length <= TITLE_CAP) return noEn

  // 3) اقتطاع الاسم العربي عند حد كلمة
  const room = TITLE_CAP - `${opts.typePrefix}${yearPart}${BRAND_SUFFIX}`.length - 1
  if (room > 8) {
    const cut = opts.nameAr.slice(0, room)
    const sp = cut.lastIndexOf(' ')
    const truncated = (sp > 8 ? cut.slice(0, sp) : cut).replace(/[\s\-–—]+$/, '')
    return `${opts.typePrefix} ${truncated}…${yearPart}${BRAND_SUFFIX}`
  }
  return `${opts.typePrefix}${yearPart}${BRAND_SUFFIX}`
}

/** تنظيف نص القصة: شيل علامات الاقتباس المحيطة والمسافات المتضخمة */
export function cleanOverviewText(raw: string | null | undefined): string {
  return String(raw ?? '')
    .replace(/[\u201C\u201D\u00AB\u00BB"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** اقتطاع عند آخر نهاية جملة داخل المقتطاع، وإلا آخر مسافة (حد كلمة) — بلا قطع وسط كلمة */
export function truncateDescription(text: string, cap = DESC_CAP): string {
  if (text.length <= cap) return text
  const slice = text.slice(0, cap)
  const sentenceEnd = Math.max(
    slice.lastIndexOf('.'),
    slice.lastIndexOf('!'),
    slice.lastIndexOf('؟')
  )
  if (sentenceEnd >= 80) return slice.slice(0, sentenceEnd + 1).trim()
  const lastSpace = slice.lastIndexOf(' ')
  if (lastSpace >= 60) return slice.slice(0, lastSpace).trim() + '…'
  return slice.trimEnd() + '…'
}
