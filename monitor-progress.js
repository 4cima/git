const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db', { readonly: true });

console.log('📊 مراقبة تقدم السحب\n');
console.log('═'.repeat(80));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// حساب الأعمال المتبقية (لم يتم سحبها)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// الأفلام
const moviesNotFetched = db.prepare(`
  SELECT COUNT(*) as count FROM movies
  WHERE overview_en IS NULL AND is_filtered = 0
`).get();

const moviesFetched = db.prepare(`
  SELECT COUNT(*) as count FROM movies
  WHERE overview_en IS NOT NULL
`).get();

const moviesComplete = db.prepare(`
  SELECT COUNT(*) as count FROM movies
  WHERE is_complete = 1 AND is_filtered = 0
`).get();

const moviesFiltered = db.prepare(`
  SELECT COUNT(*) as count FROM movies
  WHERE is_filtered = 1
`).get();

// المسلسلات
const seriesNotFetched = db.prepare(`
  SELECT COUNT(*) as count FROM tv_series
  WHERE overview_en IS NULL AND is_filtered = 0
`).get();

const seriesFetched = db.prepare(`
  SELECT COUNT(*) as count FROM tv_series
  WHERE overview_en IS NOT NULL
`).get();

const seriesComplete = db.prepare(`
  SELECT COUNT(*) as count FROM tv_series
  WHERE is_complete = 1 AND is_filtered = 0
`).get();

const seriesFiltered = db.prepare(`
  SELECT COUNT(*) as count FROM tv_series
  WHERE is_filtered = 1
`).get();

console.log('\n🎬 الأفلام:');
console.log('─'.repeat(80));
console.log(`   ❌ لم يُسحب بعد:        ${moviesNotFetched.count.toLocaleString()}`);
console.log(`   ✅ تم السحب:            ${moviesFetched.count.toLocaleString()}`);
console.log(`   ✅ مكتمل:               ${moviesComplete.count.toLocaleString()}`);
console.log(`   🚫 مفلتر:               ${moviesFiltered.count.toLocaleString()}`);

console.log('\n📺 المسلسلات:');
console.log('─'.repeat(80));
console.log(`   ❌ لم يُسحب بعد:        ${seriesNotFetched.count.toLocaleString()}`);
console.log(`   ✅ تم السحب:            ${seriesFetched.count.toLocaleString()}`);
console.log(`   ✅ مكتمل:               ${seriesComplete.count.toLocaleString()}`);
console.log(`   🚫 مفلتر:               ${seriesFiltered.count.toLocaleString()}`);

console.log('\n📊 الإجمالي:');
console.log('─'.repeat(80));
const totalNotFetched = moviesNotFetched.count + seriesNotFetched.count;
const totalFetched = moviesFetched.count + seriesFetched.count;
const totalComplete = moviesComplete.count + seriesComplete.count;
const totalFiltered = moviesFiltered.count + seriesFiltered.count;

console.log(`   ❌ لم يُسحب بعد:        ${totalNotFetched.toLocaleString()}`);
console.log(`   ✅ تم السحب:            ${totalFetched.toLocaleString()}`);
console.log(`   ✅ مكتمل:               ${totalComplete.toLocaleString()}`);
console.log(`   🚫 مفلتر:               ${totalFiltered.toLocaleString()}`);

console.log('\n' + '═'.repeat(80) + '\n');

db.close();
