import { NextRequest, NextResponse } from 'next/server'
import { executeFirst, executeAll } from '@/lib/db'
import { filterExcludedGenres } from '@/utils/excludedGenres'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    // Get movie tmdb_id
    const movie = await executeFirst<{ tmdb_id: number }>(
      `SELECT tmdb_id FROM movies WHERE slug = ?`,
      [slug]
    )
    
    if (!movie) {
      return NextResponse.json({ data: [] })
    }
    
    // Read from cache
    const cached = await executeFirst<{ recommended_ids: string }>(
      `SELECT recommended_ids FROM movie_similar_cache WHERE tmdb_id = ?`,
      [movie.tmdb_id]
    )
    
    if (!cached || !cached.recommended_ids) {
      // Cache empty - return empty, no fallback
      return NextResponse.json({ data: [] })
    }
    
    // Parse IDs
    const ids: number[] = JSON.parse(cached.recommended_ids)
    if (ids.length === 0) {
      return NextResponse.json({ data: [] })
    }
    
    // Fetch cards
    const placeholders = ids.map(() => '?').join(',')
    const similar = await executeAll(
      `SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, vote_average, release_date, genres_json
       FROM movies 
       WHERE tmdb_id IN (${placeholders})
         AND (filter_status IS NULL OR filter_status IN ('clean', 'reviewed_approved'))
       LIMIT 12`,
      ids
    )
    
    // فلتر: Talk Show + War & Politics + Documentary + History
    return NextResponse.json({ data: filterExcludedGenres(similar) })
  } catch (error) {
    console.error('Error fetching similar movies:', error)
    return NextResponse.json({ data: [] })
  }
}
