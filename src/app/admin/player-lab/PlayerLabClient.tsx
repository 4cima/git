'use client'

import Link from 'next/link'

export default function PlayerLabClient() {
  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
      <div className="max-w-md space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <h1 className="text-xl font-black">هذا الرابط اتقفل بسبب تحذير أمان</h1>
        <p className="text-sm text-zinc-400">لا مشغّل. لا أزرار.</p>
        <Link
          href="/admin/player-test"
          className="inline-block rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold hover:bg-cyan-500"
        >
          الانتقال إلى معمل السيرفرات الجديد
        </Link>
      </div>
    </div>
  )
}