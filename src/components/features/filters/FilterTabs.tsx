import React, { memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ContentType } from '../../../types/unified-section'

interface Tab {
  id: string
  labelAr: string
  labelEn: string
  path: string
}

function getTabsForContentType(contentType: ContentType, basePath: string): Tab[] {
  const base: Tab[] = [
    { id: 'all', labelAr: 'الكل', labelEn: 'All', path: basePath },
    { id: 'trending', labelAr: 'الرائج', labelEn: 'Trending', path: `${basePath}/trending` },
    { id: 'top-rated', labelAr: 'الأعلى تقييماً', labelEn: 'Top Rated', path: `${basePath}/top-rated` },
    { id: 'latest', labelAr: 'الأحدث', labelEn: 'Latest', path: `${basePath}/latest` },
  ]

  // No "upcoming" tab - site only has released content
  switch (contentType) {
    case 'movies':
      return [
        ...base,
        { id: 'classics', labelAr: 'كلاسيكيات', labelEn: 'Classics', path: `${basePath}/classics` },
        { id: 'summaries', labelAr: 'ملخصات', labelEn: 'Summaries', path: `${basePath}/summaries` },
      ]
    case 'series':
      return [
        ...base,
        { id: 'classics', labelAr: 'كلاسيكيات', labelEn: 'Classics', path: `${basePath}/classics` },
        { id: 'summaries', labelAr: 'ملخصات', labelEn: 'Summaries', path: `${basePath}/summaries` },
        { id: 'ramadan', labelAr: 'رمضان', labelEn: 'Ramadan', path: `${basePath}/ramadan` },
      ]
    case 'anime':
      return [
        ...base,
        { id: 'animation_movies', labelAr: 'أفلام أنيمي', labelEn: 'Animation Movies', path: `${basePath}/animation-movies` },
        { id: 'cartoon_series', labelAr: 'مسلسلات كرتون', labelEn: 'Cartoon Series', path: `${basePath}/cartoon-series` },
      ]
    case 'gaming':
      // Gaming uses standard navigation tabs (All, Trending, Top Rated, Latest)
      // Platform filtering is done via UnifiedFilters component
      return base
    case 'software':
      // Software uses standard navigation tabs (All, Trending, Top Rated, Latest)
      // OS filtering is done via UnifiedFilters component
      return base
    default:
      return base
  }
}

interface FilterTabsProps {
  contentType: ContentType
  activeFilter: string
  lang: 'ar' | 'en'
  basePath?: string
}

export const FilterTabs: React.FC<FilterTabsProps> = memo(({
  contentType,
  activeFilter,
  lang,
  basePath,
}) => {
  const pathname = usePathname()
  const base = basePath || `/${contentType}`
  const tabs = getTabsForContentType(contentType, base)

  return (
    <nav
      aria-label={lang === 'ar' ? 'فلاتر المحتوى' : 'Content filters'}
      className="pt-24 pb-4"
      data-filter-tabs
    >
      <div className="flex items-center flex-wrap gap-2 snap-x snap-mandatory">
        {tabs.map((tab) => {
          const isActive = activeFilter === tab.id || pathname === tab.path
          return (
            <Link
              key={tab.id}
              href={tab.path}
              aria-current={isActive ? 'page' : undefined}
              className={`
                snap-start px-6 py-3 rounded-full font-semibold text-sm whitespace-nowrap
                transition-all duration-200 min-h-[44px] flex items-center relative
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-lumen-gold
                ${isActive
                  ? 'bg-lumen-gold text-lumen-void'
                  : 'bg-lumen-surface/50 text-lumen-cream hover:bg-lumen-surface'
                }
              `}
            >
              {lang === 'ar' ? tab.labelAr : tab.labelEn}
              {/* Neon dot indicator for active tab */}
              {isActive && (
                <span
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                  style={{
                    background: '#f5c518',
                    boxShadow: '0 0 8px #f5c518, 0 0 12px #f5c51880',
                  }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
})

FilterTabs.displayName = 'FilterTabs'
