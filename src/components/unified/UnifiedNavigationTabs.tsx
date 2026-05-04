/**
 * UnifiedNavigationTabs Component
 * 
 * Displays persistent navigation tabs for subsections across all content types.
 * Provides consistent navigation experience with accessibility support.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.2, 2.3, 2.4, 2.5, 2.6,
 *               5.2, 5.3, 5.4, 5.5, 6.2, 6.3, 6.4, 6.5, 13.1, 13.2
 */

'use client'

import Link from 'next/link'
import { useLang } from '../../state/useLang'
import type { ContentType, SubsectionDefinition } from '../../types/subsection'
import styles from './UnifiedNavigationTabs.module.css'

interface UnifiedNavigationTabsProps {
  /** Content type (movies, series, gaming, software) */
  contentType: ContentType
  
  /** Currently active tab ID */
  activeTab: string
  
  /** Array of subsection definitions */
  subsections: SubsectionDefinition[]
}

/**
 * UnifiedNavigationTabs Component
 * 
 * Renders navigation tabs for subsections with:
 * - Active tab highlighting
 * - Responsive horizontal scrolling
 * - Keyboard navigation support
 * - ARIA accessibility attributes
 * - Bilingual labels (Arabic/English)
 */
export function UnifiedNavigationTabs({
  contentType,
  activeTab,
  subsections
}: UnifiedNavigationTabsProps) {
  const { lang } = useLang()

  return (
    <nav
      className={styles.unifiedNavigationTabs}
      role="tablist"
      aria-label={lang === 'ar' ? 'أقسام المحتوى' : 'Content sections'}
      data-testid="navigation-tabs"
    >
      <div className={styles.tabsContainer}>
        {subsections.map((subsection) => {
          const isActive = subsection.id === activeTab
          const label = lang === 'ar' ? subsection.labelAr : subsection.labelEn

          return (
            <Link
              key={subsection.id}
              href={subsection.path}
              className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${contentType}-content-panel`}
              tabIndex={isActive ? 0 : -1}
              data-testid={`tab-${subsection.id}`}
            >
              {subsection.icon && (
                <span className={styles.tabIcon} aria-hidden="true">
                  {subsection.icon}
                </span>
              )}
              <span className={styles.tabLabel}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
