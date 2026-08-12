/**
 * Smart Username Validation System
 * - Minimum 5 characters
 * - No profanity/inappropriate words
 * - No reserved admin/system names
 * - No special characters abuse
 * - Arabic and English support
 */

// Reserved system/admin names
const RESERVED_NAMES = [
  'admin', 'administrator', 'moderator', 'mod', 'supervisor', 'support',
  'system', 'root', 'owner', 'staff', 'team', 'official', 'verified',
  'مشرف', 'ادمن', 'ادارة', 'مدير', 'مراقب', 'دعم', 'فريق', 'رسمي',
  '4cima', 'cima', 'fourсima', 'cinema',
]

// Profanity/inappropriate words (Arabic + English)
const BLACKLISTED_WORDS = [
  // English profanity
  'fuck', 'shit', 'bitch', 'ass', 'damn', 'crap', 'bastard', 'dick', 
  'pussy', 'cock', 'penis', 'vagina', 'sex', 'porn', 'nude', 'xxx',
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'whore', 'slut',
  
  // Arabic profanity/inappropriate
  'كس', 'كسم', 'عرص', 'شرموط', 'زب', 'نيك', 'متناك', 'خول', 'لبوة',
  'قحبة', 'عاهرة', 'ابن الكلب', 'يلعن', 'منيوك', 'زبي', 'طيز',
  'احا', 'يبن', 'كلب', 'حمار', 'حيوان',
  
  // Variations with numbers/symbols
  'fck', 'fuk', 'sht', 'btch', 'a$$', 'azz', 'p0rn', 'fck',
]

// Suspicious patterns
const SUSPICIOUS_PATTERNS = [
  /(.)\1{4,}/i, // Repeated character 5+ times (aaaaa)
  /^[0-9]+$/, // Only numbers
  /^[^a-zA-Z\u0600-\u06FF]+$/, // No letters at all
  /admin|mod|staff/i, // Contains admin-related words
]

interface ValidationResult {
  valid: boolean
  error?: string
  reason?: string
}

export function validateUsername(username: string): ValidationResult {
  const trimmed = username.trim()

  // Check minimum length
  if (trimmed.length < 5) {
    return {
      valid: false,
      error: 'اسم المستخدم يجب أن يكون 5 أحرف على الأقل',
      reason: 'TOO_SHORT',
    }
  }

  // Check maximum length
  if (trimmed.length > 30) {
    return {
      valid: false,
      error: 'اسم المستخدم يجب أن لا يتجاوز 30 حرفاً',
      reason: 'TOO_LONG',
    }
  }

  // Check for reserved names (case-insensitive)
  const lowerUsername = trimmed.toLowerCase()
  if (RESERVED_NAMES.some(reserved => lowerUsername.includes(reserved))) {
    return {
      valid: false,
      error: 'هذا الاسم محجوز ولا يمكن استخدامه',
      reason: 'RESERVED_NAME',
    }
  }

  // Check for blacklisted words
  for (const word of BLACKLISTED_WORDS) {
    if (lowerUsername.includes(word)) {
      return {
        valid: false,
        error: 'اسم المستخدم يحتوي على كلمات غير مناسبة',
        reason: 'INAPPROPRIATE_CONTENT',
      }
    }
  }

  // Check suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        error: 'اسم المستخدم يحتوي على نمط غير مسموح به',
        reason: 'SUSPICIOUS_PATTERN',
      }
    }
  }

  // Check for valid characters (letters, numbers, underscore, dot, dash)
  const validCharsRegex = /^[a-zA-Z0-9\u0600-\u06FF._-]+$/
  if (!validCharsRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'اسم المستخدم يحتوي على أحرف غير مسموحة',
      reason: 'INVALID_CHARACTERS',
    }
  }

  // Check that username has at least some letters (not only numbers/symbols)
  const hasLetters = /[a-zA-Z\u0600-\u06FF]/.test(trimmed)
  if (!hasLetters) {
    return {
      valid: false,
      error: 'اسم المستخدم يجب أن يحتوي على أحرف',
      reason: 'NO_LETTERS',
    }
  }

  return {
    valid: true,
  }
}

export function canChangeUsername(lastChangeDate: string | null): { 
  canChange: boolean
  error?: string
  hoursRemaining?: number
} {
  if (!lastChangeDate) {
    return { canChange: true }
  }

  const lastChange = new Date(lastChangeDate)
  const now = new Date()
  const hoursSinceLastChange = (now.getTime() - lastChange.getTime()) / (1000 * 60 * 60)

  if (hoursSinceLastChange < 24) {
    const hoursRemaining = Math.ceil(24 - hoursSinceLastChange)
    return {
      canChange: false,
      error: `يمكنك تغيير اسم المستخدم بعد ${hoursRemaining} ساعة`,
      hoursRemaining,
    }
  }

  return { canChange: true }
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

// Helper to check if a username looks like it's trying to impersonate staff
export function looksLikeStaffImpersonation(username: string): boolean {
  const lower = username.toLowerCase()
  const staffIndicators = [
    'admin', 'mod', 'staff', 'support', 'official', 'verified',
    'مشرف', 'ادمن', 'مدير', 'رسمي', 'موثق'
  ]
  
  return staffIndicators.some(indicator => lower.includes(indicator))
}
