const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db', { readonly: true });

console.log('🔍 فحص الأعمال التي لم تُسحب ولم تُفلتر\n');

const movies = db.prepare('SELECT id, title_en FROM movies WHERE overview_en IS NULL AND is_filtered = 0 LIMIT 10').all();
const series = db.prepare('SELECT id, title_en FROM tv_series WHERE overview_ar IS NULL AND is_filtered = 0 LIMIT 10').all();

console.log('🎬 عينة من الأفلام (2,885):');
movies.forEach(m => console.log(`  ${m.id}: ${m.title_en || 'NO TITLE'}`));

console.log('\n📺 عينة من المسلسلات (401):');
series.forEach(s => console.log(`  ${s.id}: ${s.title_en || 'NO TITLE'}`));

db.close();
