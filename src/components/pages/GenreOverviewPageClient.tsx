'use client'

import Link from 'next/link'
import { Film, Tv, ChevronLeft, Sparkles } from 'lucide-react'
import { MovieCard } from '@/components/features/media/MovieCard'
import { getGenreColor } from '@/utils/genreColors'
import { AdFrame } from '@/components/features/system/AdsterraBanner'
import { MobileStickyAd } from '@/components/features/system/MobileStickyAd'
import { Footer } from '@/components/layout/Footer'
import { getAdByNum } from '@/data/ads/4cima.com'

/* ===== إعلانات صفحة النظرة العامة — أرقام موحّدة من src/data/ads/4cima.com (نفس نظام صفحات الأقسام) =====
   1: 728×90 هيدر | 4: 468×60 فاصل قبل الفوتر | 6: 320×50 شريط الموبايل الثابت (MobileStickyAd) */
const AD_HEADER = getAdByNum(1)! // 728×90
const AD_FOOTER_MID = getAdByNum(4)! // 468×60

interface GenreOverviewPageClientProps {
  genre: any
  slug: string
  topMovies: any[]
  topSeries: any[]
  /** رابط صفحة أفلام القسم (افتراضي: /movies/genres/{slug}) — تستخدمه صفحة /genres/arabic */
  moviesHref?: string
  /** رابط صفحة مسلسلات القسم (افتراضي: /series/genres/{slug}) */
  seriesHref?: string
}

