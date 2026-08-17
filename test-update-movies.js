const db = require('./scripts/services/local-db');

// Test the exact UPDATE statement structure
const testUpdate = db.prepare(`
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

console.log('✅ UPDATE statement prepared successfully');

// Try to run it with dummy data
try {
  testUpdate.run(
    'test_ar', 'test_en', 'test_orig', 'test-slug',
    'overview_ar', 'overview_en',
    'Action',
    '/poster.jpg', '/backdrop.jpg',
    'trailer123', 'tt0000001',
    '2024-01-01', 2024, 120,
    'en', 'US',
    null,
    7.5, 1000, 50.0,
    'PG-13',
    1, 3,
    '{"test": "keywords"}', 'SEO Title AR',
    'SEO Desc AR', '/movie/test-slug',
    1 // tmdb_id
  );
  console.log('✅ UPDATE executed successfully');
} catch (e) {
  console.log('❌ Error during execution:', e.message);
}
