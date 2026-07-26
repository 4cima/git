import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config({ path: '.dev.vars' })

export type DB = ReturnType<typeof createClient>

export interface Env {
  TURSO_DATABASE_URL?: string
  TURSO_AUTH_TOKEN?: string
  TMDB_API_KEY?: string
  GROQ_API_KEY?: string
  MISTRAL_API_KEY?: string
  SUPABASE_URL?: string
  SUPABASE_SERVICE_KEY?: string
}

let dbInstance: DB | null = null

export function createDB(env?: Env): DB {
  if (!dbInstance) {
    const url = process.env.TURSO_DATABASE_URL || env?.TURSO_DATABASE_URL
    const token = process.env.TURSO_AUTH_TOKEN || env?.TURSO_AUTH_TOKEN
    
    if (!url) {
      throw new Error('TURSO_DATABASE_URL is required')
    }
    
    dbInstance = createClient({
      url,
      authToken: token
    })
  }
  return dbInstance
}
