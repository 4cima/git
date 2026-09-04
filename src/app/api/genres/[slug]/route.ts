import { NextRequest, NextResponse } from 'next/server'
import { executeFirst, executeAll } from '@/lib/db'
import { getGenreWithSiblings, getGenreWithTvSiblings, buildGenreWhereClause, buildGenreParams } from '@/lib/genre-siblings'
import { filterExcludedGenres } from '@/utils/excludedGenres'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug }       = await params
    const searchParams   = request.nextUrl.searchParams

    const page   = Math.max(1, parseInt(searchParams.get('page')  || '1') || 1)
    const rawLimit = parseInt(searchParams.get('limit') || '20')
    const limit  = Math.min(60, Math.max(1, rawLimit || 20))
    const offset = (page - 1) * limit
    const type   = searchParams.get('type')
    const sort   = searchParams.get('sort')  || 'popularity'
    const order  = searchParams.get('order') || 'desc'

    const genre = await executeFirst(
      'SELECT tmdb_id, slug, name_en, name_ar FROM genres WHERE slug = ? LIMIT 1',
      [slug]
    )

    if (!genre) {
      return NextResponse.json({ error: 'Genre not found' }, { status: 404 })
    }

    // عمود الترتيب حسب النوع — أعمدة الأفلام تختلف عن المسلسلات
    // (release_year للأفلام فقط، first_air_year للمسلسلات فقط — وإلا فشل SQL)
    const commonSorts = ['popularity', 'vote_average', 'vote_count']
    const isMovie = type === 'movie'
    const validSorts = [...commonSorts, isMovie ? 'release_year' : 'first_air_year']
    const sortColumn = validSorts.includes(sort) ? sort : 'popularity'
    const sortOrder  = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    // TV siblings فقط للمسلسلات — TMDB لا يوسم المسلسلات بـ Thriller(53)/Horror(27) بل Mystery(9648)
    const genreIds = type === 'tv'
      ? getGenreWithTvSiblings(Number(genre.tmdb_id))
      : getGenreWithSiblings(Number(genre.tmdb_id))
    const whereClause = buildGenreWhereClause(genreIds, 'm')
    const whereClauseSeries = buildGenreWhereClause(genreIds, 's')
    const genreParams = buildGenreParams(genreIds)

    /* ترتيب "التصنيف الأساسي أولًا": الأعمال التي يأتي التصنيف المطلوب أول قائمة
       تصنيفاتها تتصدر النتائج — فلا تظهر صفحة أكشن مملوءة بأعمال تحمل أكشن
       تصنيفًا ثانويًا فقط. يُطبق على الترتيب الافتراضي (popularity) دون ترتيبات المستخدم الصريحة. */
    /* الوضع الصارم (strict=1): عرض الأعمال التي يكون التصنيف المطلوب تصنيفها الأساسي فقط —
       لصفحات "أكشن صافي" بلا خلط التصنيفات الثانوية من TMDB. افتراضيًا معطل. */
    const strict = searchParams.get('strict') === '1'
    /* كل القيم مربوطة (?) — ممنوع دمج القيم مباشرة في SQL */
    const genreIdPlaceholders = genreIds.map(() => '?').join(',')
    const strictMoviesParams: number[] = strict ? genreIds : []
    const strictSeriesParams: number[] = strict ? genreIds : []
    const primaryFirstMoviesParams: number[] = sort === 'popularity' ? genreIds : []
    const primaryFirstSeriesParams: number[] = sort === 'popularity' ? genreIds : []
    const strictMovies  = strict ? `json_extract(m.genres_json, '$[0].tmdb_id') IN (${genreIdPlaceholders})` : '1=1'
    const strictSeries  = strict ? `json_extract(s.genres_json, '$[0].tmdb_id') IN (${genreIdPlaceholders})` : '1=1'
    const primaryFirstMovies = sort === 'popularity'
      ? `CASE WHEN json_extract(m.genres_json, '$[0].tmdb_id') IN (${genreIdPlaceholders}) THEN 0 ELSE 1 END, `
      : ''
    const primaryFirstSeries = sort === 'popularity'
      ? `CASE WHEN json_extract(s.genres_json, '$[0].tmdb_id') IN (${genreIdPlaceholders}) THEN 0 ELSE 1 END, `
      : ''

    /* شرط المحتوى المعتمد — يمنع ظهور أعمال غير مراجعة في الترتيبات غير الافتراضية */
    const approvedClause = isMovie
      ? "(m.filter_status IN ('clean', 'reviewed_approved') OR m.filter_status IS NULL)"
      : "(s.filter_status IN ('clean', 'reviewed_approved') OR s.filter_status IS NULL)"

    // Use cache for first page default sort (popularity) movie/tv type with single genre
    // — الكاش يتجاوز في الوضع الصارم (strict=1) لأن رتبته لا تمثل "التصنيف الأساسي فقط"
    if (page === 1 && sort === 'popularity' && genreIds.length === 1 && !strict) {
      if (type === 'movie') {
        try {
          const cacheRows = await executeAll(
            `SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, backdrop_path,
                    vote_average, release_year, overview_ar, genres_json, popularity,
                    printf('%04d-01-01', release_year) as release_date,
                    'movie' as media_type
             FROM list_movies_genre
             WHERE genre_tmdb_id = ?
             ORDER BY rank ASC
             LIMIT ? OFFSET ?`,
            [genre.tmdb_id, limit + 1, offset]
          )
          const hasMore = cacheRows.length > limit
          if (hasMore) cacheRows.pop()
          return NextResponse.json({
            genre,
            content: filterExcludedGenres(cacheRows),
            pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page }
          }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
        } catch (err) {
          console.error('Cache query failed, returning empty:', err)
          return NextResponse.json({
            genre,
            content: [],
            pagination: { page, limit, hasMore: false, totalPages: 1 }
          })
        }
      } else if (type === 'tv') {
        try {
          const cacheRows = await executeAll(
            `SELECT id, tmdb_id, slug,
                    name_ar as title_ar, name_en as title_en,
                    poster_path, backdrop_path,
                    vote_average, first_air_year, overview_ar, genres_json, popularity,
                    printf('%04d-01-01', first_air_year) as first_air_date,
                    'tv' as media_type
             FROM list_series_genre
             WHERE genre_tmdb_id = ?
             ORDER BY rank ASC
             LIMIT ? OFFSET ?`,
            [genre.tmdb_id, limit + 1, offset]
          )
          const hasMore = cacheRows.length > limit
          if (hasMore) cacheRows.pop()
          return NextResponse.json({
            genre,
            content: filterExcludedGenres(cacheRows),
            pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page }
          }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
        } catch (err) {
          console.error('Cache query failed, returning empty:', err)
          return NextResponse.json({
            genre,
            content: [],
            pagination: { page, limit, hasMore: false, totalPages: 1 }
          })
        }
      }
    }

    if (type === 'movie') {
      const rows = await executeAll(
        `SELECT m.id, m.tmdb_id, m.slug, m.title_ar, m.title_en, m.poster_path, m.backdrop_path,
                m.vote_average, m.vote_count, m.popularity, m.release_date, m.release_year,
                m.overview_ar, m.overview_en, m.genres_json, m.original_language,
                'movie' as media_type
         FROM movies m
         WHERE ${whereClause}
           AND ${approvedClause}
           AND ${strictMovies}
         ORDER BY ${primaryFirstMovies}m.${sortColumn} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...genreParams, ...strictMoviesParams, ...primaryFirstMoviesParams, limit + 1, offset]
      )
      const hasMore = rows.length > limit
      if (hasMore) rows.pop()
      return NextResponse.json({ genre, content: filterExcludedGenres(rows), pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page } })

    } else if (type === 'tv') {
      const rows = await executeAll(
        `SELECT s.id, s.tmdb_id, s.slug, s.name_ar, s.name_en, s.poster_path, s.backdrop_path,
                s.vote_average, s.vote_count, s.popularity, s.first_air_date, s.first_air_year,
                s.overview_ar, s.overview_en, s.genres_json, s.original_language,
                'tv' as media_type
         FROM tv_series s
         WHERE ${whereClauseSeries}
           AND ${approvedClause}
           AND ${strictSeries}
         ORDER BY ${primaryFirstSeries}s.${sortColumn} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...genreParams, ...strictSeriesParams, ...primaryFirstSeriesParams, limit + 1, offset]
      )
      const hasMore = rows.length > limit
      if (hasMore) rows.pop()
      return NextResponse.json({ genre, content: filterExcludedGenres(rows), pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page } })

    } else {
      // type === 'all'
      const fetchLimit = Math.ceil(limit * 1.5)
      const [moviesRows, seriesRows] = await Promise.all([
        executeAll(
          `SELECT m.id, m.tmdb_id, m.slug, m.title_ar, m.title_en, m.poster_path, m.backdrop_path,
                  m.vote_average, m.vote_count, m.popularity, m.release_date, m.release_year,
                  m.overview_ar, m.overview_en, m.genres_json, m.original_language,
                  'movie' as media_type
           FROM movies m WHERE ${whereClause}
             AND (m.filter_status IN ('clean', 'reviewed_approved') OR m.filter_status IS NULL)
             AND ${strictMovies}
           ORDER BY m.${sortColumn} ${sortOrder} LIMIT ?`,
          [...genreParams, ...strictMoviesParams, fetchLimit]
        ),
        executeAll(
          `SELECT s.id, s.tmdb_id, s.slug, s.name_ar, s.name_en, s.poster_path, s.backdrop_path,
                  s.vote_average, s.vote_count, s.popularity, s.first_air_date, s.first_air_year,
                  s.overview_ar, s.overview_en, s.genres_json, s.original_language,
                  'tv' as media_type
           FROM tv_series s WHERE ${whereClauseSeries}
             AND (s.filter_status IN ('clean', 'reviewed_approved') OR s.filter_status IS NULL)
             AND ${strictSeries}
           ORDER BY s.${sortColumn} ${sortOrder} LIMIT ?`,
          [...genreParams, ...strictSeriesParams, fetchLimit]
        )
      ])

      /* التصنيف الأساسي أولًا (على الترتيب الافتراضي) ثم قيمة الترتيب */
      const gidSet = new Set(genreIds.map(Number))
      const primaryGenreId = (row: any) => {
        try { return Number(JSON.parse(row.genres_json || '[]')?.[0]?.tmdb_id) } catch { return 0 }
      }
      const asc = order.toLowerCase() === 'asc'
      const combined = filterExcludedGenres([...moviesRows, ...seriesRows]).sort((a, b) => {
        if (sort === 'popularity') {
          const ap = gidSet.has(primaryGenreId(a)) ? 0 : 1
          const bp = gidSet.has(primaryGenreId(b)) ? 0 : 1
          if (ap !== bp) return ap - bp
        }
        const aVal = Number(a[sortColumn] || 0)
        const bVal = Number(b[sortColumn] || 0)
        return asc ? aVal - bVal : bVal - aVal
      })

      const paged   = combined.slice(offset, offset + limit + 1)
      const hasMore = paged.length > limit
      if (hasMore) paged.pop()

      return NextResponse.json({
        genre,
        content:    paged,
        pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page }
      }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
    }
  } catch (error) {
    console.error('Error fetching genre content:', error)
    return NextResponse.json({ error: 'Failed to fetch genre content' }, { status: 500 })
  }
}
