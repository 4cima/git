import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  intMode: 'number'
})

console.log('═══════════════════════════════════════════════════════════')
console.log('PHASE 2: VERIFY REMAINING FILTERS WITH REAL TURSO QUERIES')
console.log('═══════════════════════════════════════════════════════════\n')

// FILTER 1: GENRE (genres_json coverage + distribution)
console.log('1. GENRE FILTER (genres_json column)')
console.log('─────────────────────────────────────────────────────────')

const moviesTotal = await turso.execute('SELECT COUNT(*) as count FROM movies')
const seriesTotal = await turso.execute('SELECT COUNT(*) as count FROM tv_series')

const moviesGenreCoverage = await turso.execute(`
  SELECT COUNT(*) as count
  FROM movies
  WHERE genres_json IS NOT NULL AND genres_json != '[]' AND genres_json != ''
`)

const seriesGenreCoverage = await turso.execute(`
  SELECT COUNT(*) as count
  FROM tv_series
  WHERE genres_json IS NOT NULL AND genres_json != '[]' AND genres_json != ''
`)

const moviesTotalCount = Number(moviesTotal.rows[0].count)
const seriesTotalCount = Number(seriesTotal.rows[0].count)
const moviesGenreCount = Number(moviesGenreCoverage.rows[0].count)
const seriesGenreCount = Number(seriesGenreCoverage.rows[0].count)

console.log(`Movies:`)
console.log(`  Total: ${moviesTotalCount.toLocaleString()}`)
console.log(`  With genres_json: ${moviesGenreCount.toLocaleString()} (${(moviesGenreCount/moviesTotalCount*100).toFixed(1)}%)`)

console.log(`\nSeries:`)
console.log(`  Total: ${seriesTotalCount.toLocaleString()}`)
console.log(`  With genres_json: ${seriesGenreCount.toLocaleString()} (${(seriesGenreCount/seriesTotalCount*100).toFixed(1)}%)`)

// Sample genre distribution for movies (top 10 genres)
const movieGenresDist = await turso.execute(`
  SELECT 
    json_extract(value, '$.name_ar') as genre,
    COUNT(DISTINCT movies.id) as count
  FROM movies, json_each(movies.genres_json)
  WHERE genres_json IS NOT NULL AND genres_json != '[]'
  GROUP BY genre
  ORDER BY count DESC
  LIMIT 10
`)

console.log(`\nTop 10 Movie Genres:`)
movieGenresDist.rows.forEach(row => {
  console.log(`  ${row.genre}: ${Number(row.count).toLocaleString()}`)
})

// Sample genre distribution for series (top 10 genres)
const seriesGenresDist = await turso.execute(`
  SELECT 
    json_extract(value, '$.name_ar') as genre,
    COUNT(DISTINCT tv_series.id) as count
  FROM tv_series, json_each(tv_series.genres_json)
  WHERE genres_json IS NOT NULL AND genres_json != '[]'
  GROUP BY genre
  ORDER BY count DESC
  LIMIT 10
`)

console.log(`\nTop 10 Series Genres:`)
seriesGenresDist.rows.forEach(row => {
  console.log(`  ${row.genre}: ${Number(row.count).toLocaleString()}`)
})

// FILTER 2: YEAR (release_year/first_air_year coverage + range)
console.log('\n\n2. YEAR FILTER (release_year / first_air_year column)')
console.log('─────────────────────────────────────────────────────────')

const moviesYearCoverage = await turso.execute(`
  SELECT 
    COUNT(*) as total,
    COUNT(release_year) as with_year,
    MIN(release_year) as min_year,
    MAX(release_year) as max_year
  FROM movies
  WHERE release_year IS NOT NULL AND release_year > 0
`)

const seriesYearCoverage = await turso.execute(`
  SELECT 
    COUNT(*) as total,
    COUNT(first_air_year) as with_year,
    MIN(first_air_year) as min_year,
    MAX(first_air_year) as max_year
  FROM tv_series
  WHERE first_air_year IS NOT NULL AND first_air_year > 0
`)

const movieYearRow = moviesYearCoverage.rows[0]
const seriesYearRow = seriesYearCoverage.rows[0]

console.log(`Movies:`)
console.log(`  With release_year: ${Number(movieYearRow.with_year).toLocaleString()} (${(Number(movieYearRow.with_year)/moviesTotalCount*100).toFixed(1)}%)`)
console.log(`  Year range: ${movieYearRow.min_year} → ${movieYearRow.max_year}`)

