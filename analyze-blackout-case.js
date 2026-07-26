require('dotenv').config({ path: '.env.local' });
const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');

const localDb = new Database('data/4cima-local.db', { readonly: true });
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function analyzeBlackout() {
  console.log('🔍 تحليل حالة "Blackout" - التصادم المتعدد\n');
  console.log('═'.repeat(70));
  
  // 1. جلب كل أفلام Blackout من المحلي
  console.log('\n1️⃣ جلب أفلام "Blackout" من المحلي:\n');
  
  const localBlackouts = localDb.prepare(`
    SELECT tmdb_id, title_en
    FROM movies
    WHERE title_en = 'Blackout'
    ORDER BY tmdb_id ASC
  `).all();
  
  console.log(`   وجد ${localBlackouts.length} فيلم بعنوان "Blackout"\n`);
  
  if (localBlackouts.length === 0) {
    console.log('   لا يوجد - جاري البحث بـLIKE...');
    const alt = localDb.prepare(`SELECT tmdb_id, title_en FROM movies WHERE title_en LIKE '%Blackout%' LIMIT 20`).all();
    console.log(`   وجد ${alt.length}:`);
    alt.forEach(m => console.log(`     [${m.tmdb_id}] ${m.title_en}`));
    localDb.close();
    return;
  }
  
  // 2. جلب تفاصيلهم من Turso
  console.log('2️⃣ جلب تفاصيل من Turso:\n');
  
  const details = [];
  
  for (const local of localBlackouts) {
    const result = await turso.execute({
      sql: 'SELECT tmdb_id, slug, title_en, release_year, genres_json FROM movies WHERE tmdb_id = ?',
      args: [local.tmdb_id]
    });
    
    if (result.rows.length === 0) continue;
    const movie = result.rows[0];
    
    // استخراج genre
    let genre = null;
    if (movie.genres_json && movie.genres_json !== '' && movie.genres_json !== '[]') {
      try {
        const arr = JSON.parse(movie.genres_json);
        if (arr[0]?.name_en) genre = arr[0].name_en;
      } catch {}
    }
    
    if (!genre) {
      const lg = localDb.prepare('SELECT primary_genre FROM movies WHERE tmdb_id = ?').get(movie.tmdb_id);
      genre = lg?.primary_genre || null;
    }
    
    details.push({
      tmdb_id: movie.tmdb_id,
      oldSlug: movie.slug,
      title: movie.title_en,
      year: movie.release_year,
      genre: genre
    });
    
    console.log(`   [${movie.tmdb_id}]`);
    console.log(`     العنوان: "${movie.title_en}"`);
    console.log(`     السنة: ${movie.release_year || 'N/A'}`);
    console.log(`     Genre: ${genre || '(لا يوجد)'}`);
    console.log(`     Slug القديم: ${movie.slug}\n`);
  }
  
  // 3. محاكاة حساب slugs
  console.log('\n3️⃣ محاكاة حساب الslugs الجديدة:\n');
  
  const slugMap = new Map();
  const results = [];
  
  for (const movie of details) {
    const base = 'blackout';
    let newSlug = null;
    let level = null;
    
    // 1. base
    if (!slugMap.has(base)) {
      newSlug = base;
      level = 'base';
    }
    // 2. base-year
    else if (movie.year) {
      const withYear = `${base}-${movie.year}`;
      if (!slugMap.has(withYear)) {
        newSlug = withYear;
        level = 'base-year';
      }
      // 3. base-year-genre
      else if (movie.genre) {
        const g = movie.genre.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const withGenre = `${base}-${movie.year}-${g}`;
        if (!slugMap.has(withGenre)) {
          newSlug = withGenre;
          level = 'base-year-genre';
        }
        // 4. base-year-genre-N
        else {
          for (let i = 2; i <= 999; i++) {
            const s = `${withGenre}-${i}`;
            if (!slugMap.has(s)) {
              newSlug = s;
              level = 'base-year-genre-N';
              break;
            }
          }
        }
      }
      // لو مفيش genre: base-year-N
      else {
        for (let i = 2; i <= 999; i++) {
          const s = `${withYear}-${i}`;
          if (!slugMap.has(s)) {
            newSlug = s;
            level = 'base-year-N';
            break;
          }
        }
      }
    }
    // لو مفيش year: base-N
    else {
      for (let i = 2; i <= 999; i++) {
        const s = `${base}-${i}`;
        if (!slugMap.has(s)) {
          newSlug = s;
          level = 'base-N';
          break;
        }
      }
    }
    
    if (newSlug) slugMap.set(newSlug, movie.tmdb_id);
    
    results.push({ tmdb_id: movie.tmdb_id, oldSlug: movie.oldSlug, newSlug, level });
    
    console.log(`   [${movie.tmdb_id}] "${movie.title}"`);
    console.log(`     القديم: ${movie.oldSlug}`);
    console.log(`     الجديد: ${newSlug || '(فشل)'}`);
    console.log(`     المستوى: ${level || 'فشل'}\n`);
  }
  
  // 4. ملخص
  console.log('\n4️⃣ الملخص:\n');
  
  const counts = {};
  results.forEach(r => {
    counts[r.level] = (counts[r.level] || 0) + 1;
  });
  
  Object.keys(counts).sort().forEach(k => {
    console.log(`   ${k}: ${counts[k]}`);
  });
  
  console.log('\n' + '═'.repeat(70));
  
  localDb.close();
  process.exit(0);
}

analyzeBlackout().catch(e => {
  console.error('❌ خطأ:', e.message);
  localDb.close();
  process.exit(1);
});
