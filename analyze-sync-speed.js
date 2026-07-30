/**
 * تحليل شامل لسرعة المزامنة والـ tmdb_id
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env.local') })
const { createClient } = require('@libsql/client')
const Database = require('better-sqlite3')
const path = require('path')

async function main() {
  const localDb = new Database(path.join(__dirname, 'data', '4cima-local.db'), { readonly: true })
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  })

  console.log('═'.repeat(80))
  console.log('📊 تحليل شامل: ingestion_progress + سرعة المزامنة')
  console.log('═'.repeat(80))
  console.log('')

  // ============================================================
  // 1) فحص ingestion_progress
  // ============================================================
  console.log('1️⃣  فحص ingestion_progress')
  console.log('─'.repeat(80))
  const progress = localDb.prepare('SELECT * FROM ingestion_progress').all()
  progress.forEach(row => {
    console.log(`  Script: ${row.script_name}`)
    console.log(`  Last Processed TMDB ID: ${row.last_processed_tmdb_id.toLocaleString('en-US')}`)
    console.log(`  Status: ${row.status}`)
    console.log(`  Last Run: ${row.last_run}`)
    console.log('')
  })

  // ============================================================
  // 2) فحص Movies vs ingestion_progress
  // ============================================================
  console.log('2️⃣  فحص Movies')
  console.log('─'.repeat(80))
  const movieStats = localDb.prepare(`
    SELECT 
      MIN(tmdb_id) as min_id,
      MAX(tmdb_id) as max_id,
      COUNT(*) as total,
      COUNT(DISTINCT tmdb_id) as unique_ids
    FROM movies
    WHERE is_complete = 1
  `).get()

  console.log(`  Min TMDB ID: ${movieStats.min_id.toLocaleString('en-US')}`)
  console.log(`  Max TMDB ID: ${movieStats.max_id.toLocaleString('en-US')}`)
  console.log(`  Total Complete: ${movieStats.total.toLocaleString('en-US')}`)
  console.log(`  Unique IDs: ${movieStats.unique_ids.toLocaleString('en-US')}`)
  console.log(`  ID Range: ${(movieStats.max_id - movieStats.min_id + 1).toLocaleString('en-US')}`)
  console.log(`  Coverage: ${((movieStats.total / (movieStats.max_id - movieStats.min_id + 1)) * 100).toFixed(2)}%`)
  console.log('')

  // ============================================================
  // 3) فحص TV Series vs ingestion_progress
  // ============================================================
  console.log('3️⃣  فحص TV Series')
  console.log('─'.repeat(80))
  const seriesStats = localDb.prepare(`
    SELECT 
      MIN(tmdb_id) as min_id,
      MAX(tmdb_id) as max_id,
      COUNT(*) as total,
      COUNT(DISTINCT tmdb_id) as unique_ids
    FROM tv_series
    WHERE is_complete = 1
  `).get()

  console.log(`  Min TMDB ID: ${seriesStats.min_id.toLocaleString('en-US')}`)
  console.log(`  Max TMDB ID: ${seriesStats.max_id.toLocaleString('en-US')}`)
  console.log(`  Total Complete: ${seriesStats.total.toLocaleString('en-US')}`)
  console.log(`  Unique IDs: ${seriesStats.unique_ids.toLocaleString('en-US')}`)
  console.log(`  ID Range: ${(seriesStats.max_id - seriesStats.min_id + 1).toLocaleString('en-US')}`)
  console.log(`  Coverage: ${((seriesStats.total / (seriesStats.max_id - seriesStats.min_id + 1)) * 100).toFixed(2)}%`)
  console.log('')

  // ============================================================
  // 4) فحص العلاقة
  // ============================================================
  console.log('4️⃣  تحليل العلاقة')
  console.log('─'.repeat(80))

  const progressId = progress.find(p => p.script_name === 'run-ingestion.js')?.last_processed_tmdb_id || 0

  console.log(`  ingestion_progress ID: ${progressId.toLocaleString('en-US')}`)
  console.log(`  Movies Max ID: ${movieStats.max_id.toLocaleString('en-US')}`)
  console.log(`  TV Series Max ID: ${seriesStats.max_id.toLocaleString('en-US')}`)
  console.log('')

  if (seriesStats.max_id === progressId || Math.abs(seriesStats.max_id - progressId) < 100) {
    console.log('  ✅ ingestion_progress يتتبع المسلسلات فقط (TV Series)')
    console.log('     المسلسلات: السحب مكتمل حتى ID ' + seriesStats.max_id.toLocaleString('en-US'))
  } else {
    console.log('  ⚠️  علاقة غير واضحة بين ingestion_progress والبيانات')
  }

  if (movieStats.max_id > 1700000) {
    console.log('  ✅ الأفلام: السحب مكتمل (وصلنا لأحدث IDs على TMDB)')
    console.log('     Max Movie ID: ' + movieStats.max_id.toLocaleString('en-US'))
  } else {
    console.log('  ⚠️  الأفلام: قد يكون السحب غير مكتمل')
  }
  console.log('')

  // ============================================================
  // 5) فحص عدد المسلسلات المتزامنة في Turso حالياً
  // ============================================================
  console.log('5️⃣  فحص عدد المسلسلات في Turso حالياً')
  console.log('─'.repeat(80))

  try {
    const tursoCount = await turso.execute('SELECT COUNT(*) as count FROM tv_series')
    const currentCount = tursoCount.rows[0].count
    console.log(`  عدد المسلسلات في Turso: ${currentCount.toLocaleString('en-US')}`)
    console.log(`  عدد المسلسلات المحلية (complete+clean): ${seriesStats.total.toLocaleString('en-US')}`)
    console.log(`  الباقي للمزامنة: ${(seriesStats.total - currentCount).toLocaleString('en-US')}`)
    console.log('')
  } catch (err) {
    console.error('  ❌ فشل الاتصال بـ Turso:', err.message)
  }

  // ============================================================
  // 6) تحليل حجم episodes_json
  // ============================================================
  console.log('6️⃣  تحليل حجم episodes_json')
  console.log('─'.repeat(80))

  const episodesAnalysis = localDb.prepare(`
    SELECT 
      tmdb_id,
      name_en,
      number_of_episodes,
      LENGTH(episodes_json) as json_size,
      LENGTH(seasons_json) as seasons_size
    FROM (
      SELECT 
        ts.tmdb_id, 
        ts.name_en,
        ts.number_of_episodes,
        (SELECT json_group_array(json_object(
          'season_number', season_number,
          'episode_number', episode_number,
          'name_en', name_en,
          'overview_en', overview_en,
          'still_path', still_path,
          'air_date', air_date,
          'runtime', runtime,
          'vote_average', vote_average
        )) FROM episodes WHERE series_tmdb_id = ts.tmdb_id) as episodes_json,
        (SELECT json_group_array(json_object(
          'season_number', season_number,
          'name_en', name_en,
          'episode_count', episode_count,
          'air_date', air_date,
          'poster_path', poster_path
        )) FROM seasons WHERE series_tmdb_id = ts.tmdb_id) as seasons_json
      FROM tv_series ts
      WHERE ts.is_complete = 1 
        AND ts.filter_status IN ('clean', 'reviewed_approved')
        AND ts.synced_to_turso = 0
      LIMIT 100
    )
    ORDER BY json_size DESC
    LIMIT 10
  `).all()

  console.log('  أكبر 10 مسلسلات من حيث حجم episodes_json:')
  episodesAnalysis.forEach((s, i) => {
    const mbSize = (s.json_size / (1024 * 1024)).toFixed(2)
    console.log(`    ${i+1}. ${s.name_en || 'N/A'} (${s.tmdb_id})`)
    console.log(`       Episodes: ${s.number_of_episodes} | JSON Size: ${mbSize} MB`)
  })
  console.log('')

  // ============================================================
  // 7) قياس سرعة batch واحد (5 مسلسلات صغيرة)
  // ============================================================
  console.log('7️⃣  قياس سرعة Batch (5 مسلسلات)')
  console.log('─'.repeat(80))

  const testBatch = localDb.prepare(`
    SELECT tmdb_id 
    FROM tv_series
    WHERE is_complete = 1 
      AND filter_status IN ('clean', 'reviewed_approved')
      AND synced_to_turso = 0
      AND number_of_episodes <= 50
    LIMIT 5
  `).all().map(r => r.tmdb_id)

  if (testBatch.length > 0) {
    console.log(`  اختبار مع ${testBatch.length} مسلسلات صغيرة (≤50 حلقة)`)
    
    const statements = []
    for (const tmdb_id of testBatch) {
      const series = localDb.prepare('SELECT * FROM tv_series WHERE tmdb_id = ?').get(tmdb_id)
      
      const genres = localDb.prepare(`
        SELECT g.tmdb_id, g.name_en, g.name_ar, g.slug
        FROM genres g
        JOIN content_genres cg ON g.tmdb_id = cg.genre_tmdb_id
        WHERE cg.content_tmdb_id = ? AND cg.content_type = 'tv'
      `).all(tmdb_id)
      
      const cast = localDb.prepare(`
        SELECT p.tmdb_id, p.name_en, p.name_ar, p.profile_path,
               cc.character_name, cc.cast_order
        FROM people p
        JOIN cast_crew cc ON p.tmdb_id = cc.person_tmdb_id
        WHERE cc.content_tmdb_id = ? AND cc.content_type = 'tv'
          AND cc.role_type = 'cast'
        ORDER BY cc.cast_order
        LIMIT 10
      `).all(tmdb_id)
      
      const seasons = localDb.prepare(`
        SELECT season_number, name_en, episode_count, air_date, poster_path
        FROM seasons WHERE series_tmdb_id = ?
        ORDER BY season_number
      `).all(tmdb_id)
      
      const episodes = localDb.prepare(`
        SELECT season_number, episode_number, name_en, overview_en,
               still_path, air_date, runtime, vote_average
        FROM episodes WHERE series_tmdb_id = ?
        ORDER BY season_number, episode_number
      `).all(tmdb_id)
      
      statements.push({
        sql: `
          INSERT INTO tv_series (
            id, tmdb_id, slug, name_en, name_ar, overview_ar,
            poster_path, backdrop_path, first_air_date, first_air_year,
            number_of_seasons, number_of_episodes, status,
            vote_average, vote_count, popularity, trailer_key,
            genres_json, cast_json, seasons_json, episodes_json,
            seo_title_ar, seo_description_ar, seo_keywords_json,
            canonical_url, created_at, updated_at, filter_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(tmdb_id) DO UPDATE SET updated_at = excluded.updated_at
        `,
        args: [
          series.tmdb_id, series.tmdb_id, series.slug,
          series.name_en, series.name_ar, series.overview_ar,
          series.poster_path, series.backdrop_path,
          series.first_air_date, series.first_air_year,
          series.number_of_seasons, series.number_of_episodes, series.status,
          series.vote_average, series.vote_count, series.popularity,
          series.trailer_key,
          JSON.stringify(genres),
          JSON.stringify(cast),
          JSON.stringify(seasons),
          JSON.stringify(episodes),
          series.seo_title_ar, series.seo_description_ar, null,
          series.canonical_url,
          series.created_at, series.updated_at,
          series.filter_status
        ]
      })
    }
    
    const startTime = Date.now()
    try {
      await turso.batch(statements, 'write')
      const duration = Date.now() - startTime
      console.log(`  ✅ نجح في ${duration}ms (${(duration/1000).toFixed(2)} ثانية)`)
      console.log(`  معدل: ${(duration / testBatch.length).toFixed(0)}ms لكل مسلسل`)
      console.log('')
      
      // حساب تقديري للوقت الكامل
      const tursoCountResult = await turso.execute('SELECT COUNT(*) as count FROM tv_series')
      const currentTursoCount = tursoCountResult.rows[0].count
      const remainingCount = seriesStats.total - currentTursoCount
      const estimatedSeconds = (duration / testBatch.length) * remainingCount / 1000
      const estimatedMinutes = (estimatedSeconds / 60).toFixed(1)
      const estimatedHours = (estimatedSeconds / 3600).toFixed(1)
      
      console.log('  📊 تقدير الوقت الكامل للمزامنة:')
      console.log(`     باقي: ${remainingCount.toLocaleString('en-US')} مسلسل`)
      console.log(`     وقت متوقع: ${estimatedMinutes} دقيقة (${estimatedHours} ساعة)`)
      
    } catch (err) {
      const duration = Date.now() - startTime
      console.error(`  ❌ فشل بعد ${duration}ms:`, err.message)
    }
  } else {
    console.log('  ⚠️  لا توجد مسلسلات صغيرة متاحة للاختبار')
  }

  console.log('')
  console.log('═'.repeat(80))
  console.log('📋 ملخص النتائج والتوصيات')
  console.log('═'.repeat(80))
  console.log('')
  console.log('سيتم عرض التوصيات بناءً على النتائج أعلاه')
  console.log('')

  localDb.close()
}

main().catch(console.error)