export function GenreOverviewPageClient({
  genre,
  slug,
  topMovies,
  topSeries,
  moviesHref,
  seriesHref
}: GenreOverviewPageClientProps) {
  const moviesLink = moviesHref ?? `/movies/genres/${slug}`
  const seriesLink = seriesHref ?? `/series/genres/${slug}`
  const c = getGenreColor(genre.name_ar || genre.name_en)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-20 pb-12">
      <div className="page-container">
        {/* بنر 728×90 — نظام AdFrame (بدون طلبات وسيطة، لا CLS، يختفي بصمت عند الفشل) */}
        <div className="mb-6 flex justify-center">
          <AdFrame ad={AD_HEADER} variant="x" />
        </div>

        {/* مسار التنقل (SEO + UX) */}
        <nav aria-label="مسار التنقل" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <Link href="/" className="transition-colors hover:text-zinc-300">الرئيسية</Link>
          <span aria-hidden="true">/</span>
          <Link href="/genres" className="transition-colors hover:text-zinc-300">التصنيفات</Link>
          <span aria-hidden="true">/</span>
          <span className={`font-bold ${c.text}`}>{genre.name_ar}</span>
        </nav>

        {/* الترويسة البطولية */}
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
            <div className={`w-3.5 h-3.5 rounded-full ${c.bg} ${c.border} border-2 ${c.glow} shadow-xl`} />
            <h1 className={`text-4xl md:text-6xl font-black ${c.text} drop-shadow-lg`}>
              {genre.name_ar}
            </h1>
            {genre.name_en && genre.name_en !== genre.name_ar && (
              <span className="text-lg font-bold text-zinc-500">{genre.name_en}</span>
            )}
          </div>
          <p className="flex items-center gap-2 text-lg text-zinc-400">
            <Sparkles className="h-4 w-4 text-amber-400" />
            أفضل أفلام ومسلسلات {genre.name_ar} المترجمة — مختارة بعناية
          </p>

          {/* بوابتي القسم — نفس ثنائية هوية الموقع (أحمر/أزرق)
              البوابة التي لا محتوى لها لا تُعرض (لا صفحات فارغة) */}
          <div className={`mt-6 grid gap-4 ${topMovies.length > 0 && topSeries.length > 0 ? 'sm:grid-cols-2' : ''}`}>
            {topMovies.length > 0 && (
            <Link
              href={moviesLink}
              className="group relative overflow-hidden rounded-2xl border border-red-500/25 bg-gradient-to-l from-red-950/60 via-slate-900 to-slate-900 p-5 transition-all duration-300 hover:border-red-500/60 hover:shadow-lg hover:shadow-red-900/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-600/15 transition-transform duration-300 group-hover:scale-110">
                    <Film className="h-6 w-6 text-red-400" />
                  </span>
                  <div>
                    <div className="text-lg font-black text-slate-100 transition-colors group-hover:text-red-300">أفلام {genre.name_ar}</div>
                    <div className="text-sm text-zinc-500">{topMovies.length > 0 ? `مختارات الأعلى شهرة • ${topMovies.length}+ عمل` : 'تصفح كل الأفلام'}</div>
                  </div>
                </div>
                <ChevronLeft className="h-5 w-5 text-red-400 opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100" />
              </div>
            </Link>
            )}
            {topSeries.length > 0 && (
            <Link
              href={seriesLink}
              className="group relative overflow-hidden rounded-2xl border border-blue-500/25 bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900 p-5 transition-all duration-300 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-900/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/15 transition-transform duration-300 group-hover:scale-110">
                    <Tv className="h-6 w-6 text-blue-400" />
                  </span>
                  <div>
                    <div className="text-lg font-black text-slate-100 transition-colors group-hover:text-blue-300">مسلسلات {genre.name_ar}</div>
                    <div className="text-sm text-zinc-500">{topSeries.length > 0 ? `مختارات الأعلى شهرة • ${topSeries.length}+ عمل` : 'تصفح كل المسلسلات'}</div>
                  </div>
                </div>
                <ChevronLeft className="h-5 w-5 text-blue-400 opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100" />
              </div>
            </Link>
            )}
          </div>
        </header>

        {/* قسم الأفلام */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-zinc-100 md:text-3xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/30 bg-red-600/10">
                <Film className="h-5 w-5 text-red-400" />
              </span>
              أفلام {genre.name_ar}
            </h2>
            {topMovies.length > 0 && (
              <Link
                href={moviesLink}
                className="group flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-600/10 px-4 py-2 text-sm font-bold text-red-300 transition-all duration-300 hover:border-red-500/60 hover:bg-red-600/25"
              >
                <span>شاهد كل الأفلام</span>
                <ChevronLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
              </Link>
            )}
          </div>

          {topMovies.length > 0 ? (
            <div className="grid-responsive gap-4">
              {topMovies.map((movie: any, index: number) => (
                <MovieCard key={movie.id} movie={{...movie, media_type: 'movie'}} index={index} />
              ))}
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-zinc-800/60 bg-slate-900/30 text-center">
              <Film className="mb-3 h-12 w-12 text-zinc-700" />
              <p className="text-zinc-400">لا توجد أفلام في هذا التصنيف</p>
            </div>
          )}
        </section>

        {/* قسم المسلسلات */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-zinc-100 md:text-3xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/10">
                <Tv className="h-5 w-5 text-blue-400" />
              </span>
              مسلسلات {genre.name_ar}
            </h2>
            {topSeries.length > 0 && (
              <Link
                href={seriesLink}
                className="group flex items-center gap-2 rounded-xl border border-blue-500/25 bg-blue-600/10 px-4 py-2 text-sm font-bold text-blue-300 transition-all duration-300 hover:border-blue-500/60 hover:bg-blue-600/25"
              >
                <span>شاهد كل المسلسلات</span>
                <ChevronLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
              </Link>
            )}
          </div>

          {topSeries.length > 0 ? (
            <div className="grid-responsive gap-4">
              {topSeries.map((series: any, index: number) => (
                <MovieCard key={series.id} movie={{...series, media_type: 'tv'}} index={index} forceTv={true} />
              ))}
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-zinc-800/60 bg-slate-900/30 text-center">
              <Tv className="mb-3 h-12 w-12 text-zinc-700" />
              <p className="text-zinc-400">لا توجد مسلسلات في هذا التصنيف</p>
            </div>
          )}
        </section>

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
