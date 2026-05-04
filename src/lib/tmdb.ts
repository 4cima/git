import axios from 'axios'
import { CONFIG } from './constants'
import { mapEnglishToArabicKeyboard } from './utils'

const TMDB_TIMEOUT_MS = 10000
const TMDB_MAX_RETRIES = 3
const TMDB_RETRY_BASE_DELAY_MS = 300

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldRetry(status?: number) {
  if (!status) return true
  if (status === 429) return true
  return status >= 500
}

export const tmdb = axios.create({
  baseURL: '/api/tmdb', // Use our secure proxy which filters unreleased content
  params: { language: 'ar-SA' },
  timeout: TMDB_TIMEOUT_MS
})

tmdb.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config
    if (!config) throw error
    
    // Suppress 404 errors silently - return empty data structure
    if (error?.response?.status === 404) {
      return {
        status: 200,
        data: { results: [] },
        config,
        headers: error.response.headers,
        statusText: 'OK'
      }
    }
    
    const retryCount = typeof config.__retryCount === 'number' ? config.__retryCount : 0
    if (retryCount >= TMDB_MAX_RETRIES || !shouldRetry(error?.response?.status)) {
      throw error
    }
    config.__retryCount = retryCount + 1
    const backoff = TMDB_RETRY_BASE_DELAY_MS * (2 ** retryCount) + Math.floor(Math.random() * 120)
    await wait(backoff)
    return tmdb.request(config)
  }
)

export function setTmdbLanguage(lang: 'ar-SA' | 'en-US') {
  tmdb.defaults.params = { ...(tmdb.defaults.params || {}), language: lang }
}
export function getTmdbLanguage(): 'ar-SA' | 'en-US' {
  const lang = tmdb.defaults.params?.language
  return lang === 'en-US' ? 'en-US' : 'ar-SA'
}
// initialize from storage if present
try {
  const raw = localStorage.getItem('cinma_lang')
  if (raw === 'en') setTmdbLanguage('en-US')
} catch {}

export function getRatingColorFromCert(cert: string): 'green' | 'yellow' | 'red' {
  const c = (cert || '').toUpperCase()
  if (['G', 'PG'].includes(c)) return 'green'
  if (['PG-13', 'TV-14'].includes(c)) return 'yellow'
  return 'red'
}

/**
 * @deprecated Use CockroachDB API instead: GET /api/trending?type=movie|tv
 * Fetch trending content from TMDB
 */
export async function fetchTrending(type: 'movie' | 'tv') {
  const { data } = await tmdb.get(`/trending/${type}/week`)
  return data
}

/**
 * @deprecated Use extractUsCertification from dataHelpers.ts instead
 * Get US movie certification from TMDB
 */
export async function getUsMovieCertification(tmdbId: number) {
  const { data } = await tmdb.get(`/movie/${tmdbId}/release_dates`)
  const arr = (data?.results || []) as Array<{ iso_3166_1: string; release_dates: Array<{ certification?: string }> }>
  const us = arr.find(r => r.iso_3166_1 === 'US')
  const cert = us?.release_dates?.[0]?.certification || ''
  return cert.toUpperCase()
}

/**
 * @deprecated Use extractUsTvRating from dataHelpers.ts instead
 * Get US TV rating from TMDB
 */
export async function getUsTvRating(tmdbId: number) {
  const { data } = await tmdb.get(`/tv/${tmdbId}/content_ratings`)
  const arr = (data?.results || []) as Array<{ iso_3166_1: string; rating?: string }>
  const us = arr.find(r => r.iso_3166_1 === 'US')
  return (us?.rating || '').toUpperCase()
}

/**
 * @deprecated Use fetchGenresFromAPI from dataHelpers.ts instead
 * Fetch genres from TMDB
 */
export async function fetchGenres(type: 'movie' | 'tv') {
  const { data } = await tmdb.get(`/genre/${type}/list`)
  return (data?.genres || []) as Array<{ id: number; name: string }>
}

