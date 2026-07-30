#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')
const db = require('./scripts/services/local-db')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

// Helper function (من السكريبت الأصلي)
function toJsonOrNull(value) {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return null
}

async function syncTestMovie(tmdb_id) {
  const movie = db.prepare('SELECT * FROM movies WHERE tmdb_id = ?').get(tmdb_id)
  if (!movie) {
    console.log(`❌ Movie ${tmdb_id} not found in local.db`)
    return null
  }
  
  // نفس منطق السكريبت الأصلي بالظبط
  const genres = db.prepare(`
    SELECT g.tmdb_id, g.name_en, g.name_ar, g.slug
    FROM genres g
    JOIN content_genres cg ON g.tmdb_id = cg.genre_tmdb_id
    WHERE cg.content_tmdb_id = ? AND cg.content_type = 'movie'
  `).all(tmdb_id)
  
  const cast = db.prepare(`
    SELECT p.tmdb_id, p.name_en, p.name_ar, p.profile_path,
           cc.character_name, cc.cast_order
    FROM people p
    JOIN cast_crew cc ON p.tmdb_id = cc.person_tmdb_id
    WHERE cc.content_tmdb_id = ? AND cc.content_type = 'movie'
      AND cc.role_type = 'cast'
    ORDER BY cc.cast_order
    LIMIT 10
  `).all(tmdb_id)
  
  const countries = movie.country_of_origin 
    ? [{ name: movie.country_of_origin }]
    : []
  
  try {
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
          genres_json = excluded.genres_json
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
        toJsonOrNull(movie.keywords_json),
        toJsonOrNull(movie.companies_json),
        movie.seo_title_ar, movie.seo_description_ar, toJsonOrNull(movie.seo_keywords_json),
        movie.canonical_url,
        movie.created_at, movie.updated_at,
        movie.filter_status, movie.original_language || null
      ]
    })
    
    return {
      tmdb_id,
      title: movie.title_ar || movie.title_en,
      genres,
      success: true
    }
  } catch (err) {
    return {
      tmdb_id,
      error: err.message,
      success: false
    }
  }
}

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('🧪 اختبار genres_json قبل full sync')
  console.log('═══════════════════════════════════════════\n')
  
  const testIds = [11, 12, 13, 14, 15] // Star Wars, Finding Nemo, Forrest Gump, American Beauty, Citizen Kane
  
  console.log('🔄 مزامنة 5 أفلام اختبار...\n')
  
  const results = []
  for (const tmdb_id of testIds) {
    const result = await syncTestMovie(tmdb_id)
    if (result) {
      results.push(result)
      if (result.success) {
        console.log(`✅ ${tmdb_id}: ${result.title} (${result.genres.length} تصنيف)`)
      } else {
        console.log(`❌ ${tmdb_id}: ${result.error}`)
      }
    }
  }
  
  console.log('\n🔍 فحص genres_json في Turso...')
  console.log('───────────────────────────────────────────\n')
  
  let allValid = true
  
  for (const tmdb_id of testIds) {
    const tursoResult = await turso.execute({
      sql: 'SELECT tmdb_id, title_ar, title_en, genres_json FROM movies WHERE tmdb_id = ?',
      args: [tmdb_id]
    })
    
    if (tursoResult.rows && tursoResult.rows.length > 0) {
      const movie = tursoResult.rows[0]
      const genres = JSON.parse(movie.genres_json || '[]')
      
      console.log(`🎬 ${tmdb_id}: ${movie.title_ar || movie.title_en}`)
      console.log(`   عدد التصنيفات: ${genres.length}`)
      
      if (genres.length === 0) {
        console.log(`   ⚠️ لا توجد تصنيفات!`)
        allValid = false
      } else {
        // فحص كل تصنيف
        let hasUndefined = false
        genres.forEach((g, i) => {
          const tmdbId = g.tmdb_id
          const slug = g.slug
          
          if (tmdbId === undefined || tmdbId === null || slug === undefined || slug === null) {
            console.log(`   ❌ تصنيف ${i + 1}: tmdb_id=${tmdbId}, slug=${slug} (undefined!)`)
            hasUndefined = true
            allValid = false
          } else {
            console.log(`   ✅ تصنيف ${i + 1}: ${tmdbId} - ${g.name_ar || g.name_en} (${slug})`)
          }
        })
        
        if (!hasUndefined) {
          console.log(`   ✅ كل التصنيفات صحيحة (لا يوجد undefined)`)
        }
      }
      console.log('')
    }
  }
  
  console.log('═══════════════════════════════════════════')
  console.log('📊 النتيجة النهائية:')
  console.log('═══════════════════════════════════════════\n')
  
  if (allValid) {
    console.log('✅ الاختبار نجح!')
    console.log('   - كل الأفلام فيها genres_json صحيح')
    console.log('   - كل tmdb_id موجود وليس undefined')
    console.log('   - كل slug موجود وليس undefined')
    console.log('')
    console.log('✅ السكريبت جاهز لـ full sync على الـ268K فيلم')
  } else {
    console.log('❌ الاختبار فشل!')
    console.log('   - فيه genres_json مكسور أو undefined')
    console.log('   - لازم نراجع السكريبت قبل full sync')
    console.log('')
    console.log('⚠️ لا تشغل full sync حتى يتم إصلاح المشكلة!')
    process.exit(1)
  }
}

main().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
