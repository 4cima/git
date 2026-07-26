require('dotenv').config({path:'.env.local'});
const {createClient} = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔍 قياس فساد slugs المسلسلات\n');
console.log('═'.repeat(70));

async function main() {
  const result = await turso.execute('SELECT id, tmdb_id, slug FROM tv_series');
  const series = result.rows;
  
  let corrupted = [];
  
  for (const s of series) {
    const tmdbStr = String(s.tmdb_id);
    const slug = s.slug || '';
    
    // كم مرة tmdb_id موجود في الـ slug
    const regex = new RegExp(tmdbStr, 'g');
    const matches = slug.match(regex);
    const count = matches ? matches.length : 0;
    
    if (count > 1) {
      corrupted.push({ id: s.id, tmdb_id: s.tmdb_id, slug, count });
    }
  }
  
  console.log(`\n📊 النتائج:`);
  console.log(`   إجمالي المسلسلات: ${series.length.toLocaleString()}`);
  console.log(`   مفسود (تكرار): ${corrupted.length.toLocaleString()}`);
  console.log(`   نظيف: ${(series.length - corrupted.length).toLocaleString()}\n`);
  
  if (corrupted.length > 0) {
    // تحليل حسب عدد التكرارات
    const by_count = {};
    corrupted.forEach(c => {
      by_count[c.count] = (by_count[c.count] || 0) + 1;
    });
    
    console.log('📈 حسب عدد التكرارات:');
    Object.keys(by_count).sort((a,b) => b-a).forEach(count => {
      console.log(`   ${count} تكرار: ${by_count[count].toLocaleString()} مسلسل`);
    });
    
    console.log('\n📋 أسوأ 10 حالات:');
    corrupted.sort((a,b) => b.count - a.count).slice(0, 10).forEach(c => {
      console.log(`   id=${c.id}, tmdb_id=${c.tmdb_id}`);
      console.log(`   slug: ${c.slug}`);
      console.log(`   تكرار: ${c.count} مرة\n`);
    });
  }
  
  console.log('═'.repeat(70));
  process.exit(0);
}

main().catch(e => {
  console.error('❌ خطأ:', e.message);
  process.exit(1);
});
