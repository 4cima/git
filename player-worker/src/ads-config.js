/**
 * ============================================================
 * إعلانات 4cima.stream (adsV2-stream) — قرار اسلام 2026-09-22
 * ============================================================
 * القواعد المعمارية (منقولة من خبرة الموقع الرئيسي — إلزامية):
 * 1) الصيغة المهيكلة { zoneId, scriptSrc / key } فقط —
 *    ممنوع DOMParser أو HTML snippets خام (بتفشل بصمت مع IIFE).
 * 2) بانرات أدستيرا تُركَّب عبر طابور متسلسل — كل snippet أدستيرا
 *    يستخدم المتغير العالمي window.atOptions فالتركيب المتوازي
 *    يجعل بانرًا واحدًا فقط يظهر.
 * 3) «الظهور عند الامتلاء»: كل خانة مخفية حتى يرسم الإعلان فعليًا،
 *    ولو لم تمتلئ خلال fillTimeoutMs تُحذف — صفر خانات فاضية وصفر CLS
 *    (المزادات تأخذ 8–15 ثانية — ممنوع مؤشرات فشل أسرع من 25 ثانية).
 * 4) حارس دومين التوصيل الميت (kettledroopingcontinuation.com) —
 *    نفس حارس الموقع الرئيسي؛ لما أدستيرا تبدّل الدومين تتعافى تلقائيًا.
 * 5) البوباندَر يُسلَّح فور فتح الصفحة (تجهيز سكربت هيلتوب يأخذ 1–2 ثانية،
 *    درس صفحات التفاصيل 7e413ea) — الفتح نفسه يحدث داخل ضغطة حقيقية فقط.
 */

