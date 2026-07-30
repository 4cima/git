/**
 * قياس دقيق لـ batch واحد (50 مسلسل حقيقي)
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env.local') })
const { createClient } = require('@libsql/client')
const Database = require('better-sqlite3')
const path = require('path')

async function main() {
  const localDb = new Database(path.join(__dirname, 'data', '4cima-local.db'))
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  })

  console.log('═'.repeat(80))
  console.log('⏱️  قياس دقيق لـ BATCH واحد (50 مسلسل حقيقي)')
  console.log('═'.repeat(80))
  console.log('')

  // سحب 50 مسلسل حقيقي (مع التأكد من وجود slug)
  const seriesIds = localDb.prepare(`
    SELECT tmdb_id FROM tv_series
    WHERE is_complete = 1 
      AND filter_status IN ('clean', 'reviewed_approved')
      AND synced_to_turso = 0
      AND slug IS NOT NULL
      AND slug != ''
    LIMIT 50
  `).all().map(r => r.tmdb_id)

  console.log(`عدد المسلسلات: ${seriesIds.length}`)
  console.log('')

  // بناء الـ statements
  console.log('🔨 بناء statements...')
  const buildStart = Date.now()
  const statements = []

  for (const tmdb_id of seriesIds) {
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

  const buildTime = Date.now() - buildStart
  console.log(`   وقت البناء: ${buildTime}ms`)
  console.log('')

  // قياس إرسال الـ batch
  console.log('📤 إرسال batch إلى Turso...')
  const sendStart = Date.now()
  
  try {
    await turso.batch(statements, 'write')
    const sendTime = Date.now() - sendStart
    
    console.log(`   ✅ نجح في ${sendTime}ms`)
    console.log('')
    
    // تحديث القاعدة المحلية
    console.log('💾 تحديث القاعدة المحلية...')
    const updateStart = Date.now()
    const placeholders = seriesIds.map(() => '?').join(',')
    localDb.prepare(`
      UPDATE tv_series SET synced_to_turso = 1, synced_at = datetime('now')
      WHERE tmdb_id IN (${placeholders})
    `).run(...seriesIds)
    const updateTime = Date.now() - updateStart
    console.log(`   ✅ تم في ${updateTime}ms`)
    console.log('')
    
    // الإحصائيات النهائية
    const totalTime = Date.now() - buildStart
    console.log('═'.repeat(80))
    console.log('📊 الإحصائيات')
    console.log('═'.repeat(80))
    console.log(`وقت بناء statements: ${buildTime}ms`)
    console.log(`وقت إرسال batch: ${sendTime}ms`)
    console.log(`وقت تحديث محلي: ${updateTime}ms`)
    console.log(`الوقت الكلي: ${totalTime}ms (${(totalTime/1000).toFixed(2)} ثانية)`)
    console.log('')
    console.log(`معدل: ${(totalTime / seriesIds.length).toFixed(0)}ms لكل مسلسل`)
    console.log('')
    
    // تقدير الوقت الكامل
    const remainingBatches = Math.ceil(52677 / 50)
    const estimatedTotalSeconds = (totalTime / 1000) * remainingBatches
    const estimatedMinutes = (estimatedTotalSeconds / 60).toFixed(1)
    const estimatedHours = (estimatedTotalSeconds / 3600).toFixed(1)
    
    console.log('═'.repeat(80))
    console.log('⏱️  التقدير المُصحّح للوقت الكامل')
    console.log('═'.repeat(80))
    console.log(`عدد batches متبقية: ${remainingBatches}`)
    console.log(`الوقت المتوقع: ${estimatedMinutes} دقيقة (${estimatedHours} ساعة)`)
    console.log('')
    
    // التحقق من Turso
    const tursoCount = await turso.execute('SELECT COUNT(*) as count FROM tv_series')
    console.log(`العدد في Turso الآن: ${tursoCount.rows[0].count}`)
    
  } catch (err) {
    const sendTime = Date.now() - sendStart
    console.error(`   ❌ فشل بعد ${sendTime}ms`)
    console.error(`   الخطأ: ${err.message}`)
    console.error(`   Stack: ${err.stack}`)
  }

  console.log('')
  console.log('═'.repeat(80))

  localDb.close()
}

main().catch(console.error)
