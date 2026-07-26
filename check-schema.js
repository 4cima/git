import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const localDb = new Database(join(__dirname, 'data', '4cima-local.db'))

console.log('='*80)
console.log('📊 MOVIES TABLE SCHEMA')
console.log('='*80)
const moviesSchema = localDb.prepare("PRAGMA table_info(movies)").all()
moviesSchema.forEach(col => {
  console.log(`${col.cid}. ${col.name} | ${col.type} | PK:${col.pk} | NotNull:${col.notnull} | Default:${col.dflt_value}`)
})

console.log('\n' + '='*80)
console.log('📊 TV_SERIES TABLE SCHEMA')
console.log('='*80)
const seriesSchema = localDb.prepare("PRAGMA table_info(tv_series)").all()
seriesSchema.forEach(col => {
  console.log(`${col.cid}. ${col.name} | ${col.type} | PK:${col.pk} | NotNull:${col.notnull} | Default:${col.dflt_value}`)
})

localDb.close()
