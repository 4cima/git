import { Metadata } from 'next'
import { turso } from '@/lib/turso'
import { HomePageClient } from '@/components/pages/HomePageClient'

export const metadata: Metadata = {
  title: 'فور سيما | شاهد أحدث الأفلام والمسلسلات المترجمة',
  description: 'موقع فور سيما لمشاهدة أحدث الأفلام والمسلسلات المترجمة بجودة عالية - أكشن، دراما، كوميديا، رعب، وأكثر',
}

export const revalidate = false // Will use cache tags instead

async function getHomeData() {
  // Fetch trending movies
  const moviesResult = await turso.execute({
    sql: `SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, vote_average, release_year, overview_ar, genres_json 
          FROM movies 
          WHERE filter_status = 'approved' 
          ORDER BY popularity DESC 
          LIMIT 100`,
    args: []
  })
  
  // Fetch trending series
  const seriesResult = await turso.execute({
    sql: `SELECT id, slug, name_ar AS title_ar, name_en AS title_en, poster_path, backdrop_path, vote_average, first_air_year AS release_year, overview_ar, genres_json 
          FROM tv_series 
          WHERE filter_status = 'approved' 
          ORDER BY popularity DESC 
          LIMIT 100`,
    args: []
  })
  
  return {
    trendingMovies: moviesResult.rows.map(row => JSON.parse(JSON.stringify(row))),
    trendingSeries: seriesResult.rows.map(row => JSON.parse(JSON.stringify(row))),
  }
}

export default async function HomePage() {
  const homeData = await getHomeData()
  
  return <HomePageClient initialData={homeData} />
}
