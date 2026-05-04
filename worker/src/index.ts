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
    const [trending, topRated, recent] = await Promise.all([
      client.execute(`
        SELECT id, slug, title_ar, title_en, poster_path, vote_average, release_year
        FROM movies 
        LIMIT 20
      `),
      client.execute(`
        SELECT id, slug, title_ar, title_en, poster_path, vote_average, release_year
        FROM movies 
        ORDER BY vote_average DESC
        LIMIT 20
      `),
      client.execute(`
        SELECT id, slug, title_ar, title_en, poster_path, vote_average, release_year
        FROM movies 
        ORDER BY created_at DESC 
        LIMIT 20
      `)
    ])

    return new Response(JSON.stringify({
      status: 'success',
      data: {
        trending: trending.rows,
        topRated: topRated.rows,
        recent: recent.rows
      },
      timestamp: new Date().toISOString()
    }), { headers })
  } catch (error) {
    console.error('Error in handleHome:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
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
    const limit = 20
    const offset = (page - 1) * limit

    const result = await client.execute(`
      SELECT id, slug, title_ar, title_en, poster_path, vote_average, release_year
      FROM movies 
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
      SELECT id, slug, title_ar, title_en, poster_path, vote_average, release_year
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
    const limit = 20
    const offset = (page - 1) * limit

    const result = await client.execute(`
      SELECT id, slug, title_ar, title_en, poster_path, vote_average, first_air_year
      FROM tv_series 
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
    const seasonsResult = await client.execute({
      sql: `SELECT * FROM seasons WHERE series_id = ? ORDER BY season_number ASC`,
      args: [seriesId]
    })

    return new Response(JSON.stringify({
      seasons: seasonsResult.rows
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
    const seasonResult = await client.execute({
      sql: `SELECT id FROM seasons WHERE series_id = ? AND season_number = ?`,
      args: [seriesId, season]
    })

    if (seasonResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Season not found' }), {
        status: 404,
        headers
      })
    }

    const seasonId = seasonResult.rows[0].id
    const episodesResult = await client.execute({
      sql: `SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number ASC`,
      args: [seasonId]
    })

    return new Response(JSON.stringify({
      episodes: episodesResult.rows
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
      SELECT id, slug, title_ar, title_en, poster_path, vote_average, first_air_year
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
          SELECT id, slug, title_ar, title_en, poster_path, vote_average, release_year, 'movie' as type
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
          SELECT id, slug, title_ar, title_en, poster_path, vote_average, first_air_year as release_year, 'series' as type
          FROM tv_series 
          WHERE title_ar LIKE ? OR title_en LIKE ?
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
