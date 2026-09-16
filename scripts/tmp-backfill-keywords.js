// مؤقت: باكفيل keywords من TMDB للصفوف visitable فاضية الكلمات — يُحذف بعد التشغيل
// الاستخدام: node scripts/tmp-backfill-keywords.js --type=movie --limit=3000
require('dotenv').config({ path: '.env.local' });
const pLimitModule = require('p-limit');
const pLimit = pLimitModule.default || pLimitModule;
const db = require('./services/local-db');
const { fetchMovieDetails, fetchSeriesDetails } = require('./services/tmdb-api');

/* المحميون (نسخة مطابقة لـ ALLOWLIST_IDS في content-filter.js — لا تغيير عليهم):
   لا يُحدَّث keywords_json لهم في هذه الجولة */
const PROTECTED = new Set([
  '398', '1576', '369885', '1408', '37135', '37136',
  '1266798', '910571', '250225', '451955', '10876', '1006947', '8653', '1145810',
  '156236', '424762', '179129', '37432', '544575', '14428', '675414', '177248',
  '67415', '46086', '1163263', '304034', '417975', '362714', '624480', '289491',
  '484328', '874490', '911719', '32766', '10488', '202277',
].map(Number));

const args = process.argv.slice(2);
const typeArg = args.find(a => a.startsWith('--type'));
const TYPE = typeArg ? typeArg.split('=')[1] : 'movie';
const limitArg = args.find(a => a.startsWith('--limit'));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 3000;

const stats = { filled: 0, stillEmpty: 0, protectedSkipped: 0, errors: 0 };

(async () => {
  const table = TYPE === 'movie' ? 'movies' : 'tv_series';
  const yearCol = TYPE === 'movie' ? 'release_year' : 'first_air_year';
  const rows = db.prepare(`
    SELECT tmdb_id FROM ${table}
    WHERE is_complete=1 AND is_filtered=0 AND ${yearCol} IS NOT NULL AND ${yearCol}>=2000
      AND (keywords_json IS NULL OR keywords_json='' OR keywords_json='[]')
    ORDER BY popularity DESC LIMIT ?
  `).all(LIMIT);
  console.log(`🚀 باكفيل keywords — ${TYPE} | مرشحون: ${rows.length} (حد ${LIMIT})`);

  const limiter = pLimit(10);
  let done = 0;
  await Promise.all(rows.map(r => limiter(async () => {
    if (PROTECTED.has(r.tmdb_id)) { stats.protectedSkipped++; done++; return; }
    try {
      const data = TYPE === 'movie' ? await fetchMovieDetails(r.tmdb_id) : await fetchSeriesDetails(r.tmdb_id);
      if (!data) { stats.errors++; done++; return; }
      const kw = TYPE === 'movie' ? (data.keywords?.keywords || []) : (data.keywords?.results || []);
      if (kw.length > 0) {
        db.prepare(`UPDATE ${table} SET keywords_json=?, synced_to_d1=0, updated_at=datetime('now') WHERE tmdb_id=?`)
          .run(JSON.stringify(kw), r.tmdb_id);
        stats.filled++;
      } else {
        stats.stillEmpty++;
      }
    } catch (e) {
      console.error(`❌ ${r.tmdb_id}: ${e.message}`);
      stats.errors++;
    }
    done++;
    if (done % 250 === 0) console.log(`   ⏱️ تقدم: ${done}/${rows.length} | ملأت=${stats.filled} فاضي=${stats.stillEmpty}`);
  })));

  console.log(`\n✅ اكتمل (${TYPE}): ملأت=${stats.filled} | فاضي على TMDB=${stats.stillEmpty} | محمي تخطّيت=${stats.protectedSkipped} | أخطاء=${stats.errors}`);
})().catch(e => { console.error('خطأ فادح:', e.message); process.exit(1); });
