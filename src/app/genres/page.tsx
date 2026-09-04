import { Metadata } from 'next'
import Link from 'next/link'
import { Film, Tv, Clapperboard } from 'lucide-react'
import { getGenresWithCounts } from '@/lib/genres'
import { getGenreColor } from '@/utils/genreColors'
import { AdFrame } from '@/components/features/system/AdsterraBanner'
import { MobileStickyAd } from '@/components/features/system/MobileStickyAd'
import { Footer } from '@/components/layout/Footer'
import { getAdByNum } from '@/data/ads/4cima.com'

const AD_HEADER = getAdByNum(1)! // 728×90
const AD_FOOTER_MID = getAdByNum(4)! // 468×60 — فاصل قبل الفوتر (موحّد مع باقي صفحات التصنيفات)

export const metadata: Metadata = {
  title: 'التصنيفات — تصفح الأفلام والمسلسلات حسب النوع | فور سيما',
  description:
    'استكشف جميع تصنيفات الأفلام والمسلسلات: أكشن، دراما، كوميديا، رعب، خيال علمي وأنواع أخرى — تصفح كل تصنيف مقسّم لأفلام ومسلسلات مترجمة بجودة عالية على 4cima.',
  keywords: [
    'تصنيفات الأفلام',
    'أنواع الأفلام',
    'تصنيفات المسلسلات',
    'أفلام أكشن',
    'أفلام دراما',
    'أفلام رعب',
    'أفلام كوميديا',
    'مسلسلات حسب التصنيف',
    'أفلام مترجمة حسب النوع',
    '4cima',
  ],
  alternates: { canonical: '/genres' },
  openGraph: {
    title: 'التصنيفات — تصفح الأفلام والمسلسلات حسب النوع | فور سيما',
    description:
      'استكشف جميع تصنيفات الأفلام والمسلسلات مقسّمة: أفلام ومسلسلات لكل نوع — أكشن، دراما، كوميديا، رعب وخيال علمي.',
    url: '/genres',
    siteName: '4cima',
    type: 'website',
    locale: 'ar_EG',
  },
}

// Uses direct DB query via shared function (genre_counts table, ~75ms)
export const dynamic = 'force-dynamic' // D1 not available at build time on CI

