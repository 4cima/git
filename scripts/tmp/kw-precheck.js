const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../../data/4cima-local.db'), { readonly: true });
db.pragma('busy_timeout = 30000');
const c = db.prepare("SELECT COUNT(*) c FROM movies WHERE is_complete=1 AND (filter_status='clean' OR filter_status='reviewed_approved') AND release_year>=2000 AND (keywords_json IS NULL OR keywords_json='' OR keywords_json='[]')").get();
console.log('eligible=' + c.c);
const s = db.prepare("SELECT tmdb_id FROM movies WHERE is_complete=1 AND (filter_status='clean' OR filter_status='reviewed_approved') AND release_year>=2000 AND (keywords_json IS NULL OR keywords_json='' OR keywords_json='[]') ORDER BY RANDOM() LIMIT 5").all();
console.log('sample5=' + JSON.stringify(s));
db.close();
