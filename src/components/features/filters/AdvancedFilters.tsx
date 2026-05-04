import React, { memo, useCallback, useRef, useState, useEffect } from 'react'
import { SlidersHorizontal, Undo2 } from 'lucide-react'

// 3D-style restore icon SVG
const RestoreIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="restoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="1" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    {/* Circular arrow path */}
    <path
      d="M4 12a8 8 0 0 1 14.93-4"
      stroke="url(#restoreGrad)"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
      filter="url(#glow)"
    />
    <path
      d="M20 12a8 8 0 0 1-14.93 4"
      stroke="url(#restoreGrad)"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
      filter="url(#glow)"
      opacity="0.7"
    />
    {/* Arrow heads */}
    <path
      d="M18.93 8l-2 2 2 2"
      stroke="url(#restoreGrad)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      filter="url(#glow)"
    />
    <path
      d="M5.07 16l2-2-2-2"
      stroke="url(#restoreGrad)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      filter="url(#glow)"
      opacity="0.7"
    />
    {/* Center highlight for 3D effect */}
    <circle cx="12" cy="12" r="2" fill="url(#restoreGrad)" opacity="0.5" filter="url(#glow)" />
  </svg>
)
import { logger } from '../../../lib/logger'
import type { ContentType } from '../../../types/unified-section'
import { useGenres } from '../../../hooks/useGenres'
import { trackFilterChange } from '../../../lib/filter-analytics'

interface AdvancedFiltersProps {
  contentType: ContentType
  genre?: string | null
  year?: number | string | null  // Support both number and string (for ranges)
  rating?: number | null
  language?: string | null
  onFilterChange: (key: string, value: string | number | null) => void
  onClearAll?: () => void
  lang: 'ar' | 'en'
}

// Generate year options with decade grouping
const generateYearOptions = (lang: 'ar' | 'en'): Array<{ value: string; label: string }> => {
  const currentYear = new Date().getFullYear()
  const yearOptions: Array<{ value: string; label: string }> = []

  // Add individual years from current year down to 2021
  for (let y = currentYear; y >= 2021; y--) {
    yearOptions.push({ value: String(y), label: String(y) })
  }

  // Add decade ranges
  yearOptions.push({ value: '2010-2020', label: '2010-2020' })
  yearOptions.push({
    value: '2000-2009',
    label: lang === 'ar' ? 'الألفينات (2000-2009)' : '2000s (2000-2009)'
  })
  yearOptions.push({
    value: '1990-1999',
    label: lang === 'ar' ? 'التسعينات (1990-1999)' : '1990s (1990-1999)'
  })
  yearOptions.push({
    value: '1980-1989',
    label: lang === 'ar' ? 'الثمانينات (1980-1989)' : '1980s (1980-1989)'
  })
  yearOptions.push({
    value: '1970-1979',
    label: lang === 'ar' ? 'السبعينات (1970-1979)' : '1970s (1970-1979)'
  })
  yearOptions.push({
    value: '1960-1969',
    label: lang === 'ar' ? 'الستينات (1960-1969)' : '1960s (1960-1969)'
  })
  yearOptions.push({
    value: '1950-1959',
    label: lang === 'ar' ? 'الخمسينات (1950-1959)' : '1950s (1950-1959)'
  })

  return yearOptions
}

const RATINGS = [
  { value: 9, labelAr: '9+ ممتاز', labelEn: '9+ Excellent' },
  { value: 8, labelAr: '8+ جيد جداً', labelEn: '8+ Very Good' },
  { value: 7, labelAr: '7+ جيد', labelEn: '7+ Good' },
  { value: 6, labelAr: '6+ مقبول', labelEn: '6+ Fair' },
]

const LANGUAGES = [
  { value: 'ar', labelAr: 'عربي', labelEn: 'Arabic' },
  { value: 'en', labelAr: 'إنجليزي', labelEn: 'English' },
  { value: 'ko', labelAr: 'كوري', labelEn: 'Korean' },
  { value: 'tr', labelAr: 'تركي', labelEn: 'Turkish' },
  { value: 'zh', labelAr: 'صيني', labelEn: 'Chinese' },
  { value: 'ja', labelAr: 'ياباني', labelEn: 'Japanese' },
  { value: 'hi', labelAr: 'هندي', labelEn: 'Hindi' },
  { value: 'es', labelAr: 'إسباني', labelEn: 'Spanish' },
  { value: 'fr', labelAr: 'فرنسي', labelEn: 'French' }
]

const GOLD = '#f5c518'

// Straight neon line from the dot next to the label down to the select top
const NeonConnector: React.FC<{ active: boolean }> = ({ active }) => {
  const color = active ? GOLD : 'rgba(255,255,255,0.12)'
  const glow = active ? `drop-shadow(0 0 3px ${GOLD}) drop-shadow(0 0 6px ${GOLD}80)` : 'none'
  return (
    <svg
      width="100%"
      height="20"
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
      style={{ display: 'block', filter: glow, transition: 'filter 0.3s' }}
    >
      {/* Straight vertical line on the right side (reversed) */}
      <line
        x1="88" y1="0"
        x2="88" y2="20"
        stroke={color}
        strokeWidth={active ? 1.5 : 1}
        strokeLinecap="round"
        style={{ transition: 'stroke 0.3s' }}
      />
      {active && (
        <circle cx="88" cy="20" r="2" fill={GOLD} style={{ filter: `drop-shadow(0 0 4px ${GOLD})` }} />
      )}
    </svg>
  )
}

interface FilterGroupProps {
  label: string
  isActive: boolean
  children: React.ReactNode
}

const FilterGroup: React.FC<FilterGroupProps> = ({ label, isActive, children }) => (
  <div className="flex flex-col w-full sm:w-auto" style={{ minWidth: 150 }}>
    {/* Label row */}
    <div className="flex items-center gap-1.5 px-1 h-6">
      <span
        className="text-xs font-medium transition-colors duration-300"
        style={{ color: isActive ? GOLD : '#9ca3af' }}
      >
        {label}
      </span>
      {isActive && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            background: GOLD,
            boxShadow: `0 0 5px ${GOLD}, 0 0 10px ${GOLD}80`,
          }}
        />
      )}
    </div>

    {/* Neon connector */}
    <NeonConnector active={isActive} />

    {/* Select */}
    {children}
  </div>
)