export default async function GenresPage() {
  const genres = (await getGenresWithCounts())
    // لا يُعرض أي تصنيف بلا أعمال (0 أفلام و0 مسلسلات)
    .filter((g: any) => g.total_count > 0)
    // الأكثر محتوى أولًا — الأكثر فائدة للزائر
    .sort((a: any, b: any) => b.total_count - a.total_count)

  const totalMovies = genres.reduce((s: number, g: any) => s + g.movie_count, 0)
  const totalSeries = genres.reduce((s: number, g: any) => s + g.series_count, 0)

  /* JSON-LD — CollectionPage + ItemList بكل التصنيفات وروابطها (SEO) */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'تصنيفات الأفلام والمسلسلات',
    description: 'استكشف جميع تصنيفات الأفلام والمسلسلات على 4cima',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: genres.length,
      itemListElement: genres.map((g: any, i: number) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: g.name_ar,
        url: `/genres/${g.slug}`,
      })),
    },
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* بنر الهيدر — 728×90 (بدون طلبات وسيطة) */}
      <div className="w-full flex justify-center px-3 sm:px-5 md:px-8 lg:px-12 py-3">
        <AdFrame ad={AD_HEADER} variant="x" />
      </div>

      <div className="mx-auto max-w-[1600px] px-3 sm:px-5 md:px-8 pb-16">

        {/* الترويسة السينمائية */}
        <header className="py-8 md:py-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-bold text-slate-400">
            <Clapperboard className="h-3.5 w-3.5 text-amber-400" />
            استكشف مكتبتنا
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight">
            <span className="bg-gradient-to-l from-red-400 via-amber-300 to-blue-400 bg-clip-text text-transparent">
              التصنيفات
            </span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            تصفح مكتبة ضخمة حسب النوع:{' '}
            <span className="font-bold text-red-400">أفلام</span> و{' '}
            <span className="font-bold text-blue-400">مسلسلات</span> مباشرة من الكارت
          </p>

          {/* شرائح الإحصائيات */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {[
              { label: 'تصنيف', value: genres.length, cls: 'text-amber-300 border-amber-500/20 bg-amber-500/5' },
              { label: 'فيلم', value: totalMovies, cls: 'text-red-400 border-red-500/20 bg-red-500/5' },
              { label: 'مسلسل', value: totalSeries, cls: 'text-blue-400 border-blue-500/20 bg-blue-500/5' },
            ].map((s) => (
              <div key={s.label} className={`flex items-center gap-2 rounded-xl border px-4 py-2 ${s.cls}`}>
                <span className="text-lg font-black tabular-nums">{s.value.toLocaleString('ar-EG')}</span>
                <span className="text-xs font-bold opacity-80">{s.label}</span>
              </div>
            ))}
          </div>
        </header>

        {/* شبكة كروت التصنيفات المنقسمة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
          {genres.map((genre: any) => {
            const c = getGenreColor(genre.name_ar || genre.name_en)
            const slug: string = genre.slug
            return (
              <div
                key={genre.id}
                className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 shadow-lg shadow-slate-950/50 transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-600 hover:shadow-2xl ${c.glow.replace(/^shadow-/, 'hover:shadow-')}`}
              >
                {/* شريط لون التصنيف + لمعة تمسح الكارت */}
                <div className={`absolute inset-x-0 top-0 h-[3px] ${c.bg} opacity-80`} />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -translate-x-[120%] bg-gradient-to-l from-transparent via-white/[0.05] to-transparent transition-transform duration-1000 ease-out group-hover:translate-x-[120%]"
                />
                {/* توهج لوني خفيف عند الـhover */}
                <div className={`pointer-events-none absolute inset-0 ${c.bg} opacity-0 transition-opacity duration-500 group-hover:opacity-[0.06]`} />

                {/* الجزء العلوي — نظرة عامة على التصنيف */}
                <Link
                  href={`/genres/${slug}`}
                  className="relative block px-5 pb-4 pt-5"
                  aria-label={`نظرة عامة على تصنيف ${genre.name_ar}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${c.bg} ${c.border} ${c.glow} shadow-md transition-transform duration-300 group-hover:scale-125`} />
                    <h2 className="text-xl font-black text-slate-100 transition-colors duration-300 group-hover:text-white">
                      {genre.name_ar}
                    </h2>
                  </div>
                  {genre.name_en && genre.name_en !== genre.name_ar && (
                    <p className="mt-1.5 pr-7 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {genre.name_en}
                    </p>
                  )}
                </Link>

                {/* الجزء السفلي — الزر المنقسم: أفلام | مسلسلات
                    (نصفه الفارغ لا يُعرض: تصنيفٌ بلا مسلسلات يُظهر زر أفلام بعرض كامل والعكس) */}
                <div className="relative grid grid-cols-2 border-t border-slate-800/80">
                  {genre.movie_count > 0 && (
                    <Link
                      href={`/movies/genres/${slug}`}
                      className={`group/m flex items-center justify-center gap-2 bg-inherit py-3.5 transition-colors duration-300 hover:bg-red-600/10 ${
                        genre.series_count > 0 ? '' : 'col-span-2'
                      }`}
                      aria-label={`أفلام ${genre.name_ar}`}
                    >
                      <Film className="h-4 w-4 text-red-400 transition-transform duration-300 group-hover/m:scale-110" />
                      <span className="text-sm font-bold text-slate-300 transition-colors duration-300 group-hover/m:text-red-300">أفلام</span>
                      <span className="text-sm font-black tabular-nums text-red-400">{genre.movie_count.toLocaleString('ar-EG')}</span>
                    </Link>
                  )}
                  {genre.series_count > 0 && (
                    <Link
                      href={`/series/genres/${slug}`}
                      className={`group/s flex items-center justify-center gap-2 transition-colors duration-300 hover:bg-blue-600/10 ${
                        genre.movie_count > 0 ? 'border-r border-slate-800/80' : 'col-span-2'
                      }`}
                      aria-label={`مسلسلات ${genre.name_ar}`}
                    >
                      <Tv className="h-4 w-4 text-blue-400 transition-transform duration-300 group-hover/s:scale-110" />
                      <span className="text-sm font-bold text-slate-300 transition-colors duration-300 group-hover/s:text-blue-300">مسلسلات</span>
                      <span className="text-sm font-black tabular-nums text-blue-400">{genre.series_count.toLocaleString('ar-EG')}</span>
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* إعلان 4 (468×60) — فاصل خفيف قبل الفوتر (نفس نظام صفحات الأقسام) */}
        <div className="flex justify-center px-4 py-2 mt-8">
          <AdFrame ad={AD_FOOTER_MID} variant="x" />
        </div>
      </div>

      <div className="pb-12"><Footer /></div>

      {/* شريط الموبايل الثابت — إعلان 6 (320×50) */}
      <MobileStickyAd />
    </div>
  )
}
