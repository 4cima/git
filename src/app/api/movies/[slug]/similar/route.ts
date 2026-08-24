import { NextRequest, NextResponse } from 'next/server';
import { executeFirst, executeAll } from '@/lib/db';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    
    // Get movie tmdb_id
    const movie = await executeFirst<{ tmdb_id: number }>(
      `SELECT tmdb_id FROM movies WHERE slug = ?`,
      [slug]
    );
    
    if (!movie) {
      return NextResponse.json({ data: [] }, { status: 404 });
    }
    
    // Try cache first
    const cached = await executeFirst<{ recommended_ids: string }>(
      `SELECT recommended_ids FROM movie_similar_cache WHERE tmdb_id = ?`,
      [movie.tmdb_id]
    );
    
    if (!cached || !cached.recommended_ids) {
      // Cache empty - return empty
      return NextResponse.json({ data: [] });
    }
    
    // Parse IDs
    const ids: number[] = JSON.parse(cached.recommended_ids);
    if (ids.length === 0) {
      return NextResponse.json({ data: [] });
    }
    
    // Fetch cards
    const placeholders = ids.map(() => '?').join(',');
    const similar = await executeAll(
      `SELECT tmdb_id, slug, title_ar, title_en, poster_path, vote_average, release_year
       FROM movies 
       WHERE tmdb_id IN (${placeholders})
         AND (filter_status IS NULL OR filter_status IN ('clean', 'reviewed_approved'))
       LIMIT 12`,
      ids
    );
    
    return NextResponse.json({ data: similar });
  } catch (error) {
    console.error('Error fetching similar movies:', error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
