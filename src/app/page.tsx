import { Metadata } from 'next'
import { executeAll } from '@/lib/db'
import { HomePageClient } from '@/components/pages/HomePageClient'

export const metadata: Metadata = {
  title: 'فور سيما | شاهد أحدث الأفلام والمسلسلات المترجمة',
  description: 'موقع فور سيما لمشاهدة أحدث الأفلام والمسلسلات المترجمة بجودة عالية - أكشن، دراما، كوميديا، رعب، وأكثر',
}

export const dynamic    = 'force-dynamic'
export const revalidate = 0

async function getHomeData() {
  const [movies, series] = await Promise.all([
    executeAll(
      `SELECT tmdb_id, slug, title_ar, title_en, poster_path, backdrop_path,
              vote_average, release_year, overview_ar
       FROM movies
       WHERE filter_status = 'clean'
       ORDER BY popularity DESC
       LIMIT 100`,
      []
    ),
    executeAll(
      `SELECT tmdb_id, slug, name_ar AS title_ar, name_en AS title_en, poster_path, backdrop_path,
              vote_average, first_air_year AS release_year, overview_ar
       FROM tv_series
       WHERE filter_status = 'clean'
       ORDER BY popularity DESC
       LIMIT 100`,
      []
    )
  ])
  return {
    trendingMovies: movies.map(r => JSON.parse(JSON.stringify(r))),
    trendingSeries: series.map(r => JSON.parse(JSON.stringify(r)))
  }
}

export default async function HomePage() {
  const homeData = await getHomeData()
  return <HomePageClient initialData={homeData} />
}
