require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = require('./scripts/services/local-db');
const { prepareMovieForTurso } = require('./scripts/prepare-content-for-turso');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const TEST_TMDB_ID = 1627985;

function limitCastJSON(castJson, limit = 10) {
  try {
    const cast = typeof castJson === 'string' ? JSON.parse(castJson) : castJson;
    if (Array.isArray(cast) && cast.length > limit) {
      return JSON.stringify(cast.slice(0, limit));
    }
    return typeof castJson === 'string' ? castJson : JSON.stringify(castJson);
  } catch (e) {
    return castJson;
  }
}

async function main() {
  console.log(`🧪 اختبار مزامنة فيلم واحد: tmdb_id=${TEST_TMDB_ID}\n`);
  console.log('═'.repeat(70));
  
  // 1. فحص المحلي
  const local = db.prepare('SELECT id, tmdb_id, title_en FROM movies WHERE tmdb_id = ?').get(TEST_TMDB_ID);
  if (!local) {
    console.log('❌ الفيلم غير موجود محلياً');
    process.exit(1);
  }
  
  console.log('\n1️⃣ البيانات المحلية:');
  console.log(`   id: ${local.id}`);
  console.log(`   tmdb_id: ${local.tmdb_id}`);
  console.log(`   title: ${local.title_en}`);
  
  // 2. فحص Turso
  const tursoCheck = await turso.execute({
    sql: 'SELECT id, tmdb_id, title_en, updated_at FROM movies WHERE tmdb_id = ?',
    args: [TEST_TMDB_ID]
  });
  
  console.log('\n2️⃣ البيانات في Turso:');
  if (tursoCheck.rows.length === 0) {
    console.log('   ✅ غير موجود (سيتم INSERT)');
  } else {
    const existing = tursoCheck.rows[0];
    console.log(`   ⚠️ موجود مسبقاً:`);
    console.log(`   id: ${existing.id}`);
    console.log(`   tmdb_id: ${existing.tmdb_id}`);
    console.log(`   title: ${existing.title_en}`);
    console.log(`   updated_at: ${existing.updated_at}`);
  }
  
  // 3. تجهيز البيانات
  console.log('\n3️⃣ تجهيز البيانات للمزامنة...');
  const movie = prepareMovieForTurso(local.id);
  if (!movie) {
    console.log('❌ فشل تجهيز البيانات');
    process.exit(1);
  }
  
  console.log(`   سيتم استخدام id=${movie.tmdb_id} (من tmdb_id)`);
  console.log(`   slug: ${movie.slug}`);
  
  // 4. المزامنة
  console.log('\n4️⃣ محاولة المزامنة...\n');
  
  try {
    await turso.execute({
      sql: `
        INSERT INTO movies (
          id, tmdb_id, slug,
          title_en, title_ar,
          overview_ar,
          poster_path,
          release_date, release_year,
          vote_average,
          trailer_key,
          genres_json, cast_json,
          countries_json, keywords_json, companies_json,
          seo_title_ar, seo_description_ar, seo_keywords_json, canonical_url,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?,
          ?, ?,
          ?,
          ?,
          ?, ?,
          ?,
          ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          tmdb_id = excluded.tmdb_id,
          slug = excluded.slug,
          title_en = excluded.title_en,
          title_ar = excluded.title_ar,
          overview_ar = excluded.overview_ar,
          poster_path = excluded.poster_path,
          release_date = excluded.release_date,
          release_year = excluded.release_year,
          vote_average = excluded.vote_average,
          trailer_key = excluded.trailer_key,
          genres_json = excluded.genres_json,
          cast_json = excluded.cast_json,
          countries_json = excluded.countries_json,
          keywords_json = excluded.keywords_json,
          companies_json = excluded.companies_json,
          seo_title_ar = excluded.seo_title_ar,
          seo_description_ar = excluded.seo_description_ar,
          seo_keywords_json = excluded.seo_keywords_json,
          canonical_url = excluded.canonical_url,
          updated_at = excluded.updated_at
      `,
      args: [
        movie.tmdb_id, movie.tmdb_id, movie.slug,
        movie.title_en, movie.title_ar,
        movie.overview_ar,
        movie.poster_path,
        movie.release_date, movie.release_year,
        movie.vote_average,
        movie.trailer_key,
        movie.genres_json,
        movie.cast_json ? limitCastJSON(movie.cast_json, 10) : null,
        movie.countries_json, movie.keywords_json, movie.companies_json,
        movie.seo_title_ar, movie.seo_description_ar, movie.seo_keywords_json, movie.canonical_url,
        movie.created_at, movie.updated_at
      ]
    });
    
    console.log('✅ نجح!\n');
    
    // 5. فحص النتيجة
    const afterSync = await turso.execute({
      sql: 'SELECT id, tmdb_id, title_en, updated_at FROM movies WHERE tmdb_id = ?',
      args: [TEST_TMDB_ID]
    });
    
    console.log('5️⃣ بعد المزامنة:');
    const updated = afterSync.rows[0];
    console.log(`   id: ${updated.id}`);
    console.log(`   tmdb_id: ${updated.tmdb_id}`);
    console.log(`   title: ${updated.title_en}`);
    console.log(`   updated_at: ${updated.updated_at}`);
    
    if (tursoCheck.rows.length > 0) {
      const oldDate = new Date(tursoCheck.rows[0].updated_at);
      const newDate = new Date(updated.updated_at);
      if (newDate > oldDate) {
        console.log(`\n   🔄 تم التحديث (من ${tursoCheck.rows[0].updated_at})`);
      } else {
        console.log(`\n   ⚠️ لم يتغير updated_at!`);
      }
    }
    
  } catch (e) {
    console.log(`❌ فشل: ${e.message}\n`);
    console.log('التفاصيل:', e);
  }
  
  console.log('\n' + '═'.repeat(70));
  
  process.exit(0);
}

main();
