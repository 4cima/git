require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = require('./scripts/services/local-db');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔍 فحص حالات فشل الـ slug\n');
console.log('═'.repeat(70));

const FAILED_IDS = [724606, 162317];

async function main() {
  console.log('\n1️⃣  البيانات المحلية:\n');
  
  const localMovies = db.prepare(`
    SELECT id, tmdb_id, slug, title_en, title_ar, release_year
    FROM movies 
    WHERE tmdb_id IN (${FAILED_IDS.join(',')})
  `).all();
  
  localMovies.forEach(m => {
    console.log(`tmdb_id=${m.tmdb_id}`);
    console.log(`  • id: ${m.id}`);
    console.log(`  • slug: ${m.slug}`);
    console.log(`  • title_en: ${m.title_en}`);
    console.log(`  • title_ar: ${m.title_ar}`);
    console.log(`  • release_year: ${m.release_year || 'N/A'}`);
    console.log('');
  });
  
  console.log('═'.repeat(70));
  console.log('\n2️⃣  الصفوف المتصادمة في Turso:\n');
  
  for (const tmdb_id of FAILED_IDS) {
    const localSlug = localMovies.find(m => m.tmdb_id === tmdb_id)?.slug;
    
    if (!localSlug) {
      console.log(`⚠️  tmdb_id=${tmdb_id} غير موجود محلياً\n`);
      continue;
    }
    
    const result = await turso.execute({
      sql: 'SELECT id, tmdb_id, slug, title_en, release_year FROM movies WHERE slug = ?',
      args: [localSlug]
    });
    
    console.log(`tmdb_id=${tmdb_id} (slug: ${localSlug}):`);
    
    if (result.rows.length === 0) {
      console.log(`  ✅ لا يوجد تصادم (الـ slug غير موجود في Turso)\n`);
    } else {
      console.log(`  ⚠️  ${result.rows.length} صف بنفس الـ slug:\n`);
      
      result.rows.forEach((row, i) => {
        console.log(`  الصف ${i + 1}:`);
        console.log(`    • id: ${row.id}`);
        console.log(`    • tmdb_id: ${row.tmdb_id}`);
        console.log(`    • title_en: ${row.title_en}`);
        console.log(`    • release_year: ${row.release_year || 'N/A'}`);
        
        if (row.tmdb_id === tmdb_id) {
          console.log(`    → ✅ نفس الفيلم (نفس tmdb_id)`);
        } else {
          console.log(`    → ⚠️  فيلم مختلف!`);
        }
        console.log('');
      });
    }
  }
  
  console.log('═'.repeat(70));
  console.log('\n3️⃣  التحليل:\n');
  
  // فحص إذا كانت أفلام مختلفة أم نفس الفيلم
  for (const tmdb_id of FAILED_IDS) {
    const localSlug = localMovies.find(m => m.tmdb_id === tmdb_id)?.slug;
    if (!localSlug) continue;
    
    const result = await turso.execute({
      sql: 'SELECT tmdb_id, title_en FROM movies WHERE slug = ?',
      args: [localSlug]
    });
    
    const tmdbIds = result.rows.map(r => r.tmdb_id);
    const unique = new Set(tmdbIds);
    
    if (unique.size === 1 && unique.has(tmdb_id)) {
      console.log(`✅ tmdb_id=${tmdb_id}: نفس الفيلم موجود مرتين`);
    } else if (unique.size > 1) {
      console.log(`⚠️  tmdb_id=${tmdb_id}: أفلام مختلفة بنفس الـ slug:`);
      result.rows.forEach(r => {
        console.log(`   - tmdb_id=${r.tmdb_id}: ${r.title_en}`);
      });
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  
  process.exit(0);
}

main().catch(e => {
  console.error('❌ خطأ:', e.message);
  process.exit(1);
});
