import { NextRequest, NextResponse } from 'next/server'
import { executeFirst, executeAll } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    // Get series tmdb_id
    const series = await executeFirst<{ tmdb_id: number }>(
      `SELECT tmdb_id FROM tv_series WHERE slug = ?`,
      [slug]
    )
    
    if (!series) {
      return NextResponse.json({ data: [] })
    }
    
    // Read from cache
    const cached = await executeFirst<{ recommended_ids: string }>(
      `SELECT recommended_ids FROM series_similar_cache WHERE tmdb_id = ?`,
      [series.tmdb_id]
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
      `SELECT id, tmdb_id, slug, name_ar, name_en, poster_path, vote_average, first_air_date, genres_json
       FROM tv_series 
       WHERE tmdb_id IN (${placeholders})
         AND (filter_status IS NULL OR filter_status IN ('clean', 'reviewed_approved'))
       LIMIT 12`,
      ids
    )
    
    return NextResponse.json({ data: similar })
  } catch (error) {
    console.error('Error fetching similar series:', error)
    return NextResponse.json({ data: [] })
  }
}
