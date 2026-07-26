require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔍 فحص slugs المسلسلات في Turso\n');
console.log('═'.repeat(70));

function toSlug(text) {
  if (!text) return 'unknown';
  return text.toString().toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  try {
    // 1. البحث عن slugs مكررة
    console.log('\n1️⃣ البحث عن slugs مكررة:\n');
    
    const duplicates = await turso.execute(`
      SELECT slug, COUNT(*) as c
      FROM tv_series
      GROUP BY slug
      HAVING COUNT(*) > 1
      ORDER BY c DESC
      LIMIT 20
    `);
    
    if (duplicates.rows.length === 0) {
      console.log('✅ لا توجد slugs مكررة\n');
    } else {
      console.log(`⚠️  ${duplicates.rows.length} slug مكرر:\n`);
      
      for (const dup of duplicates.rows) {
        const series = await turso.execute({
          sql: 'SELECT id, tmdb_id, name_en, first_air_year FROM tv_series WHERE slug = ?',
          args: [dup.slug]
        });
        
        console.log(`slug: ${dup.slug} → ${dup.c} مسلسل:`);
        series.rows.forEach(s => {
          console.log(`  - id=${s.id}, tmdb_id=${s.tmdb_id}, "${s.name_en}" (${s.first_air_year || 'N/A'})`);
        });
        console.log('');
      }
    }
    
    // 2. فحص كم slug بدون tmdb_id
    console.log('═'.repeat(70));
    console.log('\n2️⃣ فحص صيغة slugs:\n');
    
    const allSeries = await turso.execute('SELECT id, tmdb_id, name_en, slug FROM tv_series LIMIT 10');
    
    let withTmdbId = 0;
    let withoutTmdbId = 0;
    
    const fullCheck = await turso.execute('SELECT id, tmdb_id, name_en, slug FROM tv_series');
    
    fullCheck.rows.forEach(s => {
      const expectedSlug = `${toSlug(s.name_en)}-${s.tmdb_id}`;
      if (s.slug === expectedSlug) {
        withTmdbId++;
      } else {
        withoutTmdbId++;
      }
    });
    
    console.log(`إجمالي المسلسلات: ${fullCheck.rows.length.toLocaleString()}`);
    console.log(`  ✅ صيغة صحيحة (title-tmdb_id): ${withTmdbId.toLocaleString()}`);
    console.log(`  ⚠️  صيغة قديمة (بدون tmdb_id): ${withoutTmdbId.toLocaleString()}`);
    
    if (withoutTmdbId > 0) {
      console.log('\n📋 عينة من الصيغة القديمة (أول 10):');
      let count = 0;
      for (const s of fullCheck.rows) {
        const expectedSlug = `${toSlug(s.name_en)}-${s.tmdb_id}`;
        if (s.slug !== expectedSlug && count < 10) {
          console.log(`  id=${s.id}, tmdb_id=${s.tmdb_id}`);
          console.log(`    الحالي: ${s.slug}`);
          console.log(`    المتوقع: ${expectedSlug}`);
          console.log('');
          count++;
        }
      }
    }
    
    console.log('═'.repeat(70));
    
    if (withoutTmdbId > 0) {
      console.log('\n💡 التوصية:');
      console.log('   يجب تحديث slugs المسلسلات للصيغة الجديدة (title-tmdb_id)');
      console.log('   نفس الإصلاح اللي عملناه للأفلام');
    } else {
      console.log('\n✅ كل المسلسلات لديها slugs صحيحة!');
    }
    
    process.exit(0);
  } catch (e) {
    console.error('\n❌ خطأ:', e.message);
    process.exit(1);
  }
}

main();