console.log(`\nSeries:`)
console.log(`  With first_air_year: ${Number(seriesYearRow.with_year).toLocaleString()} (${(Number(seriesYearRow.with_year)/seriesTotalCount*100).toFixed(1)}%)`)
console.log(`  Year range: ${seriesYearRow.min_year} → ${seriesYearRow.max_year}`)

// FILTER 3: RATING (vote_average coverage + distribution across UI buckets)
console.log('\n\n3. RATING FILTER (vote_average column)')
console.log('─────────────────────────────────────────────────────────')

const moviesRatingCoverage = await turso.execute(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN vote_average > 0 THEN 1 END) as with_rating
  FROM movies
`)

const seriesRatingCoverage = await turso.execute(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN vote_average > 0 THEN 1 END) as with_rating
  FROM tv_series
`)

const movieRatingRow = moviesRatingCoverage.rows[0]
const seriesRatingRow = seriesRatingCoverage.rows[0]

console.log(`Movies:`)
console.log(`  With vote_average > 0: ${Number(movieRatingRow.with_rating).toLocaleString()} (${(Number(movieRatingRow.with_rating)/moviesTotalCount*100).toFixed(1)}%)`)

console.log(`\nSeries:`)
console.log(`  With vote_average > 0: ${Number(seriesRatingRow.with_rating).toLocaleString()} (${(Number(seriesRatingRow.with_rating)/seriesTotalCount*100).toFixed(1)}%)`)

// Distribution across UI rating buckets (Movies)
const moviesRatingBuckets = await turso.execute(`
  SELECT
    CASE
      WHEN vote_average >= 9.1 THEN '9.1-10 مذهل'
      WHEN vote_average >= 8.1 THEN '8.1-9 ممتاز'
      WHEN vote_average >= 7.1 THEN '7.1-8 جيد جداً'
      WHEN vote_average >= 6.1 THEN '6.1-7 جيد'
      WHEN vote_average >= 5.1 THEN '5.1-6 مقبول'
      WHEN vote_average >= 4.1 THEN '4.1-5 متوسط'
      WHEN vote_average >= 3.1 THEN '3.1-4 ضعيف'
      ELSE 'أقل من 3.1'
    END as bucket,
    COUNT(*) as count
  FROM movies
  WHERE vote_average > 0
  GROUP BY bucket
  ORDER BY MIN(vote_average) DESC
`)

console.log(`\nMovies by Rating Bucket:`)
moviesRatingBuckets.rows.forEach(row => {
  console.log(`  ${row.bucket}: ${Number(row.count).toLocaleString()}`)
})

// Distribution across UI rating buckets (Series)
const seriesRatingBuckets = await turso.execute(`
  SELECT
    CASE
      WHEN vote_average >= 9.1 THEN '9.1-10 مذهل'
      WHEN vote_average >= 8.1 THEN '8.1-9 ممتاز'
      WHEN vote_average >= 7.1 THEN '7.1-8 جيد جداً'
      WHEN vote_average >= 6.1 THEN '6.1-7 جيد'
      WHEN vote_average >= 5.1 THEN '5.1-6 مقبول'
      WHEN vote_average >= 4.1 THEN '4.1-5 متوسط'
      WHEN vote_average >= 3.1 THEN '3.1-4 ضعيف'
      ELSE 'أقل من 3.1'
    END as bucket,
    COUNT(*) as count
  FROM tv_series
  WHERE vote_average > 0
  GROUP BY bucket
  ORDER BY MIN(vote_average) DESC
`)

console.log(`\nSeries by Rating Bucket:`)
seriesRatingBuckets.rows.forEach(row => {
  console.log(`  ${row.bucket}: ${Number(row.count).toLocaleString()}`)
})

// FILTER 4: COUNTRY (re-confirm coverage)
console.log('\n\n4. COUNTRY FILTER (countries_json / country_of_origin column)')
console.log('─────────────────────────────────────────────────────────')

const moviesCountryCoverage = await turso.execute(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN countries_json IS NOT NULL AND countries_json != '[]' AND countries_json != '' THEN 1 END) as with_country
  FROM movies
`)

const seriesCountryCoverage = await turso.execute(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN country_of_origin IS NOT NULL AND country_of_origin != '' THEN 1 END) as with_country
  FROM tv_series
`)

const movieCountryRow = moviesCountryCoverage.rows[0]
const seriesCountryRow = seriesCountryCoverage.rows[0]

console.log(`Movies (countries_json):`)
console.log(`  With country data: ${Number(movieCountryRow.with_country).toLocaleString()} (${(Number(movieCountryRow.with_country)/moviesTotalCount*100).toFixed(1)}%)`)

