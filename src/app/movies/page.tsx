import { Metadata } from 'next'
import { executeAll } from '@/lib/db'
import { MoviesPageClient } from '@/components/pages/MoviesPageClient'

export const metadata: Metadata = {
  title: 'الأفلام المترجمة',
  description: 'استكشف آلاف الأفلام المترجمة بجودة عالية - أفلام أكشن، كوميديا، دراما، رعب، وأكثر',
  alternates: { canonical: 'https://4cima.com/movies' }
}

export const dynamic   = 'force-static'
export const revalidate = 300 // 5 minutes

async function getInitialMovies() {
  try {
    const rows = await executeAll(
      `SELECT id, slug, title_ar, title_en, poster_path, vote_average, 
              printf('%04d-01-01', release_year) AS release_date, genres_json
       FROM list_movies_popular
       ORDER BY rank
       LIMIT 50`,
      []
    )
    return rows.map(row => JSON.parse(JSON.stringify(row)))
  } catch (error) {
    console.error('Error fetching initial movies:', error)
    return []
  }
}

export default async function MoviesPage() {
  const initialMovies = await getInitialMovies()
  return <MoviesPageClient initialMovies={initialMovies} />
}
