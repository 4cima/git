const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', '..', 'data', '4cima-local.db'), { readonly: true });
function q(s){ try { return db.prepare(s).get(); } catch(e){ return {err:e.message}; } }
console.log('m_all_missing_any:', JSON.stringify(q(`SELECT COUNT(*) c FROM movies WHERE (title_ar IS NULL OR title_ar='' OR overview_ar IS NULL OR overview_ar='')`)));
console.log('m_incomplete_missing:', JSON.stringify(q(`SELECT COUNT(*) c FROM movies WHERE is_complete=0 AND (title_ar IS NULL OR title_ar='' OR overview_ar IS NULL OR overview_ar='')`)));
console.log('m_complete_missing_relaxed(is_complete=1 only):', JSON.stringify(q(`SELECT COUNT(*) c FROM movies WHERE is_complete=1 AND (title_ar IS NULL OR title_ar='' OR overview_ar IS NULL OR overview_ar='')`)));
console.log('m_complete_overview_en_null:', JSON.stringify(q(`SELECT COUNT(*) c FROM movies WHERE is_complete=1 AND (overview_en IS NULL OR overview_en='')`)));
console.log('tv_all_missing_any:', JSON.stringify(q(`SELECT COUNT(*) c FROM tv_series WHERE (name_ar IS NULL OR name_ar='' OR overview_ar IS NULL OR overview_ar='')`)));
console.log('tv_incomplete_missing:', JSON.stringify(q(`SELECT COUNT(*) c FROM tv_series WHERE is_complete=0 AND (name_ar IS NULL OR name_ar='' OR overview_ar IS NULL OR overview_ar='')`)));
console.log('tv_complete_missing_relaxed:', JSON.stringify(q(`SELECT COUNT(*) c FROM tv_series WHERE is_complete=1 AND (name_ar IS NULL OR name_ar='' OR overview_ar IS NULL OR overview_ar='')`)));
console.log('tv_complete_overview_en_null:', JSON.stringify(q(`SELECT COUNT(*) c FROM tv_series WHERE is_complete=1 AND (overview_en IS NULL OR overview_en='')`)));
console.log('odd_reviewed_rejected_complete:', JSON.stringify(q(`SELECT tmdb_id, title_en, release_year, is_filtered, filter_status, is_complete FROM movies WHERE is_complete=1 AND filter_status='reviewed_rejected'`)));
db.close();
