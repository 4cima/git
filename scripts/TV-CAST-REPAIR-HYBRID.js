#!/usr/bin/env node
/**
 * ============================================
 * 🔧 TV CAST REPAIR - HYBRID (TMDB + TVMaze)
 * ============================================
 * Purpose: Fetch missing cast from TMDB first, then TVMaze
 * Strategy: Best of both worlds
 * ============================================
 */

const axios = require('axios');
const db = require('./services/local-db');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TVMAZE_BASE_URL = 'https://api.tvmaze.com';

// Configuration
const BATCH_SIZE = 100;
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds
const MAX_CAST_PER_SERIES = 10;

// Stats
const stats = {
  total: 0,
  tmdbSuccess: 0,
  tvmazeSuccess: 0,
  bothFailed: 0,
  skipped: 0,
  errors: 0,
  startTime: Date.now()
};

/**
 * Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch cast from TMDB
 */
async function fetchCastFromTMDB(tmdbId) {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/tv/${tmdbId}/credits`, {
      params: { api_key: TMDB_API_KEY },
      timeout: 10000
    });
    
    return response.data.cast || [];
  } catch (e) {
    if (e.response?.status === 404) {
      return null; // Series not found
    }
    throw e;
  }
}

/**
 * Fetch cast from TVMaze
 */
async function fetchCastFromTVMaze(searchName) {
  try {
    // Search by name
    const searchResponse = await axios.get(`${TVMAZE_BASE_URL}/search/shows`, {
      params: { q: searchName },
      timeout: 10000
    });
    
    if (searchResponse.data.length === 0) {
      return null;
    }
    
    const show = searchResponse.data[0].show;
    
    // Get cast
    const castResponse = await axios.get(`${TVMAZE_BASE_URL}/shows/${show.id}/cast`, {
      timeout: 10000
    });
    
    const cast = castResponse.data || [];
    
    // Convert TVMaze format to TMDB-like format
    return cast.map(c => ({
      id: c.person.id,
      name: c.person.name,
      original_name: c.person.name,
      character: c.character?.name || 'Unknown',
      profile_path: c.person.image?.medium ? c.person.image.medium.replace('https://static.tvmaze.com', '') : null,
      popularity: 0,
      order: c.character?.id || 999
    }));
  } catch (e) {
    return null;
  }
}

/**
 * Insert or get person
 */
function upsertPerson(person) {
  const existing = db.prepare('SELECT id FROM people WHERE tmdb_id = ?').get(person.id);
  
  if (existing) {
    return existing.id;
  }
  
  const result = db.prepare(`
    INSERT INTO people (
      tmdb_id, name_en, name_ar, profile_path, popularity
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    person.id,
    person.name || person.original_name,
    person.name || person.original_name, // Will be translated later
    person.profile_path,
    person.popularity || 0
  );
  
  return result.lastInsertRowid;
}

/**
 * Insert cast for series
 */
