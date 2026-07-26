import { createClient } from '@libsql/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

console.log('🗑️  حذف البيانات القديمة من Turso...\n')

await turso.execute('DELETE FROM movies')
await turso.execute('DELETE FROM tv_series')

console.log('✅ تم حذف جميع الأفلام والمسلسلات\n')
