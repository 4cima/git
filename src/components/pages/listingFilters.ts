/* ============================================================
   خيارات فلاتر صفحات القوائم — مصدر واحد للست صفحات
   (/movies • /series • /movies/genres/* • /series/genres/* • /movies/lang/* • /series/lang/*)
   توحيد الخيارات يضمن نفس سلوك الفلاتر في كل مكان.
   ============================================================ */

/** أدنى سنة في القوائم — الموقع لا يعرض أعمالاً قبل 2000:
    كل استعلامات SSR والـAPI تشترط release_year/first_air_year >= 2000
    (src/app/movies/page.tsx • src/app/movies/lang/[code]/page.tsx:70 • src/app/api/movies/route.ts) */
export const MIN_YEAR = 2000

/** أعلى سنة في القائمة — تُرفَع هذه القيمة مع كل سنة ميلادية جديدة */
export const MAX_YEAR = 2026

/**
 * «كل السنوات» + سنوات مفردة من 2026 نزولاً إلى 2000 = 28 خياراً (27 سنة + كل السنوات).
 * حُذفت الخيارات المضلّلة القديمة (كلاسيكي / التسعينات / الألفينات) لأن الموقع لا يملك
 * أعمالاً قبل 2000 فكانت تعطي «صفر نتائج» دائماً.
 * ملاحظة: /api/movies و /api/series ما زالا يقبلان المدى والصيغة القديمة
 * (year=2015 • year=2000-2010 • year=before-1990) لمن يفتح رابطاً قديماً — الحذف في الواجهة فقط.
 */
export const YEARS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'all', label: 'كل السنوات' },
  ...Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => {
    const year = String(MAX_YEAR - i)
    return { value: year, label: year }
  }),
]

export const RATINGS = [
  { value: 'all',     label: 'كل التقييمات' },
  { value: '9.1-10',  label: '⭐ 10 مذهل' },
  { value: '8.1-9',   label: '⭐ 9 ممتاز'     },
  { value: '7.1-8',   label: '⭐ 8 جيد جداً'  },
  { value: '6.1-7',   label: '⭐ 7 جيد'       },
  { value: '5.1-6',   label: '⭐ 6 مقبول'    },
  { value: '4.1-5',   label: '⭐ 5 متوسط'    },
]

export const COUNTRIES = [
  { value: 'all', label: 'كل الدول'      },
  { value: 'US',  label: 'أمريكا'        },
  { value: 'JP',  label: 'اليابان'       },
  { value: 'GB',  label: 'بريطانيا'      },
  { value: 'CN',  label: 'الصين'         },
  { value: 'KR',  label: 'كوريا'         },
  { value: 'CA',  label: 'كندا'          },
  { value: 'FR',  label: 'فرنسا'         },
  { value: 'DE',  label: 'ألمانيا'       },
  { value: 'IN',  label: 'الهند'         },
  { value: 'TH',  label: 'تايلاند'       },
  { value: 'RU',  label: 'روسيا'         },
  { value: 'AU',  label: 'أستراليا'      },
  { value: 'BR',  label: 'البرازيل'      },
  { value: 'MX',  label: 'المكسيك'       },
  { value: 'TR',  label: 'تركيا'         },
]

/** لغات المحتوى — القيمة تُرسل كما هي إلى original_language في /api/movies و /api/series
    (نفس مجموعة التسميات العربية المستخدمة في شرائح الفلاتر النشطة بصفحات القوائم) */
export const LANGUAGES = [
  { value: 'all', label: 'كل اللغات' },
  { value: 'ar',  label: 'عربي'     },
  { value: 'en',  label: 'إنجليزي'  },
  { value: 'ko',  label: 'كوري'     },
  { value: 'ja',  label: 'ياباني'   },
  { value: 'zh',  label: 'صيني'     },
  { value: 'hi',  label: 'هندي'     },
  { value: 'tr',  label: 'تركي'     },
  { value: 'es',  label: 'إسباني'   },
  { value: 'fr',  label: 'فرنسي'    },
  { value: 'de',  label: 'ألماني'   },
  { value: 'pt',  label: 'برتغالي'  },
  { value: 'ru',  label: 'روسي'     },
  { value: 'it',  label: 'إيطالي'   },
  { value: 'th',  label: 'تايلاندي' },
]

