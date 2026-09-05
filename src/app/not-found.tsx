import type { Metadata } from 'next'
import Link from 'next/link'

// تُغلب robots القادمة من layout (index,follow) — صفحات 404 لا تُفهرس ولا تُتابع
export const metadata: Metadata = {
  title: 'الصفحة غير موجودة',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div
      dir="rtl"
      className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 bg-black text-white"
    >
      <p className="text-6xl md:text-8xl font-black text-cyan-400/90 mb-4" aria-hidden>
        404
      </p>
      <h1 className="text-2xl md:text-3xl font-bold mb-3">الصفحة غير موجودة</h1>
      <p className="text-slate-400 mb-8 max-w-md leading-relaxed">
        عذراً، الصفحة أو العمل الذي تبحث عنه غير موجود أو تم حذفه أو نقل رابطه.
        يمكنك البحث من الأعلى أو استخدام الروابط أدناه.
      </p>
      <nav className="flex flex-wrap items-center justify-center gap-3" aria-label="روابط بديلة">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 font-semibold transition-colors"
        >
          الرئيسية
        </Link>
        <Link
          href="/movies"
          className="px-5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/40 text-red-300 hover:bg-red-500/20 font-semibold transition-colors"
        >
          الأفلام
        </Link>
        <Link
          href="/series"
          className="px-5 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/40 text-blue-300 hover:bg-blue-500/20 font-semibold transition-colors"
        >
          المسلسلات
        </Link>
      </nav>
    </div>
  )
}
