const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/4cima-local.db'), { readonly: true });
db.pragma('busy_timeout = 30000');
// نفس اختيار السكربت: ORDER BY tmdb_id DESC LIMIT 500
const batch = db.prepare('SELECT tmdb_id FROM movies WHERE is_fetched=0 ORDER BY tmdb_id DESC LIMIT 500').all();
const ids = batch.map(r => r.tmdb_id);
console.log('batch500 size=' + ids.length + ' max=' + Math.max(...ids) + ' min=' + Math.min(...ids));
console.log('series_waiting=' + db.prepare('SELECT COUNT(*) c FROM tv_series WHERE is_fetched=0').get().c);
db.close();
const dir = path.join(__dirname, '../data/backups/discover-2026-09-12');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'batch-500.json'), JSON.stringify(ids), 'utf8');
console.log('saved batch-500.json');
