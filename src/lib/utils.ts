import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * دمج class names مع Tailwind CSS
 * Merge class names with Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * تنسيق الأرقام الكبيرة (1000 → 1K)
 * Format large numbers (1000 → 1K)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

/**
 * تأخير التنفيذ (للـ debouncing)
 * Delay execution (for debouncing)
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Sleep function for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if code is running in browser
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Get value from localStorage safely
 */
export function getLocalStorage<T>(key: string, defaultValue: T): T {
  if (!isBrowser()) return defaultValue

  try {
    const item = window.localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error: any) {
    console.error(`Error reading localStorage key "${key}":`, error)
    return defaultValue
  }
}

/**
 * Set value in localStorage safely
 */
export function setLocalStorage<T>(key: string, value: T): void {
  if (!isBrowser()) return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error: any) {
    console.error(`Error setting localStorage key "${key}":`, error)
  }
}

/**
 * Remove value from localStorage safely
 */
export function removeLocalStorage(key: string): void {
  if (!isBrowser()) return

  try {
    window.localStorage.removeItem(key)
  } catch (error: any) {
    console.error(`Error removing localStorage key "${key}":`, error)
  }
}


/**
 * Generate watch URL for content
 */
export function generateWatchUrl(
  item: { id?: number | string; slug?: string | null; media_type?: string; type?: string; season?: number; episode?: number } | string,
  season?: number,
  episode?: number
): string {
  // Handle string input (just slug)
  if (typeof item === 'string') {
    return `/watch/movie/${item}`
  }

  // CRITICAL: Always use slug, fallback to id only if slug is missing
  const slug = item.slug && item.slug.trim() !== '' ? item.slug : String(item.id || '')
  const contentType = (item.media_type || item.type || 'movie')

  // Software goes to /software/:slug
  if (contentType === 'software') {
    return `/software/${slug}`
  }

  if (contentType === 'movie') {
    return `/watch/movie/${slug}`
  }

  const s = season ?? item.season
  const e = episode ?? item.episode

  if (s !== undefined && e !== undefined) {
    return `/watch/tv/${slug}/s${s}/ep${e}`
  }

  return `/watch/tv/${slug}`
}

/**
 * Generate content URL (detail page)
 */
export function generateContentUrl(
  item: { id?: number | string; slug?: string | null; media_type?: string; type?: string } | string
): string {
  // Handle string input
  if (typeof item === 'string') {
    return `/movie/${item}`
  }

  // CRITICAL: Always use slug, fallback to id only if slug is missing
  const slug = item.slug && item.slug.trim() !== '' ? item.slug : String(item.id || '')
  const contentType = (item.media_type || item.type || 'movie')

  // Map content types to correct URLs
  if (contentType === 'software') {
    return `/software/${slug}`
  }

  if (contentType === 'actor' || contentType === 'person') {
    return `/actor/${slug}`
  }

  if (contentType === 'tv' || contentType === 'series') {
    return `/tv/${slug}`
  }

  return `/movie/${slug}`
}

/**
 * Map English keyboard to Arabic keyboard
 */
export function mapEnglishToArabicKeyboard(text: string): string {
  const mapping: Record<string, string> = {
    'q': 'ض', 'w': 'ص', 'e': 'ث', 'r': 'ق', 't': 'ف', 'y': 'غ', 'u': 'ع', 'i': 'ه', 'o': 'خ', 'p': 'ح',
    'a': 'ش', 's': 'س', 'd': 'ي', 'f': 'ب', 'g': 'ل', 'h': 'ا', 'j': 'ت', 'k': 'ن', 'l': 'م',
    'z': 'ئ', 'x': 'ء', 'c': 'ؤ', 'v': 'ر', 'b': 'لا', 'n': 'ى', 'm': 'ة'
  }

  return text.split('').map(char => mapping[char.toLowerCase()] || char).join('')
}

/**
 * Advanced search match for Arabic text
 */
export function advancedSearchMatch(text: string, query: string): boolean {
  if (!text || !query) return false

  const normalizedText = text.toLowerCase().trim()
  const normalizedQuery = query.toLowerCase().trim()

  // Direct match
  if (normalizedText.includes(normalizedQuery)) return true

  // Try English to Arabic keyboard mapping
  const arabicQuery = mapEnglishToArabicKeyboard(normalizedQuery)
  if (normalizedText.includes(arabicQuery)) return true

  // Try word-by-word match
  const queryWords = normalizedQuery.split(/\s+/)
  return queryWords.every(word => normalizedText.includes(word))
}
