/**
 * طبقة كاش الحافة جوه الـWorker — Cloudflare Cache API (caches.default)
 *
 * ليه دي أهم طبقة في المشروع دلوقتي؟
 *   - ردود الـWorker بتتجاهل من كاش الحافة بقواعد الداشبورد (الصفحات بتتولد جوه الـWorker نفسه).
 *   - الـISR بتاع Next كتابته في KV بيفشل بصمت على الخطة المجانية (حد 1,000 كتابة/يوم) —
 *     اتأكدنا: صفحات سخونة زي /movies/genres/action ملهاش أي مدخل في كاش أي بيلد من ~300 بيلد.
 *   - النتيجة كانت: كل زاحف/زائر على صفحة تفاصيل أو ترقيم أنواع = إعادة توليد كاملة من D1
 *     (استعلامات COUNT + تصفح OFFSET عميق) — ده كان المحرق الأساسي لـ300M صف/يوم على ~90K طلب.
 *   - الـCache API بلا حدود مجانية (قراءة/كتابة) وبيتمسح بنفس purge_everything اللي شغال
 *     بعد كل مزامنة وزر المسح اليدوي في الأدمن.
 *
 * بيكاش إيه؟
 *   - صفحات عامة نفسها واحد لكل الزوار (الحماية والتخصيص كله client-side عبر APIs):
 *     التفاصيل + الأنواع + الترقيم (4 ساعات) • الرئيسية والقوائم (10 دقايق) • اللغات (ساعة) • sitemap (ساعة)
 *   - 404 لسلاجات ميتة (10 دقايق) — سد باب زحف البوتات على الصفحات غير الموجودة
 *   - APIs عامة معلنة الكاش بنفسها (s-maxage) — الكاش بيحترم إعلانها: home-sections, movies, series,
 *     listing/arabic, genres, tv
 *
 * ممنوع الكاش (بيرجّع للـhandler زي ما هو):
 *   /admin و /api/admin (محميين) • /api/ads (زر الإيقاف الفوري) • /api/continue-watching
 *   • /search (استعلامات لا نهائية) • /profile وكل الصفحات الشخصية • أي API غير معلنة الكاش
 *
 * ملاحظات:
 *   - المفتاح للصفحات = الـpath بس من غير query (الصفحات المكتاشة مبتقراش searchParams — اتحقق منها)
 *     عشان استعلامات الزواحف العشوائية ما تبعثش الكاش بمفاتيح لا نهائية.
 *   - النسخة المكتاشة بتاخد cache-control خاص بيها (s-maxage + max-age=0) — يعني المتصفح
 *     ما يكاشش HTML أصلًا وبيفضل بياخد الرد الأصلي من غير تغيير هيدراته.
 *   - الـVary بتاع ردود RSC/HTML بيتحترم تلقائيًا في الـCache API (طلبات الـrouter مش هتتلخبط).
 *   - التحقق لايف: هيدر x-edge-cache: HIT | MISS.
 */

// @ts-ignore — حزمة OpenNext المولّدة (JS غير مُعرّف الأنواع، وبتتوفر بعد build:cloudflare)
import openNextWorker, { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "../.open-next/worker.js";

// إعادة تصدير كلاسات الـDurable Objects — wrangler migrations بتشاور عليها من الـentry
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache };

type Env = unknown;
type WorkerCtx = { waitUntil(promise: Promise<unknown>): void };

interface EdgeCacheStore {
  match(request: Request | string): Promise<Response | undefined>;
  put(request: Request | string, response: Response): Promise<void>;
}

const edgeCache: EdgeCacheStore | undefined = (
  globalThis as { caches?: { default?: EdgeCacheStore } }
).caches?.default;

type OpenNextHandler = {
  fetch: (request: Request, env: Env, ctx: WorkerCtx) => Promise<Response>;
};
const handler = openNextWorker as unknown as OpenNextHandler;

/** بالثواني */
const DETAILS_TTL = 4 * 60 * 60; // تفاصيل + أنواع + ترقيم — بينضف بعد كل مزامنة بـpurge_everything
const LISTING_TTL = 10 * 60; // الرئيسية والقوائم الرئيسية
const LANG_TTL = 60 * 60; // أرشيف اللغات
const SITEMAP_TTL = 60 * 60;
const NOT_FOUND_TTL = 10 * 60; // 404 لسلاجات ميتة

