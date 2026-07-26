import { createClient } from '@libsql/client'

// Direct connection to Turso (fastest for production)
export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})
