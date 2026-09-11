/**
 * أكواد لغات الـ Navbar + صفحات أقسام اللغات (/movies/lang/[code] و /series/lang/[code]).
 *
 * مصدر موحّد يشاركه QuantumNavbar وصفحات اللغات (مستهلكان) — نُقل هنا حرفيًا
 * من مصفوفة countryLinks التي كانت داخل QuantumNavbar كي لا تتكسر التسميات/الفلاتر بينهما.
 *
 * العربي (filter === 'ar') له «قسم» مسار خاص: /movies/arabic و /series/arabic — لا /movies/lang/ar.
 */
export interface NavLanguage {
  /** كود ISO 639-1 — يُستخدم كمفتاح React في الـ Navbar وليس بالضرورة في المسار */
  code: string
  /** التسمية العربية المعروضة في الـ Navbar والعناوين (مثل «أجنبي» بدل «إنجليزي») */
  label: string
  /** قيمة فلتر original_language المرسلة للـ API (يدعم التعدد: 'zh,cn' → IN ('zh','cn')) */
  filter: string
  /** مقطع مسار خاص بالعربي فقط ('arabic') — بقية اللغات عبر /movies/lang/[filter] */
  section?: string
}

export const NAVBAR_LANGUAGES: NavLanguage[] = [
  { code: 'ar', label: 'عربي', filter: 'ar', section: 'arabic' },
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
 * يوافق بـ filter أولاً (لأن الـ Navbar يبني الروابط بـ filter — مثل 'zh,cn')
 * ثم بـ code كاسم مستعار مقبول. غير الموجود في القائمة → undefined (notFound في الصفحة).
 */
export function findNavLanguage(value: string): NavLanguage | undefined {
  return NAVBAR_LANGUAGES.find((l) => l.filter === value) ?? NAVBAR_LANGUAGES.find((l) => l.code === value)
}