console.log(`\nSeries (country_of_origin):`)
console.log(`  With country data: ${Number(seriesCountryRow.with_country).toLocaleString()} (${(Number(seriesCountryRow.with_country)/seriesTotalCount*100).toFixed(1)}%)`)

// Top 10 countries for movies
const moviesCountryDist = await turso.execute(`
  SELECT 
    json_extract(value, '$.iso_3166_1') as country_code,
    COUNT(DISTINCT movies.id) as count
  FROM movies, json_each(movies.countries_json)
  WHERE countries_json IS NOT NULL AND countries_json != '[]'
  GROUP BY country_code
  ORDER BY count DESC
  LIMIT 10
`)

console.log(`\nTop 10 Movie Countries:`)
moviesCountryDist.rows.forEach(row => {
  console.log(`  ${row.country_code}: ${Number(row.count).toLocaleString()}`)
})

// Top 10 countries for series
const seriesCountryDist = await turso.execute(`
  SELECT 
    country_of_origin as country_code,
    COUNT(*) as count
  FROM tv_series
  WHERE country_of_origin IS NOT NULL AND country_of_origin != ''
  GROUP BY country_code
  ORDER BY count DESC
  LIMIT 10
`)

console.log(`\nTop 10 Series Countries:`)
seriesCountryDist.rows.forEach(row => {
  console.log(`  ${row.country_code}: ${Number(row.count).toLocaleString()}`)
})

// FILTER 5: SORT (verify all 8 options work)
console.log('\n\n5. SORT FILTER (verify all 8 options work)')
console.log('─────────────────────────────────────────────────────────')

const sortTests = [
  { value: 'popularity', order: 'DESC', label: 'الأكثر شهرة' },
  { value: 'vote_average', order: 'DESC', label: 'الأعلى تقييماً' },
  { value: 'vote_count', order: 'DESC', label: 'الأكثر تقييماً' },
  { value: 'release_year', order: 'DESC', label: 'الأحدث (movies)' },
  { value: 'release_year', order: 'ASC', label: 'الأقدم (movies)' },
  { value: 'created_at', order: 'DESC', label: 'آخر إضافة' },
  { value: 'title_ar', order: 'ASC', label: 'الاسم (أ-ي)' },
  { value: 'title_ar', order: 'DESC', label: 'الاسم (ي-أ)' },
]

console.log(`Testing all 8 sort options for Movies:\n`)

for (const sort of sortTests) {
  try {
    const result = await turso.execute({
      sql: `SELECT id, title_ar, ${sort.value} as sort_col FROM movies ORDER BY ${sort.value} ${sort.order} LIMIT 3`,
      args: []
    })
    
    const values = result.rows.map(r => r.sort_col).join(', ')
    console.log(`  ✅ ${sort.label}: ${values}`)
  } catch (err) {
    console.log(`  ❌ ${sort.label}: ERROR - ${err.message}`)
  }
}

const sortTestsSeries = [
  { value: 'popularity', order: 'DESC', label: 'الأكثر شهرة' },
  { value: 'vote_average', order: 'DESC', label: 'الأعلى تقييماً' },
  { value: 'vote_count', order: 'DESC', label: 'الأكثر تقييماً' },
  { value: 'first_air_year', order: 'DESC', label: 'الأحدث (series)' },
  { value: 'first_air_year', order: 'ASC', label: 'الأقدم (series)' },
  { value: 'created_at', order: 'DESC', label: 'آخر إضافة' },
  { value: 'name_ar', order: 'ASC', label: 'الاسم (أ-ي)' },
  { value: 'name_ar', order: 'DESC', label: 'الاسم (ي-أ)' },
]

console.log(`\nTesting all 8 sort options for Series:\n`)

for (const sort of sortTestsSeries) {
  try {
    const result = await turso.execute({
      sql: `SELECT id, name_ar, ${sort.value} as sort_col FROM tv_series ORDER BY ${sort.value} ${sort.order} LIMIT 3`,
      args: []
    })
    
    const values = result.rows.map(r => r.sort_col).join(', ')
    console.log(`  ✅ ${sort.label}: ${values}`)
  } catch (err) {
    console.log(`  ❌ ${sort.label}: ERROR - ${err.message}`)
  }
}

console.log('\n═══════════════════════════════════════════════════════════')
console.log('PHASE 2 COMPLETE')
console.log('═══════════════════════════════════════════════════════════')

await turso.close()
