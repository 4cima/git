'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import {
  LISTING_ACCENT,
  LISTING_TITLE_3D,
  LISTING_TITLE_TYPE,
  type ListingAccent,
} from './listingTheme'

/* ============================================================
   ListingPageHeader — الهيدر الموحّد لكل صفحات القوائم
   (Breadcrumb مرئي + H1 كبير + وصف + أزرار تنقّل اختيارية)
   يوضع داخل عمود المحتوى الرئيسي (يمين الصفحة في RTL) — نفس موضع هيدر صفحات التصنيفات بالظبط،
   والإعلان الجانبي 300×250 يجاوره في نفس الـgrid.
   ============================================================ */

export interface ListingBreadcrumbSegment {
  label: string
  href?: string
}

interface ListingPageHeaderProps {
  /** movie = أفلام (نقطة/لمسات حمراء داكنة) | series = مسلسلات (ذهبي داكن) */
  variant: ListingAccent
  title: string
  description: string
  breadcrumb: ListingBreadcrumbSegment[]
  /** أزرار تنقّل سريع (اختيارية) */
  actions?: ReactNode
}

export function ListingPageHeader({ variant, title, description, breadcrumb, actions }: ListingPageHeaderProps) {
  const accent = LISTING_ACCENT[variant]
  const title3d = LISTING_TITLE_3D[variant]
  const last = breadcrumb.length - 1

  return (
    <div>
      {/* مسار التنقل */}
      <nav aria-label="مسار التنقل" className="mb-3 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
        {breadcrumb.map((seg, i) => (
          <Fragment key={`${seg.label}-${i}`}>
            {i > 0 && <span aria-hidden="true">/</span>}
            {seg.href && i !== last ? (
              <Link href={seg.href} className="transition-colors hover:text-zinc-300">{seg.label}</Link>
            ) : (
              <span className={`font-bold ${i === last ? accent.softText : 'text-zinc-300'}`}>{seg.label}</span>
            )}
          </Fragment>
        ))}
      </nav>

      {/* العنوان — H1 مسطّح أنيق: لون صلب فاتح راقٍ + ظل نصي ناعم + خط سفلي زخرفي.
          بلا bg-clip-text، بلا blur، بلا أي span فوق النص — لا يوجد أي عنصر مطلق هنا. */}
      <div className="mb-2 flex items-center gap-3">
        {/* شريط عمودي رفيع بلون القسم — عنصر شقيق بجانب النص (في تدفق RTL)، لا فوقه */}
        <span
          aria-hidden="true"
          className={`h-9 w-1.5 shrink-0 self-center rounded-full bg-gradient-to-b md:h-12 ${title3d.underline}`}
        />
        <div className="min-w-0">
          <h1 className={`listing-title-in ${LISTING_TITLE_TYPE} ${title3d.title} ${title3d.shadow}`}>
            {title}
          </h1>
          {/* خط سفلي زخرفي قصير تحت النص — عرض ثابت صغير لا يتمدد فوق المحتوى */}
          <span
            aria-hidden="true"
            className={`mt-2 block h-[3px] w-24 rounded-full bg-gradient-to-l ${title3d.underline}`}
          />
        </div>
      </div>

      {/* الوصف */}
      <p className="mb-3 text-lg text-zinc-400">{description}</p>

      {/* أزرار التنقّل السريع */}
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}

/* ---------- زر تنقّل سريع داخل الهيدر (نفس نمط صفحات التصنيفات) ---------- */

interface HeaderLinkButtonProps {
  href: string
  children: ReactNode
  /** neutral = زجاجي محايد | movie = أحمر داكن | series = ذهبي داكن */
  accent?: ListingAccent | 'neutral'
  chevron?: boolean
}

export function HeaderLinkButton({ href, children, accent = 'neutral', chevron }: HeaderLinkButtonProps) {
  const cls =
    accent === 'movie'
      ? 'border-[#b91c1c]/35 bg-[#7f1d1d]/20 text-[#fca5a5] hover:border-[#b91c1c]/70 hover:bg-[#7f1d1d]/35'
      : accent === 'series'
        ? 'border-[#b45309]/35 bg-[#78350f]/20 text-[#fcd34d] hover:border-[#b45309]/70 hover:bg-[#78350f]/35'
        : 'border-white/10 bg-black/30 text-zinc-300 hover:border-white/25 hover:bg-black/45 hover:text-white'
  return (
    <Link
      href={href}
      className={`group flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-all duration-300 ${cls}`}
    >
      <span>{children}</span>
      {chevron && <ChevronLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />}
    </Link>
  )
}
