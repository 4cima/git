import { NextResponse, NextRequest } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Cache for 1 hour

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'movie' or 'tv'
    
    // Get all genres with counts
    // TODO: Replace with genre_ids_csv + index when scaling beyond 10K items (see TECH_DEBT.md #1)
    let query = `
      SELECT 
        g.*,
        (SELECT COUNT(*) FROM movies m
         WHERE EXISTS (
           SELECT 1 FROM json_each(m.genres_json)
           WHERE CAST(json_extract(value, '$.id') AS INTEGER) = g.tmdb_id
         )) as movie_count,
        (SELECT COUNT(*) FROM tv_series s
         WHERE EXISTS (
           SELECT 1 FROM json_each(s.genres_json)
           WHERE CAST(json_extract(value, '$.id') AS INTEGER) = g.tmdb_id
         )) as series_count
      FROM genres g
    `
    
    // Filter by type if specified
    if (type === 'movie') {
      query += `
        WHERE EXISTS (
          SELECT 1 FROM movies m
          WHERE EXISTS (
            SELECT 1 FROM json_each(m.genres_json)
            WHERE CAST(json_extract(value, '$.id') AS INTEGER) = g.tmdb_id
          )
        )
      `
    } else if (type === 'tv') {
      query += `
        WHERE EXISTS (
          SELECT 1 FROM tv_series s
          WHERE EXISTS (
            SELECT 1 FROM json_each(s.genres_json)
            WHERE CAST(json_extract(value, '$.id') AS INTEGER) = g.tmdb_id
          )
        )
      `
    }
    
    query += ` ORDER BY g.name_ar ASC`
    
    const genresResult = await turso.execute(query)
    
    const genres = genresResult.rows.map(genre => ({
      ...genre,
      movie_count: Number(genre.movie_count || 0),
      series_count: Number(genre.series_count || 0),
      total_count: Number(genre.movie_count || 0) + Number(genre.series_count || 0)
    }))
    
    return NextResponse.json({ genres })
  } catch (error) {
    console.error('Error fetching genres:', error)
    return NextResponse.json(
      { error: 'Failed to fetch genres' },
      { status: 500 }
    )
  }
}
