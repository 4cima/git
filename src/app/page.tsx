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
    const [movies, series, topMovies, topSeries] = await Promise.all([
      executeAll(
        `SELECT l.id, l.tmdb_id,
                COALESCE(m.slug, l.slug) AS slug,
                l.title_ar, l.title_en, l.poster_path, l.backdrop_path,
                l.vote_average, printf('%04d-01-01', l.release_year) AS release_date, l.overview_ar, l.genres_json
         FROM list_movies_popular l
         LEFT JOIN movies m ON m.tmdb_id = l.tmdb_id
         ORDER BY l.rank
         LIMIT 100`,
        []
      ),
      executeAll(
        `SELECT l.id, l.tmdb_id,
                COALESCE(t.slug, l.slug) AS slug,
                l.name_ar AS title_ar, l.name_en AS title_en, l.poster_path, l.backdrop_path,
                l.vote_average, printf('%04d-01-01', l.first_air_year) AS first_air_date, l.overview_ar, l.genres_json
         FROM list_series_popular l
         LEFT JOIN tv_series t ON t.tmdb_id = l.tmdb_id
         ORDER BY l.rank
         LIMIT 100`,
        []
      ),
      executeAll(
        `SELECT l.id, l.tmdb_id,
                COALESCE(m.slug, l.slug) AS slug,
                l.title_ar, l.title_en, l.poster_path, l.backdrop_path,
                l.vote_average, printf('%04d-01-01', l.release_year) AS release_date, l.overview_ar, l.genres_json
         FROM list_movies_popular l
         LEFT JOIN movies m ON m.tmdb_id = l.tmdb_id
         ORDER BY l.vote_average DESC
         LIMIT 40`,
        []
      ),
      executeAll(
        `SELECT l.id, l.tmdb_id,
                COALESCE(t.slug, l.slug) AS slug,
                l.name_ar AS title_ar, l.name_en AS title_en, l.poster_path, l.backdrop_path,
                l.vote_average, printf('%04d-01-01', l.first_air_year) AS first_air_date, l.overview_ar, l.genres_json
         FROM list_series_popular l
         LEFT JOIN tv_series t ON t.tmdb_id = l.tmdb_id
         ORDER BY l.vote_average DESC
         LIMIT 40`,
        []
      )
    ])
    return {
      trendingMovies: movies.map(r => JSON.parse(JSON.stringify(r))),
      trendingSeries: series.map(r => JSON.parse(JSON.stringify(r))),
      topRatedMovies: topMovies.map(r => JSON.parse(JSON.stringify(r))),
      topRatedSeries: topSeries.map(r => JSON.parse(JSON.stringify(r)))
    }
  } catch (error) {
    console.error('Error fetching home data:', error)
    return {
      trendingMovies: [],
      trendingSeries: [],
      topRatedMovies: [],
      topRatedSeries: []
    }
  }
}

export default async function HomePage() {
  const homeData = await getHomeData()
  return <HomePageClient initialData={homeData} />
}
