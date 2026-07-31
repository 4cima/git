/**
 * Example: How to use withTurso helper for any Turso script
 * This ensures connections are always closed, preventing hanging Node processes
 */

const { withTurso } = require('../lib/with-turso')

// Old way (prone to hanging if script crashes before close):
// const turso = createClient({ ... })
// const result = await turso.execute('SELECT ...')
// await turso.close() // <-- might never execute if error happens

// New way (always closes):
withTurso(async (turso) => {
  // Your logic here - turso will auto-close when done
  const movies = await turso.execute('SELECT COUNT(*) as count FROM movies')
  const series = await turso.execute('SELECT COUNT(*) as count FROM series')
  
  console.log('Movies:', movies.rows[0].count)
  console.log('Series:', series.rows[0].count)
  
  // Return value is passed through
  return {
    movies: movies.rows[0].count,
    series: series.rows[0].count
  }
}).then(result => {
  console.log('Result:', result)
}).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
