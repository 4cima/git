# خط الأساس — المرحلة 0 (2026-09-21)

التقطت آلياً عبر GSC API (حساب خدمة zcode-gsc@cima-506214) + فحوص إنتاج مباشرة، قبل أي تغيير في المرحلة 1.

## فهرسة الصفحات (من تقرير GSC، تحديث 18/9/2026 — رقم مرجعي يدوي)
- مفهرسة: **53**
- غير مفهرسة: ~**88,000** (منها **87,941** «تم اكتشاف الصفحة – لم تُفهرس حتى الآن»)
- redirect: 6 + خطأ توجيه 1 + 404: 2

## الأداء (searchAnalytics API، نهائي)
| النطاق | نقرات | ظهور |
|---|---|---|
| آخر 90 يوم | 3,197 | 14,070 |
| آخر 7 أيام | 784 | 4,027 ← تصاعد حديث واضح |

- ملفات: `gsc-performance-daily-90d.csv`، `gsc-top-pages-28d.csv`، `gsc-baseline-summary.json`
- أعلى الصفحات (28 يوم): الرئيسية 14,024 ظهور/3,133 نقرة · `/movies` 1,209/109 · فقط **47 صفحة** حصلت على أي ظهور.

## الـ sitemap كما يراها جوجل (sites/sitemaps API)
- `https://4cima.com/sitemap-index.xml` — مقروءة، **آخر قراءة 2026-09-21T13:29Z (يومياً)**، 0 أخطاء، 0 تحذيرات، submitted=**91,878** URL (عداد indexed في هذا الـ endpoint غير موثوق = 0 دائماً).

## فحص URL (urlInspection API) — عينة
| URL | الحالة | آخر زحف |
|---|---|---|
| `/` | Submitted and indexed · PASS | 2026-09-21 18:45 UTC |
| `/movies` | Submitted and indexed · PASS | 2026-09-20 11:14 |
| `/series/silo` | Submitted and indexed · PASS | 2026-09-15 08:41 |
| `/movies/the-furious` (priority #31) | **URL is unknown to Google** | never |
| `/movies/anacondas-the-hunt-…` (priority #2501) | **URL is unknown to Google** | never |

ملاحظة: referringUrls للرئيسية تتضمن رابط سبام (best-backlink-provider.com.in) — يُرصد لاحقاً في المرحلة 4.

## 0.2 — Googlebot محجوب؟ **لا (أدلة قاطعة)**
- الرئيسية زُحفت بنجاح اليوم (pageFetchState=SUCCESSFUL، robotsTxtState=ALLOWED، crawledAs=MOBILE).
- 87,941 صفحة «مُكتشفة» — الاكتشاف نفسه يثبت زحفاً سليماً للـ sitemap/الروابط.
- طلب بـ UA مزيف لـ Googlebot من IP غير جوجلي: **200 بلا أي تحدي** (لا Bot Fight Mode ظاهر الأثر).
- توكنات الـ API المتاحة لا تملك صلاحية قراءة Zone Analytics/Bot Management — التأكيد البصري من لوحة Cloudflare (Security → Events فلترة Googlebot + Bots Settings) متروك للمستخدم كخطوة اختيارية.

## 0.3 — سرعة الاستجابة
- TTFB من موقع الفحص: 0.61s / 0.48s / 0.22s (بارد ثم دافئ) — ضمن/قرب حد 600ms من هذه النقطة، وfetch جوجل نفسه SUCCESSFUL.
- قراءة Crawl stats الرسمية من GSC UI تحتاج تسجيل دخول المستخدم — اختيارية الآن بعد دليل الزحف الحي أعلاه.

## 0.4 — الباك أب
- `sitemap_urls_backup_20260917` موجودة: **87,173 صف** ✓
- `sitemap_urls` الحالي: movies 62,361 + series 24,474 = 86,835.
- المؤهل لـ priority (clean + سنة≥2000 + tmdb، قبل فلتر slug): 145,066 فيلم / 38,338 مسلسل — نواة الـ 5,000 محمية بأضعاف.

## حالة الإنتاج قبل 1.1
- `sitemap-index.xml` يحوي **12** خريطة: static + priority + movies-0..6 + series-0..2.
- robots.txt سليم، `Sitemap: https://4cima.com/sitemap-index.xml` موجود.
