require('dotenv').config({ path: '.env.local' });
const db = require('./scripts/services/local-db');

console.log('🔍 فحص slugs المكررة في القاعدة المحلية\n');
console.log('═'.repeat(70));

// عدد الـ slugs المكررة
const totalDuplicates = db.prepare(`
  SELECT COUNT(*) as count 
  FROM (
    SELECT slug 
    FROM movies 
    GROUP BY slug 
    HAVING COUNT(*) > 1
  )
`).get();

console.log(`\n📊 عدد slugs المكررة: ${totalDuplicates.count}\n`);

if (totalDuplicates.count === 0) {
  console.log('✅ لا توجد slugs مكررة - كل slug فريد!');
  process.exit(0);
}

// أمثلة
const examples = db.prepare(`
  SELECT slug, COUNT(*) as c 
  FROM movies 
  GROUP BY slug 
  HAVING c > 1 
  ORDER BY c DESC 
  LIMIT 20
`).all();

console.log('📝 أول 20 مثال:\n');
examples.forEach(r => {
  console.log(`   ${r.slug} → ${r.c} مرة`);
});

// إحصائيات
const maxDuplicates = examples[0]?.c || 0;
const totalAffected = db.prepare(`
  SELECT SUM(cnt) as total
  FROM (
    SELECT COUNT(*) as cnt
    FROM movies
    GROUP BY slug
    HAVING cnt > 1
  )
`).get();

console.log(`\n📊 إحصائيات:`);
console.log(`   أكبر تكرار: ${maxDuplicates} أفلام بنفس الـ slug`);
console.log(`   إجمالي الأفلام المتأثرة: ${totalAffected.total}`);

console.log('\n═'.repeat(70));
console.log('💡 يجب ضمان الـ slug فريد قبل المزامنة الواسعة');
