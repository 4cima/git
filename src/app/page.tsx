import { Metadata } from 'next'
import { turso } from '@/lib/turso'

export const metadata: Metadata = {
  title: 'فور سيما | شاهد أحدث الأفلام والمسلسلات المترجمة',
  description: 'موقع فور سيما لمشاهدة أحدث الأفلام والمسلسلات المترجمة بجودة عالية - أكشن، دراما، كوميديا، رعب، وأكثر',
}

// Force dynamic rendering - never static generation
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getHomeData() {
  // Fetch trending movies
  const moviesResult = await turso.execute({
    sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, vote_average, release_year, overview_ar, genres_json 
          FROM movies 
          WHERE filter_status IN ('clean', 'reviewed_approved')
          ORDER BY popularity DESC 
          LIMIT 100`,
    args: []
  })
  
  // Fetch trending series
  const seriesResult = await turso.execute({
    sql: `SELECT id, slug, name_ar AS title_ar, name_en AS title_en, poster_path, backdrop_path, vote_average, first_air_year AS release_year, overview_ar, genres_json 
          FROM tv_series 
          WHERE filter_status IN ('clean', 'reviewed_approved')
          ORDER BY popularity DESC 
          LIMIT 100`,
    args: []
  })
  
  const movies = moviesResult.rows.map(row => JSON.parse(JSON.stringify(row)))
  const series = seriesResult.rows.map(row => JSON.parse(JSON.stringify(row)))
  
  return { movies, series }
}

export default async function HomePage() {
  const { movies, series } = await getHomeData()
  
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-8">فور سيما v2.0 - DEPLOYMENT TEST VERIFIED</h1>
      
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">أفلام رائجة</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {movies.slice(0, 12).map((movie: any) => (
            <div key={movie.id} className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold">{movie.title_ar || movie.title_en}</h3>
              <p className="text-xs text-gray-400">{movie.release_year}</p>
            </div>
          ))}
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">مسلسلات رائجة</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {series.slice(0, 12).map((s: any) => (
            <div key={s.id} className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold">{s.title_ar || s.title_en}</h3>
              <p className="text-xs text-gray-400">{s.release_year}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
