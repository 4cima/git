import { NextRequest, NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'
import { sanitizeSearchInput } from '@/lib/search-utils'
import { resolveGenreSlug } from '@/lib/genre-siblings'
import { filterExcludedGenres } from '@/utils/excludedGenres'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const page   = Math.max(1, parseInt(searchParams.get('page')  || '1')  || 1)
    const limit  = Math.min(60, Math.max(1, parseInt(searchParams.get('limit') || '24') || 24))
    const offset = (page - 1) * limit
    
    const genre     = searchParams.get('genre')
    const year      = searchParams.get('year')
    const country   = searchParams.get('country')
    const language  = searchParams.get('language')
    const ratingMin = searchParams.get('rating_min')
    const search    = searchParams.get('search')
    const sort      = searchParams.get('sort')  || 'popularity'
    const order     = searchParams.get('order') || 'desc'
    
    const conditions: string[] = []
    const args: (string | number)[] = []

    /* الفهرس المجمّع للتصنيف (series_by_genre) — يُفعَّل مع ?genre= فقط */
    let genreJoin = ''
    let sortRef = 'tv_series'

    if (genre) {
      /* مطابقة موحّدة مع SSR — alias السلاج ثم slug → tmdb_id من جدول genres.
         العضوية محسوبة مسبقًا في series_by_genre (scripts/build-genre-index.js —
         نسخة مادية من قواعد buildTvGenreClause التفريقية: أكشن = 10759 بدون
         53/10765/14/878، مغامرة/رعب/فانتازيا/ساي-فاي بقواعدها…) ⇒ بحث نطاقي
         على PK (genre_id, sort, id) بقراءة ~25-50 صفًا بدل json_each الحي.
         أعمدة العرض من tv_series الحي (JOIN بالـPK) — العضوية والترتيب مادّيان.
         ⚠️ أي تعديل على buildTvGenreClause يستلزم إعادة تشغيل سكربت البناء. */
      const genreRow = await executeFirst('SELECT tmdb_id FROM genres WHERE slug = ? LIMIT 1', [resolveGenreSlug(genre)]).catch(() => null)
      if (!genreRow || genreRow.tmdb_id == null) {
        // تصنيف غير معروف — مكافئ notFound() في SSR: قائمة فارغة بلا شرط WHERE خاطئ
        const unknownGenre = NextResponse.json({
          series: [],
          pagination: { page, limit, hasMore: false, totalPages: 1 }
        })
        return unknownGenre
      }
      genreJoin = 'JOIN series_by_genre g ON g.tmdb_id = tv_series.tmdb_id'
      conditions.push('g.genre_id = ?')
      args.push(Number(genreRow.tmdb_id))
      sortRef = 'g'
    }
    
    let ftsJoin = ''
    if (search) {
      const sanitized = sanitizeSearchInput(search)
      if (sanitized) {
        ftsJoin = 'JOIN series_fts ON tv_series.id = series_fts.rowid'
        conditions.push('series_fts MATCH ?')
        args.push(sanitized)
      }
    }
    
    if (year) {
      if (year === 'before-1990') {
        conditions.push('tv_series.first_air_year < 1990')
      } else if (year.includes('-')) {
        const [from, to] = year.split('-').map(Number)
        if (Number.isFinite(from) && Number.isFinite(to)) {
          conditions.push('tv_series.first_air_year BETWEEN ? AND ?')
          args.push(from, to)
        }
      } else {
        const y = parseInt(year)
        if (Number.isFinite(y)) {
          conditions.push('tv_series.first_air_year = ?')
          args.push(y)
        }
      }
    }

    if (language) {
      const languages = language.split(',').map(l => l.trim().toLowerCase()).filter(Boolean)
      if (languages.length === 1) {
        conditions.push('tv_series.original_language = ?')
        args.push(languages[0])
      } else if (languages.length > 1) {
        const placeholders = languages.map(() => '?').join(',')
        conditions.push(`tv_series.original_language IN (${placeholders})`)
        args.push(...languages)
      }
    }

    if (country) {
      /* E-6: توحيد شكل شرط الدولة مع /api/movies (country_of_origin OR countries_json LIKE).
         قياس حي على D1 (2026-09-16): عمود tv_series.countries_json فارغ تماماً
         (0 صف غير NULL من 38,338)، لذا فرع LIKE لا يستعيد شيئاً اليوم والنتائج مطابقة
         تماماً للسابق (TR: 586، US: 6086، KR: 2376). استرجاع الصفوف ذات
         country_of_origin = NULL (5,226) يحتاج backfill لعمود countries_json —
         خارج نطاق هذه الجولة، والشرط جاهز له بلا تغيير في الواجهة. */
      conditions.push('(tv_series.country_of_origin = ? OR tv_series.countries_json LIKE ?)')
      args.push(country, `%${country}%`)
    }

    if (ratingMin) {
      if (ratingMin.includes('-')) {
        const [min, max] = ratingMin.split('-').map(parseFloat)
        conditions.push('tv_series.vote_average BETWEEN ? AND ?')
        args.push(min, max)
      } else {
        conditions.push('tv_series.vote_average >= ?')
        args.push(parseFloat(ratingMin))
      }
    }
    
    // Exclude unwanted genres (Talk Show, War & Politics, Documentary, History) —
    // anti-join على جدول الممنوعات المُجمّع بدل json_each الحي. نفس الدلالات:
    // genres_json IS NULL ⇒ يُقبل.
    conditions.push(`(tv_series.genres_json IS NULL OR es.tmdb_id IS NULL)`)

    // بوابة الإخفاء — لا يظهر المحجوب (blocked) ولا المحتاج للمراجعة في أي قائمة أو بحث
    // جولة السياسة: + فلتر السنة (first_air_year >= 2000) وempty_date مستبعد
    /* بوابة الإخفاء — صياغة موحّدة حرفيًا مع الفهرس الجزئي idx_tv_listing:
       IFNULL(filter_status,'clean') IN (…) مكافئة منطقيًا 100% لـ IN (…) OR IS NULL،
       وبدونها لا يستخدم المُخطِّط الفهرس الجزئي وتعود USE TEMP B-TREE (أثر: 128814 صفًا مقروءًا). */
    conditions.push(`(IFNULL(tv_series.filter_status, 'clean') IN ('clean', 'reviewed_approved'))`)
    conditions.push(`(tv_series.first_air_year IS NOT NULL AND tv_series.first_air_year >= 2000)`)
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const validSorts  = ['popularity', 'vote_average', 'vote_count', 'first_air_year']
    const sortColumn  = validSorts.includes(sort) ? sort : 'popularity'
    const sortOrder   = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    
    // Use cache for first page top rated with no filters
    if (page === 1 && sort === 'vote_average' && !genre && !year && !country && !language && !ratingMin && !search) {
      try {
        const cacheRows = await executeAll(
          `SELECT id, tmdb_id, slug, name_ar, name_en, poster_path,
                  vote_average, first_air_year, genres_json, overview_ar
           FROM list_series_top_rated
           ORDER BY rank ASC
           LIMIT ? OFFSET ?`,
          [limit + 1, offset]
        )
        const hasMore = cacheRows.length > limit
        if (hasMore) cacheRows.pop()
        const filteredCache = filterExcludedGenres(cacheRows)
        const response = NextResponse.json({
          series: filteredCache,
          pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page }
        })
        response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
        return response
      } catch (err) {
        console.error('Cache query failed, returning empty:', err)
        return NextResponse.json({
          series: [],
          pagination: { page, limit, hasMore: false, totalPages: 1 }
        })
      }
    }
    
    const rows = await executeAll(
      `SELECT
          tv_series.id, tv_series.tmdb_id, tv_series.slug, tv_series.name_ar, tv_series.name_en, tv_series.poster_path,
          tv_series.vote_average, tv_series.first_air_year,
          tv_series.genres_json, tv_series.overview_ar, tv_series.country_of_origin
       FROM tv_series
       LEFT JOIN excluded_genre_series_ids es ON es.tmdb_id = tv_series.tmdb_id
       ${ftsJoin}
       ${genreJoin}
       ${whereClause}
       ORDER BY ${search ? 'rank,' : ''} ${sortRef}.${sortColumn} ${sortOrder}, tv_series.id ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...args, limit + 1, offset]
    )

    const hasMore = rows.length > limit
    if (hasMore) rows.pop()
    const filteredRows = filterExcludedGenres(rows)

    // Broad listings are stable — cache longer at the CDN; narrow/heavy filters less so
    const cacheTime = (genre || ratingMin || search) ? 120 : 300
    const response  = NextResponse.json({
      series:     filteredRows,
      pagination: { page, limit, hasMore, totalPages: hasMore ? page + 1 : page }
    })
    response.headers.set('Cache-Control', `public, s-maxage=${cacheTime}, stale-while-revalidate=600`)
    return response
  } catch (error) {
    console.error('Error fetching series:', error)
    return NextResponse.json({ error: 'Failed to fetch series' }, { status: 500 })
  }
}
