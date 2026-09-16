/**
 * src/app/loading.tsx — (E-16) لم يكن هناك أي loading.tsx في المشروع كله.
 * Next يلفّ كل المسارات بهذا الـSuspense boundary التلقائي، فيظهر مؤشر تحميل
 * متسق مع الثيم الداكن بدل شاشة بيضاء أثناء تنقّل العميل.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[70vh] flex flex-col items-center justify-center gap-4 bg-slate-950 text-slate-100"
    >
      <div
        aria-hidden="true"
        className="h-10 w-10 rounded-full border-2 border-slate-700 border-t-[#b91c1c] animate-spin"
      />
      <p className="text-sm font-bold text-zinc-400">جارٍ التحميل…</p>
    </div>
  )
}