/** مسارات الصفحات القابلة للكاش — ترتيب الفحص مهم: الأدق قبل الأعم */
const PAGE_RULES: Array<{ exact?: string[]; prefix?: string[]; ttl: number }> = [
  { exact: ["/", "/movies", "/series", "/genres"], ttl: LISTING_TTL },
  { prefix: ["/movies/genres/", "/series/genres/", "/genres/"], ttl: DETAILS_TTL },
  { prefix: ["/movies/lang/", "/series/lang/"], ttl: LANG_TTL },
  { prefix: ["/movies/", "/series/"], ttl: DETAILS_TTL },
  { prefix: ["/sitemap"], ttl: SITEMAP_TTL },
];

/**
 * APIs معلنة كاشها بنفسها (s-maxage في ردها) — معطّلة حاليًا لأسباب مكتشفة على الإنتاج:
 * قواعد كاش الـzone النائمة في الداشبورد بتتصحى بمجرد ما الرد يدخل الكاش وبتفرض browser TTL
 * 4 ساعات على الـAPIs (اترصد فعليًا: max-age=14400 على home-sections حتى مع max-age=0 صريح
 * في النسخة المخزنة — التجاوز بيحصل فوق كود الـWorker). النتيجة: زائر راجع يشوف أقسام
 * الهوم قديمة من متصفحه.
 * لتفعيلها لاحقًا: تنظيف/تعديل قواعد كاش الـzone من الداشبورد (Browser TTL: respect origin
 * أو إلغاء الـoverride) ثم إعادة الأسماء هنا — الميكانيزم تحت جاهز وبيحترم s-maxage بتاع الرد.
 */
const API_PREFIXES: string[] = [];

function getPageTtl(pathname: string): number | undefined {
  for (const rule of PAGE_RULES) {
    if (rule.exact?.includes(pathname)) return rule.ttl;
    if (rule.prefix?.some((p) => pathname.startsWith(p))) return rule.ttl;
  }
  return undefined;
}

function isApiCacheable(pathname: string): boolean {
  return API_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

function isPublicCacheable(cacheControl: string | null): boolean {
  if (!cacheControl) return false;
  const cc = cacheControl.toLowerCase();
  return (
    cc.includes("s-maxage") &&
    !cc.includes("private") &&
    !cc.includes("no-store") &&
    !cc.includes("no-cache")
  );
}

function withHeader(res: Response, value: "HIT" | "MISS"): Response {
  const headers = new Headers(res.headers);
  headers.set("x-edge-cache", value);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: WorkerCtx): Promise<Response> {
    if (!edgeCache || request.method !== "GET") {
      return handler.fetch(request, env, ctx);
    }

    const url = new URL(request.url);
    const pathname = url.pathname;
    const pageTtl = getPageTtl(pathname);
    const apiCacheable = pageTtl === undefined && isApiCacheable(pathname);
    if (!pageTtl && !apiCacheable) {
      return handler.fetch(request, env, ctx);
    }

    const cacheKey = url.origin + pathname + (pageTtl ? "" : url.search);

    const cached = await edgeCache.match(cacheKey);
    if (cached) {
      return withHeader(cached, "HIT");
    }

    const res = await handler.fetch(request, env, ctx);

    const shouldCache =
      !res.headers.has("set-cookie") &&
      (pageTtl
        ? res.status === 200 || res.status === 404
        : res.status === 200 && isPublicCacheable(res.headers.get("cache-control")));

    if (shouldCache) {
      const ttl = pageTtl ? (res.status === 200 ? pageTtl : NOT_FOUND_TTL) : 0;
      const headers = new Headers(res.headers);
      if (pageTtl) {
        // نسخة الحافة بتتحدد بـTTL موحد؛ max-age=0 عشان المتصفح ما يكاشش HTML أصلًا
        headers.set("cache-control", `public, s-maxage=${ttl}, max-age=0`);
      } else {
        // الـAPI: نفس سياسة الأصل لكن max-age=0 صريح — من غيره Cloudflare بيرفع الـbrowser
        // TTL للـedge TTL بتاع قواعد الـzone (اترصد فعليًا: max-age=14400 على home-sections)
        const cc = (res.headers.get("cache-control") ?? "").replace(/max-age=\d+/gi, "max-age=0");
        headers.set("cache-control", /max-age=/i.test(cc) ? cc : `${cc}, max-age=0`);
      }
      headers.set("x-edge-cache", "MISS");
      const edgeCopy = new Response(res.clone().body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
      ctx.waitUntil(
        edgeCache.put(cacheKey, edgeCopy).catch(() => {
          // أي رفض من الـCache API (Set-Cookie/حجم/قيود) = تخطّي صامت، الرد واصل للزائر برضه
        }),
      );
    }

    return withHeader(res, "MISS");
  },
};
