#!/usr/bin/env node

/**
 * إصلاح المسلسلات بدون مواسم
 * يعيد معالجة المسلسلات التي لديها بيانات لكن بدون مواسم
 */

const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', 'data', '4cima-local.db')

// استيراد دالة processSeries من السكريبت الرئيسي
// سنستخدم نفس المنطق
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const TMDB_API_KEY = process.env.TMDB_API_KEY

if (!TMDB_API_KEY) {
  console.error('❌ TMDB_API_KEY غير موجود في .env.local')
  process.exit(1)
}

async function fetchTMDB(endpoint) {
  const url = `https://api.themoviedb.org/3${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`TMDB API Error: ${response.status}`)
  }
  return response.json()
}

const stats = {
  start: Date.now(),
  processed: 0,
  seasonsAdded: 0,
  episodesAdded: 0,
  errors: 0,
  fixed: 0
}

async function fixSeries(id, db) {
  try {
    // سحب بيانات المسلسل من TMDB
    const series = await fetchTMDB(`/tv/${id}`)
    
    // سحب المواسم
    const validSeasons = (series.seasons || []).filter(s => s.season_number > 0)
    
    if (validSeasons.length === 0) {
      console.log(`   ⚠️ [${id}] لا توجد مواسم في TMDB`)
      return
    }
    
    const insertSeason = db.prepare(`
      INSERT OR IGNORE INTO tv_seasons
      (tv_series_id, tmdb_id, season_number, name_en, overview_en,
       poster_path, air_date, air_year, episode_count, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `)

    const insertEpisode = db.prepare(`
      INSERT OR IGNORE INTO tv_episodes
      (tv_series_id, season_id, tmdb_id, episode_number, season_number,
       name_en, overview_en, still_path, air_date, runtime,
       vote_average, is_active, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'tmdb')
    `)
    
    let seasonsAdded = 0
    let episodesAdded = 0
    
    for (const season of validSeasons) {
      // إدراج الموسم
      const result = insertSeason.run(
        id, season.id, season.season_number,
        season.name, season.overview,
        season.poster_path, season.air_date,
        season.air_date ? parseInt(season.air_date.split('-')[0]) : null,
        season.episode_count || 0
      )
      
      if (result.changes > 0) {
        seasonsAdded++
      }

      const seasonRecord = db.prepare(
        'SELECT id FROM tv_seasons WHERE tv_series_id = ? AND season_number = ?'
      ).get(id, season.season_number)

      if (!seasonRecord) continue

      // سحب الحلقات
      let episodesData = []
      try {
        const seasonDetails = await fetchTMDB(`/tv/${id}/season/${season.season_number}`)
        episodesData = seasonDetails.episodes || []
      } catch (e) {
        console.log(`   ⚠️ فشل سحب حلقات الموسم ${season.season_number}: ${e.message}`)
        continue
      }

      for (const ep of episodesData) {
        const result = insertEpisode.run(
          id, seasonRecord.id, ep.id,
          ep.episode_number, ep.season_number,
          ep.name, ep.overview,
          ep.still_path, ep.air_date,
          ep.runtime, ep.vote_average || 0
        )
        
        if (result.changes > 0) {
          episodesAdded++
        }
      }
    }
    
    // تحديث is_complete
    if (seasonsAdded > 0) {
      db.prepare('UPDATE tv_series SET is_complete = 1 WHERE id = ?').run(id)
      stats.fixed++
    }
    
    stats.seasonsAdded += seasonsAdded
    stats.episodesAdded += episodesAdded
    
    console.log(`   ✅ [${id}] ${seasonsAdded} موسم، ${episodesAdded} حلقة`)
    
  } catch (e) {
    stats.errors++
    console.error(`   ❌ [${id}] خطأ: ${e.message}`)
  }
}

async function main() {
  console.log('🔧 إصلاح المسلسلات بدون مواسم\n')
  console.log('='.repeat(70))
  
  const db = new Database(DB_PATH)
  
  // البحث عن المسلسلات بدون مواسم
  const seriesWithoutSeasons = db.prepare(`
    SELECT id, title_en FROM tv_series 
    WHERE overview_en IS NOT NULL 
    AND is_filtered = 0
    AND id NOT IN (SELECT DISTINCT tv_series_id FROM tv_seasons)
    ORDER BY vote_average DESC, vote_count DESC
    LIMIT 100
  `).all()
  
  console.log(`\n📊 وجدنا ${seriesWithoutSeasons.length} مسلسل بدون مواسم`)
  console.log('سنعالج أول 100 مسلسل...\n')
  
  for (let i = 0; i < seriesWithoutSeasons.length; i++) {
    const series = seriesWithoutSeasons[i]
    stats.processed++
    
    console.log(`\n[${i + 1}/${seriesWithoutSeasons.length}] ${series.title_en} (ID: ${series.id})`)
    await fixSeries(series.id, db)
    
    // تأخير بسيط لتجنب Rate Limit
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // عرض التقدم كل 10 مسلسلات
    if ((i + 1) % 10 === 0) {
      const mins = (Date.now() - stats.start) / 60000
      const rate = (stats.processed / mins).toFixed(1)
      console.log(`\n📊 التقدم: ${stats.processed}/${seriesWithoutSeasons.length} | ${rate}/دقيقة`)
      console.log(`   ✅ تم إصلاح: ${stats.fixed}`)
      console.log(`   📺 مواسم: ${stats.seasonsAdded}`)
      console.log(`   🎬 حلقات: ${stats.episodesAdded}`)
      console.log(`   ❌ أخطاء: ${stats.errors}`)
    }
  }
  
  db.close()
  
  const mins = (Date.now() - stats.start) / 60000
  
  console.log('\n' + '='.repeat(70))
  console.log('✅ اكتمل الإصلاح!')
  console.log('='.repeat(70))
  console.log(`\n📊 الإحصائيات:`)
  console.log(`   معالج: ${stats.processed}`)
  console.log(`   تم إصلاحه: ${stats.fixed}`)
  console.log(`   مواسم مضافة: ${stats.seasonsAdded}`)
  console.log(`   حلقات مضافة: ${stats.episodesAdded}`)
  console.log(`   أخطاء: ${stats.errors}`)
  console.log(`   الوقت: ${mins.toFixed(1)} دقيقة`)
  console.log(`   السرعة: ${(stats.processed / mins).toFixed(1)} مسلسل/دقيقة`)
}

main().catch(console.error)
