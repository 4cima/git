import { NextRequest, NextResponse } from 'next/server'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

/**
 * GET /api/admin/tmdb/search?type=movie|tv&query=searchterm
 * Search TMDB for movies or TV series
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') || 'movie'
  const query = searchParams.get('query') || ''

  if (!query.trim()) {
    return NextResponse.json({ results: [] })
  }

  if (!TMDB_API_KEY) {
    return NextResponse.json(
      { error: 'TMDB API key not configured' },
      { status: 500 }
    )
  }

  try {
    const endpoint = type === 'tv' ? '/search/tv' : '/search/movie'
    const url = `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&include_adult=false`

    const res = await fetch(url)
    const data = await res.json()

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error('TMDB search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}
