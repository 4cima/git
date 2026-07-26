require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = require('./scripts/services/local-db');
const { prepareMovieForTurso } = require('./scripts/prepare-content-for-turso');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const FAILED_IDS = [724606, 128115, 132277, 29404];

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

async function syncMovieToTurso(movieId, tmdbId) {
  try {
    const movie = prepareMovieForTurso(movieId);
    if (!movie) {
      console.error(`❌ tmdb_id=${tmdbId}: لم يتم العثور عليه محلياً`);
      return false;
    }

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

    console.log(`✅ tmdb_id=${tmdbId}: نجح (slug: ${movie.slug})`);
    return true;
  } catch (e) {
    console.error(`❌ tmdb_id=${tmdbId}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('🔄 إعادة محاولة الأفلام الفاشلة\n');
  console.log('═'.repeat(70));
  console.log(`📋 العدد: ${FAILED_IDS.length} فيلم\n`);

  let success = 0;
  let failed = 0;

  for (const tmdbId of FAILED_IDS) {
    const localMovie = db.prepare('SELECT id FROM movies WHERE tmdb_id = ?').get(tmdbId);
    
    if (!localMovie) {
      console.error(`⚠️  tmdb_id=${tmdbId}: غير موجود محلياً`);
      failed++;
      continue;
    }

    const result = await syncMovieToTurso(localMovie.id, tmdbId);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('📊 النتائج:');
  console.log(`   ✅ نجح: ${success}`);
  console.log(`   ❌ فشل: ${failed}`);
  console.log('═'.repeat(70));

  process.exit(0);
}

main().catch(e => {
  console.error('❌ خطأ:', e.message);
  process.exit(1);
});