/** ترتيب الأفلام — عمود release_year */
export const MOVIE_SORT_OPTIONS = [
  { value: 'popularity',   order: 'desc', label: 'الأكثر شهرة',    icon: '🔥' },
  { value: 'vote_average', order: 'desc', label: 'الأعلى تقييماً', icon: '⭐' },
  { value: 'vote_count',   order: 'desc', label: 'الأكثر تقييماً', icon: '📊' },
  { value: 'release_year', order: 'desc', label: 'الأحدث',         icon: '📅' },
  { value: 'release_year', order: 'asc',  label: 'الأقدم',         icon: '🕰️' },
]

/** ترتيب المسلسلات — عمود first_air_year */
export const SERIES_SORT_OPTIONS = [
  { value: 'popularity',     order: 'desc', label: 'الأكثر شهرة',    icon: '🔥' },
  { value: 'vote_average',   order: 'desc', label: 'الأعلى تقييماً', icon: '⭐' },
  { value: 'vote_count',     order: 'desc', label: 'الأكثر تقييماً', icon: '📊' },
  { value: 'first_air_year', order: 'desc', label: 'الأحدث',         icon: '📅' },
  { value: 'first_air_year', order: 'asc',  label: 'الأقدم',         icon: '\u{1F570}\uFE0F' },
]

/* ============================================================
   (E-12) مزامنة الفلاتر مع الرابط — نفس المنطق للست صفحات قوائم
   الرابط هو الحالة الظاهرة: /movies?genre=action&year=2024&sort=vote_average
   كل الدوال هنا نقية (بلا React) وتُستخدم من الـclient فقط.
   ============================================================ */

/** واجهة مختصرة لـURLSearchParams / ReadonlyURLSearchParams */
export type SearchParamsLike = { get(name: string): string | null }

/** خيار ترتيب واحد (value + order) — نفس شكل MOVIE_SORT_OPTIONS/SERIES_SORT_OPTIONS */
export type ListingSortOption = { value: string; order: string }

export type ListingSortState = { sortBy: string; sortOrder: 'asc' | 'desc' }

/** يطبّع أي قيمة إلى asc|desc (الافتراضي desc) */
function normalizeOrder(value: string | null | undefined, fallback: 'asc' | 'desc' = 'desc'): 'asc' | 'desc' {
  if (value === 'asc') return 'asc'
  if (value === 'desc') return 'desc'
  return fallback
}

/**
 * قراءة الفلاتر المشتركة (سنة/تقييم/دولة/لغة/بحث) من الرابط مع التحقق من صحة القيم.
 * القيم غير المعروفة تُسقط إلى 'all' (نفس سلوك قراءة الفلاتر في صفحات القوائم سابقاً).
 * اللغة تُمرَّر كما هي lowercase إلى API (original_language) — أي كود غير معروف يعطي
 * قائمة فارغة صريحة من الـAPI، وهو سلوك مقصود لا fallback صامت.
 */
export function readCommonFiltersFromSearchParams(searchParams: SearchParamsLike) {
  const urlYear     = searchParams.get('year')
  const urlRating   = searchParams.get('rating')
  const urlCountry  = searchParams.get('country')
  const urlLanguage = searchParams.get('language')

  return {
    year:     urlYear    && YEARS.some(y => y.value === urlYear)        ? urlYear    : 'all',
    rating:   urlRating  && RATINGS.some(r => r.value === urlRating)    ? urlRating  : 'all',
    country:  urlCountry && COUNTRIES.some(c => c.value === urlCountry) ? urlCountry : 'all',
    language: urlLanguage ? urlLanguage.toLowerCase() : 'all',
    search:   searchParams.get('search') || searchParams.get('q') || '',
  }
}

/**
 * قراءة الترتيب من الرابط: ?sort=vote_average[&order=asc].
 * - بلا order ⇒ ترتيب الخيار نفسه كما هو معرّف أعلاه.
 * - قيمة sort غير معروفة ⇒ الافتراضي (popularity desc).
 */
