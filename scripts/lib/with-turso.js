const { createClient } = require('@libsql/client')
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.local') })

/**
 * Wrapper that creates a Turso client, runs your function, and always closes the client.
 * Prevents hanging Node processes from unclosed connections.
 * 
 * @param {(client: import('@libsql/client').Client) => Promise<any>} fn - Async function that receives the turso client
 * @returns {Promise<any>} Result from your function
 * 
 * @example
 * const { withTurso } = require('./scripts/lib/with-turso')
 * 
 * withTurso(async (turso) => {
 *   const result = await turso.execute('SELECT COUNT(*) FROM movies')
 *   console.log(result.rows[0])
 * }).catch(console.error)
 */
async function withTurso(fn) {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  try {
    return await fn(client)
  } finally {
    client.close()
  }
}

module.exports = { withTurso }
