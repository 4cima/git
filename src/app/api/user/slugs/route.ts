import { NextRequest, NextResponse } from 'next/server';
import { executeFirst } from '@/lib/db';

export const runtime = 'nodejs'

// Get slugs for tmdb_ids - minimal endpoint
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.items || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const slugs: Record<string, string | null> = {};

  for (const item of body.items) {
    const { content_type, tmdb_id } = item;
    if (!content_type || !tmdb_id) continue;

    const key = `${content_type}-${tmdb_id}`;
    const table = content_type === 'movie' ? 'movies' : 'tv_series';
    
    const row = await executeFirst<{slug: string}>(
      `SELECT slug FROM ${table} WHERE tmdb_id = ? LIMIT 1`,
      [tmdb_id]
    );
    
    if (row?.slug && row.slug.trim() && !/^\d+$/.test(row.slug.trim())) {
      slugs[key] = row.slug;
    } else {
      slugs[key] = null;
    }
  }

  return NextResponse.json({ ok: true, slugs });
}
