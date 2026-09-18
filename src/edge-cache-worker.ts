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
 *     التفاصيل + الأنواع + الترقيم + اللغات (سنة) • الرئيسية والقوائم + sitemap (أسبوع) —
 *     التحديث بيوصل بـpurge بعد المزامنة (وزر المسح اليدوي)، مش بانتظار انتهاء المدة
 *   - 404 لسلاجات ميتة (أسبوع) — سد باب زحف البوتات على الصفحات غير الموجودة
 *   - APIs عامة معلنة الكاش بنفسها (شرط s-maxage كمافحة أمان): home-sections, movies,
 *     series, listing/arabic, genres, tv — سنة على الحافة
 *
 * ممنوع الكاش (بيرجّع للـhandler زي ما هو):
 *   /admin و /api/admin (محميين) • /api/ads (زر الإيقاف الفوري) • /api/continue-watching
 *   • /search (استعلامات لا نهائية) • /profile وكل الصفحات الشخصية • أي API غير معلنة الكاش
 *
 * ملاحظات:
 *   - المفتاح للصفحات = الـpath بس من غير query (الصفحات المكتاشة مبتقراش searchParams — اتحقق منها)
 *     عشان استعلامات الزواحف العشوائية ما تبعثش الكاش بمفاتيح لا نهائية.
 *   - النسخة المكتاشة بتاخد cache-control خاص بيها (s-maxage طويل + max-age=5 دقايق +
 *     stale-while-revalidate ساعة + stale-if-error يوم) — المتصفح بيرجع يتحقق بسرعة، والحافة شايلة الحمل
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

/** بالثواني — المحتوى ثابت والتحديث الوحيد هو المزامنة، فالـinvalidation بالـpurge مش بالزمن */
const DETAILS_TTL = 60 * 60 * 24 * 365; // تفاصيل + أنواع + ترقيم — سنة
const LISTING_TTL = 60 * 60 * 24 * 7; // الرئيسية والقوائم — أسبوع
const LANG_TTL = 60 * 60 * 24 * 365; // أرشيف اللغات — سنة
const SITEMAP_TTL = 60 * 60 * 24 * 7; // أسبوع
const NOT_FOUND_TTL = 60 * 60 * 24 * 7; // 404 لسلاجات ميتة — أسبوع
const API_EDGE_TTL = 60 * 60 * 24 * 365; // الـAPIs — سنة
/** ساعة SWR على الأقل + يوم stale-if-error لو الأصل وقع (D1/الـWorker غير متاح) */
const SWR = 60 * 60;
const STALE_IF_ERROR = 24 * 60 * 60;

/** مسارات الصفحات القابلة للكاش — ترتيب الفحص مهم: الأدق قبل الأعم */
const PAGE_RULES: Array<{ exact?: string[]; prefix?: string[]; ttl: number }> = [
  { exact: ["/", "/movies", "/series", "/genres"], ttl: LISTING_TTL },
  { prefix: ["/movies/genres/", "/series/genres/", "/genres/"], ttl: DETAILS_TTL },
  { prefix: ["/movies/lang/", "/series/lang/"], ttl: LANG_TTL },
  { prefix: ["/movies/", "/series/"], ttl: DETAILS_TTL },
  { prefix: ["/sitemap"], ttl: SITEMAP_TTL },
];

/**
 * APIs معلنة الكاش بنفسها (شرط s-maxage في ردها كمافحة أمان) — النسخة المخزنة بتاخد
 * سنة على الحافة (الـinvalidation بـpurge المزامنة) و5 دقايق للمتصفح.
 * (اتعطّلت مؤقتًا 2026-09-18 لما كان Browser Cache TTL العام "4 hours" بيفرض نفسه —
 *  اتحل: الإعداد العام بقى Respect Existing Headers + حذف القواعد المتداخلة.)
 */
const API_PREFIXES = [
  "/api/home-sections",
  "/api/movies",
  "/api/series",
  "/api/listing/arabic",
  "/api/genres",
  "/api/tv/",
];

/** كاش المتصفح للصفحات — نفس سلوك الـ5 دقايق اللي كانت Rule 1 بتفرضه، بس تحت إدارتنا */
const BROWSER_TTL = 5 * 60;
/** كاش المتصفح للـAPIs المعلنة — 5 دقايق (الحد الأدنى من نطاق المواصفة 5-30 د) */
const API_BROWSER_TTL = 5 * 60;

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
    // ⚠️ درس 18/9: Cache API بتكلاود فلير بتتجاهل Vary تمامًا (مطابقة بالـURL بس) —
    // طلبات راوتر Next (RSC/prefetch) لو اتخزنت تحت نفس الـURL بتبوّظ الصفحة للزوار
    // (سودة + JSON خام). فطلبات الراوتر بتعدي خالص، ونتأكد إن المخزّن HTML فقط.
    const isRouterDataRequest =
      request.headers.has("rsc") ||
      request.headers.has("next-router-prefetch") ||
      request.headers.has("next-router-state-tree") ||
      request.headers.has("next-router-segment-prefetch");

    if (!edgeCache || request.method !== "GET" || isRouterDataRequest) {
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
      const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
      const looksLikeHtml = contentType.includes("text/html");
      const looksLikeJson = contentType.includes("application/json");
      // الصفحات: HTML فقط — أي رد تاني (RSC/x-component/redirect) ميتخزنش أبدًا
      if ((pageTtl && !looksLikeHtml) || (!pageTtl && !looksLikeJson)) {
        return withHeader(res, "MISS");
      }
      const headers = new Headers(res.headers);
      headers.delete("vary"); // الـCache API بيتجاهل Vary أصلًا — نشيله من النسخة المخزنة احتياطًا
      if (pageTtl) {
        // الحافة سنة/أسبوع حسب النوع؛ المتصفح 5 دقايق للـ200 والـ404 صفر
        const browserTtl = res.status === 200 ? BROWSER_TTL : 0;
        headers.set(
          "cache-control",
          `public, s-maxage=${ttl}, max-age=${browserTtl}, stale-while-revalidate=${SWR}, stale-if-error=${STALE_IF_ERROR}`,
        );
      } else {
        // الـAPI: سنة على الحافة — المحتوى بيتغير بالمزامنة بس وبيوصلها purge_everything
        headers.set(
          "cache-control",
          `public, s-maxage=${API_EDGE_TTL}, max-age=${API_BROWSER_TTL}, stale-while-revalidate=${SWR}, stale-if-error=${STALE_IF_ERROR}`,
        );
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
