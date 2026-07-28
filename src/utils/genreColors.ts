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

// ألوان التصنيفات (17+ تصنيف) - ألوان غامقة مريحة للعين
export const genreColors: Record<string, GenreColorScheme> = {
  // Action - أحمر داكن جداً
  'action': {
    bg: 'bg-red-950',
    text: 'text-white',
    border: 'border-red-900',
    glow: 'shadow-red-500/20'
  },
  'أكشن': {
    bg: 'bg-red-950',
    text: 'text-white',
    border: 'border-red-900',
    glow: 'shadow-red-500/20'
  },
  
  // Drama - بنفسجي
  'drama': {
    bg: 'bg-purple-800',
    text: 'text-white',
    border: 'border-purple-700',
    glow: 'shadow-purple-500/20'
  },
  'دراما': {
    bg: 'bg-purple-800',
    text: 'text-white',
    border: 'border-purple-700',
    glow: 'shadow-purple-500/20'
  },
  
  // Comedy - أصفر
  'comedy': {
    bg: 'bg-yellow-700',
    text: 'text-white',
    border: 'border-yellow-600',
    glow: 'shadow-yellow-500/20'
  },
  'كوميديا': {
    bg: 'bg-yellow-700',
    text: 'text-white',
    border: 'border-yellow-600',
    glow: 'shadow-yellow-500/20'
  },
  
  // Horror - رمادي داكن
  'horror': {
    bg: 'bg-gray-800',
    text: 'text-white',
    border: 'border-gray-700',
    glow: 'shadow-gray-500/20'
  },
  'رعب': {
    bg: 'bg-gray-800',
    text: 'text-white',
    border: 'border-gray-700',
    glow: 'shadow-gray-500/20'
  },
  
  // Romance - وردي
  'romance': {
    bg: 'bg-pink-800',
    text: 'text-white',
    border: 'border-pink-700',
    glow: 'shadow-pink-500/20'
  },
  'رومانسي': {
    bg: 'bg-pink-800',
    text: 'text-white',
    border: 'border-pink-700',
    glow: 'shadow-pink-500/20'
  },
  
  // Sci-Fi - سماوي
  'science fiction': {
    bg: 'bg-cyan-800',
    text: 'text-white',
    border: 'border-cyan-700',
    glow: 'shadow-cyan-500/20'
  },
  'sci-fi': {
    bg: 'bg-cyan-800',
    text: 'text-white',
    border: 'border-cyan-700',
    glow: 'shadow-cyan-500/20'
  },
  'خيال علمي': {
    bg: 'bg-cyan-800',
    text: 'text-white',
    border: 'border-cyan-700',
    glow: 'shadow-cyan-500/20'
  },
  
  // Adventure - أخضر زمردي
  'adventure': {
    bg: 'bg-emerald-800',
    text: 'text-white',
    border: 'border-emerald-700',
    glow: 'shadow-emerald-500/20'
  },
  'مغامرة': {
    bg: 'bg-emerald-800',
    text: 'text-white',
    border: 'border-emerald-700',
    glow: 'shadow-emerald-500/20'
  },
  
  // Thriller - برتقالي
  'thriller': {
    bg: 'bg-orange-800',
    text: 'text-white',
    border: 'border-orange-700',
    glow: 'shadow-orange-500/20'
  },
  'إثارة': {
    bg: 'bg-orange-800',
    text: 'text-white',
    border: 'border-orange-700',
    glow: 'shadow-orange-500/20'
  },
  
  // Crime - أحمر داكن
  'crime': {
    bg: 'bg-red-950',
    text: 'text-white',
    border: 'border-red-900',
    glow: 'shadow-red-900/20'
  },
  'جريمة': {
    bg: 'bg-red-950',
    text: 'text-white',
    border: 'border-red-900',
    glow: 'shadow-red-900/20'
  },
  
  // Fantasy - نيلي
  'fantasy': {
    bg: 'bg-indigo-800',
    text: 'text-white',
    border: 'border-indigo-700',
    glow: 'shadow-indigo-500/20'
  },
  'فانتازيا': {
    bg: 'bg-indigo-800',
    text: 'text-white',
    border: 'border-indigo-700',
    glow: 'shadow-indigo-500/20'
  },
  
  // Animation - أزرق
  'animation': {
    bg: 'bg-blue-800',
    text: 'text-white',
    border: 'border-blue-700',
    glow: 'shadow-blue-500/20'
  },
  'أنيميشن': {
    bg: 'bg-blue-800',
    text: 'text-white',
    border: 'border-blue-700',
    glow: 'shadow-blue-500/20'
  },
  'رسوم متحركة': {
    bg: 'bg-blue-800',
    text: 'text-white',
    border: 'border-blue-700',
    glow: 'shadow-blue-500/20'
  },
  
  // Family - أخضر
  'family': {
    bg: 'bg-green-800',
    text: 'text-white',
    border: 'border-green-700',
    glow: 'shadow-green-500/20'
  },
  'عائلي': {
    bg: 'bg-green-800',
    text: 'text-white',
    border: 'border-green-700',
    glow: 'shadow-green-500/20'
  },
  
  // War - رمادي مزرق
  'war': {
    bg: 'bg-slate-700',
    text: 'text-white',
    border: 'border-slate-600',
    glow: 'shadow-slate-500/20'
  },
  'حرب': {
    bg: 'bg-slate-700',
    text: 'text-white',
    border: 'border-slate-600',
    glow: 'shadow-slate-500/20'
  },
  
  // History - كهرماني
  'history': {
    bg: 'bg-amber-800',
    text: 'text-white',
    border: 'border-amber-700',
    glow: 'shadow-amber-500/20'
  },
  'تاريخي': {
    bg: 'bg-amber-800',
    text: 'text-white',
    border: 'border-amber-700',
    glow: 'shadow-amber-500/20'
  },
  
  // Mystery - بنفسجي داكن
  'mystery': {
    bg: 'bg-violet-800',
    text: 'text-white',
    border: 'border-violet-700',
    glow: 'shadow-violet-500/20'
  },
  'غموض': {
    bg: 'bg-violet-800',
    text: 'text-white',
    border: 'border-violet-700',
    glow: 'shadow-violet-500/20'
  },
  
  // Documentary - أزرق مخضر
  'documentary': {
    bg: 'bg-teal-800',
    text: 'text-white',
    border: 'border-teal-700',
    glow: 'shadow-teal-500/20'
  },
  'وثائقي': {
    bg: 'bg-teal-800',
    text: 'text-white',
    border: 'border-teal-700',
    glow: 'shadow-teal-500/20'
  },
  
  // Western - بني
  'western': {
    bg: 'bg-orange-900',
    text: 'text-white',
    border: 'border-orange-800',
    glow: 'shadow-orange-700/20'
  },
  'غربي': {
    bg: 'bg-orange-900',
    text: 'text-white',
    border: 'border-orange-800',
    glow: 'shadow-orange-700/20'
  },
  
  // Music - وردي فاتح
  'music': {
    bg: 'bg-fuchsia-800',
    text: 'text-white',
    border: 'border-fuchsia-700',
    glow: 'shadow-fuchsia-500/20'
  },
  'موسيقي': {
    bg: 'bg-fuchsia-800',
    text: 'text-white',
    border: 'border-fuchsia-700',
    glow: 'shadow-fuchsia-500/20'
  }
}

