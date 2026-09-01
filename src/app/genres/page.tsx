import { Metadata } from 'next'
import Link from 'next/link'
import { Film, Tv } from 'lucide-react'
import { getGenreColor } from '@/utils/genreColors'
import { getGenresWithCounts } from '@/lib/genres'
import { AdsManager } from '@/components/features/system/AdsManager'

export const metadata: Metadata = {
  title: 'التصنيفات | فور سيما',
  description: 'تصفح جميع التصنيفات - أفلام ومسلسلات'
}

// Now safe for static generation - uses direct DB query via shared function
// Fast query on genre_counts table (JOIN on primary key, ~75ms)
export const dynamic = 'force-dynamic' // D1 not available at build time on CI

export default async function GenresPage() {
  const genres = await getGenresWithCounts()
  
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="page-container py-12">
        {/* Ad banner under the header (global-header) */}
        <div className="mb-6 flex justify-center">
          <AdsManager type="banner" position="global-header" />
        </div>

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
            🎬 التصنيفات
          </h1>
          <p className="text-lg text-zinc-400">
            اكتشف آلاف الأفلام والمسلسلات حسب نوعك المفضل
          </p>
        </div>

        {/* Genres Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {genres.map((genre: any) => {
            const genreColorScheme = getGenreColor(genre.name_ar || genre.name_en)
            
            return (
              <Link
                key={genre.id}
                href={`/genres/${genre.slug}`}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 hover:border-cyan-500/50 transition-all duration-300 hover:scale-105"
              >
                <div className="p-6">
                  {/* Genre Name with Color */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-3 h-3 rounded-full ${genreColorScheme.bg} ${genreColorScheme.border} border-2 ${genreColorScheme.glow} shadow-lg`} />
                    <h2 className={`text-2xl font-bold ${genreColorScheme.text} group-hover:brightness-125 transition-all`}>
                      {genre.name_ar}
                    </h2>
                  </div>
                  
                  {/* Counts */}
                  <div className="space-y-2 text-sm">
                    {genre.movie_count > 0 && (
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="flex items-center gap-2">
                          <Film size={16} className="text-red-400" />
                          أفلام
                        </span>
                        <span className="font-bold text-white">
                          {genre.movie_count.toLocaleString('ar-EG')}
                        </span>
                      </div>
                    )}
                    
                    {genre.series_count > 0 && (
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="flex items-center gap-2">
                          <Tv size={16} className="text-blue-400" />
                          مسلسلات
                        </span>
                        <span className="font-bold text-white">
                          {genre.series_count.toLocaleString('ar-EG')}
                        </span>
                      </div>
                    )}
                    
                    <div className="pt-2 mt-2 border-t border-zinc-800">
                      <div className="flex items-center justify-between font-bold">
                        <span className={genreColorScheme.text}>الإجمالي</span>
                        <span className={genreColorScheme.text}>
                          {genre.total_count?.toLocaleString('ar-EG') || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Hover Effect with Genre Color */}
                <div className={`absolute inset-0 ${genreColorScheme.bg} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
