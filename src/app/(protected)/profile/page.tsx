import { Suspense } from 'react'

import ProfileClient from '@/components/profile/ProfileClient'

/**
 * src/app/(protected)/profile/page.tsx
 * صفحة البروفايل — الاستعادة عبر ?tab= تتطلب Suspense حول مكون useSearchParams.
 * الحماية (تسجيل الدخول) تأتي من src/app/(protected)/layout.tsx،
 * والـmetadata (noindex) من src/app/(protected)/profile/layout.tsx.
 */
function ProfileFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-800 border-t-amber-500" />
        <p className="text-sm text-zinc-400">جاري التحميل...</p>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileFallback />}>
      <ProfileClient />
    </Suspense>
  )
}
