import { NextRequest, NextResponse } from 'next/server'
import { executeFirst, executeAll } from '@/lib/db'
import { getGenreWithSiblings, getTvGenreIds, buildTvGenreClause, buildGenreWhereClause, buildGenreParams, buildGenreExclusionClause, buildGenreExclusionParams, resolveGenreSlug } from '@/lib/genre-siblings'
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
      [resolveGenreSlug(slug)]
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

    // جولة التفريق: لا توحيد اسم ظاهر — أكشن/مغامرة يحتفظان باسميهما وسلاجهما.
    // type=tv: يُبنى الشرط عبر buildTvGenreClause (قاعدة تفريق ID حدّي عبر json_each).
    // type=movie: مطابقة ID صافية عبر getGenreWithSiblings (الآن = [id] فقط).
    const gid = Number(genre.tmdb_id)
    const genreIds = type === 'tv' ? getTvGenreIds(gid) : getGenreWithSiblings(gid)
    const whereClause = buildGenreWhereClause(genreIds, 'm')
    const genreParams = buildGenreParams(genreIds)

    /* جولة التفريق: شرط المسلسلات — قاعدة أكشن×مغامرة/رعب/فانتازيا×ساي-فاي */
    const tvClause = buildTvGenreClause(gid, 's')
    const whereClauseSeries = tvClause.sql
    const genreParamsSeries = tvClause.params

    /* استبعادات أنواع التلفزيون — أُلغيت مع جولة التفريق: القواعد في buildTvGenreClause
       تضمن صفر تكرار بالبناء (الأكشن يستبعد مشغّلات المغامرة، والفانتازيا تستبعد sci-fi).
       للأفلام لا استبعاد إطلاقًا. */
    const excludedTvIds: number[] = []
    const exclusionSeries = buildGenreExclusionClause(excludedTvIds, 's')
    const exclusionSeriesParams = buildGenreExclusionParams(excludedTvIds)

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

    /* «التصنيف الأساسي أولًا» — إفصاح صريح: كان يُطبق عبر CASE(json_extract) في ORDER BY
       داخل SQL، مما يمنع استخدام فهرس الترتيب ويقيّم json_extract على كل صف ممسوح.
       الآن SQL يرتّب على العمود الصافي (popularity/vote_* — يمشي على الفهرس)،
       والتصنيف الأساسي يُطبق هنا في JS على صفوف الصفحة فقط (~limit صفًا).
       لا تغيير في شكل الاستجابة (حقول/pagination) ولا في الفلاتر. */
    const pageGidSet = new Set(genreIds.map(Number))
    const pagePrimaryGenreId = (row: any): number => {
      try { return Number(JSON.parse(row.genres_json || '[]')?.[0]?.tmdb_id) } catch { return 0 }
    }
    const pageAsc = order.toLowerCase() === 'asc'
    const primaryFirstPageSort = (rows: any[]) => {
      if (sort !== 'popularity') return rows
      return [...rows].sort((a, b) => {
        const ap = pageGidSet.has(pagePrimaryGenreId(a)) ? 0 : 1
        const bp = pageGidSet.has(pagePrimaryGenreId(b)) ? 0 : 1
        if (ap !== bp) return ap - bp
        const aVal = Number(a.popularity || 0)
        const bVal = Number(b.popularity || 0)
        return pageAsc ? aVal - bVal : bVal - aVal
      })
    }

    const strictMovies  = strict ? `json_extract(m.genres_json, '$[0].tmdb_id') IN (${genreIdPlaceholders})` : '1=1'
    const strictSeries  = strict ? `json_extract(s.genres_json, '$[0].tmdb_id') IN (${genreIdPlaceholders})` : '1=1'

    /* شرط المحتوى المعتمد — يمنع ظهور أعمال غير مراجعة في الترتيبات غير الافتراضية */
    /* جولة السياسة: + فلتر السنة (>= 2000) على كل فرع — لا ظهور لما قبل 2000 أو بلا سنة */
    const approvedClause = isMovie
      ? "(m.filter_status IN ('clean', 'reviewed_approved') OR m.filter_status IS NULL) AND m.release_year IS NOT NULL AND m.release_year >= 2000"
      : "(s.filter_status IN ('clean', 'reviewed_approved') OR s.filter_status IS NULL) AND s.first_air_year IS NOT NULL AND s.first_air_year >= 2000"

    // Use cache for first page default sort (popularity) movie/tv type with single genre
    // — الكاش يتجاوز في الوضع الصارم (strict=1) لأن رتبته لا تمثل "التصنيف الأساسي فقط"
    // مفتاح الكاش: للأفلام genreIds[0] = gid؛ ولـTV gid الأصلي لكل صفحة (28/12/14/878/27/10765)
    // — أكشن (28) ومغامرة (12) لكلٍّ منهما مفتاح مستقل مطابق لقواعد buildTvGenreClause،
    //   وصفحة الأب action-adventure تقرأ 10759 بقاعدتها الحية has(10759).
    // حارس المخفي: جداول الكاش مبنية مسبقًا وقد تحوي عناصر حُجبت لاحقًا.
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
               AND tmdb_id NOT IN (SELECT tmdb_id FROM movies WHERE filter_status = 'blocked'
                 OR release_year IS NULL OR release_year < 2000)
             ORDER BY rank ASC
             LIMIT ? OFFSET ?`,
            [genreIds[0], limit + 1, offset]
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
               AND tmdb_id NOT IN (SELECT tmdb_id FROM tv_series WHERE filter_status = 'blocked'
                 OR first_air_year IS NULL OR first_air_year < 2000)
             ORDER BY rank ASC
             LIMIT ? OFFSET ?`,
            [gid, limit + 1, offset]
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
      /* بدون CASE في ORDER BY — الترتيب على العمود الصافي يمشي على الفهرس */
      const rows = await executeAll(
        `SELECT m.id, m.tmdb_id, m.slug, m.title_ar, m.title_en, m.poster_path, m.backdrop_path,
                m.vote_average, m.vote_count, m.popularity, m.release_date, m.release_year,
                m.overview_ar, m.overview_en, m.genres_json, m.original_language,
                'movie' as media_type
         FROM movies m
         WHERE ${whereClause}
           AND ${approvedClause}
           AND ${strictMovies}
         ORDER BY m.${sortColumn} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...genreParams, ...strictMoviesParams, limit + 1, offset]
      )
      const hasMore = rows.length > limit
      if (hasMore) rows.pop()
      /* «التصنيف الأساسي أولًا» في JS على صفوف الصفحة فقط (انظر الإفصاح أعلاه) */
      const content = primaryFirstPageSort(filterExcludedGenres(rows))
      return NextResponse.json({ genre, content, pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page } },
        { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })

    } else if (type === 'tv') {
      const rows = await executeAll(
        `SELECT s.id, s.tmdb_id, s.slug, s.name_ar, s.name_en, s.poster_path, s.backdrop_path,
                s.vote_average, s.vote_count, s.popularity, s.first_air_date, s.first_air_year,
                s.overview_ar, s.overview_en, s.genres_json, s.original_language,
                'tv' as media_type
         FROM tv_series s
         WHERE ${whereClauseSeries}
           AND ${exclusionSeries}
           AND ${approvedClause}
           AND ${strictSeries}
         ORDER BY s.${sortColumn} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...genreParamsSeries, ...exclusionSeriesParams, ...strictSeriesParams, limit + 1, offset]
      )
      const hasMore = rows.length > limit
      if (hasMore) rows.pop()
      /* «التصنيف الأساسي أولًا» في JS على صفوف الصفحة فقط (انظر الإفصاح أعلاه) */
      const content = primaryFirstPageSort(filterExcludedGenres(rows))
      return NextResponse.json({ genre, content, pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page } },
        { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })

    } else {
      // type === 'all' — الترقيم في SQL (LIMIT/OFFSET لكل جدول) بدل جلب شريحة
      // صغيرة (30 صفًا) ثم الترقيم في الذاكرة الذي كان يعيد نفس الاستعلام مع
      // كل صفحة ويترك الصفحات بعد الثالثة فارغة.
      // الترتيب الافتراضي popularity يمشي على idx_movies_popularity/idx_tv_popularity
      // — «التصنيف الأساسي أولًا» يبقى نفس العرض لكن يُطبق في JS على صفوف الصفحة
      // فقط (بدون CASE في ORDER BY يمنع استخدام الفهرس ويعيد المسح الكامل).
      const perType   = Math.ceil(limit / 2)
      const perOffset = (page - 1) * perType
      const [moviesRows, seriesRows] = await Promise.all([
        executeAll(
          `SELECT m.id, m.tmdb_id, m.slug, m.title_ar, m.title_en, m.poster_path, m.backdrop_path,
                  m.vote_average, m.vote_count, m.popularity, m.release_date, m.release_year,
                  m.overview_ar, m.overview_en, m.genres_json, m.original_language,
                  'movie' as media_type
           FROM movies m WHERE ${whereClause}
             AND (m.filter_status IN ('clean', 'reviewed_approved') OR m.filter_status IS NULL)
             AND m.release_year IS NOT NULL AND m.release_year >= 2000
             AND ${strictMovies}
           ORDER BY m.${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`,
          [...genreParams, ...strictMoviesParams, perType + 1, perOffset]
        ),
        executeAll(
          `SELECT s.id, s.tmdb_id, s.slug, s.name_ar, s.name_en, s.poster_path, s.backdrop_path,
                  s.vote_average, s.vote_count, s.popularity, s.first_air_date, s.first_air_year,
                  s.overview_ar, s.overview_en, s.genres_json, s.original_language,
                  'tv' as media_type
           FROM tv_series s WHERE ${whereClauseSeries}
             AND ${exclusionSeries}
             AND (s.filter_status IN ('clean', 'reviewed_approved') OR s.filter_status IS NULL)
             AND s.first_air_year IS NOT NULL AND s.first_air_year >= 2000
             AND ${strictSeries}
           ORDER BY s.${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`,
          [...genreParamsSeries, ...exclusionSeriesParams, ...strictSeriesParams, perType + 1, perOffset]
        )
      ])

      const moviesHasMore = moviesRows.length > perType
      const seriesHasMore = seriesRows.length > perType
      if (moviesHasMore) moviesRows.pop()
      if (seriesHasMore) seriesRows.pop()

      /* التصنيف الأساسي أولًا (على الترتيب الافتراضي) ثم قيمة الترتيب —
         على صفوف الصفحة فقط (~limit صفًا) وليس على الجدول كله */
      const gidSet = new Set(genreIds.map(Number))
      const primaryGenreId = (row: any) => {
        try { return Number(JSON.parse(row.genres_json || '[]')?.[0]?.tmdb_id) } catch { return 0 }
      }
      const asc = order.toLowerCase() === 'asc'
      const paged = filterExcludedGenres([...moviesRows, ...seriesRows]).sort((a, b) => {
        if (sort === 'popularity') {
          const ap = gidSet.has(primaryGenreId(a)) ? 0 : 1
          const bp = gidSet.has(primaryGenreId(b)) ? 0 : 1
          if (ap !== bp) return ap - bp
        }
        const aVal = Number(a[sortColumn] || 0)
        const bVal = Number(b[sortColumn] || 0)
        return asc ? aVal - bVal : bVal - aVal
      }).slice(0, limit)

      const hasMore = moviesHasMore || seriesHasMore

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
