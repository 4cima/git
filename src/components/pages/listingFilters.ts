/* ============================================================
   خيارات فلاتر صفحات القوائم — مصدر واحد للست صفحات
   (/movies • /series • /movies/genres/* • /series/genres/* • /movies/lang/* • /series/lang/*)
   توحيد الخيارات يضمن نفس سلوك الفلاتر في كل مكان.
   ============================================================ */

export const YEARS = [
  { value: 'all', label: 'كل السنوات' },
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
  { value: '2021', label: '2021' },
  { value: '2020', label: '2020' },
  { value: '2019', label: '2019' },
  { value: '2018', label: '2018' },
  { value: '2017', label: '2017' },
  { value: '2016', label: '2016' },
  { value: '2015', label: '2015' },
  { value: '2014', label: '2014' },
  { value: '2013', label: '2013' },
  { value: '2012', label: '2012' },
  { value: '2011', label: '2011' },
  { value: '2000-2010', label: 'الألفينات' },
  { value: '1990-1999', label: 'التسعينات' },
  { value: 'before-1990', label: 'كلاسيكي' },
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
  { value: 'first_air_year', order: 'asc',  label: 'الأقدم',         icon: '🕰️' },
]
