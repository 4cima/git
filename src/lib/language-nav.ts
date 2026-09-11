/**
 * أكواد لغات الـ Navbar + صفحات أقسام اللغات (/movies/lang/[code] و /series/lang/[code]).
 *
 * مصدر موحّد يشاركه QuantumNavbar وصفحات اللغات (مستهلكان) — نُقل هنا حرفيًا
 * من مصفوفة countryLinks التي كانت داخل QuantumNavbar كي لا تتكسر التسميات/الفلاتر بينهما.
 *
 * كل اللغات بما فيها العربي (ar) عبر نفس المسار الموحّد: /movies/lang/[code] —
 * عربي = /movies/lang/ar مثل ألماني = /movies/lang/de — صفر استثناء للعربي.
 */
export interface NavLanguage {
  /** كود ISO 639-1 — يُستخدم كمفتاح React في الـ Navbar وليس بالضرورة في المسار */
  code: string
  /** التسمية العربية المعروضة في الـ Navbar والعناوين (مثل «أجنبي» بدل «إنجليزي») */
  label: string
  /** قيمة فلتر original_language المرسلة للـ API (يدعم التعدد: 'zh,cn' → IN ('zh','cn')) */
  filter: string
}

export const NAVBAR_LANGUAGES: NavLanguage[] = [
  { code: 'ar', label: 'عربي', filter: 'ar' },
  { code: 'en', label: 'أجنبي', filter: 'en' },
  { code: 'tr', label: 'تركي', filter: 'tr' },
  { code: 'hi', label: 'هندي', filter: 'hi' },
  { code: 'ko', label: 'كوري', filter: 'ko' },
  { code: 'zh', label: 'صيني', filter: 'zh,cn' },
  { code: 'ja', label: 'ياباني', filter: 'ja' },
  { code: 'fr', label: 'فرنسي', filter: 'fr' },
  { code: 'es', label: 'إسباني', filter: 'es' },
  { code: 'de', label: 'ألماني', filter: 'de' },
]

/**
 * إيجاد لغة الـ Navbar من مقطع المسار (/movies/lang/[code]).
 * يوافق بـ code أولاً (الروابط تُبنى الآن بـ country.code — مثل 'zh' بدل 'zh,cn')
 * ثم بـ filter (مثل 'zh,cn') كتوافق مع أي روابط قديمة لا تزال موجودة.
 * غير الموجود في القائمة → undefined (notFound في الصفحة).
 */
export function findNavLanguage(value: string): NavLanguage | undefined {
  return NAVBAR_LANGUAGES.find((l) => l.code === value) ?? NAVBAR_LANGUAGES.find((l) => l.filter === value)
}