function insertCast(seriesId, cast, source) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO cast_crew (
      content_id, content_type, person_id, role_type,
      character_name, character_name_ar, cast_order
    ) VALUES (?, 'tv', ?, 'cast', ?, ?, ?)
  `);
  
  let inserted = 0;
  
  for (let i = 0; i < Math.min(cast.length, MAX_CAST_PER_SERIES); i++) {
    const person = cast[i];
    const personId = upsertPerson(person);
    
    stmt.run(
      seriesId,
      personId,
      person.character || 'Unknown',
      person.character || 'Unknown', // Will be translated later
      person.order || i
    );
    
    inserted++;
  }
  
  return inserted;
}

/**
 * Process one series (TMDB first, then TVMaze)
 */
async function processSeries(series) {
  try {
    // 1. Try TMDB first
    const tmdbCast = await fetchCastFromTMDB(series.tmdb_id);
    
    if (tmdbCast && tmdbCast.length > 0) {
      // TMDB has cast - use it
      db.exec('BEGIN IMMEDIATE');
      try {
        insertCast(series.id, tmdbCast, 'tmdb');
        db.prepare('UPDATE tv_series SET has_cast = 1 WHERE id = ?').run(series.id);
        db.exec('COMMIT');
        
        stats.tmdbSuccess++;
        return { success: true, source: 'tmdb', count: tmdbCast.length };
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    }
    
    // 2. TMDB failed or no cast - try TVMaze
    await sleep(500); // Small delay between APIs
    
    const tvmazeCast = await fetchCastFromTVMaze(series.title_en);
    
    if (tvmazeCast && tvmazeCast.length > 0) {
      // TVMaze has cast - use it
      db.exec('BEGIN IMMEDIATE');
      try {
        insertCast(series.id, tvmazeCast, 'tvmaze');
        db.prepare('UPDATE tv_series SET has_cast = 1 WHERE id = ?').run(series.id);
        db.exec('COMMIT');
        
        stats.tvmazeSuccess++;
        return { success: true, source: 'tvmaze', count: tvmazeCast.length };
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    }
    
    // 3. Both failed
    stats.bothFailed++;
    return { success: false, source: 'none' };
    
  } catch (e) {
    stats.errors++;
    console.error(`\n  ❌ خطأ في ${series.id} (${series.title_en}):`, e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const priority = args.find(a => a.startsWith('--priority='))?.split('=')[1] || 'all';
  const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1]) || 0;
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔧 إصلاح Cast للمسلسلات - هجين (TMDB + TVMaze)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Build query based on priority
  let query = `
    SELECT id, tmdb_id, title_en, vote_count
    FROM tv_series 
    WHERE overview_en IS NOT NULL
      AND is_filtered = 0
      AND NOT EXISTS (
        SELECT 1 FROM cast_crew 
        WHERE content_id = tv_series.id AND content_type = 'tv'
      )
  `;
  
  if (priority === 'popular') {
    query += ' AND vote_count >= 100 ORDER BY vote_count DESC';
  } else if (priority === 'medium') {
    query += ' AND vote_count >= 50 ORDER BY vote_count DESC';
  } else {
    query += ' ORDER BY vote_count DESC, popularity DESC';
  }
  
  if (limit > 0) {
    query += ` LIMIT ${limit}`;
  }
  
  const series = db.prepare(query).all();
  stats.total = series.length;
  
  console.log(`📊 الإحصائيات:`);
  console.log(`   الأولوية: ${priority}`);
  console.log(`   العدد: ${stats.total.toLocaleString()}`);
  console.log(`   الاستراتيجية: TMDB أولاً، ثم TVMaze\n`);
  
  if (stats.total === 0) {
    console.log('✅ لا يوجد مسلسلات تحتاج إصلاح!\n');
    return;
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔄 بدء المعالجة...\n');
  
  // Process in batches
  for (let i = 0; i < series.length; i += BATCH_SIZE) {
    const batch = series.slice(i, i + BATCH_SIZE);
    
    // Process batch
    for (const s of batch) {
      await processSeries(s);
      
      // Progress
      const processed = stats.tmdbSuccess + stats.tvmazeSuccess + stats.bothFailed + stats.errors;
      const percent = ((processed / stats.total) * 100).toFixed(1);
      const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(0);
      const rate = (processed / elapsed * 60).toFixed(0);
      
      process.stdout.write(
        `\r  ⏳ ${processed} / ${stats.total} (${percent}%) | ` +
        `🎯 TMDB: ${stats.tmdbSuccess} | 📺 TVMaze: ${stats.tvmazeSuccess} | ` +
        `❌ فشل: ${stats.bothFailed} | ${rate} مسلسل/دقيقة`
      );
    }
    
    // Delay between batches
    if (i + BATCH_SIZE < series.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }
  
  console.log('\n');
  
  // Final stats
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 النتائج النهائية:\n');
  
  const totalTime = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
  const totalSuccess = stats.tmdbSuccess + stats.tvmazeSuccess;
  
  console.log(`  إجمالي: ${stats.total.toLocaleString()}`);
  console.log(`  نجح: ${totalSuccess.toLocaleString()} (${((totalSuccess/stats.total)*100).toFixed(1)}%)`);
  console.log(`    - من TMDB: ${stats.tmdbSuccess.toLocaleString()} (${((stats.tmdbSuccess/stats.total)*100).toFixed(1)}%)`);
  console.log(`    - من TVMaze: ${stats.tvmazeSuccess.toLocaleString()} (${((stats.tvmazeSuccess/stats.total)*100).toFixed(1)}%)`);
  console.log(`  فشل (كلاهما): ${stats.bothFailed.toLocaleString()} (${((stats.bothFailed/stats.total)*100).toFixed(1)}%)`);
  console.log(`  أخطاء: ${stats.errors.toLocaleString()}`);
  console.log(`  الوقت: ${totalTime} دقيقة\n`);
  
  // Update is_complete for fixed series
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔄 إعادة حساب is_complete للمسلسلات المُصلحة...\n');
  
  db.exec('BEGIN IMMEDIATE');
  try {
    const updated = db.prepare(`
      UPDATE tv_series 
      SET is_complete = 1
      WHERE is_filtered = 0
        AND has_arabic_title = 1
        AND title_en IS NOT NULL AND TRIM(title_en) <> ''
        AND has_arabic_overview = 1
        AND poster_path IS NOT NULL AND TRIM(poster_path) <> ''
        AND (
          number_of_seasons IS NULL OR number_of_seasons = 0
          OR EXISTS (SELECT 1 FROM seasons s WHERE s.series_id = tv_series.id)
        )
        AND is_complete = 0
    `).run();
    
    db.exec('COMMIT');
    console.log(`  ✅ تم تحديث ${updated.changes.toLocaleString()} مسلسل\n`);
  } catch (e) {
    db.exec('ROLLBACK');
    console.error('  ❌ خطأ:', e.message);
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ اكتمل الإصلاح الهجين!');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Summary
  console.log('📈 الملخص:');
  console.log(`   TVMaze أضاف: ${stats.tvmazeSuccess} مسلسل (${((stats.tvmazeSuccess/totalSuccess)*100).toFixed(1)}% من الناجح)`);
  console.log(`   تحسين بنسبة: ${((stats.tvmazeSuccess/stats.total)*100).toFixed(1)}% إضافي\n`);
}

if (require.main === module) {
  main().catch(e => {
    console.error('\n❌ خطأ فادح:', e.message);
    process.exit(1);
  });
}

module.exports = { processSeries };
