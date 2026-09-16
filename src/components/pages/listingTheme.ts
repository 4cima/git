/* ============================================================
   نظام التصميم السينمائي الموحّد لصفحات القوائم
   (/movies • /series • /movies/genres/* • /series/genres/* • /movies/lang/* • /series/lang/*)
   الألوان: أحمر داكن فاخر (أفلام) + ذهبي داكن (مسلسلات) — بلا أحمر فاقع.
   كل زر نشط: حد خارجي أسود 1px + inner shadow علوي فاتح + inner سفلي غامق + توهج خارجي خافت بلون الزر.
   ============================================================ */

export type ListingAccent = 'movie' | 'series'

export const LISTING_ACCENT = {
  movie: {
    /** أدكن درجة (قاعدة الزر) */
    dark: '#7f1d1d',
    /** الدرجة الوسطى */
    mid: '#991b1b',
    /** أفتح درجة (قمة الزر والحدود) */
    light: '#b91c1c',
    /** توهج خارجي خافت */
    glow: 'rgba(185, 28, 28, 0.45)',
    /** نص فاتح ناعم فوق الخلفيات الداكنة (تباين عالٍ بلا بيضاء فاقعة) */
    softText: 'text-[#fca5a5]',
    /** خلفية ناعمة للشرائح/عناصر القوائم النشطة */
    softBg: 'bg-[#7f1d1d]/40',
    softBgHover: 'hover:bg-[#7f1d1d]/60',
    softBorder: 'border-[#b91c1c]/30',
  },
  series: {
    dark: '#78350f',
    mid: '#92400e',
    light: '#b45309',
    glow: 'rgba(180, 83, 9, 0.45)',
    softText: 'text-[#fcd34d]',
    softBg: 'bg-[#78350f]/40',
    softBgHover: 'hover:bg-[#78350f]/60',
    softBorder: 'border-[#b45309]/35',
  },
} as const

/* ---------- العنوان الكبير (H1) — نظام مسطّح أنيق بلا طبقات فوق النص ---------- */

/** مقاسات H1 الموحّدة لكل صفحات القوائم — Cairo صريح + سماكة قصوى + تباعد مريح */
export const LISTING_TITLE_TYPE =
  "font-['Cairo',sans-serif] text-4xl md:text-5xl font-black leading-[1.25] tracking-tight"

/**
 * توكنات H1 لكل قسم — نظام مسطّح (flat) بلا bg-clip-text وبلا أي طبقة فوق النص:
 * - title: لون النص النهائي (فاتح راقٍ للتباين فوق الداكن) — لا تدرّج، لا شفافية.
 * - underline: خط زخرفي سفلي صغير بلون القسم (راقٍ غير فاقع) — تحت النص لا فوقه.
 * - shadow: ظل نصي واحد ناعم (text-shadow بدون blur خلفي).
 * ملاحظة: لا توجد هنا أي glow/blur خلفي ولا highlightLayer — ممنوع أي span فوق النص.
 */
export const LISTING_TITLE_3D: Record<ListingAccent, { title: string; underline: string; shadow: string }> = {
  movie: {
    title: 'text-[#e8b4b8]',
    underline: 'from-[#b91c1c] to-[#7f1d1d]',
    shadow: '[text-shadow:0_1px_0_rgba(0,0,0,0.8),0_4px_14px_rgba(0,0,0,0.55)]',
  },
  series: {
    title: 'text-[#f3d08a]',
    underline: 'from-[#b45309] to-[#78350f]',
    shadow: '[text-shadow:0_1px_0_rgba(0,0,0,0.8),0_4px_14px_rgba(0,0,0,0.55)]',
  },
}

/** زر نشط بحواف 3D (وفق المواصفة 2.2): حد أسود خارجي + inner علوي فاتح + inner سفلي غامق + ظل خارجي بلون الزر */
export const activeBtnClasses = (accent: ListingAccent): string =>
  accent === 'movie'
    ? 'border border-black/80 bg-[linear-gradient(180deg,#b91c1c_0%,#991b1b_55%,#7f1d1d_100%)] text-red-50 shadow-[0_4px_12px_-2px_rgba(127,29,29,0.65),0_2px_6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-3px_8px_rgba(0,0,0,0.55)]'
    : 'border border-black/80 bg-[linear-gradient(180deg,#b45309_0%,#92400e_55%,#78350f_100%)] text-amber-50 shadow-[0_4px_12px_-2px_rgba(120,53,15,0.65),0_2px_6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.32),inset_0_-3px_8px_rgba(0,0,0,0.55)]'

/** زر غير نشط: زجاجي داكن محايد بلمعة علوية رقيقة */
export const LISTING_BTN_INACTIVE =
  'border border-white/[0.08] bg-black/30 text-zinc-400 hover:text-zinc-100 hover:bg-black/45 hover:border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300'
