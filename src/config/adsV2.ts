/**
 * adsV2 — وحدة التحكم المركزية للإعلانات (الخطة الجديدة من الصفر)
 * ================================================================
 * الاستراتيجية: أعلى عائد من فورمات الضغط والفورمات التي تتموه مع المحتوى،
 * لا من بنرات iframe كثيرة. كل وحدة هنا = لصق كود الشبكة (snippet) في حقلها
 * فتتفعّل تلقائيًا في كل صفحاتها — والفارغ يعني «غير مفعّلة» فيتولّى
 * السلوت القديم (legacy) شغلها تلقائيًا عبر SmartSlot حتى التحول.
 *
 * شبكات: Adsterra (Social Bar + Native + SmartLink) —
 *        HilltopAds (MultiTag In-Page 300×250 + بوباندَر + Video Slider + VAST) —
 *        Monetag/PropellerAds (بوباندَر + Vignette).
 *
 * ملاحظة CSP/allowlist: أي دومين توصيل جديد في السنيبت يجب إضافته إلى
 * NETWORK_HOSTS في src/lib/adsAllowlist.ts وقسم Report-Only في next.config.ts.
 */

export type SnippetUnit = {
  /** كود الوحدة كما تعطيه الشبكة (وسوم script/div كاملة) — فارغ = معطّلة */
  snippet: string
}

export const ADS_V2 = {
  /** Social Bar (Adsterra) — عالمي على كل الصفحات، يُحقن بعد أول رسمة + idle */
  socialBar: { snippet: '' } as SnippetUnit,

  /** MultiTag In-Page 300×250 (HilltopAds) — تحت بوستر التفاصيل وترُوس الكتالوجات */
  multiTag: { snippet: '' } as SnippetUnit,

  /** Native Banner (Adsterra) — كارت بوستر في نهاية الصفوف وداخل الشبكات */
  native: { snippet: '' } as SnippetUnit,

  /** Vignette Banner (Monetag) — الستيتشي السفلي للموبايل (قابل للإغلاق) */
  vignette: { snippet: '' } as SnippetUnit,

  /** Video Slider (HilltopAds) — فيديو عايم في رُكن الشاشة بعد تأخير */
  videoSlider: { snippet: '', delayMs: 45_000 } as SnippetUnit & { delayMs: number },

  /** SmartLink — ضغطة المشاهدة الثانية في الطابور (ولاحقًا أزرار التحميل) */
  smartlink: { url: '' },

  popunder: {
    /** Monetag/PropellerAds — فعّال الآن (زون 11691417) */
    monetag: {
      scriptUrl: 'https://al5sm.com/tag.min.js',
      zoneId: '11691417',
    },
    /** HilltopAds — يُملأ بكود زون البوبندر (scriptUrl + zoneId) */
    hilltop: {
      scriptUrl: '',
      zoneId: '',
    },
  },

  /** بعد 3 ضغطات مشاهدة: هدوء حتى مرور المدة ثم بوباندَر واحد جديد */
  cooldownMs: 30 * 60 * 1000,
}

/** هل الوحدة النصية مفعّلة؟ (سنيبت غير فارغ) */
export function hasSnippet(u: { snippet: string }): boolean {
  return u.snippet.trim().length > 0
}
