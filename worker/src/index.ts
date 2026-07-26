import { createClient } from '@libsql/client'

interface Env {
  TURSO_DATABASE_URL: string
  TURSO_AUTH_TOKEN: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const pathname = url.pathname
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    try {
      const client = createClient({
        url: env.TURSO_DATABASE_URL,
        authToken: env.TURSO_AUTH_TOKEN
      })

      // Health check
      if (pathname === '/health') {
        return new Response(JSON.stringify({ status: 'ok' }), { headers: corsHeaders })
      }

      // Home page
      if (pathname === '/api/home') {
        return handleHome(client, corsHeaders)
      }

      // Movies list
      if (pathname === '/api/movies' && !pathname.includes('/api/movies/')) {
        return handleMovies(client, url, corsHeaders)
      }

      // Movie detail with cast
      if (pathname.match(/^\/api\/movies\/[^/]+\/cast$/)) {
        const slug = pathname.split('/')[3]
        return handleMovieCast(client, slug, corsHeaders)
      }

      // Movie detail with similar
      if (pathname.match(/^\/api\/movies\/[^/]+\/similar$/)) {
        const slug = pathname.split('/')[3]
        return handleMovieSimilar(client, slug, corsHeaders)
      }

      // Movie detail
      if (pathname.match(/^\/api\/movies\/[^/]+$/)) {
        const slug = pathname.split('/')[3]
        return handleMovieDetail(client, slug, corsHeaders)
      }

      // Anime (must be before TV series to avoid conflict)
      if (pathname === '/api/anime') {
        return handleAnime(client, url, corsHeaders)
      }

      // Plays (must be before other routes)
      if (pathname === '/api/plays') {
        return handlePlays(client, url, corsHeaders)
      }

      // TV series list
      if (pathname === '/api/tv' && !pathname.includes('/api/tv/')) {
        return handleSeries(client, url, corsHeaders)
      }

      // TV series seasons
      if (pathname.match(/^\/api\/tv\/[^/]+\/seasons$/)) {
        const slug = pathname.split('/')[3]
        return handleSeriesSeasons(client, slug, corsHeaders)
      }

      // TV series season episodes
      if (pathname.match(/^\/api\/tv\/[^/]+\/season\/\d+\/episodes$/)) {
        const parts = pathname.split('/')
        const slug = parts[3]
        const season = parseInt(parts[5])
        return handleSeasonEpisodes(client, slug, season, corsHeaders)
      }

      // TV series cast
      if (pathname.match(/^\/api\/tv\/[^/]+\/cast$/)) {
        const slug = pathname.split('/')[3]
        return handleSeriesCast(client, slug, corsHeaders)
      }

      // TV series similar
      if (pathname.match(/^\/api\/tv\/[^/]+\/similar$/)) {
        const slug = pathname.split('/')[3]
        return handleSeriesSimilar(client, slug, corsHeaders)
      }

      // TV series detail
      if (pathname.match(/^\/api\/tv\/[^/]+$/)) {
        const slug = pathname.split('/')[3]
        return handleSeriesDetail(client, slug, corsHeaders)
      }

      // Search
      if (pathname === '/api/search') {
        return handleSearch(client, url, corsHeaders)
      }

      // Genres
      if (pathname === '/api/genres') {
        return handleGenres(client, corsHeaders)
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: corsHeaders
      })

    } catch (error) {
      console.error('Worker error:', error)
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: corsHeaders
      })
    }
  }
}

// Home page data
async function handleHome(client: any, headers: any) {
  try {
    // Get latest movies (sorted by release date)
    const latestMovies = await client.execute(`
      SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, vote_average, release_year
      FROM movies 
      WHERE poster_path IS NOT NULL
      ORDER BY release_year DESC
      LIMIT 100
    `)

    // Get latest series (sorted by first air date)
    const latestSeries = await client.execute(`
      SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, vote_average, first_air_year as release_year
      FROM tv_series 
      WHERE poster_path IS NOT NULL
      ORDER BY first_air_year DESC
      LIMIT 100
    `)

    // Get top rated movies
    const topRated = await client.execute(`
      SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, vote_average, release_year
      FROM movies 
      WHERE vote_average > 7
      ORDER BY vote_average DESC
      LIMIT 100
    `)

    // Get popular movies
    const popular = await client.execute(`
      SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, vote_average, release_year
      FROM movies 
      ORDER BY vote_average DESC
      LIMIT 100
    `)

    return new Response(JSON.stringify({
      latest: latestMovies.rows,
      latestSeries: latestSeries.rows,
      topRated: topRated.rows,
      popular: popular.rows
    }), { headers })
  } catch (error) {
    console.error('Error in handleHome:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      latest: [],
      latestSeries: [],
      topRated: [],
      popular: []
    }), {
      status: 500,
      headers
    })
  }
}

