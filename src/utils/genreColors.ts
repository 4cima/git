/**
 * نظام الألوان الموحّد للتصنيفات ونوع المحتوى
 * مُستخدم في جميع أنحاء الموقع للحفاظ على الاتساق البصري
 */

export interface GenreColorScheme {
  bg: string      // لون الخلفية
  text: string    // لون النص
  border: string  // لون الحدود
  glow: string    // تأثير التوهج
}

// ألوان التصنيفات (17+ تصنيف)
export const genreColors: Record<string, GenreColorScheme> = {
  // Action - أحمر
  'action': {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
    glow: 'shadow-red-500/20'
  },
  'أكشن': {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
    glow: 'shadow-red-500/20'
  },
  
  // Drama - بنفسجي
  'drama': {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    glow: 'shadow-purple-500/20'
  },
  'دراما': {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    glow: 'shadow-purple-500/20'
  },
  
  // Comedy - أصفر
  'comedy': {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    glow: 'shadow-yellow-500/20'
  },
  'كوميديا': {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    glow: 'shadow-yellow-500/20'
  },
  
  // Horror - رمادي داكن
  'horror': {
    bg: 'bg-gray-500/20',
    text: 'text-gray-300',
    border: 'border-gray-500/30',
    glow: 'shadow-gray-500/20'
  },
  'رعب': {
    bg: 'bg-gray-500/20',
    text: 'text-gray-300',
    border: 'border-gray-500/30',
    glow: 'shadow-gray-500/20'
  },
  
  // Romance - وردي
  'romance': {
    bg: 'bg-pink-500/20',
    text: 'text-pink-400',
    border: 'border-pink-500/30',
    glow: 'shadow-pink-500/20'
  },
  'رومانسي': {
    bg: 'bg-pink-500/20',
    text: 'text-pink-400',
    border: 'border-pink-500/30',
    glow: 'shadow-pink-500/20'
  },
  
  // Sci-Fi - سماوي
  'science fiction': {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    glow: 'shadow-cyan-500/20'
  },
  'sci-fi': {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    glow: 'shadow-cyan-500/20'
  },
  'خيال علمي': {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    glow: 'shadow-cyan-500/20'
  },
  
  // Adventure - أخضر زمردي
  'adventure': {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20'
  },
  'مغامرة': {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20'
  },
  
  // Thriller - برتقالي
  'thriller': {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    glow: 'shadow-orange-500/20'
  },
  'إثارة': {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    glow: 'shadow-orange-500/20'
  },
  
  // Crime - أحمر داكن
  'crime': {
    bg: 'bg-red-900/30',
    text: 'text-red-300',
    border: 'border-red-900/40',
    glow: 'shadow-red-900/20'
  },
  'جريمة': {
    bg: 'bg-red-900/30',
    text: 'text-red-300',
    border: 'border-red-900/40',
    glow: 'shadow-red-900/20'
  },
  
  // Fantasy - نيلي
  'fantasy': {
    bg: 'bg-indigo-500/20',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    glow: 'shadow-indigo-500/20'
  },
  'فانتازيا': {
    bg: 'bg-indigo-500/20',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    glow: 'shadow-indigo-500/20'
  },
  
  // Animation - أزرق
  'animation': {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/20'
  },
  'أنيميشن': {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/20'
  },
  
  // Family - أخضر
  'family': {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/30',
    glow: 'shadow-green-500/20'
  },
  'عائلي': {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/30',
    glow: 'shadow-green-500/20'
  },
  
  // War - رمادي مزرق
  'war': {
    bg: 'bg-slate-500/20',
    text: 'text-slate-300',
    border: 'border-slate-500/30',
    glow: 'shadow-slate-500/20'
  },
  'حرب': {
    bg: 'bg-slate-500/20',
    text: 'text-slate-300',
    border: 'border-slate-500/30',
    glow: 'shadow-slate-500/20'
  },
  
  // History - كهرماني
  'history': {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20'
  },
  'تاريخي': {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20'
  },
  
  // Mystery - بنفسجي داكن
  'mystery': {
    bg: 'bg-violet-500/20',
    text: 'text-violet-400',
    border: 'border-violet-500/30',
    glow: 'shadow-violet-500/20'
  },
  'غموض': {
    bg: 'bg-violet-500/20',
    text: 'text-violet-400',
    border: 'border-violet-500/30',
    glow: 'shadow-violet-500/20'
  },
  
  // Documentary - أزرق مخضر
  'documentary': {
    bg: 'bg-teal-500/20',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
    glow: 'shadow-teal-500/20'
  },
  'وثائقي': {
    bg: 'bg-teal-500/20',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
    glow: 'shadow-teal-500/20'
  },
  
  // Western - بني
  'western': {
    bg: 'bg-orange-700/20',
    text: 'text-orange-300',
    border: 'border-orange-700/30',
    glow: 'shadow-orange-700/20'
  },
  'غربي': {
    bg: 'bg-orange-700/20',
    text: 'text-orange-300',
    border: 'border-orange-700/30',
    glow: 'shadow-orange-700/20'
  },
  
  // Music - وردي فاتح
  'music': {
    bg: 'bg-fuchsia-500/20',
    text: 'text-fuchsia-400',
    border: 'border-fuchsia-500/30',
    glow: 'shadow-fuchsia-500/20'
  },
  'موسيقي': {
    bg: 'bg-fuchsia-500/20',
    text: 'text-fuchsia-400',
    border: 'border-fuchsia-500/30',
    glow: 'shadow-fuchsia-500/20'
  }
}

