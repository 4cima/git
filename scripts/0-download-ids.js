require('dotenv').config({ path: '.env.local' });
const zlib = require('zlib');
const db = require('./services/local-db');

function formatDateForTmdb(date) {
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const DD = String(date.getDate()).padStart(2, '0');
  return `${MM}_${DD}_${date.getFullYear()}`;
}

async function tryDownloadExport(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return zlib.gunzipSync(Buffer.from(buffer));
  } catch { return null; }
}

async function downloadExportWithFallback(fileType) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayUrl = `http://files.tmdb.org/p/exports/${fileType}_ids_${formatDateForTmdb(today)}.json.gz`;
  console.log(`📥 محاولة: ${todayUrl}`);
  let buf = await tryDownloadExport(todayUrl);
  if (buf) { console.log(`✅ نجح (اليوم)`); return buf; }

  const yUrl = `http://files.tmdb.org/p/exports/${fileType}_ids_${formatDateForTmdb(yesterday)}.json.gz`;
  console.log(`⚠️  ملف اليوم مش جاهز، محاولة: ${yUrl}`);
  buf = await tryDownloadExport(yUrl);
  if (buf) { console.log(`✅ نجح (امبارح)`); return buf; }

  console.error(`❌ فشل تحميل ${fileType} (يومين)`);
  return null;
}

function importIdsToTable(buffer, table) {
  const lines = buffer.toString('utf-8').split('\n');
  let inserted = 0, skipped = 0;

  const insertStmt = db.prepare(`INSERT OR IGNORE INTO ${table} (tmdb_id, is_fetched, is_complete) VALUES (?, 0, 0)`);

  db.transaction((lines) => {
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let data;
      try { data = JSON.parse(trimmed); } catch { skipped++; continue; }
      if (!data.id || data.adult === true) { skipped++; continue; }
      const result = insertStmt.run(data.id);
      if (result.changes > 0) inserted++;
    }
  })(lines);

  console.log(`✅ ${inserted.toLocaleString()} ID جديد في ${table} | ⏭️ ${skipped.toLocaleString()} متجاهل`);
}

async function main() {
  console.log('🚀 تحميل IDs من TMDB Exports\n');

  const movieBuf = await downloadExportWithFallback('movie');
  if (movieBuf) importIdsToTable(movieBuf, 'movies');

  const tvBuf = await downloadExportWithFallback('tv_series');
  if (tvBuf) importIdsToTable(tvBuf, 'tv_series');

  const movieCount = db.prepare('SELECT COUNT(*) c FROM movies').get().c;
  const seriesCount = db.prepare('SELECT COUNT(*) c FROM tv_series').get().c;
  console.log(`\n📊 إجمالي: ${movieCount.toLocaleString()} فيلم | ${seriesCount.toLocaleString()} مسلسل`);
}

main().catch(err => { console.error('❌ خطأ فادح:', err); process.exit(1); });
