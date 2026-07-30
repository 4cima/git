/**
 * الاختبارات النهائية قبل المزامنة الكاملة
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
  console.log('🔬 الاختبارات النهائية قبل المزامنة الكاملة')
  console.log('═'.repeat(80))
  console.log('')

  // ============================================================
  // Test 3: المسلسل الوحيد بدون slug
  // ============================================================
  console.log('3️⃣  المسلسل الوحيد بدون slug')
  console.log('─'.repeat(80))
  
  const noSlugSeries = localDb.prepare(`
    SELECT tmdb_id, name_en, name_ar, slug, overview_ar
    FROM tv_series 
    WHERE is_complete = 1 
      AND filter_status IN ('clean', 'reviewed_approved')
      AND (slug IS NULL OR slug = '')
  `).all()

  if (noSlugSeries.length > 0) {
    noSlugSeries.forEach(s => {
      console.log(`  TMDB ID: ${s.tmdb_id}`)
      console.log(`  الاسم الإنجليزي: ${s.name_en || 'N/A'}`)
      console.log(`  الاسم العربي: ${s.name_ar || 'N/A'}`)
      console.log(`  slug: ${s.slug || 'NULL/EMPTY'}`)
      console.log(`  overview: ${s.overview_ar ? 'موجود' : 'غير موجود'}`)
      console.log('')
    })
  } else {
    console.log('  ✅ لا يوجد مسلسلات بدون slug')
  }
  console.log('')

  // ============================================================
  // Test 2: توزيع حجم البيانات على كامل الـ backlog
  // ============================================================
  console.log('2️⃣  توزيع حجم episodes_json على كامل الـ backlog')
  console.log('─'.repeat(80))

  // جلب الـ 99 الموجودين في Turso
  const existingInTurso = await turso.execute('SELECT tmdb_id FROM tv_series')
  const existingIds = new Set(existingInTurso.rows.map(r => r.tmdb_id))
  
  console.log(`  عدد المسلسلات الموجودة في Turso: ${existingIds.size}`)
  console.log('')

  // تحليل حجم البيانات للمسلسلات المتبقية (الجديدة فقط)
  const sizeAnalysis = localDb.prepare(`
    SELECT 
      tmdb_id,
      name_en,
      number_of_episodes,
      LENGTH(
        (SELECT json_group_array(json_object(
          'season_number', season_number,
          'episode_number', episode_number,
          'name_en', name_en,
          'overview_en', overview_en,
          'still_path', still_path,
          'air_date', air_date,
          'runtime', runtime,
          'vote_average', vote_average
        )) FROM episodes WHERE series_tmdb_id = tv_series.tmdb_id)
      ) as episodes_size,
      LENGTH(
        (SELECT json_group_array(json_object(
          'season_number', season_number,
          'name_en', name_en,
          'episode_count', episode_count,
          'air_date', air_date,
          'poster_path', poster_path
        )) FROM seasons WHERE series_tmdb_id = tv_series.tmdb_id)
      ) as seasons_size
    FROM tv_series
    WHERE is_complete = 1 
      AND filter_status IN ('clean', 'reviewed_approved')
      AND synced_to_turso = 0
      AND slug IS NOT NULL 
      AND slug != ''
    ORDER BY episodes_size DESC
    LIMIT 20
  `).all()

  console.log('  أكبر 20 مسلسل من حيث حجم episodes_json:')
  console.log('')
  sizeAnalysis.forEach((s, i) => {
    const mbSize = (s.episodes_size / (1024 * 1024)).toFixed(2)
    const isNew = !existingIds.has(s.tmdb_id)
    const marker = isNew ? '🆕 NEW' : '📝 UPDATE'
    console.log(`    ${i+1}. ${marker} | ${s.name_en || 'N/A'} (${s.tmdb_id})`)
    console.log(`       Episodes: ${s.number_of_episodes} | JSON Size: ${mbSize} MB`)
  })
  console.log('')

  // إحصائيات إضافية
  const avgSize = sizeAnalysis.reduce((sum, s) => sum + s.episodes_size, 0) / sizeAnalysis.length
  const maxSize = Math.max(...sizeAnalysis.map(s => s.episodes_size))
  console.log(`  متوسط حجم أكبر 20: ${(avgSize / (1024 * 1024)).toFixed(2)} MB`)
  console.log(`  أقصى حجم: ${(maxSize / (1024 * 1024)).toFixed(2)} MB`)
  console.log('')

  // ============================================================
  // Test 1: قياس batch حقيقي (INSERT جديد)
  // ============================================================
  console.log('1️⃣  قياس batch حقيقي (50 مسلسل جديد - INSERT فعلي)')
  console.log('─'.repeat(80))

  // اختيار 50 مسلسل جديد (غير موجودين في Turso)
  const newSeriesIds = localDb.prepare(`
    SELECT tmdb_id FROM tv_series
    WHERE is_complete = 1 
      AND filter_status IN ('clean', 'reviewed_approved')
      AND synced_to_turso = 0
      AND slug IS NOT NULL 
      AND slug != ''
    LIMIT 200
  `).all().map(r => r.tmdb_id).filter(id => !existingIds.has(id)).slice(0, 50)

  console.log(`  عدد المسلسلات الجديدة المختارة: ${newSeriesIds.length}`)
  
  if (newSeriesIds.length === 0) {
    console.log('  ⚠️  كل المسلسلات موجودة في Turso! (لا يوجد بيانات جديدة للاختبار)')
    console.log('')
  } else {
    console.log(`  نطاق TMDB IDs: ${Math.min(...newSeriesIds)} - ${Math.max(...newSeriesIds)}`)
    console.log('')

    // بناء الـ statements
    console.log('  🔨 بناء statements...')
    const buildStart = Date.now()
    const statements = []

    for (const tmdb_id of newSeriesIds) {
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
    console.log(`     وقت البناء: ${buildTime}ms`)
    console.log('')

    // قياس إرسال الـ batch
    console.log('  📤 إرسال batch إلى Turso...')
    const sendStart = Date.now()
    
    try {
      await turso.batch(statements, 'write')
      const sendTime = Date.now() - sendStart
      
      console.log(`     ✅ نجح في ${sendTime}ms`)
      console.log('')
      
      // تحديث القاعدة المحلية
      console.log('  💾 تحديث القاعدة المحلية...')
      const updateStart = Date.now()
      const placeholders = newSeriesIds.map(() => '?').join(',')
      localDb.prepare(`
        UPDATE tv_series SET synced_to_turso = 1, synced_at = datetime('now')
        WHERE tmdb_id IN (${placeholders})
      `).run(...newSeriesIds)
      const updateTime = Date.now() - updateStart
      console.log(`     ✅ تم في ${updateTime}ms`)
      console.log('')
      
      // الإحصائيات النهائية
      const totalTime = Date.now() - buildStart
      console.log('  ═'.repeat(40))
      console.log('  📊 الإحصائيات (INSERT حقيقي)')
      console.log('  ═'.repeat(40))
      console.log(`  وقت بناء statements: ${buildTime}ms`)
      console.log(`  وقت إرسال batch: ${sendTime}ms`)
      console.log(`  وقت تحديث محلي: ${updateTime}ms`)
      console.log(`  ─────────────────────────────`)
      console.log(`  الوقت الكلي: ${totalTime}ms (${(totalTime/1000).toFixed(2)} ثانية)`)
      console.log('')
      console.log(`  معدل: ${(totalTime / newSeriesIds.length).toFixed(0)}ms لكل مسلسل`)
      console.log('')
      
      // مقارنة مع القياس السابق (UPDATE)
      const previousTest = 6470 // الوقت السابق للـ UPDATE
      const diff = totalTime - previousTest
      const diffPercent = ((diff / previousTest) * 100).toFixed(1)
      
      console.log('  📊 المقارنة مع الاختبار السابق (UPDATE):')
      console.log(`     السابق (UPDATE): 6,470ms`)
      console.log(`     الحالي (INSERT): ${totalTime}ms`)
      console.log(`     الفرق: ${diff > 0 ? '+' : ''}${diff}ms (${diff > 0 ? '+' : ''}${diffPercent}%)`)
      console.log('')
      
      // التحقق من Turso
      const tursoCount = await turso.execute('SELECT COUNT(*) as count FROM tv_series')
      const newCount = tursoCount.rows[0].count
      console.log(`  ✅ العدد في Turso الآن: ${newCount} (كان ${existingIds.size})`)
      console.log(`     تم إضافة: ${newCount - existingIds.size} مسلسل جديد`)
      console.log('')
      
      // تقدير نهائي
      const remainingCount = 52725 - newCount
      const remainingBatches = Math.ceil(remainingCount / 50)
      const estimatedSeconds = (totalTime / 1000) * remainingBatches
      const estimatedMinutes = (estimatedSeconds / 60).toFixed(1)
      const estimatedHours = (estimatedSeconds / 3600).toFixed(1)
      
      console.log('  ⏱️  التقدير النهائي المُحدّث (بناءً على INSERT حقيقي):')
      console.log(`     باقي: ${remainingCount.toLocaleString('en-US')} مسلسل`)
      console.log(`     عدد batches: ${remainingBatches}`)
      console.log(`     الوقت المتوقع: ${estimatedMinutes} دقيقة (${estimatedHours} ساعة)`)
      
    } catch (err) {
      const sendTime = Date.now() - sendStart
      console.error(`     ❌ فشل بعد ${sendTime}ms`)
      console.error(`     الخطأ: ${err.message}`)
    }
  }

  console.log('')
  console.log('═'.repeat(80))
  console.log('✅ اكتملت الاختبارات')
  console.log('═'.repeat(80))

  localDb.close()
}

main().catch(console.error)