export const STREAM_ADS = {
  enabled: true,

  // بانرات أدستيرا — حساب 4cima.stream (6022089) — زونات من
  // المصدر الرسمي src/data/ads/4cima.stream.ts (الإعلانات رقم 4/1/6/3).
  // ⚠️ زونتا 300×250 (31024507) و160×300 (31024508) اتشالوا من العرض
  // بأمر اسلام 23/9 (إزالة إعلانات شمال المشغّل) — متاحين لو حب يرجّعهم.
  adsterra: {
    deliveryBase: 'https://professionalsusceptible.com',
    // تنظيف 2/10 بحكم الأرقام: ريل 160×600 (31024509) والبانر العريض 728×90
    // (31024511) اتشالوا — صفر إيراد في قياس الـplacement. الباقي: 468×60
    // تحت الفيديو ($0.01) + ستيكي موبايل 320×50 ($0.01) + النيتف (متحجز أرباحه
    // عند أدستيرا $0.02). للترجيع: أعد سطور الـslots المحذوفة:
    //   { id: 'wideBanner', zoneId: '31024511', key: 'bdb4e0892a506c5b4ffd50fb24dd1806', width: 728, height: 90, container: 'adWide', box: 'adWideBox', desktopOnly: true },
    //   { id: 'railRight',  zoneId: '31024509', key: '08167b6512c4b7d71219cb965142440d', width: 160, height: 600, container: 'adRailRight', box: 'adRailRightBox' },
    slots: [
      { id: 'underVideo',   zoneId: '31024506', key: 'a473e3ba3aedd3ec83b608c4fa915f7d', width: 468, height: 60,  container: 'adUnderVideo', box: 'adUnderVideoBox', desktopOnly: true },
      { id: 'stickyMobile', zoneId: '31024510', key: '57877d62319a7f78e0d12672140d9af3', width: 320, height: 50,  container: 'adSticky',     box: 'stickyAd',        mobileOnly: true },
      // زونتا 300×250 (31024507) و160×300 (31024508) اتشالوا من العرض
      // بأمر اسلام 23/9 (إزالة إعلانات شمال المشغّل) — متاحين لو حب يرجّعهم.
    ],
  },

  // Native Banner أدستيرا — زون 31352054 (4cima.stream) — شريط تيزرات 4:1
  // (الكود من GET CODE في 29/9). مش من طابور atOptions: invoke.js بتاع
  // النيتف بيرسم جوه div بمعرّف حرفي container-<hash> بالترتيب الرسمي
  // (السكربت أولًا ثم الحاوية بعده) — نفس درس الموقع الرئيسي beb690c.
  nativeBanner: {
    zoneId: '31352054',
    scriptSrc: 'https://professionalsusceptible.com/9c51c0c228fab0e6b348911f9d685728/invoke.js',
    containerId: 'container-9c51c0c228fab0e6b348911f9d685728',
  },

  // سلايدر فيديو هيلتوب — نفس زون الموقع الرئيسي — ⛔ مُعطّل 2/10 بحكم
  // الأرقام: 1,457 ظهور / 37 إعلان → ~$0.016 (eCPM $0.011) — فيديو ركن مزعج
  // بأقل عائد (اتشال من الموقع والمشغّل معًا). للترجيع: أعد الرابط
  //   scriptSrc: 'https://conventionalresponse.com/b.XcVxsod/Gnl_0EYGWSct/fesmb9/uCZyU/lrkVPfTLch0zNUDegBwIMvjYU/t/NLzDQn0/OaDCACyyOlQ-'
  videoSlider: {
    zoneId: '7448025',
    scriptSrc: '',
    delayMs: 45_000,
  },

  // فيجنت مونتاج (يغطي الشاشة لحظة الضغط) — ⛔ معطّل بأمر اسلام 2026-09-23
  // «شيل الإعلان اللي في نص الشاشة من كل مكان في الموقعين».
  // للترجيع: أعد الرابط — الزون 11699162 شغالة على مونتاج.
  //   scriptSrc: 'https://n6wxm.com/vignette.min.js'
  vignette: { zoneId: '', scriptSrc: '' },

  // طابور ضغطات المشغّل — نفس إيقاع الموقع الرئيسي بالظبط:
  // ضغطة 1 بوباندَر هيلتوب • ضغطة 2 سمارتلينك • ضغطة 3 بوباندَر • هدوء 30 دقيقة.
  // الجلسة منفصلة على دومين المشغّل، وسقف هيلتوب الذاتي (2/24 ساعة) يحكم أيضًا.
  popunder: {
    zoneId: '7448001',
    scriptSrc: 'https://sadpicture.com/cdDl9.6/bt2D5MlZSdWIQv9qNMz/QO0xOODdAPwHMbS/0F3xNND-QO4nMKDQA/1O',
  },
  smartlink: {
    url: 'https://elementarywhole.com/b/3.Vj0gPL3dpWv/b_mwVlJTZaD_0/3PN/DhQe4/MWDLAbxDLSTycy0/NoDWgxw/M/DCUb',
  },
  cooldownMs: 30 * 60 * 1000,

  fillTimeoutMs: 25_000,
  fillPollMs: 400,
  adsterraLoadFailsafeMs: 8_000,
};

// ads.txt الرسمية لدومين 4cima.stream — بدونها البانرات لا تُحتسب صح.
// أدستيرا بحساب المشغّل 6022089 + مونتاج/بروبلر + هيلتوب (نفس حساب الموقع الرئيسي).
export const ADS_TXT = [
  'adsterra.com, 6022089, DIRECT',
  'monetag.com, 3471530, DIRECT',
  'propellerads.com, 3471530, DIRECT, 5d62403b1874469b',
  'hilltopads.com, 404814, DIRECT',
  'hilltopads.net, 404814, DIRECT',
  '',
].join('\n');

// منع فهرسة المشغّل (قرار اسلام 2026-09-22): محتوى مكرر مع صفحات
// تفاصيل 4cima.com — الحماية للسيو بتاع الموقع الرئيسي.
export const ROBOTS_TXT = ['User-agent: *', 'Disallow: /', ''].join('\n');
