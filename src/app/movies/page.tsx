import { Metadata } from 'next'
import { turso } from '@/lib/turso'
import { MoviesPageClient } from '@/components/pages/MoviesPageClient'

export const metadata: Metadata = {
  title: 'أفلام | فور سيما',
  description: 'استكشف آلاف الأفلام المترجمة بجودة عالية - أفلام أكشن، كوميديا، دراما، رعب، وأكثر',
}

export const revalidate = false // Will use cache tags instead

async function getInitialMovies() {
  const result = await turso.execute({
    sql: `SELECT id, slug, title_ar, title_en, poster_path, vote_average, release_year, genres_json 
          FROM movies 
          WHERE filter_status IN ('clean', 'reviewed_approved')
          ORDER BY popularity DESC 
          LIMIT 50`,
    args: []
  })
  
  return result.rows.map(row => JSON.parse(JSON.stringify(row)))
}

export default async function MoviesPage() {
  const initialMovies = await getInitialMovies()
  
  return <MoviesPageClient initialMovies={initialMovies} />
}
