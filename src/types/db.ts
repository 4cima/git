export type Role = 'user' | 'admin'
export type RatingColor = 'green' | 'yellow' | 'red'

export type Profile = {
  id: string
  username: string
  avatar_url: string | null
  role: Role
}

export type Movie = {
  id: string
  title: string
  arabic_title: string | null
  overview: string | null
  ai_summary: string | null
  rating_color: RatingColor
  genres: string[] | null
  release_date: string | null
  poster_path: string | null
  backdrop_path: string | null
  embed_urls: string[] | null
  download_urls: string[] | null
}

export type TVSeries = Movie

export type Season = {
  id: string
  series_id: string
  season_number: number
  name: string | null
  poster_path: string | null
}

export type Episode = {
  id: string
  season_id: string
  episode_number: number
  name: string | null
  overview: string | null
  air_date: string | null
  embed_urls: string[] | null
}
