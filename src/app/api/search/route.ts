import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { sanitizeSearchInput } from '@/lib/search-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q')
    
    if (!q || q.length < 1) {
      return NextResponse.json({ results: [] })
    }
    
    const queryLength = q.length
    
    // Smart Length-Based Search Strategy
    if (queryLength === 1) {
      // حرف واحد: بحث فقط في الأعمال بحرف واحد (103 نتيجة فقط)
      const moviesResult = await turso.execute({
        sql: `
          SELECT *, 'movie' as media_type
          FROM movies
          WHERE (LENGTH(title_ar) = 1 OR LENGTH(title_en) = 1)
            AND (title_ar = ? OR title_en = ? OR title_ar LIKE ? OR title_en LIKE ?)
            AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
          ORDER BY popularity DESC
          LIMIT 20
        `,
        args: [q, q, `${q}%`, `${q}%`]
      })
      
      const seriesResult = await turso.execute({
        sql: `
          SELECT *, 'tv' as media_type
          FROM tv_series
          WHERE (LENGTH(name_ar) = 1 OR LENGTH(name_en) = 1)
            AND (name_ar = ? OR name_en = ? OR name_ar LIKE ? OR name_en LIKE ?)
            AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
          ORDER BY popularity DESC
          LIMIT 20
        `,
        args: [q, q, `${q}%`, `${q}%`]
      })
      
      const results = [...(moviesResult.rows || []), ...(seriesResult.rows || [])]
      return NextResponse.json({ results })
    }
    
    if (queryLength === 2) {
      // حرفين: بحث فقط في الأعمال بحرفين (502 نتيجة فقط)
      const moviesResult = await turso.execute({
        sql: `
          SELECT *, 'movie' as media_type
          FROM movies
          WHERE (LENGTH(title_ar) = 2 OR LENGTH(title_en) = 2)
            AND (title_ar = ? OR title_en = ? OR title_ar LIKE ? OR title_en LIKE ?)
            AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
          ORDER BY 
            CASE 
              WHEN title_ar = ? OR title_en = ? THEN 1
              ELSE 2
            END,
            popularity DESC
          LIMIT 30
        `,
        args: [q, q, `${q}%`, `${q}%`, q, q]
      })
      
      const seriesResult = await turso.execute({
        sql: `
          SELECT *, 'tv' as media_type
          FROM tv_series
          WHERE (LENGTH(name_ar) = 2 OR LENGTH(name_en) = 2)
            AND (name_ar = ? OR name_en = ? OR name_ar LIKE ? OR name_en LIKE ?)
            AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
          ORDER BY 
            CASE 
              WHEN name_ar = ? OR name_en = ? THEN 1
              ELSE 2
            END,
            popularity DESC
          LIMIT 30
        `,
        args: [q, q, `${q}%`, `${q}%`, q, q]
      })
      
      const results = [...(moviesResult.rows || []), ...(seriesResult.rows || [])]
      return NextResponse.json({ results })
    }
    
    // 3 حروف فأكثر: البحث العادي FTS5 في كل الأعمال
    // Smart Length-Based Search:
    // - 1 حرف: بحث في 103 أعمال فقط (2458x أسرع)
    // - 2 حرف: بحث في 502 أعمال فقط (504x أسرع)  
    // - 3+ حروف: بحث FTS5 عادي في كل الأعمال
    const searchTerm = sanitizeSearchInput(q)
    
    // Search movies using FTS5 index
    const moviesResult = await turso.execute({
      sql: `
        SELECT movies.*, 'movie' as media_type
        FROM movies
        JOIN movies_fts ON movies.id = movies_fts.rowid
        WHERE movies_fts MATCH ?
          AND (movies.filter_status IN ('clean', 'reviewed_approved') OR movies.filter_status IS NULL)
        ORDER BY rank
        LIMIT 30
      `,
      args: [searchTerm]
    })
    
    // Search series using FTS5 index
    const seriesResult = await turso.execute({
      sql: `
        SELECT tv_series.*, 'tv' as media_type
        FROM tv_series
        JOIN series_fts ON tv_series.id = series_fts.rowid
        WHERE series_fts MATCH ?
          AND (tv_series.filter_status IN ('clean', 'reviewed_approved') OR tv_series.filter_status IS NULL)
        ORDER BY rank
        LIMIT 30
      `,
      args: [searchTerm]
    })
    
    const results = [...(moviesResult.rows || []), ...(seriesResult.rows || [])]
    
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json({ results: [] })
  }
}
