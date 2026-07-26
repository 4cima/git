/**
 * Text Sanitizer Utility
 * استبدال الكلمات الحساسة بكلمات مناسبة للعائلات
 * يعمل عند العرض فقط (لا يغير قاعدة البيانات)
 */

// قاموس استبدال الكلمات الحساسة بكلمات مناسبة
const WORD_REPLACEMENTS: Record<string, string> = {
  // الكلمات الأساسية
  'جنس': 'حب',
  'الجنس': 'الحب',
  'جنسي': 'رومانسي',
  'جنسية': 'رومانسية',
  'جنسياً': 'رومانسياً',
  'جنسيا': 'رومانسيا',
  
  // كلمات إنجليزية
  'sex': 'love',
  'Sex': 'Love',
  'SEX': 'LOVE',
  'sexual': 'romantic',
  'Sexual': 'Romantic',
  'sexually': 'romantically',
  'Sexually': 'Romantically',
  
  // كلمات أخرى
  'إباحي': 'رومانسي',
  'إباحية': 'رومانسية',
  'عاري': 'رومانسي',
  'عارية': 'رومانسية',
  'عري': 'رومانسية',
  
  // عبارات شائعة
  'مشهد جنسي': 'مشهد رومانسي',
  'مشاهد جنسية': 'مشاهد رومانسية',
  'علاقة جنسية': 'علاقة عاطفية',
  'علاقات جنسية': 'علاقات عاطفية',
  'محتوى جنسي': 'محتوى رومانسي',
}

/**
 * تنظيف النص - استبدال الكلمات الحساسة بكلمات مناسبة
 * @param text النص المراد تنظيفه
 * @returns النص المنظف
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return ''
  
  let sanitized = text
  
  // استبدال كل الكلمات الحساسة
  for (const [badWord, goodWord] of Object.entries(WORD_REPLACEMENTS)) {
    // استبدال مع مراعاة حدود الكلمة
    const regex = new RegExp(`\\b${badWord}\\b`, 'gi')
    sanitized = sanitized.replace(regex, goodWord)
  }
  
  return sanitized
}

/**
 * تنظيف العنوان
 * @param title العنوان المراد تنظيفه
 * @returns العنوان المنظف
 */
export function sanitizeTitle(title: string | null | undefined): string {
  return sanitizeText(title)
}

/**
 * تنظيف الوصف
 * @param overview الوصف المراد تنظيفه
 * @returns الوصف المنظف
 */
export function sanitizeOverview(overview: string | null | undefined): string {
  return sanitizeText(overview)
}

/**
 * فحص إذا كان النص يحتوي على كلمات حساسة
 * (للاستخدام في الفلترة قبل الحفظ)
 * @param text النص المراد فحصه
 * @returns true إذا كان يحتوي على كلمات حساسة
 */
export function containsSensitiveWords(text: string | null | undefined): boolean {
  if (!text) return false
  
  const textLower = text.toLowerCase()
  
  for (const badWord of Object.keys(WORD_REPLACEMENTS)) {
    const regex = new RegExp(`\\b${badWord.toLowerCase()}\\b`, 'i')
    if (regex.test(textLower)) {
      return true
    }
  }
  
  return false
}
