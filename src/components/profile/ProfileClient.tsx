'use client'

/**
 * src/components/profile/ProfileClient.tsx
 * الهيكل الرئيسي لصفحة البروفايل:
 * - هيدر (أفاتار/اسم/بريد/انضمام/خروج) + 5 أقسام
 * - التبويب النشط من ?tab= — التلوين فوري (setState) ثم تحديث الرابط بلا scroll
 * - sidebar عمودي على الديسكتوب، tabs أفقية sticky على الموبايل
 */
import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ProfileHeader } from './ProfileHeader'
import { ProfileTabsDesktop, ProfileTabsMobile, TAB_DEFS } from './ProfileTabs'
import type { TabKey } from './types'
import { OverviewTab } from './tabs/OverviewTab'
import { FavoritesTab } from './tabs/FavoritesTab'
import { HistoryTab } from './tabs/HistoryTab'
import { ReviewsTab } from './tabs/ReviewsTab'
import { SettingsTab } from './tabs/SettingsTab'

const VALID_TABS = TAB_DEFS.map((t) => t.key)

function parseTab(v: string | null): TabKey {
  return VALID_TABS.includes(v as TabKey) ? (v as TabKey) : 'overview'
}

export default function ProfileClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  // الحالة الأولى من الرابط مباشرة (يدعم /profile?tab=favorites)
  const [tab, setTab] = useState<TabKey>(() => parseTab(searchParams.get('tab')))

  // مزامنة زر الرجوع/التقدم في المتصفح مع ?tab=
  useEffect(() => {
    const fromUrl = parseTab(searchParams.get('tab'))
    setTab((current) => (current === fromUrl ? current : fromUrl))
  }, [searchParams])

  /** تبويب نشط فوري: setState أولاً (تلوين في نفس اللحظة) ثم ?tab= بلا scroll ولا reload */
  const selectTab = useCallback(
    (next: TabKey) => {
      setTab(next)
      router.replace(next === 'overview' ? '/profile' : `/profile?tab=${next}`, { scroll: false })
    },
    [router]
  )

  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-hidden px-4 pb-16 pt-6 md:pt-10">
      <ProfileHeader />

      {/* موبايل: tabs أفقية sticky */}
      <div className="mt-4">
        <ProfileTabsMobile active={tab} onSelect={selectTab} />
      </div>

      <div className="mt-4 flex items-start gap-6">
        {/* ديسكتوب: sidebar عمودي */}
        <ProfileTabsDesktop active={tab} onSelect={selectTab} />

        <main className="min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
            >
              {tab === 'overview' && <OverviewTab />}
              {tab === 'favorites' && <FavoritesTab />}
              {tab === 'history' && <HistoryTab />}
              {tab === 'reviews' && <ReviewsTab />}
              {tab === 'settings' && <SettingsTab />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
