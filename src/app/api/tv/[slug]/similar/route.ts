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
    
    // Get series tmdb_id
    const series = await executeFirst<{ tmdb_id: number }>(
      `SELECT tmdb_id FROM tv_series WHERE slug = ?`,
      [slug]
    );
    
    if (!series) {
      return NextResponse.json({ data: [] }, { status: 404 });
    }
    
    // Try cache first
    const cached = await executeFirst<{ recommended_ids: string }>(
      `SELECT recommended_ids FROM series_similar_cache WHERE tmdb_id = ?`,
      [series.tmdb_id]
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
      `SELECT tmdb_id, slug, name_ar as title_ar, name_en as title_en, poster_path, vote_average, first_air_year
       FROM tv_series 
       WHERE tmdb_id IN (${placeholders})
         AND (filter_status IS NULL OR filter_status IN ('clean', 'reviewed_approved'))
       LIMIT 12`,
      ids
    );
    
    return NextResponse.json({ data: similar });
  } catch (error) {
    console.error('Error fetching similar series:', error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
