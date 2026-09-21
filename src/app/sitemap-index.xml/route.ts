import {
  SITEMAP_BASE_URL,
  INDEX_CACHE_CONTROL,
  sitemapindexXml,
  xmlSuccessResponse,
  xmlUnavailableResponse,
  sitemapCacheMatch,
  sitemapCachePut,
} from '@/lib/sitemap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * /sitemap-index.xml — sitemap index Route Handler (raw XML).
 *
 * المرحلة 1.1 من خطة استعادة الفهرسة (INDEXING-RECOVERY-PLAN.md): الفهرس
 * يرشّح النواة فقط — لا استعلام D1 ولا عدّ شظايا بعد الآن:
 *   /sitemap/static.xml   (الصفحات الثابتة + صفحات الهبوط للتصنيفات)
 *   /sitemap/priority.xml (أفضل 3,000 فيلم + 2,000 مسلسل حسب popularity)
 *
 * شظايا الكتالوج (movies-0..N / series-0..N) تبقى حية وتُخدم من مسارها
 * بلا تغيير — لكنها خارج قائمة الفهرس مؤقتاً: جوجل يعرفها من الـ history
 * ويستمر باكتشافها عبر الروابط الداخلية، وتُعاد دفعة-دفعة في المرحلة 5
 * ببوابات قياس (لا يُرشَّح أكثر مما يُفهرس فعلاً). إعادتها = استرجاع عدّاد
 * الشظايا في git history.
 *
 * طبقة كاش واحدة (Cache API على الحافة، 24 ساعة): الرد ثابت لا يتطلب D1.
 * ⚠️ بعد أي نشر يلمس هذا الملف: purge لكاش الحافة لمسار /sitemap* (الكاش يوم كامل).
 *
 * Any database failure → 503 XML (never an empty or partial index with 200).
 */
export async function GET(request: Request) {
  try {
    /* كاش الحافة أولاً — لا يوجد استعلام D1 في هذا المسار */
    const edgeHit = await sitemapCacheMatch(request)
    if (edgeHit) return edgeHit

    const locs: string[] = [
      `${SITEMAP_BASE_URL}/sitemap/static.xml`,
      `${SITEMAP_BASE_URL}/sitemap/priority.xml`,
    ]

    const response = xmlSuccessResponse(sitemapindexXml(locs), INDEX_CACHE_CONTROL)
    await sitemapCachePut(request, response)
    return response
  } catch (error) {
    return xmlUnavailableResponse(error)
  }
}
