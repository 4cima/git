require('dotenv').config({path:'.env.local'});
const {createClient} = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// نفس دالة toSlug من INGEST-SERIES-LOGIC.js
function toSlug(text) {
  if (!text) return 'unknown';
  return text.toString().toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// توليد slug صحيح من العنوان + tmdb_id
function generateCorrectSlug(name, tmdbId) {
  const base = toSlug(name);
  return `${base}-${tmdbId}`;
}

async function fixSample(limit = 100) {
  console.log(`🧪 اختبار على عينة ${limit} مسلسل\n`);
  console.log('═'.repeat(70));
  
  const result = await turso.execute(`SELECT id, tmdb_id, name_en, name_ar, slug FROM tv_series LIMIT ${limit}`);
  const series = result.rows;
  
  let fixed = 0;
  let skipped = 0;
  const examples = [];
  
  for (const s of series) {
    const name = s.name_ar || s.name_en || `series-${s.tmdb_id}`;
    const correctSlug = generateCorrectSlug(name, s.tmdb_id);
    
    if (s.slug !== correctSlug) {
      // يحتاج تحديث
      await turso.execute({
        sql: 'UPDATE tv_series SET slug = ? WHERE id = ?',
        args: [correctSlug, s.id]
      });
      
      if (examples.length < 5) {
        examples.push({
          id: s.id,
          old: s.slug,
          new: correctSlug
        });
      }
      
      fixed++;
    } else {
      // بالفعل صحيح
      skipped++;
    }
  }
  
  console.log(`\n📊 النتائج:`);
  console.log(`   ✅ تم التحديث: ${fixed}`);
  console.log(`   ⏭️  تم التخطي (صحيح بالفعل): ${skipped}`);
  
  if (examples.length > 0) {
    console.log(`\n📋 أمثلة (قبل/بعد):`);
    examples.forEach((ex, i) => {
      console.log(`\n   ${i+1}. id=${ex.id}`);
      console.log(`      قبل: ${ex.old}`);
      console.log(`      بعد: ${ex.new}`);
    });
  }
  
  console.log('\n' + '═'.repeat(70));
}

async function fixAll() {
  console.log('🔧 إصلاح كل المسلسلات\n');
  console.log('═'.repeat(70));
  
  const result = await turso.execute('SELECT id, tmdb_id, name_en, name_ar, slug FROM tv_series');
  const series = result.rows;
  
  console.log(`\n📦 إجمالي: ${series.length.toLocaleString()} مسلسل\n`);
  console.log('🚀 بدء الإصلاح...\n');
  
  let fixed = 0;
  let skipped = 0;
  let errors = 0;
  
  const BATCH_SIZE = 50;
  for (let i = 0; i < series.length; i += BATCH_SIZE) {
    const batch = series.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (s) => {
      try {
        const name = s.name_ar || s.name_en || `series-${s.tmdb_id}`;
        const correctSlug = generateCorrectSlug(name, s.tmdb_id);
        
        if (s.slug !== correctSlug) {
          await turso.execute({
            sql: 'UPDATE tv_series SET slug = ? WHERE id = ?',
            args: [correctSlug, s.id]
          });
          fixed++;
        } else {
          skipped++;
        }
      } catch (e) {
        errors++;
      }
    }));
    
    if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= series.length) {
      const progress = Math.min(i + BATCH_SIZE, series.length);
      console.log(`   ${progress.toLocaleString()}/${series.length.toLocaleString()} (${(progress/series.length*100).toFixed(1)}%)`);
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 النتائج النهائية:');
  console.log(`   ✅ تم التحديث: ${fixed.toLocaleString()}`);
  console.log(`   ⏭️  تم التخطي: ${skipped.toLocaleString()}`);
  console.log(`   ❌ أخطاء: ${errors.toLocaleString()}`);
  console.log('═'.repeat(70));
}

// تحديد: اختبار أو كامل
const mode = process.argv[2] || 'test';

if (mode === 'full') {
  fixAll().then(() => process.exit(0)).catch(e => {
    console.error('❌ خطأ:', e.message);
    process.exit(1);
  });
} else {
  const limit = parseInt(process.argv[3]) || 100;
  fixSample(limit).then(() => process.exit(0)).catch(e => {
    console.error('❌ خطأ:', e.message);
    process.exit(1);
  });
}
