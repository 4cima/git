require('dotenv').config({ path: '.env.local' });

const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');

const db = new Database('./data/4cima-local.db');
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const BATCH_SIZE = 50;

async function main() {
  console.log('🚀 مزامنة المسلسلات إلى Turso\n');
  
  const series = db.prepare(`
    SELECT id FROM tv_series 
    WHERE is_complete = 1 AND is_filtered = 0 
    AND (synced_to_turso = 0 OR synced_to_turso IS NULL)
    ORDER BY first_air_year DESC
  `).all();
  
  console.log(`📺 إجمالي المسلسلات: ${series.length.toLocaleString()}`);
  console.log(`📦 عدد الدفعات: ${Math.ceil(series.length / BATCH_SIZE)}\n`);
  
  let synced = 0;
  let errors = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < series.length; i += BATCH_SIZE) {
    const batch = series.slice(i, i + BATCH_SIZE);
    
    for (const item of batch) {
      try {
        const s = db.prepare('SELECT * FROM tv_series WHERE id = ?').get(item.id);
        
        await turso.execute({
          sql: `
            INSERT INTO tv_series (tmdb_id, slug, name_en, name_ar, overview_ar, poster_path, first_air_year, number_of_seasons, number_of_episodes, status, vote_average, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(tmdb_id) DO UPDATE SET
              slug = excluded.slug,
              name_en = excluded.name_en,
              name_ar = excluded.name_ar,
              overview_ar = excluded.overview_ar,
              updated_at = excluded.updated_at
          `,
          args: [
            s.tmdb_id,
            s.slug,
            s.title_en || '',
            s.title_ar || '',
            s.overview_ar || '',
            s.poster_path || '',
            s.first_air_year || 0,
            s.number_of_seasons || 0,
            s.number_of_episodes || 0,
            s.status || '',
            s.vote_average || 0,
            new Date().toISOString(),
            new Date().toISOString()
          ]
        });
        
        db.prepare('UPDATE tv_series SET synced_to_turso = 1 WHERE id = ?').run(item.id);
        synced++;
      } catch (error) {
        errors++;
      }
    }
    
    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    const rate = (synced / elapsed * 60).toFixed(0);
    const percent = ((synced / series.length) * 100).toFixed(1);
    const eta = ((series.length - synced) / (synced / elapsed) / 60).toFixed(0);
    
    process.stdout.write(`\r⏳ ${synced.toLocaleString()} / ${series.length.toLocaleString()} (${percent}%) | ${rate}/دقيقة | ETA: ${eta} دقيقة`);
  }
  
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log('\n\n✅ اكتملت المزامنة!');
  console.log(`📺 المسلسلات: ${synced.toLocaleString()}`);
  console.log(`❌ الأخطاء: ${errors.toLocaleString()}`);
  console.log(`⏱️  الوقت: ${totalTime} دقيقة`);
  console.log(`⚡ السرعة: ${(synced / totalTime).toFixed(0)} مسلسل/دقيقة`);
}

main().catch(console.error);
