import { NextRequest, NextResponse } from 'next/server'
import { executeFirst } from '@/lib/db'
import { extractTmdbIdFromSlug } from '@/lib/slugGenerator'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    console.log('🔄 [API /movies/:slug] Fetching movie:', slug)

    // المرحلة 2 بند 3: احتياط tmdb_id لأي صيغة سلاج — رقم صريح، w-{id}-{year}،
    // أو {كلمات}-{id} — حتى لا يفقد مشغّل 4cima.stream تشغيله بعد تغيير السلاج.
    const tmdbId = extractTmdbIdFromSlug(slug)
    const movie = await executeFirst(
      `SELECT * FROM movies
            WHERE (slug = ? OR tmdb_id = ?)
              AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
              AND release_year IS NOT NULL AND release_year >= 2000
            LIMIT 1`,
      [slug, tmdbId ?? -1]
    )
    
    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 })
    }
    
    console.log('✅ [API /movies/:slug] Movie found:', movie.title_ar || movie.title_en)
    
    return NextResponse.json(movie, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      }
    })
  } catch (error) {
    console.error('❌ [API /movies/:slug] Error fetching movie:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
