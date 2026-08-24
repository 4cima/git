import { NextRequest, NextResponse } from 'next/server';
import { executeAll, executeFirst } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

// Get card states for multiple items
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.items || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const states: Record<string, 'neutral' | 'favorite' | 'completed'> = {};

  // Extract all tmdb_ids by content_type
  const movieIds: number[] = [];
  const seriesIds: number[] = [];
  
  for (const item of body.items) {
    if (item.content_type === 'movie') {
      movieIds.push(item.tmdb_id);
    } else if (item.content_type === 'tv') {
      seriesIds.push(item.tmdb_id);
    }
  }

  // Batch fetch favorites - one query for movies, one for series
  const favorites = new Set<string>();
  
  if (movieIds.length > 0) {
    const placeholders = movieIds.map(() => '?').join(',');
    const movieFavs = await executeAll<{tmdb_id: number}>(
      `SELECT tmdb_id FROM favorites WHERE user_id=? AND content_type='movie' AND tmdb_id IN (${placeholders})`,
      [user.id, ...movieIds]
    );
    movieFavs.forEach(f => favorites.add(`movie-${f.tmdb_id}`));
  }
  
  if (seriesIds.length > 0) {
    const placeholders = seriesIds.map(() => '?').join(',');
    const seriesFavs = await executeAll<{tmdb_id: number}>(
      `SELECT tmdb_id FROM favorites WHERE user_id=? AND content_type='tv' AND tmdb_id IN (${placeholders})`,
      [user.id, ...seriesIds]
    );
    seriesFavs.forEach(f => favorites.add(`tv-${f.tmdb_id}`));
  }

  // Batch fetch completed - one query for movies, one for series
  const completed = new Set<string>();
  
  if (movieIds.length > 0) {
    const placeholders = movieIds.map(() => '?').join(',');
    const movieComps = await executeAll<{tmdb_id: number}>(
      `SELECT tmdb_id FROM completed_watch WHERE user_id=? AND content_type='movie' AND tmdb_id IN (${placeholders})`,
      [user.id, ...movieIds]
    );
    movieComps.forEach(c => completed.add(`movie-${c.tmdb_id}`));
  }
  
  if (seriesIds.length > 0) {
    const placeholders = seriesIds.map(() => '?').join(',');
    const seriesComps = await executeAll<{tmdb_id: number}>(
      `SELECT tmdb_id FROM completed_watch WHERE user_id=? AND content_type='tv' AND tmdb_id IN (${placeholders})`,
      [user.id, ...seriesIds]
    );
    seriesComps.forEach(c => completed.add(`tv-${c.tmdb_id}`));
  }

  // Build states object
  for (const item of body.items) {
    const key = `${item.content_type}-${item.tmdb_id}`;
    
    if (favorites.has(key)) {
      states[key] = 'favorite';
    } else if (completed.has(key)) {
      states[key] = 'completed';
    } else {
      states[key] = 'neutral';
    }
  }

  return NextResponse.json({ ok: true, states });
}
