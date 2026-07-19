import { Metadata } from 'next'
import Link from 'next/link'
import { Film, Tv } from 'lucide-react'

export const metadata: Metadata = {
  title: 'التصنيفات | فور سيما',
  description: 'تصفح جميع التصنيفات - أفلام ومسلسلات'
}

export const revalidate = 3600

async function getGenres() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/genres`, {
      next: { revalidate: 3600 }
    })
    if (!response.ok) throw new Error('Failed to fetch')
    const data = await response.json()
    return data.genres || []
  } catch (error) {
    console.error('Error fetching genres:', error)
    return []
  }
}

export default async function GenresPage() {
  const genres = await getGenres()
  
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="page-container py-12">
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
          {genres.map((genre: any) => (
            <Link
              key={genre.id}
              href={`/genres/${genre.slug}`}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 hover:border-cyan-500/50 transition-all duration-300 hover:scale-105"
            >
              <div className="p-6">
                {/* Genre Name */}
                <h2 className="text-2xl font-bold mb-4 text-white group-hover:text-cyan-400 transition-colors">
                  {genre.name_ar}
                </h2>
                
                {/* Counts */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="flex items-center gap-2">
                      <Film size={16} />
                      أفلام
                    </span>
                    <span className="font-bold text-white">
                      {genre.movie_count?.toLocaleString('ar-EG') || 0}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="flex items-center gap-2">
                      <Tv size={16} />
                      مسلسلات
                    </span>
                    <span className="font-bold text-white">
                      {genre.series_count?.toLocaleString('ar-EG') || 0}
                    </span>
                  </div>
                  
                  <div className="pt-2 mt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-cyan-400">الإجمالي</span>
                      <span className="text-cyan-400">
                        {genre.total_count?.toLocaleString('ar-EG') || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Hover Effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
