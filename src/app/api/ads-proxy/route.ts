/**
 * بروكسي سكريبتات الإعلانات — يمرر السكريبت من نفس الدومين
 * عشان يتجاوز حجب الـ DNS / الإضافات اللي بتحجب دومينات الإعلانات المعروفة.
 * في الإنتاج على Cloudflare بيشتغل من نفس الدومين (same-origin).
 * ملاحظة: بدون runtime='edge' — OpenNext على Cloudflare يرفض edge runtime
 * داخل الدالة الرئيسية (Build كان بيفشل بـ "cannot use the edge runtime").
 */
const ALLOWED_HOSTS = [
  'www.highrevenueformat.com',
  'highrevenueformat.com',
  'al5sm.com',
  'www.al5sm.com',
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const target = searchParams.get('url')
  if (!target) return new Response('missing url', { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return new Response('bad url', { status: 400 })
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.includes(parsed.hostname)) {
    return new Response('host not allowed', { status: 403 })
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        'user-agent': req.headers.get('user-agent') || 'Mozilla/5.0',
        referer: 'https://4cima.com/',
      },
      cf: { cacheTtl: 300, cacheEverything: true },
    } as RequestInit)
    const body = await upstream.text()
    return new Response(body, {
      status: upstream.status,
      headers: {
        'content-type': 'application/javascript; charset=utf-8',
        'cache-control': 'public, max-age=300',
        'access-control-allow-origin': '*',
      },
    })
  } catch {
    return new Response('upstream error', { status: 502 })
  }
}
