import Link from 'next/link'

/**
 * شريط ترقيم قابل للزحف لصفحات القوائم — روابط <a> حقيقية في الـSSR
 * (جوجل لا يرى أي شيء تُولّده JS فقط). يُمرَّر كبيانات ساكنة من الـServer:
 * basePath بلا شرطة مائلة نهائية، والصفحة 1 تُخدم على المسار الأصلي نفسه
 * والصفحات 2..N على `${basePath}/page/${p}` (مسارات ثابتة ISR — لا searchParams).
 */
export interface StaticPagination {
  current: number
  totalPages: number
  basePath: string
}

export function paginationHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}/page/${page}`
}

export function ListingPagination({ current, totalPages, basePath }: StaticPagination) {
  if (totalPages <= 1) return null

  /* نافذة أرقام حول الصفحة الحالية: 1 … (c-1, c, c+1) … N */
  const pages: (number | '…')[] = []
  const push = (p: number | '…') => pages.push(p)
  push(1)
  const start = Math.max(2, current - 1)
  const end = Math.min(totalPages - 1, current + 1)
  if (start > 2) push('…')
  for (let p = start; p <= end; p++) push(p)
  if (end < totalPages - 1) push('…')
  if (totalPages > 1) push(totalPages)

  const linkCls =
    'flex h-9 min-w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 text-sm font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white'
  const activeCls =
    'flex h-9 min-w-9 items-center justify-center rounded-lg border border-red-500/40 bg-red-600/20 px-2 text-sm font-black text-red-400'
  const labelCls =
    'flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white'

  return (
    <nav
      aria-label="تصفح الصفحات"
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
      dir="rtl"
    >
      {current > 1 && (
        <Link href={paginationHref(basePath, current - 1)} className={labelCls} rel="prev">
          السابق
        </Link>
      )}
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`dots-${i}`} className="px-1 text-sm text-zinc-500">
            …
          </span>
        ) : p === current ? (
          <span key={p} aria-current="page" className={activeCls}>
            {p}
          </span>
        ) : (
          <Link key={p} href={paginationHref(basePath, p)} className={linkCls}>
            {p}
          </Link>
        )
      )}
      {current < totalPages && (
        <Link href={paginationHref(basePath, current + 1)} className={labelCls} rel="next">
          التالي
        </Link>
      )}
    </nav>
  )
}