// لون افتراضي للتصنيفات غير المعروفة
const defaultGenreColor: GenreColorScheme = {
  bg: 'bg-zinc-700',
  text: 'text-white',
  border: 'border-zinc-600',
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
    bg: 'bg-red-700',
    text: 'text-white',
    border: 'border-red-600',
    icon: '🎬',
    label: 'فيلم'
  },
  'movies': {
    bg: 'bg-red-700',
    text: 'text-white',
    border: 'border-red-600',
    icon: '🎬',
    label: 'فيلم'
  },
  'tv': {
    bg: 'bg-blue-800',
    text: 'text-white',
    border: 'border-blue-700',
    icon: '📺',
    label: 'مسلسل'
  },
  'series': {
    bg: 'bg-blue-800',
    text: 'text-white',
    border: 'border-blue-700',
    icon: '📺',
    label: 'مسلسل'
  },
  'anime': {
    bg: 'bg-pink-800',
    text: 'text-white',
    border: 'border-pink-700',
    icon: '🎌',
    label: 'أنمي'
  },
  'game': {
    bg: 'bg-green-800',
    text: 'text-white',
    border: 'border-green-700',
    icon: '🎮',
    label: 'لعبة'
  },
  'software': {
    bg: 'bg-indigo-800',
    text: 'text-white',
    border: 'border-indigo-700',
    icon: '💾',
    label: 'برنامج'
  },
  'quran': {
    bg: 'bg-teal-800',
    text: 'text-white',
    border: 'border-teal-700',
    icon: '📖',
    label: 'قرآن'
  }
}

// لون افتراضي لنوع المحتوى
const defaultMediaTypeColor: MediaTypeColorScheme = {
  bg: 'bg-zinc-700',
  text: 'text-white',
  border: 'border-zinc-600',
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
