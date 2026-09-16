const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', '..', 'data', '4cima-local.db'), { readonly: true });
function q(s){ try { return db.prepare(s).get(); } catch(e){ return {err:e.message}; } }
function qa(s){ try { return db.prepare(s).all(); } catch(e){ return [{err:e.message}]; } }
console.log('movies_cols:', qa(`PRAGMA table_info(movies)`).map(c=>c.name).join(','));
console.log('tv_cols:', qa(`PRAGMA table_info(tv_series)`).map(c=>c.name).join(','));
console.log('m_complete:', JSON.stringify(q(`SELECT COUNT(*) c FROM movies WHERE is_complete=1`)));
console.log('m_complete_nofilter:', JSON.stringify(q(`SELECT COUNT(*) c FROM movies WHERE is_complete=1 AND is_filtered=0`)));
console.log('m_complete_nofilter_y2000:', JSON.stringify(q(`SELECT COUNT(*) c FROM movies WHERE is_complete=1 AND is_filtered=0 AND release_year>=2000`)));
console.log('m_complete_nofilter_y2000_titlear_null:', JSON.stringify(q(`SELECT COUNT(*) c FROM movies WHERE is_complete=1 AND is_filtered=0 AND release_year>=2000 AND (title_ar IS NULL OR title_ar='')`)));
console.log('m_filter_status_dist:', JSON.stringify(qa(`SELECT filter_status, COUNT(*) c FROM movies WHERE is_complete=1 GROUP BY filter_status`)));
console.log('m_is_filtered_dist:', JSON.stringify(qa(`SELECT is_filtered, COUNT(*) c FROM movies WHERE is_complete=1 GROUP BY is_filtered`)));
console.log('m_sample_complete:', JSON.stringify(qa(`SELECT tmdb_id,title_en,substr(COALESCE(title_ar,''),1,30) ta,substr(COALESCE(overview_ar,''),1,30) oa,release_year,is_filtered,filter_status FROM movies WHERE is_complete=1 ORDER BY tmdb_id DESC LIMIT 5`), null, 1));
console.log('tv_complete:', JSON.stringify(q(`SELECT COUNT(*) c FROM tv_series WHERE is_complete=1`)));
console.log('tv_complete_nofilter:', JSON.stringify(q(`SELECT COUNT(*) c FROM tv_series WHERE is_complete=1 AND is_filtered=0`)));
console.log('tv_complete_nofilter_y2000:', JSON.stringify(q(`SELECT COUNT(*) c FROM tv_series WHERE is_complete=1 AND is_filtered=0 AND first_air_year>=2000`)));
console.log('tv_filter_status_dist:', JSON.stringify(qa(`SELECT filter_status, COUNT(*) c FROM tv_series WHERE is_complete=1 GROUP BY filter_status`)));
console.log('tv_sample_complete:', JSON.stringify(qa(`SELECT tmdb_id,name_en,substr(COALESCE(name_ar,''),1,30) na,substr(COALESCE(overview_ar,''),1,30) oa,first_air_year,is_filtered,filter_status FROM tv_series WHERE is_complete=1 ORDER BY tmdb_id DESC LIMIT 5`), null, 1));
db.close();
