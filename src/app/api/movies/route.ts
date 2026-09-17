import { NextRequest, NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'
import { sanitizeSearchInput } from '@/lib/search-utils'
import { resolveGenreSlug } from '@/lib/genre-siblings'
import { filterExcludedGenres } from '@/utils/excludedGenres'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1')  || 1)
    const limit = Math.min(60, Math.max(1, parseInt(searchParams.get('limit') || '24') || 24))
    const offset = (page - 1) * limit
    
    const genre    = searchParams.get('genre')
    const year     = searchParams.get('year')
    const country  = searchParams.get('country')
    const language = searchParams.get('language')
    const ratingMin = searchParams.get('rating_min')
    const search   = searchParams.get('search')
    const sort     = searchParams.get('sort') || 'popularity'
    const order    = searchParams.get('order') || 'desc'
    
    const conditions: string[] = []
    const args: (string | number)[] = []

    let ftsJoin = ''
    /* الفهرس المجمّع للتصنيف (movies_by_genre) — يُفعَّل مع ?genre= فقط */
    let genreJoin = ''
    let sortRef = 'movies'
    if (search) {
      const sanitized = sanitizeSearchInput(search)
      if (sanitized) {
        ftsJoin = 'JOIN movies_fts ON movies.id = movies_fts.rowid'
        conditions.push('movies_fts MATCH ?')
        args.push(sanitized)
      }
    }

    if (genre) {
      /* مطابقة دقيقة وموحّدة مع /api/series و SSR (src/app/movies/genres/[slug]/page.tsx:51):
         1) alias السلاج (resolveGenreSlug: sci-fi/scifi → science-fiction)
         2) slug → tmdb_id من جدول genres ثم مطابقة المعرّف داخل genres_json (ID حدّي بلا LIKE).
         تصنيف مجهول ⇒ قائمة فارغة صريحة (مكافئ notFound() في SSR) بدل شرط WHERE باطل
         أو LIKE fallback صامت كان يعطي «صفر نتائج» بلا تفسير. */
      const genreRow = await executeFirst('SELECT tmdb_id FROM genres WHERE slug = ? LIMIT 1', [resolveGenreSlug(genre)]).catch(() => null)
      if (!genreRow || genreRow.tmdb_id == null) {
        return NextResponse.json({
          movies: [],
          pagination: { page, limit, hasMore: false, totalPages: 1 }
        })
      }
      /* العضوية محسوبة مسبقًا في movies_by_genre (scripts/build-genre-index.js —
         نفس البوابات والاستبعادات وقواعد العضوية) ⇒ بحث نطاقي على PK
         (genre_id, sort, id) بقراءة ~25-50 صفًا بدل مسح json_each للكتالوج
         كله (~410K/نداء). أعمدة العرض تبقى من movies الحي (JOIN بالـPK)
         فلا انحراف بيانات — العضوية والترتيب فقط مادّيان.
         ⚠️ أي تغيير بوابات/عضوية يستلزم إعادة تشغيل سكربت البناء. */
      genreJoin = 'JOIN movies_by_genre g ON g.tmdb_id = movies.tmdb_id'
      conditions.push('g.genre_id = ?')
      args.push(Number(genreRow.tmdb_id))
      sortRef = 'g'
    }
    
    if (year) {
      if (year === 'before-1990') {
        conditions.push('movies.release_year < 1990')
      } else if (year.includes('-')) {
        const [from, to] = year.split('-').map(Number)
        if (Number.isFinite(from) && Number.isFinite(to)) {
          conditions.push('movies.release_year BETWEEN ? AND ?')
          args.push(from, to)
        }
      } else {
        const y = parseInt(year)
        if (Number.isFinite(y)) {
          conditions.push('movies.release_year = ?')
          args.push(y)
        }
      }
    }

    if (country) {
      conditions.push(`movies.countries_json LIKE ?`)
      args.push(`%${country}%`)
    }

    if (language) {
      const languages = language.split(',').map(l => l.trim()).filter(l => l)
      if (languages.length === 1) {
        conditions.push('movies.original_language = ?')
        args.push(languages[0])
      } else if (languages.length > 1) {
        const placeholders = languages.map(() => '?').join(',')
        conditions.push(`movies.original_language IN (${placeholders})`)
        args.push(...languages)
      }
    }

    if (ratingMin) {
      if (ratingMin.includes('-')) {
        const [min, max] = ratingMin.split('-').map(parseFloat)
        conditions.push('movies.vote_average BETWEEN ? AND ?')
        args.push(min, max)
      } else {
        conditions.push('movies.vote_average >= ?')
        args.push(parseFloat(ratingMin))
      }
    }
    
    /* (E-13) الفلاتر المزالة من هذا المسار: rating_max + runtime_min/max — لا ترسلها أي واجهة */

    // Exclude unwanted genres (Talk Show, War & Politics, Documentary, History) —
    // anti-join على جدول الممنوعات المُجمّع (probe واحد لكل صف مرشَّح) بدل json_each
    // الذي كان يمسح الكتالوج كاملًا. نفس الدلالات: genres_json IS NULL ⇒ يُقبل.
    conditions.push(`(movies.genres_json IS NULL OR eg.tmdb_id IS NULL)`)

    // بوابة الإخفاء — لا يظهر المحجوب (blocked) ولا المحتاج للمراجعة في أي قائمة أو بحث
    // جولة السياسة: + فلتر السنة (release_year >= 2000) وempty_date مستبعد
    /* بوابة الإخفاء — صياغة موحّدة حرفيًا مع الفهرس الجزئي idx_movies_listing:
       IFNULL(filter_status,'clean') IN (…) مكافئة منطقيًا 100% لـ IN (…) OR IS NULL،
       وبدونها لا يستخدم المُخطِّط الفهرس الجزئي وتعود USE TEMP B-TREE (أثر: 468030 صفًا مقروءًا). */
    conditions.push(`(IFNULL(movies.filter_status, 'clean') IN ('clean', 'reviewed_approved'))`)
    conditions.push(`(movies.release_year IS NOT NULL AND movies.release_year >= 2000)`)
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const validSorts = ['popularity', 'vote_average', 'vote_count', 'release_year']
    const sortColumn = validSorts.includes(sort) ? sort : 'popularity'
    const sortOrder  = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    
    // Use cache for first page top rated with no filters
    if (page === 1 && sort === 'vote_average' && !genre && !year && !country && !language && !ratingMin && !search) {
      try {
        const cacheRows = await executeAll(
          `SELECT id, tmdb_id, slug, title_ar, title_en, poster_path,
                  vote_average, release_year, genres_json, overview_ar
           FROM list_movies_top_rated
           ORDER BY rank ASC
           LIMIT ? OFFSET ?`,
          [limit + 1, offset]
        )
        const hasMore = cacheRows.length > limit
        if (hasMore) cacheRows.pop()
        const filteredCache = filterExcludedGenres(cacheRows)
        const response = NextResponse.json({
          movies: filteredCache,
          pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page }
        })
        response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
        return response
      } catch (err) {
        console.error('Cache query failed, returning empty:', err)
        return NextResponse.json({
          movies: [],
          pagination: { page, limit, hasMore: false, totalPages: 1 }
        })
      }
    }
    
    const rows = await executeAll(
      `SELECT movies.id, movies.tmdb_id, movies.slug, movies.title_ar, movies.title_en, movies.poster_path,
              movies.vote_average, movies.release_year,
              movies.genres_json, movies.overview_ar, movies.original_language
       FROM movies
       LEFT JOIN excluded_genre_movie_ids eg ON eg.tmdb_id = movies.tmdb_id
       ${ftsJoin}
       ${genreJoin}
       ${whereClause}
       ORDER BY ${search ? 'rank,' : ''} ${sortRef}.${sortColumn} ${sortOrder}, movies.id ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...args, limit + 1, offset]
    )

    const hasMore = rows.length > limit
    if (hasMore) rows.pop()
    const filteredRows = filterExcludedGenres(rows)

    // Broad listings are stable — cache longer at the CDN; narrow/heavy filters less so
    const cacheTime = (genre || ratingMin || search) ? 120 : 300
    const response = NextResponse.json({
      movies: filteredRows,
      pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page }
    })
    response.headers.set('Cache-Control', `public, s-maxage=${cacheTime}, stale-while-revalidate=600`)
    return response
  } catch (error) {
    console.error('Error fetching movies:', error)
    return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 })
  }
}
