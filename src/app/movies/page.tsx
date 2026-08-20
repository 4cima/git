import { Metadata } from 'next'
import { executeAll } from '@/lib/db'
import { MoviesPageClient } from '@/components/pages/MoviesPageClient'

export const metadata: Metadata = {
  title: 'أفلام | فور سيما',
  description: 'استكشف آلاف الأفلام المترجمة بجودة عالية - أفلام أكشن، كوميديا، دراما، رعب، وأكثر',
  alternates: { canonical: 'https://4cima.com/movies' }
}

export const dynamic   = 'force-dynamic'
export const revalidate = 0

async function getInitialMovies() {
  const rows = await executeAll(
    `SELECT id, slug, title_ar, title_en, poster_path, vote_average, release_year, genres_json
     FROM movies
     WHERE filter_status = 'clean'
     ORDER BY popularity DESC
     LIMIT 50`,
    []
  )
  return rows.map(row => JSON.parse(JSON.stringify(row)))
}

export default async function MoviesPage() {
  const initialMovies = await getInitialMovies()
  return <MoviesPageClient initialMovies={initialMovies} />
}