// Movies list
async function handleMovies(client: any, url: URL, headers: any) {
  try {
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = 50
    const offset = (page - 1) * limit

    const result = await client.execute(`
      SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, vote_average, release_year
      FROM movies 
      WHERE poster_path IS NOT NULL
      ORDER BY release_year DESC, vote_average DESC
      LIMIT ${limit} OFFSET ${offset}
    `)

    return new Response(JSON.stringify({
      results: result.rows,
      page,
      limit,
      hasMore: result.rows.length === limit
    }), { headers })
  } catch (error) {
    console.error('Error in handleMovies:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers
    })
  }
}

// Movie detail
async function handleMovieDetail(client: any, slug: string, headers: any) {
  try {
    const result = await client.execute({
      sql: `SELECT * FROM movies WHERE slug = ?`,
      args: [slug]
    })

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Movie not found' }), {
        status: 404,
        headers
      })
    }

    const movie = result.rows[0]
    return new Response(JSON.stringify(movie), { headers })
  } catch (error) {
    console.error('Error in handleMovieDetail:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers
    })
  }
}

// Movie cast
async function handleMovieCast(client: any, slug: string, headers: any) {
  try {
    const movieResult = await client.execute({
      sql: `SELECT id FROM movies WHERE slug = ?`,
      args: [slug]
    })

    if (movieResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Movie not found' }), {
        status: 404,
        headers
      })
    }

    const movieId = movieResult.rows[0].id
    const castResult = await client.execute({
      sql: `SELECT * FROM cast_json WHERE movie_id = ? LIMIT 20`,
      args: [movieId]
    })

    return new Response(JSON.stringify({
      cast: castResult.rows
    }), { headers })
  } catch (error) {
    console.error('Error in handleMovieCast:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers
    })
  }
}

// Movie similar
async function handleMovieSimilar(client: any, slug: string, headers: any) {
  try {
    const movieResult = await client.execute({
      sql: `SELECT id FROM movies WHERE slug = ?`,
      args: [slug]
    })

    if (movieResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Movie not found' }), {
        status: 404,
        headers
      })
    }

    const similar = await client.execute(`
      SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, vote_average, release_year
      FROM movies 
      LIMIT 20
    `)

    return new Response(JSON.stringify({
      similar: similar.rows
    }), { headers })
  } catch (error) {
    console.error('Error in handleMovieSimilar:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers
    })
  }
}

// TV series list
async function handleSeries(client: any, url: URL, headers: any) {
  try {
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = 50
    const offset = (page - 1) * limit

    const result = await client.execute(`
      SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, vote_average, first_air_year
      FROM tv_series 
      WHERE poster_path IS NOT NULL
      ORDER BY first_air_year DESC, vote_average DESC
      LIMIT ${limit} OFFSET ${offset}
    `)

    return new Response(JSON.stringify({
      results: result.rows,
      page,
      limit,
      hasMore: result.rows.length === limit
    }), { headers })
  } catch (error) {
    console.error('Error in handleSeries:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers
    })
  }
}

// TV series detail
async function handleSeriesDetail(client: any, slug: string, headers: any) {
  try {
    const result = await client.execute({
      sql: `SELECT * FROM tv_series WHERE slug = ?`,
      args: [slug]
    })

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Series not found' }), {
        status: 404,
        headers
      })
    }

    const series = result.rows[0]
    return new Response(JSON.stringify(series), { headers })
  } catch (error) {
    console.error('Error in handleSeriesDetail:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers
    })
  }
}

// TV series seasons
async function handleSeriesSeasons(client: any, slug: string, headers: any) {
  try {
    const seriesResult = await client.execute({
      sql: `SELECT id, seasons_json, number_of_seasons FROM tv_series WHERE slug = ?`,
      args: [slug]
    })

    if (seriesResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Series not found' }), {
        status: 404,
        headers
      })
    }

    const series = seriesResult.rows[0]
    
    // Parse seasons from JSON
    const seasons = series.seasons_json ? JSON.parse(series.seasons_json as string) : []

    return new Response(JSON.stringify({
      seasons: seasons
    }), { headers })
  } catch (error) {
    console.error('Error in handleSeriesSeasons:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers
    })
  }
}

