const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', '..', 'data', '4cima-local.db');
const db = new Database(dbPath, { readonly: true });

function q(sql) { try { return db.prepare(sql).get(); } catch (e) { return { err: e.message }; } }
function qa(sql) { try { return db.prepare(sql).all(); } catch (e) { return [{ err: e.message }]; } }

console.log('=== MOVIES ===');
console.log('total_missing:', JSON.stringify(q(`SELECT COUNT(*) AS c FROM movies WHERE is_complete=1 AND is_filtered=0 AND release_year>=2000 AND (title_ar IS NULL OR title_ar='' OR overview_ar IS NULL OR overview_ar='')`)));
console.log('title_only:', JSON.stringify(q(`SELECT COUNT(*) AS c FROM movies WHERE is_complete=1 AND is_filtered=0 AND release_year>=2000 AND (title_ar IS NULL OR title_ar='') AND (overview_ar IS NOT NULL AND overview_ar<>'')`)));
console.log('overview_only:', JSON.stringify(q(`SELECT COUNT(*) AS c FROM movies WHERE is_complete=1 AND is_filtered=0 AND release_year>=2000 AND (title_ar IS NOT NULL AND title_ar<>'') AND (overview_ar IS NULL OR overview_ar='')`)));
console.log('both:', JSON.stringify(q(`SELECT COUNT(*) AS c FROM movies WHERE is_complete=1 AND is_filtered=0 AND release_year>=2000 AND (title_ar IS NULL OR title_ar='') AND (overview_ar IS NULL OR overview_ar='')`)));
console.log('sample20:', JSON.stringify(qa(`SELECT tmdb_id, title_en, release_year, CASE WHEN title_ar IS NULL OR title_ar='' THEN 1 ELSE 0 END AS miss_t, CASE WHEN overview_ar IS NULL OR overview_ar='' THEN 1 ELSE 0 END AS miss_o FROM movies WHERE is_complete=1 AND is_filtered=0 AND release_year>=2000 AND (title_ar IS NULL OR title_ar='' OR overview_ar IS NULL OR overview_ar='') ORDER BY tmdb_id DESC LIMIT 20`), null, 1));

console.log('=== TV ===');
console.log('total_missing:', JSON.stringify(q(`SELECT COUNT(*) AS c FROM tv_series WHERE is_complete=1 AND is_filtered=0 AND first_air_year>=2000 AND (name_ar IS NULL OR name_ar='' OR overview_ar IS NULL OR overview_ar='')`)));
console.log('title_only:', JSON.stringify(q(`SELECT COUNT(*) AS c FROM tv_series WHERE is_complete=1 AND is_filtered=0 AND first_air_year>=2000 AND (name_ar IS NULL OR name_ar='') AND (overview_ar IS NOT NULL AND overview_ar<>'')`)));
console.log('overview_only:', JSON.stringify(q(`SELECT COUNT(*) AS c FROM tv_series WHERE is_complete=1 AND is_filtered=0 AND first_air_year>=2000 AND (name_ar IS NOT NULL AND name_ar<>'') AND (overview_ar IS NULL OR overview_ar='')`)));
console.log('both:', JSON.stringify(q(`SELECT COUNT(*) AS c FROM tv_series WHERE is_complete=1 AND is_filtered=0 AND first_air_year>=2000 AND (name_ar IS NULL OR name_ar='') AND (overview_ar IS NULL OR overview_ar='')`)));
console.log('sample20:', JSON.stringify(qa(`SELECT tmdb_id, name_en, first_air_year, CASE WHEN name_ar IS NULL OR name_ar='' THEN 1 ELSE 0 END AS miss_t, CASE WHEN overview_ar IS NULL OR overview_ar='' THEN 1 ELSE 0 END AS miss_o FROM tv_series WHERE is_complete=1 AND is_filtered=0 AND first_air_year>=2000 AND (name_ar IS NULL OR name_ar='' OR overview_ar IS NULL OR overview_ar='') ORDER BY tmdb_id DESC LIMIT 20`), null, 1));
db.close();
