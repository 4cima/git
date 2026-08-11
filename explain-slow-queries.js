const { withTurso } = require('./scripts/lib/with-turso')

withTurso(async (turso) => {
  console.log('\n' + '='.repeat(80))
  console.log('EXPLAIN QUERY PLAN - SLOW QUERIES')
  console.log('='.repeat(80))
  
  // Query 1: release_year ASC with country=KR (81.9s observed)
  console.log('\n📊 Query 1: sort=release_year ASC, country=KR')
  console.log('-'.repeat(80))
  const explain1 = await turso.execute({
    sql: `
      EXPLAIN QUERY PLAN
      SELECT movies.id, movies.slug, movies.title_ar, movies.title_en, movies.poster_path,
             movies.vote_average, movies.release_year,
             movies.genres_json, movies.overview_ar, movies.original_language
      FROM movies
      WHERE original_language = ?
      ORDER BY release_year ASC
      LIMIT 72 OFFSET 0
    `,
    args: ['ko']
  })
  console.log('Query plan:')
  explain1.rows.forEach(row => console.log(`  ${JSON.stringify(row)}`))
  
  // Query 2: created_at DESC (60-68s observed)
  console.log('\n\n📊 Query 2: sort=created_at DESC')
  console.log('-'.repeat(80))
  const explain2 = await turso.execute({
    sql: `
      EXPLAIN QUERY PLAN
      SELECT movies.id, movies.slug, movies.title_ar, movies.title_en, movies.poster_path,
             movies.vote_average, movies.release_year,
             movies.genres_json, movies.overview_ar, movies.original_language
      FROM movies
      ORDER BY created_at DESC
      LIMIT 72 OFFSET 0
    `,
    args: []
  })
  console.log('Query plan:')
  explain2.rows.forEach(row => console.log(`  ${JSON.stringify(row)}`))
  
  // Query 3: title_ar ASC (143s observed)
  console.log('\n\n📊 Query 3: sort=title_ar ASC')
  console.log('-'.repeat(80))
  const explain3 = await turso.execute({
    sql: `
      EXPLAIN QUERY PLAN
      SELECT movies.id, movies.slug, movies.title_ar, movies.title_en, movies.poster_path,
             movies.vote_average, movies.release_year,
             movies.genres_json, movies.overview_ar, movies.original_language
      FROM movies
      ORDER BY title_ar ASC
      LIMIT 72 OFFSET 0
    `,
    args: []
  })
  console.log('Query plan:')
  explain3.rows.forEach(row => console.log(`  ${JSON.stringify(row)}`))
  
  // Query 4: vote_average DESC (82s observed)
  console.log('\n\n📊 Query 4: sort=vote_average DESC')
  console.log('-'.repeat(80))
  const explain4 = await turso.execute({
    sql: `
      EXPLAIN QUERY PLAN
      SELECT movies.id, movies.slug, movies.title_ar, movies.title_en, movies.poster_path,
             movies.vote_average, movies.release_year,
             movies.genres_json, movies.overview_ar, movies.original_language
      FROM movies
      ORDER BY vote_average DESC
      LIMIT 72 OFFSET 0
    `,
    args: []
  })
  console.log('Query plan:')
  explain4.rows.forEach(row => console.log(`  ${JSON.stringify(row)}`))
  
  // Check existing indexes
  console.log('\n\n📊 Existing Indexes on movies table')
  console.log('-'.repeat(80))
  const indexes = await turso.execute(`
    SELECT name, sql FROM sqlite_master 
    WHERE type = 'index' AND tbl_name = 'movies'
    ORDER BY name
  `)
  console.log(`Found ${indexes.rows.length} indexes:\n`)
  indexes.rows.forEach(row => {
    console.log(`  ${row.name}`)
    if (row.sql) console.log(`    ${row.sql}\n`)
  })
  
  console.log('\n' + '='.repeat(80))
  
}).catch(console.error)