// Season episodes
async function handleSeasonEpisodes(client: any, slug: string, season: number, headers: any) {
  try {
    const seriesResult = await client.execute({
      sql: `SELECT id, seasons_json, episodes_json FROM tv_series WHERE slug = ?`,
      args: [slug]
    })

    if (seriesResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Series not found' }), {
        status: 404,
        headers
      })
    }

    const series = seriesResult.rows[0]
    
    // Parse JSON data
    const seasons = series.seasons_json ? JSON.parse(series.seasons_json as string) : []
    const allEpisodes = series.episodes_json ? JSON.parse(series.episodes_json as string) : []
    
    // Find the requested season
    const seasonData = seasons.find((s: any) => s.season_number === season)
    
    if (!seasonData) {
      return new Response(JSON.stringify({ 
        error: 'Season not found',
        episodes: [],
        servers: []
      }), {
        status: 200,
        headers
      })
    }
    
    // Filter episodes for this season
    const episodes = allEpisodes.filter((ep: any) => ep.season_number === season)
    
    return new Response(JSON.stringify({
      episodes: episodes,
      servers: [] // TODO: Add servers logic
    }), { headers })
  } catch (error) {
    console.error('Error in handleSeasonEpisodes:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers
    })
  }
}

// TV series cast
async function handleSeriesCast(client: any, slug: string, headers: any) {
  try {
    const seriesResult = await client.execute({
      sql: `SELECT id FROM tv_series WHERE slug = ?`,
      args: [slug]
    })

    if (seriesResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Series not found' }), {
        status: 404,
        headers
      })
    }

    const seriesId = seriesResult.rows[0].id
    const castResult = await client.execute({
      sql: `SELECT * FROM cast_json WHERE series_id = ? LIMIT 20`,
      args: [seriesId]
    })

    return new Response(JSON.stringify({
      cast: castResult.rows
    }), { headers })
  } catch (error) {
    console.error('Error in handleSeriesCast:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers
    })
  }
}

// TV series similar
async function handleSeriesSimilar(client: any, slug: string, headers: any) {
  try {
    const seriesResult = await client.execute({
      sql: `SELECT id FROM tv_series WHERE slug = ?`,
      args: [slug]
    })

    if (seriesResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Series not found' }), {
        status: 404,
        headers
      })
    }

    const similar = await client.execute(`
      SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, vote_average, first_air_year
      FROM tv_series 
      LIMIT 20
    `)

    return new Response(JSON.stringify({
      similar: similar.rows
    }), { headers })
  } catch (error) {
    console.error('Error in handleSeriesSimilar:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers
    })
  }
}

// Search
async function handleSearch(client: any, url: URL, headers: any) {
  try {
    const query = url.searchParams.get('q') || ''
    const type = url.searchParams.get('type') || 'all'

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ results: [] }), { headers })
    }

    const results: any[] = []

    if (type === 'all' || type === 'movie') {
      const movies = await client.execute({
        sql: `
          SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, vote_average, release_year, 'movie' as type
          FROM movies 
          WHERE title_ar LIKE ? OR title_en LIKE ?
          LIMIT 10
        `,
        args: [`%${query}%`, `%${query}%`]
      })
      results.push(...movies.rows)
    }

    if (type === 'all' || type === 'series') {
      const series = await client.execute({
        sql: `
          SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, backdrop_path, vote_average, first_air_year as release_year, 'series' as type
          FROM tv_series 
          WHERE name_ar LIKE ? OR name_en LIKE ?
          LIMIT 10
        `,
        args: [`%${query}%`, `%${query}%`]
      })
      results.push(...series.rows)
    }

    return new Response(JSON.stringify({ results }), { headers })
  } catch (error) {
    console.error('Error in handleSearch:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers
    })
  }
}

// Genres
async function handleGenres(client: any, headers: any) {
  try {
    const result = await client.execute(`
      SELECT id, name_ar, name_en, slug
      FROM genres 
      ORDER BY name_ar ASC
    `)

    return new Response(JSON.stringify({
      genres: result.rows
    }), { headers })
  } catch (error) {
    console.error('Error in handleGenres:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers
    })
  }
}


// Anime endpoint (filter TV series by anime genre)
async function handleAnime(client: any, url: URL, headers: any) {
  try {
    const searchParams = url.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Get anime genre ID (16 is Animation in TMDB)
    const result = await client.execute(`
      SELECT id, slug, name_ar as title_ar, name_en as title_en, poster_path, vote_average, first_air_year
      FROM tv_series 
      WHERE genres_json LIKE '%"id":16%' OR genres_json LIKE '%Animation%'
      LIMIT ${limit} OFFSET ${offset}
    `)

    return new Response(JSON.stringify({
      results: result.rows,
      page,
      limit,
      hasMore: result.rows.length === limit
    }), { headers })
  } catch (error) {
    console.error('Error in handleAnime:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers
    })
  }
}

// Plays endpoint (placeholder - returns empty for now)
async function handlePlays(client: any, url: URL, headers: any) {
  try {
    return new Response(JSON.stringify({
      results: [],
      page: 1,
      limit: 20,
      hasMore: false
    }), { headers })
  } catch (error) {
    console.error('Error in handlePlays:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers
    })
  }
}
