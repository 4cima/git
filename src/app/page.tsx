import { Metadata } from 'next'
import { executeAll } from '@/lib/db'
import { HomePageClient } from '@/components/pages/HomePageClient'

export const metadata: Metadata = {
  title: 'فور سيما | شاهد أحدث الأفلام والمسلسلات المترجمة',
  description: 'موقع فور سيما لمشاهدة أحدث الأفلام والمسلسلات المترجمة بجودة عالية - أكشن، دراما، كوميديا، رعب، وأكثر',
  alternates: { canonical: 'https://4cima.com/' },
}

export const dynamic = 'force-dynamic' // D1 not available at build time on CI

async function getHomeData() {
  try {
    const [movies, series] = await Promise.all([
      executeAll(
        `SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, backdrop_path,
                vote_average, printf('%04d-01-01', release_year) AS release_date, overview_ar, genres_json
         FROM list_movies_popular
         ORDER BY rank
         LIMIT 100`,
        []
      ),
      executeAll(
        `SELECT id, tmdb_id, slug, name_ar AS title_ar, name_en AS title_en, poster_path, backdrop_path,
                vote_average, printf('%04d-01-01', first_air_year) AS first_air_date, overview_ar, genres_json
         FROM list_series_popular
         ORDER BY rank
         LIMIT 100`,
        []
      )
    ])
    return {
      trendingMovies: movies.map(r => JSON.parse(JSON.stringify(r))),
      trendingSeries: series.map(r => JSON.parse(JSON.stringify(r)))
    }
  } catch (error) {
    console.error('Error fetching home data:', error)
    return {
      trendingMovies: [],
      trendingSeries: []
    }
  }
}

export default async function HomePage() {
  const homeData = await getHomeData()
  return <HomePageClient initialData={homeData} />
}
