import { NextRequest, NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'
import { filterExcludedGenres } from '@/utils/excludedGenres'

export const dynamic = 'force-dynamic'

/**
 * GET /api/listing/arabic — قوائم الأفلام/المسلسلات العربية (لصفحات /movies/arabic و /series/arabic)
 *
 * Query params:
 *   type  : 'movie' | 'tv'  (افتراضي movie)
 *   page  : رقم الصفحة (افتراضي 1)
 *   limit : عدد العناصر (افتراضي 20، بحد أقصى 60)
 *   sort  : popularity | vote_average | vote_count | release_year | first_air_year
 *   order : asc | desc
 *
 * نفس شكل استجابة /api/genres/[slug]: { content, pagination: { page, limit, hasMore, totalPages } }
 */
const MOVIE_SORTS = ['popularity', 'vote_average', 'vote_count', 'release_year']
const SERIES_SORTS = ['popularity', 'vote_average', 'vote_count', 'first_air_year']

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(60, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const offset = (page - 1) * limit
    const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie'
    const sort = searchParams.get('sort') || 'popularity'
    const order = searchParams.get('order')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    const validSorts = type === 'tv' ? SERIES_SORTS : MOVIE_SORTS
    const sortColumn = validSorts.includes(sort) ? sort : 'popularity'

    if (type === 'movie') {
      const rows = await executeAll(
        `SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, backdrop_path,
                vote_average, release_year, overview_ar, genres_json, popularity,
                printf('%04d-01-01', release_year) as release_date,
                'movie' as media_type
         FROM movies
         WHERE original_language = 'ar'
           AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
           AND slug IS NOT NULL AND tmdb_id IS NOT NULL
         ORDER BY ${sortColumn} ${order}
         LIMIT ? OFFSET ?`,
        [limit + 1, offset]
      )
      const hasMore = rows.length > limit
      if (hasMore) rows.pop()
      return NextResponse.json(
        {
          content: filterExcludedGenres(rows),
          pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page },
        },
        { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
      )
    }

    // type === 'tv'
    const rows = await executeAll(
      `SELECT id, tmdb_id, slug,
              name_ar as title_ar, name_en as title_en,
              poster_path, backdrop_path,
              vote_average, first_air_year, overview_ar, genres_json, popularity,
              printf('%04d-01-01', first_air_year) as first_air_date,
              'tv' as media_type
       FROM tv_series
       WHERE original_language = 'ar'
         AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
         AND slug IS NOT NULL AND tmdb_id IS NOT NULL
       ORDER BY ${sortColumn} ${order}
       LIMIT ? OFFSET ?`,
      [limit + 1, offset]
    )
    const hasMore = rows.length > limit
    if (hasMore) rows.pop()
    return NextResponse.json(
      {
        content: filterExcludedGenres(rows),
        pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (error) {
    console.error('❌ [API /listing/arabic] Error:', error)
    return NextResponse.json(
      { content: [], pagination: { page: 1, limit: 20, hasMore: false, totalPages: 1 } },
      { status: 500 }
    )
  }
}
