/**
 * adsV2 — وحدة التحكم المركزية للإعلانات (الخطة الجديدة من الصفر)
 * ================================================================
 * الاستراتيجية: أعلى عائد من فورمات الضغط والفورمات التي تتموه مع المحتوى،
 * لا من بنرات iframe كثيرة. كل وحدة هنا = لصق كود الشبكة (snippet) في حقلها
 * فتتفعّل تلقائيًا في كل صفحاتها — والفارغ يعني «غير مفعّلة» فيتولّى
 * السلوت القديم (legacy) شغلها تلقائيًا عبر SmartSlot حتى التحول.
 *
 * شبكات: Adsterra (Social Bar + Native + SmartLink) —
 *        HilltopAds (MultiTag In-Page 300×250 + بوباندَر + Video Slider + DirectLink) —
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
  /**
   * Social Bar (Adsterra) — عالمي على كل الصفحات، يُحقن بعد أول رسمة + idle.
   * زون 31352043 (SocialBar_1) على 4cima.com — تُزرع فوق </body>.
   */
  socialBar: {
    snippet: '<script src="https://professionalsusceptible.com/6b/2d/9c/6b2d9ce00c7c6273639af52472cf6980.js"></script>',
  } as SnippetUnit,

  /**
   * MultiTag In-Page 300×250 (HilltopAds) — تحت بوستر التفاصيل وترُوس الكتالوجات.
   * زون 7448009 (4cima-inpage-300x250، معتمدة) — In-Page + Popup مدمجان.
   */
  multiTag: {
    snippet: `<script>
(function(lmjkg){
var d = document,
    s = d.createElement('script'),
    l = d.currentScript || d.scripts[d.scripts.length - 1];
s.settings = lmjkg || {};
s.src = "//conventionalresponse.com/bqXrVss.d/GTlw0UYNWmcS/he-ma9/uDZVUYl/kePaTUcu0LNWDTgUwnMnDpk/tGNszxQB0XOcD/A/x/M-wD";
s.async = true;
s.referrerPolicy = 'no-referrer-when-downgrade';
l.parentNode.insertBefore(s, l);
})({})
</script>`,
  } as SnippetUnit,

  /**
   * Native Banner (Adsterra) — كارت بوستر في نهاية الصفوف وشريط تيزرات بعد
   * «قد يعجبك أيضاً». الزون أُنشئت على 4cima.com لكن كودها لم يُجلب بعد —
   * الصق الكود هنا (GET CODE من داشبورد Adsterra) فتتفعّل السلوتات تلقائيًا.
   */
  native: { snippet: '' } as SnippetUnit,

  /**
   * Vignette Banner (Monetag) — الستيتشي السفلي للموبايل (قابل للإغلاق).
   * أنشئ الزون في platforms.propellerads.com/Monetag والصق الكود هنا.
   * حتى ذلك الحين يظل بنر Adsterra 320×50 القديم يعمل في نفس الصدفة.
   */
  vignette: { snippet: '' } as SnippetUnit,

  /**
   * Video Slider (HilltopAds) — فيديو عايم في رُكن الشاشة بعد تأخير.
   * زون 7448025 (4cima-video-slider، معتمدة).
   */
  videoSlider: {
    snippet: `<script>
(function(udu){
var d = document,
    s = d.createElement('script'),
    l = d.currentScript || d.scripts[d.scripts.length - 1];
s.settings = udu || {};
s.src = "//conventionalresponse.com/b.XcVxsod/Gnl_0EYGWSct/fesmb9/uCZyU/lrkVPfTLch0zNUDegBwIMvjYU/t/NLzDQn0/OaDCACyyOlQ-";
s.async = true;
s.referrerPolicy = 'no-referrer-when-downgrade';
l.parentNode.insertBefore(s, l);
})({})
</script>`,
    delayMs: 45_000,
  } as SnippetUnit & { delayMs: number },

  /**
   * SmartLink — ضغطة المشاهدة الثانية في الطابور (ولاحقًا أزرار التحميل).
   * حاليًا: DirectLink من زون البوباندَر HilltopAds (7448001).
   */
  smartlink: {
    url: 'https://elementarywhole.com/b/3.Vj0gPL3dpWv/b_mwVlJTZaD_0/3PN/DhQe4/MWDLAbxDLSTycy0/NoDWgxw/M/DCUb',
  },

  popunder: {
    /** Monetag/PropellerAds — فعّال (زون 11691417) — نص الجلسات A/B */
    monetag: {
      scriptUrl: 'https://al5sm.com/tag.min.js',
      zoneId: '11691417',
    },
    /** HilltopAds — زون 7448001 (معتمدة) — النص الآخر من A/B */
    hilltop: {
      scriptUrl:
        'https://sadpicture.com/cdDl9.6/bt2D5MlZSdWIQv9qNMz/QO0xOODdAPwHMbS/0F3xNND-QO4nMKDQA/1O',
      zoneId: '7448001',
    },
  },

  /** بعد 3 ضغطات مشاهدة: هدوء حتى مرور المدة ثم بوباندَر واحد جديد */
  cooldownMs: 30 * 60 * 1000,
}

/** هل الوحدة النصية مفعّلة؟ (سنيبت غير فارغ) */
export function hasSnippet(u: { snippet: string }): boolean {
  return u.snippet.trim().length > 0
}
