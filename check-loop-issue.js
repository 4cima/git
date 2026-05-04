const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db', { readonly: true });

console.log('🔍 فحص مشكلة اللوب\n');

// الأفلام
console.log('🎬 الأفلام:\n');

const m1 = db.prepare(`
  SELECT COUNT(*) as c FROM movies 
  WHERE overview_en IS NULL AND is_filtered = 0
`).get();
console.log(`1. لم يُسحب (overview_en IS NULL): ${m1.c.toLocaleString()}`);

const m2 = db.prepare(`
  SELECT COUNT(*) as c FROM movies 
  WHERE overview_en IS NOT NULL AND (title_ar = 'TBD' OR title_ar IS NULL)
`).get();
console.log(`2. مسحوب لكن title_ar = TBD أو NULL: ${m2.c.toLocaleString()}`);

const m3 = db.prepare(`
  SELECT COUNT(*) as c FROM movies 
  WHERE overview_en IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = movies.id AND content_type = 'movie')
`).get();
console.log(`3. مسحوب لكن بدون ممثلين: ${m3.c.toLocaleString()}`);

const m_total = db.prepare(`
  SELECT COUNT(*) as c FROM movies
  WHERE (
    (overview_en IS NULL AND is_filtered = 0)
    OR (overview_en IS NOT NULL AND (title_ar = 'TBD' OR title_ar IS NULL))
    OR (overview_en IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = movies.id AND content_type = 'movie'))
  )
`).get();
console.log(`\n📊 إجمالي الأفلام المحتاجة: ${m_total.c.toLocaleString()}`);

// المسلسلات
console.log('\n\n📺 المسلسلات:\n');

const s1 = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series 
  WHERE overview_en IS NULL AND is_filtered = 0
`).get();
console.log(`1. لم يُسحب (overview_en IS NULL): ${s1.c.toLocaleString()}`);

const s2 = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series 
  WHERE overview_en IS NOT NULL AND (title_ar = 'TBD' OR title_ar IS NULL)
`).get();
console.log(`2. مسحوب لكن title_ar = TBD أو NULL: ${s2.c.toLocaleString()}`);

const s3 = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series 
  WHERE overview_en IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = tv_series.id AND content_type = 'series')
`).get();
console.log(`3. مسحوب لكن بدون ممثلين: ${s3.c.toLocaleString()}`);

const s_total = db.prepare(`
  SELECT COUNT(*) as c FROM tv_series
  WHERE (
    (overview_en IS NULL AND is_filtered = 0)
    OR (overview_en IS NOT NULL AND (title_ar = 'TBD' OR title_ar IS NULL))
    OR (overview_en IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = tv_series.id AND content_type = 'series'))
  )
`).get();
console.log(`\n📊 إجمالي المسلسلات المحتاجة: ${s_total.c.toLocaleString()}`);

// عينة من الأفلام بدون ممثلين
console.log('\n\n📝 عينة من الأفلام المسحوبة بدون ممثلين:');
const sample = db.prepare(`
  SELECT id, title_en, vote_count 
  FROM movies 
  WHERE overview_en IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = movies.id AND content_type = 'movie')
  ORDER BY vote_count DESC
  LIMIT 10
`).all();
sample.forEach(m => console.log(`  ${m.id}: ${m.title_en} (votes: ${m.vote_count})`));

db.close();
