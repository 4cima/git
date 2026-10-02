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
   * Social Bar (Adsterra) — **معطّلة بقرار اسلام 2026-09-22**: كانت بتتراكم
   * فوق إشعارات مونتاج في صفحات التفاصيل (3 إشعارات متراكبة) — الاتفاق:
   * الإبقاء على إشعارات مونتاج المتشابهة فقط. للترجيع: إعادة لصق الرابط.
   * (زون 31352043 SocialBar_1 على 4cima.com)
   * scriptSrc كان: https://professionalsusceptible.com/6b/2d/9c/6b2d9ce00c7c6273639af52472cf6980.js
   */
  socialBar: {
    scriptSrc: '',
  },

  /**
   * MultiTag In-Page 300×250 (HilltopAds) — زون 7448009 (4cima-inpage-300x250)
   * ⛔ مُعطّل 2/10 بحكم الأرقام: 438 ظهور → ~$0.001 (eCPM $0.002) بينما البنر
   * الرابح أدستيرا 300×250 (31008095) بيدفع $0.12/يوم بـeCPM $0.381 في نفس
   * المقاس — بتفريغ الحقلين يرجع البنر الرابح تحت بوستر التفاصيل تلقائيًا
   * (سلوت ذكي بلا خسارة عائد).
   * للترجيع: أعد لصق الرابط (الزون شغالة على هيلتوب):
   *   scriptSrc: 'https://conventionalresponse.com/bqXrVss.d/GTlw0UYNWmcS/he-ma9/uDZVUYl/kePaTUcu0LNWDTgUwnMnDpk/tGNszxQB0XOcD/A/x/M-wD'
   */
  multiTag: {
    zoneId: '',
    scriptSrc: '',
  },

  /**
   * Native Banner (Adsterra) — كارت بوستر في نهاية الصفوف وشريط تيزرات بعد
   * «قد يعجبك أيضاً». الزون 31352076 على 4cima.com (ويدجت 4:1، خط ولون Inherit)
   * — الكود جُلب من GET CODE في 2026-09-26 فتفعّلت السلوتات تلقائيًا.
   * للإزالة: أفرغ الحقلين فيرجع البديل القديم فورًا (سلوت ذكي بلا خسارة عائد).
   */
  native: {
    zoneId: '31352076',
    scriptSrc: 'https://professionalsusceptible.com/903a1ef85e8087137c1831470111f84/invoke.js',
  },

  /**
   * Vignette Banner (Monetag) — زون 11699162 (Wonderful tag)
   * ⛔ معطّل بأمر اسلام 2026-09-23 — «شيل الإعلان اللي في نص الشاشة من كل مكان في الموقعين»
   * للترجيع: أعد لصق الرابط في scriptSrc (الزون شغالة على مونتاج):
   *   scriptSrc: 'https://n6wxm.com/vignette.min.js'
   * (كان يُحقن في أعلى كل الصفحات + تحت هيرو الرئيسية)
   */
  vignette: {
    zoneId: '',
    scriptSrc: '',
  },

  /**
   * In-Page Push (Monetag) — زون 11699161 (Great tag)
   * ⛔ معطّل بأمر اسلام 2026-09-25 — «احذف إشعارات مونتاج» — أقل إعلان عائدًا في
   * المنظومة ($0.004/يوم) بينما ياخد سايدبار صفحات التفاصيل.
   * للترجيع: أعد لصق الرابط (الزون شغالة على مونتاج):
   *   zoneId: '11699161',
   *   scriptSrc: 'https://nap5k.com/tag.min.js'
   */
  inPagePush: {
    zoneId: '',
    scriptSrc: '',
  },

  /**
   * ستيتشي الموبايل — هيلتوب MultiTag In-Page 300×100 (موبايل فقط)
   * زون 7450617 (4cima-Mobile-Only)
   * ⛔ مُعطّل 2/10 بحكم الأرقام: 717 ظهور في 8 أيام → $0.0005 (eCPM $0.001)
   * — شريط دائم على كل صفحة موبايل ببلاش (قاعدة التنظيف: eCPM أقل من $0.05 يتشال).
   * للترجيع: أعد لصق الرابط (الزون شغالة على هيلتوب):
   *   scriptSrc: 'https://conventionalresponse.com/buXaV.s_d-G/le0NY/WmcT/QeTmc9Hu/ZSU/lUkDP/T/cw0kN/TtA/2/MFTGcbt/NWzsQQ1wMFD-YmynMPQq'
   */
  stickyMobile: {
    zoneId: '7450617',
    scriptSrc: '',
  },

  /**
   * Video Slider (HilltopAds) — فيديو عايم في رُكن الشاشة بعد تأخير.
   * زون 7448025 (4cima-video-slider)
   * ⛔ مُعطّل 2/10 بحكم الأرقام: 1,457 ظهور / 37 إعلان → ~$0.016 (eCPM $0.011)
   * — فيديو ركن مزعج بأقل عائد في المنظومة تقريبًا (يُشال من المشغّل كذلك).
   * للترجيع: أعد لصق الرابط (الزون شغالة على هيلتوب):
   *   scriptSrc: 'https://conventionalresponse.com/b.XcVxsod/Gnl_0EYGWSct/fesmb9/uCZyU/lrkVPfTLch0zNUDegBwIMvjYU/t/NLzDQn0/OaDCACyyOlQ-'
   */
  videoSlider: {
    zoneId: '7448025',
    scriptSrc: '',
    delayMs: 45_000,
  },

  /**
   * SmartLink — ضغطة المشاهدة الثانية في الطابور (ولاحقًا أزرار التحميل).
   * حاليًا: DirectLink من زون البوباندَر HilltopAds (7448001).
   */
  smartlink: {
    url: 'https://elementarywhole.com/b/3.Vj0gPL3dpWv/b_mwVlJTZaD_0/3PN/DhQe4/MWDLAbxDLSTycy0/NoDWgxw/M/DCUb',
  },

  popunder: {
    /** Monetag — معطّل بقرار صاحب الموقع: البوباندَر انتقل لهيلتوب بالكامل */
    monetag: {
      scriptUrl: '',
      zoneId: '',
    },
    /** HilltopAds — زون 7448001 (معتمدة) — البوباندَر الوحيد */
    hilltop: {
      scriptUrl:
        'https://sadpicture.com/cdDl9.6/bt2D5MlZSdWIQv9qNMz/QO0xOODdAPwHMbS/0F3xNND-QO4nMKDQA/1O',
      zoneId: '7448001',
    },
  },

  /**
   * بوباندَر مونتاج الشامل — 🔄 أُعيد تفعيله 2/10 بأمر اسلام: بوباندَر تاني
   * دائمًا متفعل «زي المواقع المنافسة» على كل الصفحات ما عدا تفاصيل الأفلام/
   * المسلسلات (هناك طابور المشاهدة هيلتوب يملك الضغطات — بدون تصادم).
   * البيانات: eCPM مونتاج التاريخي $0.30-0.61. ⚠️ لازم Frequency الزون
   * 11691417 في داشبورد مونتاج = 1/24 ساعة (كاب داخلي منهم كمان).
   * للترجيع: أفرغ الحقلين.
   */
  popunderWide: {
    scriptUrl: 'https://al5sm.com/tag.min.js',
    zoneId: '11691417',
  },

  /** بعد 3 ضغطات مشاهدة: هدوء حتى مرور المدة ثم بوباندَر واحد جديد */
  cooldownMs: 30 * 60 * 1000,
}

/** هل الوحدة النصية مفعّلة؟ (سنيبت غير فارغ) */
export function hasScriptSrc(u: { scriptSrc: string }): boolean {
  return u.scriptSrc.trim().length > 0
}
