'use client'

/**
 * src/app/error.tsx — (E-16) لم يكن هناك أي error.tsx في المشروع كله، فأي خطأ
 * في عرض سيرفري كان يعطي شاشة Next الافتراضية (إنجليزية/بلا هوية الموقع).
 * هذا الحد يحتفظ بهوية 4cima ويعطي زر إعادة محاولة حقيقي (reset).
 */
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route error boundary:', error)
  }, [error])

  return (
    <div
      dir="rtl"
      className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-6 text-center bg-slate-950 text-slate-100"
    >
      <h2 className="text-2xl font-black text-white">حدث خطأ غير متوقع</h2>
      <p className="max-w-md text-sm text-zinc-400">
        تعذّر إكمال الطلب. جرّب إعادة المحاولة، وإن تكرر الخطأ فحدّث الصفحة بعد قليل.
      </p>
      {error?.digest && (
        <p className="text-[11px] text-zinc-600" dir="ltr">
          Ref: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="px-8 py-3 bg-black/40 hover:bg-black/60 border border-[#b91c1c]/40 hover:border-[#b91c1c]/70 rounded-xl text-sm font-bold text-red-400 hover:text-red-300 transition-colors"
      >
        إعادة المحاولة
      </button>
    </div>
  )
}