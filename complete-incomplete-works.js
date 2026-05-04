#!/usr/bin/env node

/**
 * 🔧 إكمال الأعمال غير المكتملة
 * 
 * الشروط الجديدة للاكتمال:
 * - title_en ✅
 * - title_ar ✅
 * - overview_en ✅
 * - overview_ar ✅
 * - poster_path ✅
 * - backdrop_path ❌ (ليس شرط)
 * - release_date / first_air_date ❌ (ليس شرط)
 */

import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const db = new Database('./data/4cima-local.db');

console.log('🔧 إكمال الأعمال غير المكتملة\n');
console.log('═'.repeat(80));

const stats = {
  checked: 0,
  completed: 0,
  failed: 0
};

/**
 * فحص اكتمال العمل حسب الشروط الجديدة
 */
function isComplete(work) {
  return (
    work.title_en && work.title_en.trim() !== '' &&
    work.title_ar && work.title_ar.trim() !== '' &&
    work.overview_en && work.overview_en.trim() !== '' &&
    work.overview_ar && work.overview_ar.trim() !== '' &&
    work.poster_path && work.poster_path.trim() !== ''
  );
}

/**
 * تحديث حالة الاكتمال
 */
function updateCompletion() {
  console.log('\n🔄 تحديث حالة الاكتمال...\n');
  
  // الأفلام
  const movies = db.prepare(`
    SELECT id, title_en, title_ar, overview_en, overview_ar, poster_path
    FROM movies
    WHERE overview_en IS NOT NULL 
    AND is_filtered = 0
  `).all();
  
  console.log(`📊 فحص ${movies.length.toLocaleString()} فيلم...`);
  
  for (const movie of movies) {
    stats.checked++;
    
    const complete = isComplete(movie);
    const currentStatus = db.prepare('SELECT is_complete FROM movies WHERE id = ?').get(movie.id);
    
    if (complete && currentStatus.is_complete === 0) {
      db.prepare('UPDATE movies SET is_complete = 1 WHERE id = ?').run(movie.id);
      stats.completed++;
      
      if (stats.completed % 100 === 0) {
        console.log(`✅ تم إكمال ${stats.completed} عمل...`);
      }
    }
  }
  
  console.log(`\n✅ الأفلام: تم تحديث ${stats.completed} فيلم`);
  
  // المسلسلات
  const series = db.prepare(`
    SELECT id, title_en, title_ar, overview_en, overview_ar, poster_path
    FROM tv_series
    WHERE overview_en IS NOT NULL 
    AND is_filtered = 0
  `).all();
  
  console.log(`\n📊 فحص ${series.length.toLocaleString()} مسلسل...`);
  
  const seriesCompleted = stats.completed;
  
  for (const s of series) {
    stats.checked++;
    
    const complete = isComplete(s);
    const currentStatus = db.prepare('SELECT is_complete FROM tv_series WHERE id = ?').get(s.id);
    
    if (complete && currentStatus.is_complete === 0) {
      db.prepare('UPDATE tv_series SET is_complete = 1 WHERE id = ?').run(s.id);
      stats.completed++;
      
      if ((stats.completed - seriesCompleted) % 100 === 0) {
        console.log(`✅ تم إكمال ${stats.completed - seriesCompleted} مسلسل...`);
      }
    }
  }
  
  console.log(`\n✅ المسلسلات: تم تحديث ${stats.completed - seriesCompleted} مسلسل`);
}

/**
 * عرض الإحصائيات النهائية
 */
function showFinalStats() {
  console.log('\n\n📊 الإحصائيات النهائية:\n');
  console.log('═'.repeat(80));
  
  // الأفلام
  const m_total = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0').get();
  const m_complete = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 1').get();
  const m_incomplete = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0').get();
  
  console.log('🎬 الأفلام:');
  console.log(`   إجمالي المقبول: ${m_total.c.toLocaleString()}`);
  console.log(`   ✅ مكتمل: ${m_complete.c.toLocaleString()} (${((m_complete.c / m_total.c) * 100).toFixed(1)}%)`);
  console.log(`   ⚠️  غير مكتمل: ${m_incomplete.c.toLocaleString()} (${((m_incomplete.c / m_total.c) * 100).toFixed(1)}%)`);
  
  // المسلسلات
  const s_total = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0').get();
  const s_complete = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 1').get();
  const s_incomplete = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0').get();
  
  console.log('\n📺 المسلسلات:');
  console.log(`   إجمالي المقبول: ${s_total.c.toLocaleString()}`);
  console.log(`   ✅ مكتمل: ${s_complete.c.toLocaleString()} (${((s_complete.c / s_total.c) * 100).toFixed(1)}%)`);
  console.log(`   ⚠️  غير مكتمل: ${s_incomplete.c.toLocaleString()} (${((s_incomplete.c / s_total.c) * 100).toFixed(1)}%)`);
  
  console.log('\n' + '═'.repeat(80));
  console.log(`\n✅ تم تحديث ${stats.completed.toLocaleString()} عمل`);
}

// تنفيذ
try {
  updateCompletion();
  showFinalStats();
} catch (e) {
  console.error('❌ خطأ:', e.message);
  process.exit(1);
} finally {
  db.close();
}
