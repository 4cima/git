'use client'

import { useEffect, type ReactNode } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import {
  activeBtnClasses,
  LISTING_ACCENT,
  LISTING_BTN_INACTIVE,
  type ListingAccent,
} from './listingTheme'

/* ============================================================
   CinematicFilterBar — بار الفلاتر السينمائي الموحّد
   غلاف زجاجي داكن (backdrop-blur + حدود رقيقة + توهج خافت بلون القسم)
   يحوي: البحث + الترتيب (أزرار ظاهرة مباشرة) + الفلاتر (قوائم منسدلة)
   RTL + Cairo (الخط عام في الموقع) + داكن — موحّد للست صفحات.
   ============================================================ */

interface CinematicFilterBarProps {
  accent: ListingAccent
  children: ReactNode
  className?: string
}

export function CinematicFilterBar({ accent, children, className = '' }: CinematicFilterBarProps) {
  const glowColor = accent === 'movie' ? 'bg-[#b91c1c]' : 'bg-[#b45309]'
  return (
    <div
      className={`relative z-30 rounded-2xl border border-white/[0.08] bg-slate-900/70 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md ${className}`}
    >
      {/* الطبقات الزخرفية داخل غلاف مقصوص خاص بها — بلا overflow-hidden على الحاوية نفسها
          حتى لا تُقص القوائم المنسدلة المفتوحة (كان السبب في «اختفاء» المنسدلة) */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        {/* لمعة علوية رقيقة */}
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-white/25 to-transparent" />
        {/* توهج خافت بلون القسم */}
        <span className={`absolute -top-20 right-1/4 h-40 w-72 rounded-full ${glowColor} opacity-[0.12] blur-3xl`} />
      </span>
      {/* صف المحتوى: البحث أولاً على الجوال، والفلاتر بجانبه على الشاشات الأكبر */}
      <div className="relative flex flex-col md:flex-row items-stretch md:items-center gap-4 p-4">
        {children}
      </div>
    </div>
  )
}

/* ---------- قائمة منسدلة سينمائية (يُتحكم فيها من الصفحة كما سابقًا) ---------- */

export interface CinematicOption {
  value: string
  label: string
}

interface CinematicDropdownProps {
  open: boolean
  onToggle: () => void
  currentLabel: string
  ariaLabel: string
  accent: ListingAccent
  options: CinematicOption[]
  isSelected: (value: string) => boolean
  onSelect: (value: string) => void
  minWidth?: string
}

export function CinematicDropdown({
  open,
  onToggle,
  currentLabel,
  ariaLabel,
  accent,
  options,
  isSelected,
  onSelect,
  minWidth = 'min-w-[120px]',
}: CinematicDropdownProps) {
  const a = LISTING_ACCENT[accent]
  const focusBorder = accent === 'movie' ? 'focus:border-[#b91c1c]' : 'focus:border-[#b45309]'

  /* Escape يغلق القائمة — يُسجَّل فقط وهي مفتوحة */
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onToggle()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onToggle])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`bg-black/40 border border-white/15 rounded-xl px-2.5 py-2 text-zinc-100 text-sm ${focusBorder} focus:outline-none flex items-center gap-2 ${minWidth} justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] hover:border-white/30 hover:bg-black/55 transition-all duration-300`}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{currentLabel}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          {/* حاجب شفاف بملء الشاشة تحت اللوحة مباشرة: أي نقرة في أي مكان خارج اللوحة
              (خارج البار، على الكروت، على الإعلانات...) تُغلق القائمة فوراً وبموثوقية —
              بلا سباق مع أي مستمع mousedown على document، لأن اللوحة نفسها z-50 فوقه z-40 */}
          <div aria-hidden="true" className="fixed inset-0 z-40" onClick={onToggle} />
          <div
            className="absolute top-full left-0 mt-2 z-50 min-w-full max-h-[255px] overflow-y-scroll overflow-x-hidden custom-scrollbar overscroll-contain rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-md shadow-2xl"
            role="listbox"
          >
            {options.map(o => (
              <button
                type="button"
                key={o.value}
                onClick={() => onSelect(o.value)}
                className={`w-full text-right px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                  isSelected(o.value) ? `${a.softBg} ${a.softText}` : 'text-zinc-100 hover:bg-white/[0.06]'
                }`}
                role="option"
                aria-selected={isSelected(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ---------- مجموعة الترتيب: أزرار ظاهرة مباشرة (مش dropdown) ---------- */

export interface CinematicSortOption {
  value: string
  order: string
  label: string
  icon: string
}

interface CinematicSortGroupProps {
  accent: ListingAccent
  options: CinematicSortOption[]
  value: string
  order: string
  onChange: (value: string, order: string) => void
  className?: string
}

export function CinematicSortGroup({ accent, options, value, order, onChange, className = '' }: CinematicSortGroupProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {options.map((o, idx) => {
        const active = o.value === value && o.order === order
        return (
          <button
            key={`${o.value}-${o.order}-${idx}`}
            onClick={() => onChange(o.value, o.order)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 hover:-translate-y-0.5 ${
              active ? activeBtnClasses(accent) : LISTING_BTN_INACTIVE
            }`}
            aria-label={`ترتيب حسب ${o.label}`}
            aria-pressed={active}
          >
            {o.icon} {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- حقل البحث السينمائي ---------- */

interface CinematicSearchProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  ariaLabel: string
  accent: ListingAccent
}

export function CinematicSearch({ id, value, onChange, placeholder, ariaLabel, accent }: CinematicSearchProps) {
  const focusRing =
    accent === 'movie'
      ? 'focus:border-[#b91c1c] focus:ring-2 focus:ring-[#b91c1c]/40'
      : 'focus:border-[#b45309] focus:ring-2 focus:ring-[#b45309]/40'
  return (
    <div className="relative flex-1 order-1 md:order-2">
      <input
        type="text"
        id={id}
        name="search"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pr-10 text-zinc-100 placeholder-zinc-500 focus:outline-none ${focusRing} text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300`}
        aria-label={ariaLabel}
      />
      <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5" />
    </div>
  )
}