export function readSortFromSearchParams(
  searchParams: SearchParamsLike,
  options: readonly ListingSortOption[]
): ListingSortState {
  const fallback: ListingSortState = {
    sortBy: options[0]?.value ?? 'popularity',
    sortOrder: normalizeOrder(options[0]?.order),
  }
  const urlSort = searchParams.get('sort')
  if (!urlSort) return fallback

  const sameColumn = options.find(o => o.value === urlSort)
  if (!sameColumn) return fallback

  const urlOrder = searchParams.get('order')
  if (urlOrder === 'asc' || urlOrder === 'desc') {
    const exact = options.find(o => o.value === urlSort && o.order === urlOrder)
    return { sortBy: urlSort, sortOrder: normalizeOrder(exact?.order ?? urlOrder) }
  }
  return { sortBy: urlSort, sortOrder: normalizeOrder(sameColumn.order) }
}

/** حالة الفلاتر القابلة للمزامنة مع الرابط */
export interface ListingUrlFilterState {
  /** سلاج التصنيف — null/undefined = لا يُزامَن (صفحات التصنيف: التصنيف من المسار نفسه) */
  genreSlug?: string | null
  /** كود اللغة — null/undefined = لا يُزامَن (صفحات اللغة: اللغة مقفولة من المسار) */
  language?: string | null
  year: string
  rating: string
  country: string
  search?: string
  sort?: string
  order?: string
}

/**
 * بناء سلسلة استعلام الفلاتر من الحالة (بلا المسار) — ترتيب ثابت للمفاتيح.
 * القيم الافتراضية ('all'/فراغ) تُحذف ليبقى الرابط نظيفاً وقابلاً للنسخ والمشاركة.
 */
export function buildListingQueryString(state: ListingUrlFilterState): string {
  const params = new URLSearchParams()
  if (state.genreSlug) params.set('genre', state.genreSlug)
  if (state.year    && state.year    !== 'all') params.set('year',    state.year)
  if (state.rating  && state.rating  !== 'all') params.set('rating',  state.rating)
  if (state.country && state.country !== 'all') params.set('country', state.country)
  if (state.language && state.language !== 'all') params.set('language', state.language)
  const search = state.search?.trim()
  if (search) params.set('search', search)
  if (state.sort) params.set('sort', state.sort)
  if (state.order) params.set('order', normalizeOrder(state.order))
  return params.toString()
}

/**
 * مقارنة دلالية بين سلسلتَي استعلام — تُطبّع القيم الافتراضية (all/desc/popularity)
 * وتتجاهل ترتيب المفاتيح. تمنع كتابة الرابط لمجرد إعادة التطبيع
 * (مثال: ?genre=action يصبح genre=action&sort=popularity&order=desc بلا تغيير فعلي للفلاتر)
 * ⇒ لا مُدخلات تاريخ زائفة في المتصفح.
 * مع ignoreSearch: تتجاهل مفتاح البحث — تُفرّق «تغيّر البحث وحده» عن باقي الفلاتر.
 */
export function isSameListingFilters(
  a: string,
  b: string,
  opts: { ignoreSearch?: boolean; defaultSort?: string; defaultOrder?: 'asc' | 'desc' } = {}
): boolean {
  const defaultSort  = opts.defaultSort  ?? 'popularity'
  const defaultOrder = opts.defaultOrder ?? 'desc'
  const norm = (query: string) => {
    const p = new URLSearchParams(query)
    const parts = [
      `genre=${p.get('genre') ?? ''}`,
      `year=${p.get('year') ?? 'all'}`,
      `rating=${p.get('rating') ?? 'all'}`,
      `country=${p.get('country') ?? 'all'}`,
      `language=${(p.get('language') ?? 'all').toLowerCase()}`,
      `sort=${p.get('sort') ?? defaultSort}`,
      `order=${normalizeOrder(p.get('order'), defaultOrder)}`,
    ]
    if (!opts.ignoreSearch) parts.push(`search=${(p.get('search') ?? p.get('q') ?? '').trim()}`)
    return parts.join('&')
  }
  return norm(a) === norm(b)
}
