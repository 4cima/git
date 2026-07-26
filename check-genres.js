const Database = require('better-sqlite3');
const db = new Database('local.db');

const genres = db.prepare('SELECT * FROM genres ORDER BY name_ar').all();
console.log('إجمالي التصنيفات:', genres.length);
console.log('\nكل التصنيفات:');
genres.forEach((g, i) => {
  console.log(`${i+1}. ${g.name_ar} (${g.name_en}) - ID: ${g.tmdb_id}`);
});

// حساب عدد الأعمال لكل تصنيف
console.log('\n\n=== أشهر 15 تصنيف (حسب عدد الأعمال) ===\n');
const genreStats = db.prepare(`
  SELECT 
    g.name_ar,
    g.name_en,
    COUNT(DISTINCT cg.content_tmdb_id) as content_count
  FROM genres g
  LEFT JOIN content_genres cg ON g.tmdb_id = cg.genre_tmdb_id
  GROUP BY g.tmdb_id, g.name_ar, g.name_en
  ORDER BY content_count DESC
  LIMIT 15
`).all();

genreStats.forEach((stat, i) => {
  console.log(`${i+1}. ${stat.name_ar} (${stat.name_en}) - ${stat.content_count} عمل`);
});

db.close();
