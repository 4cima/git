import { createClient } from '@libsql/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

console.log('='.repeat(80))
console.log('TURSO SCHEMA CHECK - REAL QUERIES')
console.log('='.repeat(80))

// 1. Check movies table structure
console.log('\n1. MOVIES TABLE SCHEMA:')
const moviesSchema = await turso.execute('PRAGMA table_info(movies)')
const moviesColumns = moviesSchema.rows.map(r => `${r.name} (${r.type})${r.notnull ? ' NOT NULL' : ''}${r.dflt_value ? ` DEFAULT ${r.dflt_value}` : ''}`).join('\n   ')
console.log('   ' + moviesColumns)

// Check if age_rating exists
const hasMoviesAgeRating = moviesSchema.rows.some(r => r.name === 'age_rating')
const hasMoviesCountry = moviesSchema.rows.some(r => r.name === 'country' || r.name === 'country_of_origin')
const hasMoviesCountriesJson = moviesSchema.rows.some(r => r.name === 'countries_json')

console.log(`\n   ✓ age_rating column: ${hasMoviesAgeRating ? '✅ EXISTS' : '❌ MISSING'}`)
console.log(`   ✓ country/country_of_origin column: ${hasMoviesCountry ? '✅ EXISTS' : '❌ MISSING'}`)
console.log(`   ✓ countries_json column: ${hasMoviesCountriesJson ? '✅ EXISTS' : '❌ MISSING'}`)

// 2. Check tv_series table structure
console.log('\n2. TV_SERIES TABLE SCHEMA:')
const seriesSchema = await turso.execute('PRAGMA table_info(tv_series)')
const seriesColumns = seriesSchema.rows.map(r => `${r.name} (${r.type})${r.notnull ? ' NOT NULL' : ''}${r.dflt_value ? ` DEFAULT ${r.dflt_value}` : ''}`).join('\n   ')
console.log('   ' + seriesColumns)

// Check if age_rating exists
const hasSeriesAgeRating = seriesSchema.rows.some(r => r.name === 'age_rating')
const hasSeriesCountry = seriesSchema.rows.some(r => r.name === 'country' || r.name === 'country_of_origin')

console.log(`\n   ✓ age_rating column: ${hasSeriesAgeRating ? '✅ EXISTS' : '❌ MISSING'}`)
console.log(`   ✓ country/country_of_origin column: ${hasSeriesCountry ? '✅ EXISTS' : '❌ MISSING'}`)

// 3. Data coverage for movies
console.log('\n3. MOVIES DATA COVERAGE:')
const moviesTotal = await turso.execute('SELECT COUNT(*) as total FROM movies')
console.log(`   Total movies: ${moviesTotal.rows[0].total.toLocaleString()}`)

if (hasMoviesAgeRating) {
  const moviesAgeRatingCount = await turso.execute('SELECT COUNT(*) as has_value FROM movies WHERE age_rating IS NOT NULL AND age_rating != \'\'')
  const coverage = ((moviesAgeRatingCount.rows[0].has_value / moviesTotal.rows[0].total) * 100).toFixed(1)
  console.log(`   age_rating coverage: ${moviesAgeRatingCount.rows[0].has_value.toLocaleString()} (${coverage}%)`)
  
  // Sample values
  const samples = await turso.execute('SELECT age_rating, COUNT(*) as count FROM movies WHERE age_rating IS NOT NULL AND age_rating != \'\' GROUP BY age_rating ORDER BY count DESC LIMIT 10')
  console.log('   Top 10 age_rating values:')
  samples.rows.forEach(r => console.log(`      ${r.age_rating}: ${r.count.toLocaleString()}`))
}

if (hasMoviesCountriesJson) {
  const moviesCountriesCount = await turso.execute('SELECT COUNT(*) as has_value FROM movies WHERE countries_json IS NOT NULL AND countries_json != \'\' AND countries_json != \'[]\'')
  const coverage = ((moviesCountriesCount.rows[0].has_value / moviesTotal.rows[0].total) * 100).toFixed(1)
  console.log(`   countries_json coverage: ${moviesCountriesCount.rows[0].has_value.toLocaleString()} (${coverage}%)`)
}

if (hasMoviesCountry) {
  const countryCol = moviesSchema.rows.find(r => r.name === 'country' || r.name === 'country_of_origin').name
  const query = `SELECT COUNT(*) as has_value FROM movies WHERE ${countryCol} IS NOT NULL AND ${countryCol} != ?`
  const moviesCountryCount = await turso.execute({ sql: query, args: [''] })
  const coverage = ((moviesCountryCount.rows[0].has_value / moviesTotal.rows[0].total) * 100).toFixed(1)
  console.log(`   ${countryCol} coverage: ${moviesCountryCount.rows[0].has_value.toLocaleString()} (${coverage}%)`)
}

// 4. Data coverage for tv_series
console.log('\n4. TV_SERIES DATA COVERAGE:')
const seriesTotal = await turso.execute('SELECT COUNT(*) as total FROM tv_series')
console.log(`   Total series: ${seriesTotal.rows[0].total.toLocaleString()}`)

if (hasSeriesAgeRating) {
  const seriesAgeRatingCount = await turso.execute('SELECT COUNT(*) as has_value FROM tv_series WHERE age_rating IS NOT NULL AND age_rating != \'\'')
  const coverage = ((seriesAgeRatingCount.rows[0].has_value / seriesTotal.rows[0].total) * 100).toFixed(1)
  console.log(`   age_rating coverage: ${seriesAgeRatingCount.rows[0].has_value.toLocaleString()} (${coverage}%)`)
  
  // Sample values
  const samples = await turso.execute('SELECT age_rating, COUNT(*) as count FROM tv_series WHERE age_rating IS NOT NULL AND age_rating != \'\' GROUP BY age_rating ORDER BY count DESC LIMIT 10')
  console.log('   Top 10 age_rating values:')
  samples.rows.forEach(r => console.log(`      ${r.age_rating}: ${r.count.toLocaleString()}`))
}

if (hasSeriesCountry) {
  const countryCol = seriesSchema.rows.find(r => r.name === 'country' || r.name === 'country_of_origin').name
  const query = `SELECT COUNT(*) as has_value FROM tv_series WHERE ${countryCol} IS NOT NULL AND ${countryCol} != ?`
  const seriesCountryCount = await turso.execute({ sql: query, args: [''] })
  const coverage = ((seriesCountryCount.rows[0].has_value / seriesTotal.rows[0].total) * 100).toFixed(1)
  console.log(`   ${countryCol} coverage: ${seriesCountryCount.rows[0].has_value.toLocaleString()} (${coverage}%)`)
  
  // Sample values
  const query2 = `SELECT ${countryCol} as country, COUNT(*) as count FROM tv_series WHERE ${countryCol} IS NOT NULL AND ${countryCol} != ? GROUP BY ${countryCol} ORDER BY count DESC LIMIT 10`
  const samples = await turso.execute({ sql: query2, args: [''] })
  console.log(`   Top 10 ${countryCol} values:`)
  samples.rows.forEach(r => console.log(`      ${r.country}: ${r.count.toLocaleString()}`))
}

console.log('\n' + '='.repeat(80))

process.exit(0)
