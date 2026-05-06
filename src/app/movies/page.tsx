import { Metadata } from 'next'
import { turso } from '@/lib/turso'
import { MoviesGrid } from '@/components/pages/MoviesGrid'

export const metadata: Metadata = {
  title: 'أفلام | فور سيما',
  description: 'استكشف أفضل الأفلام على فور سيما - جودة عالية ومترجم',
}

export const revalidate = 3600

export default async function MoviesPage() {
  // Fetch first 48 movies
  const result = await turso.execute({
    sql: 'SELECT * FROM movies WHERE is_filtered = 0 ORDER BY id DESC LIMIT 48',
    args: []
  })

  const movies = result.rows || []
  const nextCursor = movies.length === 48 ? movies[movies.length - 1].id : null

  return (
    <div className="min-h-screen pt-16 page-container pb-8">
      <h1 className="text-2xl md:text-4xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500 font-cairo">
        أفلام
      </h1>
      
      <MoviesGrid initialMovies={movies} initialCursor={nextCursor} />
    </div>
  )
}
