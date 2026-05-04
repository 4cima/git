const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db');

console.log('🎬 الأفلام - لم يتم سحبها ولم يتم فلترتها:');
const m1 = db.prepare(`SELECT COUNT(*) as c FROM movies WHERE overview_en IS NULL AND is_filtered = 0`).get();
console.log(m1.c.toLocaleString());

console.log('\n📺 المسلسلات - لم يتم سحبها ولم يتم فلترتها:');
const s1 = db.prepare(`SELECT COUNT(*) as c FROM tv_series WHERE overview_ar IS NULL AND is_filtered = 0`).get();
console.log(s1.c.toLocaleString());

db.close();
