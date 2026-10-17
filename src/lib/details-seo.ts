/**
 * قوالب العنوان والوصف لصفحات التفاصيل (فيلم/مسلسل) — المرحلة 1 بند 3+4 + تعديل 2026-10.
 *
 * العنوان:  «{فيلم|مسلسل} {عربي} ({سنة}) – القصة والأبطال والتريلر | فور سيما»
 *           الاسم الإنجليزي لم يعد يدخل وسم <title> إطلاقًا (حماية من تصنيف الصفحة
 *           كصفحة بث مقرصن + تفادي ازدواجية عناوين الأعمال غير العربية).
 *           إن كان الاسم العربي فارغًا أو مطابقًا للإنجليزي (حروف لاتينية فقط)
 *           يُستخدم كما هو مع البادئة العربية (فيلم/مسلسل) دون تكرار الإنجليزي.
 *           السنة لا تُحذف أبدًا (كانت مفقودة في القالب القديم)، وأسماء العناوين
 *           القصيرة الغامضة (مثل «من») تحتفظ طبيعيًا بالسنة لأنها لا تُقتطع.
 * الوصف:    يبدأ بالقصة مباشرة (بدلاً من «نوع · نوع · سنة — …»)، ويُقتطع عند حد جملة
 *           ثم حد كلمة ضمن ~150-160 حرفًا بلا قطع وسط كلمة، مع قالب احتياطي فريد
 *           مبني من بيانات حقيقية (اسم/سنة/تصنيفات) لعدم تكرار الوصف بين الصفحات.
 */

const BRAND_SUFFIX = ' | فور سيما'
const TITLE_CAP = 70
const DESC_CAP = 158

export function buildDetailsTitle(opts: {
  typePrefix: string // «فيلم» أو «مسلسل»
  nameAr: unknown
  /** @deprecated الاسم الإنجليزي لم يعد يدخل <title> إطلاقًا — يُقبل للتوافق الخلفي ويتُهمَل */
  nameEn?: unknown
  year?: unknown
  intent: string // مثال: « – القصة والأبطال والتريلر»
}): string {
  // صفوف D1 بترجع SqlValue — نوحّدها نصوصًا هنا
  const rawAr = String(opts.nameAr ?? '').trim()
  const rawEn = String(opts.nameEn ?? '').trim()
  const year = opts.year == null || opts.year === false || opts.year === '' ? null : String(opts.year)
  const yearPart = year ? ` (${year})` : ''

  // الاسم المعروض: العربي إن وُجد (ولو كان لاتينيًا بالكامل — يُعرض مع البادئة العربية
  // دون تكرار النسخة الإنجليزية)، وإن كان فارغًا تمامًا يُستخدم الإنجليزي مرة واحدة.
  const display = rawAr || rawEn
  if (!display) return `${opts.typePrefix}${yearPart}${BRAND_SUFFIX}`

  const full = `${opts.typePrefix} ${display}${yearPart}${opts.intent}${BRAND_SUFFIX}`
  if (full.length <= TITLE_CAP) return full

  // 1) شيل نية البحث
  const noIntent = `${opts.typePrefix} ${display}${yearPart}${BRAND_SUFFIX}`
  if (noIntent.length <= TITLE_CAP) return noIntent

  // 2) اقتطاع الاسم المعروض عند حد كلمة (السنة تبقى دائمًا)
  const room = TITLE_CAP - `${opts.typePrefix}${yearPart}${BRAND_SUFFIX}`.length - 1
  if (room > 8) {
    const cut = display.slice(0, room)
    const sp = cut.lastIndexOf(' ')
    const truncated = (sp > 8 ? cut.slice(0, sp) : cut).replace(/[\s\-–—]+$/, '')
    return `${opts.typePrefix} ${truncated}…${yearPart}${BRAND_SUFFIX}`
  }
  return `${opts.typePrefix}${yearPart}${BRAND_SUFFIX}`
}

/** تنظيف نص القصة: شيل علامات الاقتباس المحيطة والمسافات المتضخمة */
export function cleanOverviewText(raw: unknown): string {
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

// ── تطهير SEO القديم المخزّن (المرحلة 2 بند 1) ──────────────────────────────
// الأعمدة المخزّنة مسبقًا (seo_title_ar / seo_description_ar / seo_keywords_json)
// وُلّدت بالسكربت القديم وقد تحوي كلمات الالتقاط (مشاهدة/تحميل/اون لاين/مباشر)
// أو الاسم الإنجليزي — لا يُعتمد عليها في العرض أبدًا؛ التوليد الحي الآمن هو المصدر.

/** كلمات بصمة البث المقرصن — وجود أي منها في نص SEO مخزّن يفسده */
const TAINTED_SEO_WORDS = ['مشاهدة', 'تحميل', 'اون لاين', 'اونلاين', 'مباشر']
/** أي حرف لاتيني في نص SEO عربي = تسريب الاسم الإنجليزي/الصيغة القديمة */
const LATIN_LETTER_RE = /[A-Za-z]/

/** هل النص العربي المخزّن ملوّث (كلمات محظورة أو حروف لاتينية)؟ */
export function isTaintedArabicSeo(text: unknown): boolean {
  const s = String(text ?? '')
  if (!s.trim()) return true
  if (LATIN_LETTER_RE.test(s)) return true
  const lower = s.toLowerCase()
  return TAINTED_SEO_WORDS.some((w) => lower.includes(w))
}

/**
 * sanitizeSeoKeywords — يفحص seo_keywords_json ويُرجع سلسلة كلمات آمنة فقط:
 * يُسقط أي كلمة تحوي حروفًا لاتينية أو كلمات (مشاهدة/تحميل/اون لاين/اونلاين/مباشر).
 * يُرجع undefined لو لا شيء صالح (لِتَرك خيار keywords من.Metadata كما هو).
 */
export function sanitizeSeoKeywords(raw: unknown): string | undefined {
  let arr: unknown[] = []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (Array.isArray(parsed)) arr = parsed
  } catch {
    return undefined
  }
  const safe = arr
    .map((k) => (typeof k === 'string' ? k : String((k as any)?.name ?? '')))
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && !LATIN_LETTER_RE.test(k) && !TAINTED_SEO_WORDS.some((w) => k.includes(w)))
  if (safe.length === 0) return undefined
  return safe.join(', ')
}