export type AdvancedSearchParams = {
  query?: string
  types?: Array<'movie' | 'tv' | 'anime'>
  genres?: number[]
  yearFrom?: number
  yearTo?: number
  ratingFrom?: number
  ratingTo?: number
  rating_color?: Array<'green' | 'yellow' | 'red'>
  sort_by?: string
  page?: number
  with_original_language?: string
  with_keywords?: string
}

type TmdbSearchItem = {
  id: number
  genre_ids?: number[]
  release_date?: string
  first_air_date?: string
  vote_average?: number
  popularity?: number
  media_type?: 'movie' | 'tv'
}

type TmdbListResponse = {
  page: number
  results: TmdbSearchItem[]
  total_pages: number
}

function colorToCertification(colors?: Array<'green' | 'yellow' | 'red'>) {
  if (!colors || colors.length === 0) return undefined
  if (colors.includes('red')) return 'NC-17'
  if (colors.includes('yellow')) return 'PG-13'
  return 'PG'
}

/**
 * @deprecated Use advancedSearchFromAPI from dataHelpers.ts instead
 * Advanced search using TMDB API
 */
export async function advancedSearch(params: AdvancedSearchParams) {
  const {
    query: rawQuery = '',
    types = ['movie'],
    genres = [],
    yearFrom,
    yearTo,
    ratingFrom,
    ratingTo,
    rating_color,
    sort_by,
    page = 1,
    with_original_language,
    with_keywords
  } = params

  // Normalize query: if it looks like English characters typed on Arabic keyboard (or vice versa), 
  // we try both the original and the mapped version to cast a wider net.
  // For TMDB API, we'll primarily use the original query, but we can detect if it's meant to be Arabic.
  const query = rawQuery.trim()
  const keyboardMappedQuery = mapEnglishToArabicKeyboard(query)
  
  // Use a heuristic: if mapping changes the string significantly and original is all English but keyboardMapped is Arabic, 
  // maybe we should try the mapped one? Actually, TMDB search works best with the actual intended string.
  // We'll use the original query for now as TMDB handles multilingual search well if the string is correct.
  
  const doAnime = types.includes('anime')
  const doMovie = types.includes('movie')
  const doTv = types.includes('tv') || doAnime
  
  const cert = colorToCertification(rating_color)
  const promises: Array<Promise<TmdbListResponse>> = []
  const hasQuery = query.length > 0
  if (doMovie) {
    if (query.length > 0) {
      // If query is English but looks like it could be Arabic keyboard mapping (e.g. 'sfhd]v'), 
      // we'll try searching with both.
      const queryToUse = (/[a-zA-Z]/.test(query) && /[\u0600-\u06FF]/.test(keyboardMappedQuery)) 
        ? `${query} ${keyboardMappedQuery}`
        : query;
        
      const p = tmdb.get('/search/movie', { params: { query: queryToUse, include_adult: false, page } })
        .then(r => {
          let res = (r.data.results || []).map((x: TmdbSearchItem) => ({ ...x, media_type: 'movie' as const }))
          // client-side filter when using search endpoint
          if (genres.length) res = res.filter((x: TmdbSearchItem) => (x.genre_ids || []).some((id: number) => genres.includes(id)))
          if (yearFrom) res = res.filter((x: TmdbSearchItem) => (x.release_date || '0').slice(0, 4) >= String(yearFrom))
          if (yearTo) res = res.filter((x: TmdbSearchItem) => (x.release_date || '0').slice(0, 4) <= String(yearTo))
          if (ratingFrom != null) res = res.filter((x: TmdbSearchItem) => (x.vote_average || 0) >= ratingFrom)
          if (ratingTo != null) res = res.filter((x: TmdbSearchItem) => (x.vote_average || 0) <= ratingTo)
          if (with_original_language) res = res.filter((x: TmdbSearchItem) => (x as any).original_language === with_original_language)
          return { ...r.data, results: res } as TmdbListResponse
        })
      promises.push(p)
    } else {
      const mp: Record<string, string | number | boolean | undefined> = {
        with_genres: genres.join(',') || undefined,
        'primary_release_date.gte': yearFrom ? `${yearFrom}-01-01` : undefined,
        'primary_release_date.lte': yearTo ? `${yearTo}-12-31` : undefined,
        'vote_average.gte': ratingFrom,
        'vote_average.lte': ratingTo,
        with_original_language,
        with_keywords,
        include_adult: false,
        sort_by: sort_by || 'popularity.desc',
        page
      }
      if (cert) {
        mp.certification_country = 'US'
        mp['certification.lte'] = cert
      }
      const p = tmdb.get('/discover/movie', { params: mp }).then(r => ({ ...r.data, results: (r.data.results || []).map((x: TmdbSearchItem) => ({ ...x, media_type: 'movie' as const })) }) as TmdbListResponse)
      promises.push(p)
    }
  }
  if (doTv) {
    if (query.length > 0) {
      const queryToUse = (/[a-zA-Z]/.test(query) && /[\u0600-\u06FF]/.test(keyboardMappedQuery)) 
        ? `${query} ${keyboardMappedQuery}`
        : query;

      const p = tmdb.get('/search/tv', { params: { query: queryToUse, include_adult: false, page } })
        .then(r => {
          let res = (r.data.results || []).map((x: TmdbSearchItem) => ({ ...x, media_type: 'tv' as const }))
          if (genres.length) res = res.filter((x: TmdbSearchItem) => (x.genre_ids || []).some((id: number) => genres.includes(id)))
          if (doAnime) res = res.filter((x: TmdbSearchItem) => (x.genre_ids || []).includes(16) && ((x as any).original_language === 'ja'))
          if (yearFrom) res = res.filter((x: TmdbSearchItem) => (x.first_air_date || '0').slice(0, 4) >= String(yearFrom))
          if (yearTo) res = res.filter((x: TmdbSearchItem) => (x.first_air_date || '0').slice(0, 4) <= String(yearTo))
          if (ratingFrom != null) res = res.filter((x: TmdbSearchItem) => (x.vote_average || 0) >= ratingFrom)
          if (ratingTo != null) res = res.filter((x: TmdbSearchItem) => (x.vote_average || 0) <= ratingTo)
          if (with_original_language) res = res.filter((x: TmdbSearchItem) => (x as any).original_language === with_original_language)
          return { ...r.data, results: res } as TmdbListResponse
        })
      promises.push(p)
    } else {
      const tp: Record<string, string | number | boolean | undefined> = {
        with_genres: genres.join(',') || undefined,
        'first_air_date.gte': yearFrom ? `${yearFrom}-01-01` : undefined,
        'first_air_date.lte': yearTo ? `${yearTo}-12-31` : undefined,
        'vote_average.gte': ratingFrom,
        'vote_average.lte': ratingTo,
        with_original_language: doAnime ? 'ja' : with_original_language,
        with_keywords,
        include_adult: false,
        sort_by: sort_by || 'popularity.desc',
        page
      }
      if (doAnime) {
        const currentGenres = tp.with_genres ? String(tp.with_genres).split(',') : []
        if (!currentGenres.includes('16')) currentGenres.push('16')
        tp.with_genres = currentGenres.join(',')
      }
      const p = tmdb.get('/discover/tv', { params: tp }).then(r => ({ ...r.data, results: (r.data.results || []).map((x: TmdbSearchItem) => ({ ...x, media_type: 'tv' as const })) }) as TmdbListResponse)
      promises.push(p)
    }
  }
  const res = await Promise.all(promises)
  if (res.length === 1) return res[0]
  // merge movie+tv, sorting by popularity desc
  const all = [...(res[0]?.results || []), ...(res[1]?.results || [])]
  all.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
  return { page, results: all, total_pages: Math.max(res[0]?.total_pages || 1, res[1]?.total_pages || 1) }
}
