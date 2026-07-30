#!/usr/bin/env node
/**
 * Test sync of 50 complete movies to diagnose data transfer issues
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env.local') })
const { createClient } = require('@libsql/client')
const Database = require('better-sqlite3')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

const localDb = new Database('./data/4cima-local.db', { readonly: true })

const TEST_LIMIT = 50

async function main() {
  console.log('🔍 بدء اختبار المزامنة على 50 فيلم...\n')
  
  // Get 50 complete movies from local
  const movies = localDb.prepare(`
    SELECT * FROM movies 
    WHERE is_complete = 1 
    AND filter_status IN ('clean', 'reviewed_approved')
    LIMIT ?
  `).all(TEST_LIMIT)
  
  console.log(`✅ وجدت ${movies.length} فيلم كامل في Local\n`)
  
  if (movies.length === 0) {
    console.log('❌ لا توجد أفلام كاملة للاختبار!')
    return
  }
  
  console.log('📊 فحص عينة من الأفلام المحلية:\n')
  
  // Sample first 3 movies to check their data structure
  movies.slice(0, 3).forEach((movie, idx) => {
    console.log(`--- فيلم ${idx + 1}: ${movie.title_ar} ---`)
    console.log('  tmdb_id:', movie.tmdb_id)
    console.log('  title_ar:', movie.title_ar)
    console.log('  title_en:', movie.title_en)
    console.log('  original_language:', movie.original_language || '⚠️ NULL')
    console.log('  slug:', movie.slug)
    console.log('  backdrop_path:', movie.backdrop_path || '⚠️ NULL')
    
    // Check genres
    const genres = localDb.prepare(`
      SELECT g.name_ar FROM genres g
      JOIN content_genres cg ON g.tmdb_id = cg.genre_tmdb_id
      WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
    `).all(movie.tmdb_id)
    console.log('  genres:', genres.length > 0 ? genres.map(g => g.name_ar).join(', ') : '⚠️ NONE')
    console.log('')
  })
  
  console.log('🚀 بدء المزامنة إلى Turso...\n')
  
  let synced = 0
  let failed = 0
  const issues = []
  
  for (const movie of movies) {
    try {
      // Prepare genres
      const genres = localDb.prepare(`
        SELECT g.tmdb_id, g.name_en, g.name_ar, g.slug
        FROM genres g
        JOIN content_genres cg ON g.tmdb_id = cg.genre_tmdb_id
        WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
      `).all(movie.tmdb_id)
      
      // Prepare cast
      const cast = localDb.prepare(`
        SELECT p.tmdb_id, p.name_en, p.name_ar, p.profile_path,
               cc.character_name, cc.cast_order
        FROM people p
        JOIN cast_crew cc ON p.tmdb_id = cc.person_tmdb_id
        WHERE cc.content_tmdb_id = ? AND cc.content_type = 'movie'
          AND cc.role_type = 'cast'
        ORDER BY cc.cast_order
        LIMIT 10
      `).all(movie.tmdb_id)
      
      const countries = movie.country_of_origin 
        ? [{ name: movie.country_of_origin }]
        : []
      
      await turso.execute({
        sql: `
          INSERT INTO movies (
            id, tmdb_id, slug,
            title_en, title_ar,
            overview_ar,
            poster_path, backdrop_path,
            release_date, release_year,
            vote_average, vote_count, popularity, runtime,
            trailer_key,
            genres_json, cast_json, countries_json,
            keywords_json, companies_json,
            seo_title_ar, seo_description_ar, seo_keywords_json,
            canonical_url,
            created_at, updated_at,
            filter_status, original_language
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(tmdb_id) DO UPDATE SET
            slug = excluded.slug,
            title_en = excluded.title_en,
            title_ar = excluded.title_ar,
            overview_ar = excluded.overview_ar,
            poster_path = excluded.poster_path,
            backdrop_path = excluded.backdrop_path,
            release_date = excluded.release_date,
            release_year = excluded.release_year,
            vote_average = excluded.vote_average,
            vote_count = excluded.vote_count,
            popularity = excluded.popularity,
            runtime = excluded.runtime,
            trailer_key = excluded.trailer_key,
            genres_json = excluded.genres_json,
            cast_json = excluded.cast_json,
            countries_json = excluded.countries_json,
            keywords_json = excluded.keywords_json,
            companies_json = excluded.companies_json,
            seo_title_ar = excluded.seo_title_ar,
            seo_description_ar = excluded.seo_description_ar,
            seo_keywords_json = excluded.seo_keywords_json,
            canonical_url = excluded.canonical_url,
            updated_at = excluded.updated_at,
            filter_status = excluded.filter_status,
            original_language = excluded.original_language
        `,
        args: [
          movie.tmdb_id, movie.tmdb_id, movie.slug,
          movie.title_en, movie.title_ar,
          movie.overview_ar,
          movie.poster_path, movie.backdrop_path,
          movie.release_date, movie.release_year,
          movie.vote_average, movie.vote_count, movie.popularity, movie.runtime,
          movie.trailer_key,
          JSON.stringify(genres),
          JSON.stringify(cast),
          JSON.stringify(countries),
          movie.keywords_json,
          movie.companies_json,
          movie.seo_title_ar, movie.seo_description_ar, movie.seo_keywords_json,
          movie.canonical_url,
          movie.created_at, movie.updated_at,
          movie.filter_status,
          movie.original_language  // ⚠️ هنا العمود المهم
        ]
      })
      
      synced++
      
      // Track issues
      if (!movie.original_language) {
        issues.push({ tmdb_id: movie.tmdb_id, title: movie.title_ar, issue: 'original_language is NULL in Local' })
      }
      if (!movie.backdrop_path) {
        issues.push({ tmdb_id: movie.tmdb_id, title: movie.title_ar, issue: 'backdrop_path is NULL in Local' })
      }
      if (genres.length === 0) {
        issues.push({ tmdb_id: movie.tmdb_id, title: movie.title_ar, issue: 'No genres in Local' })
      }
      
    } catch (error) {
      failed++
      console.error(`❌ فشل فيلم ${movie.tmdb_id}:`, error.message)
    }
  }
  
  console.log('\n📊 نتيجة المزامنة:')
  console.log(`  ✅ نجح: ${synced}`)
  console.log(`  ❌ فشل: ${failed}`)
  
  if (issues.length > 0) {
    console.log(`\n⚠️ مشاكل في البيانات المصدرية (${issues.length} مشكلة):`)
    issues.slice(0, 10).forEach(issue => {
      console.log(`  - ${issue.title} (${issue.tmdb_id}): ${issue.issue}`)
    })
    if (issues.length > 10) {
      console.log(`  ... و ${issues.length - 10} مشكلة أخرى`)
    }
  }
  
  // Verify in Turso
  console.log('\n🔍 التحقق من البيانات في Turso...\n')
  
  const sampleIds = movies.slice(0, 5).map(m => m.tmdb_id)
  
  for (const tmdb_id of sampleIds) {
    const result = await turso.execute({
      sql: 'SELECT tmdb_id, title_ar, original_language, backdrop_path, genres_json FROM movies WHERE tmdb_id = ?',
      args: [tmdb_id]
    })
    
    if (result.rows.length > 0) {
      const row = result.rows[0]
      console.log(`✅ ${row.title_ar} (${row.tmdb_id}):`)
      console.log(`   original_language: ${row.original_language || '❌ NULL'}`)
      console.log(`   backdrop_path: ${row.backdrop_path ? '✅' : '❌ NULL'}`)
      console.log(`   genres_json: ${row.genres_json ? JSON.parse(row.genres_json).length + ' تصنيفات' : '❌ NULL'}`)
      console.log('')
    }
  }
  
  localDb.close()
}

main().catch(console.error)
