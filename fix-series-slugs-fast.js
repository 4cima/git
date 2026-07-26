require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔧 إصلاح slugs المسلسلات (سريع)\n');
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
    console.log('\n⏳ جلب المسلسلات...');
    const result = await turso.execute('SELECT id, tmdb_id, name_en FROM tv_series');
    const series = result.rows;
    
    console.log(`✅ ${series.length.toLocaleString()} مسلسل\n`);
    console.log('🚀 بدء التحديث...\n');
    
    let updated = 0;
    let errors = 0;
    
    const BATCH_SIZE = 50;
    for (let i = 0; i < series.length; i += BATCH_SIZE) {
      const batch = series.slice(i, i + BATCH_SIZE);
      
      const promises = batch.map(async (s) => {
        const expectedSlug = `${toSlug(s.name_en)}-${s.tmdb_id}`;
        try {
          await turso.execute({
            sql: 'UPDATE tv_series SET slug = ? WHERE id = ?',
            args: [expectedSlug, s.id]
          });
          return { success: true };
        } catch (e) {
          return { success: false, error: e.message };
        }
      });
      
      const results = await Promise.all(promises);
      results.forEach(r => r.success ? updated++ : errors++);
      
      if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= series.length) {
        const progress = Math.min(i + BATCH_SIZE, series.length);
        console.log(`   ${progress.toLocaleString()}/${series.length.toLocaleString()} (${(progress / series.length * 100).toFixed(1)}%)`);
      }
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('📊 النتائج:');
    console.log(`   ✅ تم: ${updated.toLocaleString()}`);
    console.log(`   ❌ فشل: ${errors.toLocaleString()}`);
    console.log('═'.repeat(70));
    
    process.exit(0);
  } catch (e) {
    console.error('\n❌ خطأ:', e.message);
    process.exit(1);
  }
}

main();