// لون افتراضي للتصنيفات غير المعروفة
const defaultGenreColor: GenreColorScheme = {
  bg: 'bg-zinc-500/20',
  text: 'text-zinc-400',
  border: 'border-zinc-500/30',
  glow: 'shadow-zinc-500/20'
}

/**
 * الحصول على ألوان التصنيف
 * @param genre اسم التصنيف (عربي أو إنجليزي)
 * @returns مخطط الألوان الخاص بالتصنيف
 */
export function getGenreColor(genre: string | null | undefined): GenreColorScheme {
  if (!genre) return defaultGenreColor
  
  const normalized = genre.toLowerCase().trim()
  return genreColors[normalized] || defaultGenreColor
}


// ألوان نوع المحتوى (Movie vs Series)
export interface MediaTypeColorScheme {
  bg: string
  text: string
  border: string
  icon: string
  label: string
}

export const mediaTypeColors: Record<string, MediaTypeColorScheme> = {
  'movie': {
    bg: 'bg-gradient-to-r from-red-500/20 to-amber-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
    icon: '🎬',
    label: 'فيلم'
  },
  'movies': {
    bg: 'bg-gradient-to-r from-red-500/20 to-amber-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
    icon: '🎬',
    label: 'فيلم'
  },
  'tv': {
    bg: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    icon: '📺',
    label: 'مسلسل'
  },
  'series': {
    bg: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    icon: '📺',
    label: 'مسلسل'
  },
  'anime': {
    bg: 'bg-gradient-to-r from-pink-500/20 to-purple-500/20',
    text: 'text-pink-400',
    border: 'border-pink-500/30',
    icon: '🎌',
    label: 'أنمي'
  },
  'game': {
    bg: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20',
    text: 'text-green-400',
    border: 'border-green-500/30',
    icon: '🎮',
    label: 'لعبة'
  },
  'software': {
    bg: 'bg-gradient-to-r from-indigo-500/20 to-violet-500/20',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    icon: '💾',
    label: 'برنامج'
  },
  'quran': {
    bg: 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
    icon: '📖',
    label: 'قرآن'
  }
}

// لون افتراضي لنوع المحتوى
const defaultMediaTypeColor: MediaTypeColorScheme = {
  bg: 'bg-zinc-500/20',
  text: 'text-zinc-400',
  border: 'border-zinc-500/30',
  icon: '🎥',
  label: 'محتوى'
}

/**
 * الحصول على ألوان نوع المحتوى
 * @param mediaType نوع المحتوى (movie, tv, series, etc)
 * @returns مخطط الألوان الخاص بنوع المحتوى
 */
export function getMediaTypeColor(mediaType: string | null | undefined): MediaTypeColorScheme {
  if (!mediaType) return defaultMediaTypeColor
  
  const normalized = mediaType.toLowerCase().trim()
  return mediaTypeColors[normalized] || defaultMediaTypeColor
}

/**
 * توليد classes كاملة للتصنيف (للاستخدام المباشر)
 * @param genre اسم التصنيف
 * @returns string من classes جاهزة للاستخدام
 */
export function getGenreClasses(genre: string | null | undefined): string {
  const colors = getGenreColor(genre)
  return `${colors.bg} ${colors.text} ${colors.border} ${colors.glow}`
}

/**
 * توليد classes كاملة لنوع المحتوى (للاستخدام المباشر)
 * @param mediaType نوع المحتوى
 * @returns string من classes جاهزة للاستخدام
 */
export function getMediaTypeClasses(mediaType: string | null | undefined): string {
  const colors = getMediaTypeColor(mediaType)
  return `${colors.bg} ${colors.text} ${colors.border}`
}
