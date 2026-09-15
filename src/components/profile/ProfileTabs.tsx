'use client'

/**
 * src/components/profile/ProfileTabs.tsx
 * تنقّل أقسام البروفايل الخمسة:
 * - ديسكتوب (md+): sidebar عمودي
 * - موبايل: tabs أفقية sticky
 * - التبويب النشط: خلفية ذهبية + نص داكن غامق — التلوين فوري عبر onSelect (state متزامن)
 */
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { Heart, History, LayoutDashboard, Settings, Star } from 'lucide-react'
import type { TabKey } from './types'

export interface TabDef {
  key: TabKey
  label: string
  icon: LucideIcon
}

export const TAB_DEFS: TabDef[] = [
  { key: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { key: 'favorites', label: 'المفضلة', icon: Heart },
  { key: 'history', label: 'سجل المشاهدة', icon: History },
  { key: 'reviews', label: 'التقييمات', icon: Star },
  { key: 'settings', label: 'الإعدادات', icon: Settings },
]

interface ProfileTabsProps {
  active: TabKey
  onSelect: (tab: TabKey) => void
}

/** شارة النشط المشتركة — ذهبي صريح + نص غامق داكن (تباين عالٍ) */
function TabButton({
  tab,
  active,
  onSelect,
  fullWidth,
}: {
  tab: TabDef
  active: boolean
  onSelect: (k: TabKey) => void
  fullWidth?: boolean
}) {
  const Icon = tab.icon
  return (
    <button
      type="button"
      onClick={() => onSelect(tab.key)}
      aria-current={active ? 'page' : undefined}
      className={[
        'relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors duration-150',
        fullWidth ? 'w-full justify-start' : 'justify-center',
        active
          ? 'bg-amber-500 font-extrabold text-zinc-950 shadow-lg shadow-amber-500/25'
          : 'font-semibold text-zinc-400 hover:bg-white/5 hover:text-zinc-100',
      ].join(' ')}
    >
      <Icon className={`h-4 w-4 ${active ? 'text-zinc-950' : 'text-amber-500/80'}`} />
      <span className="whitespace-nowrap">{tab.label}</span>
      {active && (
        <motion.span
          layoutId={fullWidth ? 'tab-underline-sidebar' : 'tab-underline-mobile'}
          className={`bg-amber-300/70 ${fullWidth ? 'absolute inset-y-2 right-0 w-1 rounded-full' : 'absolute inset-x-4 -bottom-px h-0.5 rounded-full'}`}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}
    </button>
  )
}

export function ProfileTabsDesktop({ active, onSelect }: ProfileTabsProps) {
  return (
    <aside className="hidden md:block">
      <nav
        aria-label="أقسام البروفايل"
        className="sticky top-24 flex flex-col gap-1 rounded-2xl border border-white/5 bg-zinc-900/60 p-2"
      >
        {TAB_DEFS.map((tab) => (
          <TabButton key={tab.key} tab={tab} active={active === tab.key} onSelect={onSelect} fullWidth />
        ))}
      </nav>
    </aside>
  )
}

export function ProfileTabsMobile({ active, onSelect }: ProfileTabsProps) {
  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-white/5 bg-zinc-950/90 px-4 py-2 backdrop-blur md:hidden">
      <nav aria-label="أقسام البروفايل" className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TAB_DEFS.map((tab) => (
          <TabButton key={tab.key} tab={tab} active={active === tab.key} onSelect={onSelect} />
        ))}
      </nav>
    </div>
  )
}