interface FiltersContentProps {
  contentType: ContentType
  genre?: string | null
  year?: number | string | null  // Support both number and string (for ranges)
  rating?: number | null
  language?: string | null
  lang: 'ar' | 'en'
  onChange: (key: string, value: string | number | null) => void
  onClearAll: () => void
  genres: { value: string; labelAr: string; labelEn: string }[]
  isLoading: boolean
}

const FiltersContent: React.FC<FiltersContentProps> = ({
  genre, year, rating, language, lang, onChange, onClearAll, genres, isLoading
}) => {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start">
      {/* Genre */}
      <FilterGroup label={lang === 'ar' ? 'التصنيف' : 'Genre'} isActive={!!genre}>
        <select
          id="filter-genre"
          aria-label={lang === 'ar' ? 'فلتر التصنيف' : 'Genre filter'}
          value={genre || ''}
          onChange={(e) => onChange('genre', e.target.value || null)}
          disabled={isLoading}
          className="px-3 py-2 rounded-lg bg-lumen-surface text-lumen-cream min-h-[44px] w-full focus:outline-none transition-all duration-300 text-sm"
          style={{
            border: `1px solid ${genre ? GOLD + 'aa' : 'rgba(255,255,255,0.1)'}`,
            boxShadow: genre ? `0 0 10px ${GOLD}20` : 'none',
          }}
        >
          <option value="">{lang === 'ar' ? 'كل التصنيفات' : 'All Genres'}</option>
          {isLoading
            ? <option disabled>{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</option>
            : genres.map((g) => (
              <option key={g.value} value={g.value}>
                {lang === 'ar' ? g.labelAr : g.labelEn}
              </option>
            ))
          }
        </select>
      </FilterGroup>

      {/* Year */}
      <FilterGroup label={lang === 'ar' ? 'السنة' : 'Year'} isActive={!!year}>
        <select
          id="filter-year"
          aria-label={lang === 'ar' ? 'فلتر السنة' : 'Year filter'}
          value={year || ''}
          onChange={(e) => onChange('year', e.target.value || null)}
          className="px-3 py-2 rounded-lg bg-lumen-surface text-lumen-cream min-h-[44px] w-full focus:outline-none transition-all duration-300 text-sm"
          style={{
            border: `1px solid ${year ? GOLD + 'aa' : 'rgba(255,255,255,0.1)'}`,
            boxShadow: year ? `0 0 10px ${GOLD}20` : 'none',
          }}
        >
          <option value="">{lang === 'ar' ? 'كل السنوات' : 'All Years'}</option>
          {generateYearOptions(lang).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FilterGroup>

      {/* Rating */}
      <FilterGroup label={lang === 'ar' ? 'التقييم' : 'Rating'} isActive={!!rating}>
        <select
          id="filter-rating"
          aria-label={lang === 'ar' ? 'فلتر التقييم' : 'Rating filter'}
          value={rating || ''}
          onChange={(e) => onChange('rating', e.target.value ? parseFloat(e.target.value) : null)}
          className="px-3 py-2 rounded-lg bg-lumen-surface text-lumen-cream min-h-[44px] w-full focus:outline-none transition-all duration-300 text-sm"
          style={{
            border: `1px solid ${rating ? GOLD + 'aa' : 'rgba(255,255,255,0.1)'}`,
            boxShadow: rating ? `0 0 10px ${GOLD}20` : 'none',
          }}
        >
          <option value="">{lang === 'ar' ? 'كل التقييمات' : 'All Ratings'}</option>
          {RATINGS.map((r) => (
            <option key={r.value} value={r.value}>
              {lang === 'ar' ? r.labelAr : r.labelEn}
            </option>
          ))}
        </select>
      </FilterGroup>

      {/* Language */}
      <FilterGroup label={lang === 'ar' ? 'اللغة' : 'Language'} isActive={!!language}>
        <select
          id="filter-language"
          aria-label={lang === 'ar' ? 'فلتر اللغة' : 'Language filter'}
          value={language || ''}
          onChange={(e) => onChange('language', e.target.value || null)}
          className="px-3 py-2 rounded-lg bg-lumen-surface text-lumen-cream min-h-[44px] w-full focus:outline-none transition-all duration-300 text-sm"
          style={{
            border: `1px solid ${language ? GOLD + 'aa' : 'rgba(255,255,255,0.1)'}`,
            boxShadow: language ? `0 0 10px ${GOLD}20` : 'none',
          }}
        >
          <option value="">{lang === 'ar' ? 'كل اللغات' : 'All Languages'}</option>
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {lang === 'ar' ? l.labelAr : l.labelEn}
            </option>
          ))}
        </select>
      </FilterGroup>

      {/* Clear all - Always visible */}
      <div className="flex items-end self-end pb-1">
        <button
          onClick={onClearAll}
          title={lang === 'ar' ? 'مسح كل الفلاتر' : 'Clear all filters'}
          aria-label={lang === 'ar' ? 'مسح كل الفلاتر' : 'Clear all filters'}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 hover:rotate-180"
          style={{
            background: 'rgba(14,165,233,0.1)',
            border: `1px solid rgba(14,165,233,0.6)`,
            color: '#0ea5e9',
          }}
        >
          <RestoreIcon size={18} />
        </button>
      </div>
    </div>
  )
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = memo(({
  contentType, genre, year, rating, onFilterChange, onClearAll, lang
}) => {
  const { genres, isLoading } = useGenres(contentType, lang)
  const [sheetOpen, setSheetOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback((key: string, value: string | number | null) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onFilterChange(key, value)
      logger.filterChange(contentType, key, value)
      trackFilterChange(contentType, key, value)
    }, 300)
  }, [onFilterChange, contentType])

  const handleClearAll = useCallback(() => {
    // Clear debounce timer if exists
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    // Reset select elements directly
    const genreSelect = document.getElementById('filter-genre') as HTMLSelectElement
    const yearSelect = document.getElementById('filter-year') as HTMLSelectElement
    const ratingSelect = document.getElementById('filter-rating') as HTMLSelectElement

    if (genreSelect) genreSelect.value = ''
    if (yearSelect) yearSelect.value = ''
    if (ratingSelect) ratingSelect.value = ''

    // Use parent's onClearAll if provided, otherwise call onFilterChange 3 times
    if (onClearAll) {
      onClearAll()
    } else {
      setTimeout(() => onFilterChange('genre', null), 0)
      setTimeout(() => onFilterChange('year', null), 10)
      setTimeout(() => onFilterChange('rating', null), 20)
    }
  }, [onFilterChange, onClearAll])

  useEffect(() => {
    if (sheetOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [sheetOpen])

  const hasActiveFilters = !!(genre || year || rating)

  return (
    <>
      {/* Desktop filters */}
      <div
        className="hidden sm:block mb-6"
        role="group"
        aria-label={lang === 'ar' ? 'فلاتر متقدمة' : 'Advanced filters'}
        data-advanced-filters
      >
        <FiltersContent
          contentType={contentType}
          genre={genre} year={year} rating={rating}
          lang={lang} onChange={handleChange} onClearAll={handleClearAll}
          genres={genres} isLoading={isLoading}
        />
      </div>

      {/* Mobile button */}
      <div className="sm:hidden mb-4 flex items-center gap-2">
        <button
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          aria-haspopup="dialog"
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-lumen-surface border border-lumen-muted text-lumen-cream min-h-[48px] hover:bg-lumen-muted transition-colors"
        >
          <SlidersHorizontal size={18} />
          <span className="text-sm font-medium">{lang === 'ar' ? 'الفلاتر' : 'Filters'}</span>
          {hasActiveFilters && (
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: GOLD, boxShadow: `0 0 6px ${GOLD}` }}
            />
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            title={lang === 'ar' ? 'مسح كل الفلاتر' : 'Clear all'}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:rotate-180"
            style={{
              background: 'rgba(14,165,233,0.1)',
              border: `1px solid rgba(14,165,233,0.6)`,
              color: '#0ea5e9'
            }}
          >
            <RestoreIcon size={18} />
          </button>
        )}
      </div>

      {/* Mobile sheet */}
      {sheetOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSheetOpen(false)} aria-hidden="true" />
          <div className="relative bg-lumen-surface rounded-t-3xl p-6 pb-8 max-h-[85vh]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-lumen-cream">{lang === 'ar' ? 'الفلاتر' : 'Filters'}</h2>
              <button onClick={() => setSheetOpen(false)} className="p-2 rounded-xl bg-lumen-muted text-lumen-cream min-h-[44px] min-w-[44px] flex items-center justify-center">
                <Undo2 size={20} />
              </button>
            </div>
            <FiltersContent
              contentType={contentType}
              genre={genre} year={year} rating={rating}
              lang={lang} onChange={handleChange} onClearAll={handleClearAll}
              genres={genres} isLoading={isLoading}
            />
            <button onClick={() => setSheetOpen(false)} className="mt-6 w-full py-3 rounded-xl bg-lumen-gold text-lumen-void font-bold min-h-[48px]">
              {lang === 'ar' ? 'تطبيق الفلاتر' : 'Apply Filters'}
            </button>
          </div>
        </div>
      )}
    </>
  )
})

AdvancedFilters.displayName = 'AdvancedFilters'
