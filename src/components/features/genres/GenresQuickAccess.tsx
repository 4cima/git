import Link from 'next/link'
import { Film, Tv, Sparkles } from 'lucide-react'

interface Genre {
  id: number
  slug: string
  name_ar: string
  name_en: string
  movie_count: number
  series_count: number
  total_count: number
}

interface GenresQuickAccessProps {
  genres: Genre[]
}

const GENRE_GRADIENTS: Record<string, string> = {
  action: 'from-red-500/20 to-orange-500/20',
  comedy: 'from-yellow-500/20 to-amber-500/20',
  drama: 'from-blue-500/20 to-purple-500/20',
  horror: 'from-red-900/20 to-black/20',
  thriller: 'from-purple-900/20 to-red-900/20',
  romance: 'from-pink-500/20 to-rose-500/20',
  'sci-fi': 'from-cyan-500/20 to-blue-500/20',
  fantasy: 'from-purple-500/20 to-pink-500/20',
  animation: 'from-green-500/20 to-teal-500/20',
  crime: 'from-zinc-700/20 to-zinc-900/20',
  mystery: 'from-indigo-500/20 to-purple-500/20',
  documentary: 'from-emerald-500/20 to-green-500/20',
}

export function GenresQuickAccess({ genres }: GenresQuickAccessProps) {
  if (!genres || genres.length === 0) return null

  return (
    <section className="py-12 relative">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg">
            <Sparkles className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              التصنيفات الشائعة
            </h2>
            <p className="text-sm text-zinc-500">اكتشف محتوى حسب نوعك المفضل</p>
          </div>
        </div>
        
        <Link
          href="/genres"
          className="hidden md:flex items-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors group"
        >
          <span>عرض الكل</span>
          <span className="text-cyan-400 group-hover:translate-x-1 transition-transform">←</span>
        </Link>
      </div>

      {/* Genres Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {genres.slice(0, 12).map((genre) => (
          <Link
            key={genre.id}
            href={`/genres/${genre.slug}`}
            className="group relative overflow-hidden rounded-xl bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 hover:border-cyan-500/50 transition-all duration-300 hover:scale-105"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${GENRE_GRADIENTS[genre.slug] || 'from-zinc-800/20 to-zinc-900/20'} opacity-50 group-hover:opacity-100 transition-opacity`} />
            
            <div className="relative p-4">
              {/* Genre Name */}
              <h3 className="text-lg font-bold mb-3 text-white group-hover:text-cyan-400 transition-colors">
                {genre.name_ar}
              </h3>
              
              {/* Counts */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Film size={12} />
                    أفلام
                  </span>
                  <span className="font-bold text-white">
                    {genre.movie_count > 999 
                      ? `${(genre.movie_count / 1000).toFixed(1)}k` 
                      : genre.movie_count}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Tv size={12} />
                    مسلسلات
                  </span>
                  <span className="font-bold text-white">
                    {genre.series_count > 999 
                      ? `${(genre.series_count / 1000).toFixed(1)}k` 
                      : genre.series_count}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </Link>
        ))}
      </div>

      {/* Mobile "View All" Button */}
      <div className="mt-6 md:hidden text-center">
        <Link
          href="/genres"
          className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors"
        >
          <span>عرض جميع التصنيفات</span>
          <span className="text-cyan-400">←</span>
        </Link>
      </div>
    </section>
  )
}
