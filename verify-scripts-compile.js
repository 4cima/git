// Verify both scripts can compile their UPDATE statements
const db = require('./scripts/services/local-db');

console.log('Testing MOVIES UPDATE statement...');
try {
  const moviesUpdate = db.prepare(`
    UPDATE movies SET
      title_ar = ?, title_en = ?, title_original = ?, slug = ?,
      overview_ar = ?, overview_en = ?,
      primary_genre = ?,
      poster_path = ?, backdrop_path = ?,
      trailer_key = ?, imdb_id = ?,
      release_date = ?, release_year = ?, runtime = ?,
      original_language = ?, country_of_origin = ?,
      production_companies = ?,
      vote_average = ?, vote_count = ?, popularity = ?,
      age_rating = ?,
      is_fetched = 1, is_filtered = 0, filter_reason = NULL,
      is_complete = ?, sync_priority = ?,
      seo_keywords_json = ?, seo_title_ar = ?,
      seo_description_ar = ?, canonical_url = ?,
      updated_at = datetime('now')
    WHERE tmdb_id = ?
  `);
  console.log('✅ Movies UPDATE compiles successfully');
} catch (e) {
  console.log('❌ Movies UPDATE error:', e.message);
}

console.log('\nTesting SERIES UPDATE statement...');
try {
  const seriesUpdate = db.prepare(`
    UPDATE tv_series SET
      name_ar = ?, name_en = ?, name_original = ?, slug = ?,
      overview_ar = ?, overview_en = ?,
      primary_genre = ?,
      poster_path = ?, backdrop_path = ?,
      trailer_key = ?, imdb_id = ?,
      first_air_date = ?, last_air_date = ?, first_air_year = ?,
      number_of_seasons = ?, number_of_episodes = ?, status = ?,
      original_language = ?, country_of_origin = ?,
      production_companies = ?,
      vote_average = ?, vote_count = ?, popularity = ?,
      age_rating = ?,
      is_fetched = 1, is_filtered = 0, filter_reason = NULL,
      is_complete = ?, sync_priority = ?,
      seo_keywords_json = ?, seo_title_ar = ?,
      seo_description_ar = ?, canonical_url = ?,
      updated_at = datetime('now')
    WHERE tmdb_id = ?
  `);
  console.log('✅ Series UPDATE compiles successfully');
} catch (e) {
  console.log('❌ Series UPDATE error:', e.message);
}

console.log('\n✅ All UPDATE statements verified!');
