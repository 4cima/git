'use client'

import Link from 'next/link'
import { Film, Tv, ChevronLeft } from 'lucide-react'
import { MovieCard } from '@/components/features/media/MovieCard'
import { getGenreColor } from '@/utils/genreColors'

interface GenreOverviewPageClientProps {
  genre: any
  slug: string
  topMovies: any[]
  topSeries: any[]
}

export function GenreOverviewPageClient({
  genre,
  slug,
  topMovies,
  topSeries
}: GenreOverviewPageClientProps) {
  const genreColorScheme = getGenreColor(genre.name_ar || genre.name_en)

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12">
      <div className="page-container">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-4 h-4 rounded-full ${genreColorScheme.bg} ${genreColorScheme.border} border-2 ${genreColorScheme.glow} shadow-xl`} />
            <h1 className={`text-4xl md:text-6xl font-black ${genreColorScheme.text} drop-shadow-lg`}>
              {genre.name_ar}
            </h1>
          </div>
          <p className="text-lg text-zinc-400">
            {genre.name_en && genre.name_en !== genre.name_ar && (
              <span>{genre.name_en} • </span>
            )}
            استكشف أفضل الأفلام والمسلسلات
          </p>
        </div>

        {/* Movies Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-100 flex items-center gap-3">
              <Film className="w-6 h-6 text-red-500" />
              أفلام {genre.name_ar}
            </h2>
            {topMovies.length > 0 && (
              <Link
                href={`/movies/genres/${slug}`}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-semibold transition-colors text-zinc-300 hover:text-white"
              >
                <span>شاهد كل الأفلام</span>
                <ChevronLeft className="w-4 h-4" />
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
            <div className="flex flex-col items-center justify-center h-64 text-center bg-zinc-900/20 rounded-xl border border-zinc-800/60">
              <Film className="w-12 h-12 text-zinc-700 mb-3" />
              <p className="text-zinc-400">لا توجد أفلام في هذا التصنيف</p>
            </div>
          )}
        </section>

        {/* Series Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-100 flex items-center gap-3">
              <Tv className="w-6 h-6 text-blue-500" />
              مسلسلات {genre.name_ar}
            </h2>
            {topSeries.length > 0 && (
              <Link
                href={`/series/genres/${slug}`}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-semibold transition-colors text-zinc-300 hover:text-white"
              >
                <span>شاهد كل المسلسلات</span>
                <ChevronLeft className="w-4 h-4" />
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
            <div className="flex flex-col items-center justify-center h-64 text-center bg-zinc-900/20 rounded-xl border border-zinc-800/60">
              <Tv className="w-12 h-12 text-zinc-700 mb-3" />
              <p className="text-zinc-400">لا توجد مسلسلات في هذا التصنيف</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
