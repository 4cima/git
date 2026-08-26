#!/usr/bin/env node
const https = require('https')
const fs = require('fs')

const ACCOUNT_ID = '834bca43d616c73db23cf95311cfe17e'
const DATABASE_ID = 'b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6'
const API_TOKEN = process.env.CLOUDFLARE_D1_TOKEN || 'REDACTED_CF_TOKEN'

async function exec(sql, retries = 10) {
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await new Promise((ok, fail) => {
        const body = JSON.stringify({ sql })
        const req = https.request(
          `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${API_TOKEN}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body)
            }
          },
          (res) => {
            let data = ''
            res.on('data', c => data += c)
            res.on('end', () => {
              const parsed = JSON.parse(data)
              if (parsed.success) ok(parsed)
              else if (parsed.errors && parsed.errors[0]?.code === 7429) fail({ retry: true })
              else fail(new Error(JSON.stringify(parsed)))
            })
          }
        )
        req.on('error', fail)
        req.setTimeout(60000)
        req.write(body)
        req.end()
      })
      return result
    } catch (err) {
      if (err.retry && i < retries) {
        const delay = Math.min(5000 * (i + 1), 30000)
        console.log(`   ⏳ Retry ${i + 1}/${retries} after ${delay}ms`)
        await new Promise(r => setTimeout(r, delay))
      } else {
        throw err
      }
    }
  }
}

async function main() {
  const tables = [
    'CREATE TABLE IF NOT EXISTS list_movies_top_rated (rank INTEGER PRIMARY KEY,id INTEGER NOT NULL,slug TEXT NOT NULL,title_ar TEXT,title_en TEXT,poster_path TEXT,backdrop_path TEXT,vote_average REAL,release_year INTEGER,overview_ar TEXT,genres_json TEXT,tmdb_id INTEGER)',
    'CREATE TABLE IF NOT EXISTS list_series_top_rated (rank INTEGER PRIMARY KEY,id INTEGER NOT NULL,slug TEXT NOT NULL,name_ar TEXT,name_en TEXT,poster_path TEXT,backdrop_path TEXT,vote_average REAL,first_air_year INTEGER,overview_ar TEXT,genres_json TEXT,tmdb_id INTEGER)',
    'CREATE TABLE IF NOT EXISTS list_movies_genre (genre_tmdb_id INTEGER NOT NULL,rank INTEGER NOT NULL,id INTEGER NOT NULL,slug TEXT NOT NULL,title_ar TEXT,title_en TEXT,poster_path TEXT,backdrop_path TEXT,vote_average REAL,release_year INTEGER,overview_ar TEXT,genres_json TEXT,tmdb_id INTEGER,popularity REAL,PRIMARY KEY(genre_tmdb_id, rank))',
    'CREATE TABLE IF NOT EXISTS list_series_genre (genre_tmdb_id INTEGER NOT NULL,rank INTEGER NOT NULL,id INTEGER NOT NULL,slug TEXT NOT NULL,name_ar TEXT,name_en TEXT,poster_path TEXT,backdrop_path TEXT,vote_average REAL,first_air_year INTEGER,overview_ar TEXT,genres_json TEXT,tmdb_id INTEGER,popularity REAL,PRIMARY KEY(genre_tmdb_id, rank))'
  ]

  for (const sql of tables) {
    const name = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1]
    console.log(`Creating ${name}...`)
    await exec(sql)
    console.log(`✅ ${name}`)
    await new Promise(r => setTimeout(r, 10000))
  }

  console.log('\n✅ All tables created')
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
