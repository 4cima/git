import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://lhpuwupbhpcqkwqugkhh.supabase.co"
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkwOTI4OCwiZXhwIjoyMDg2NDg1Mjg4fQ.yqLUJq2PfiSM5osZIXjCjRetRuSiSvz8Lv6Q51BHeD8"

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const tablesToDelete = [
  'islamic_lectures',    // 16 rows
  'prophet_stories',     // 7 rows
  'islamic_fatwas',      // 21 rows
  'games',               // 5000 rows
  'software',            // 3500 rows
  'movies',              // 74924 rows (Supabase copy, NOT Turso)
  'tv_series',           // 17547 rows (Supabase copy, NOT Turso)
  'anime'                // 5602 rows
]

console.log('=== DELETING OBSOLETE SUPABASE TABLES ===\n')
console.log('⚠️  This will DELETE the following tables from SUPABASE ONLY (Turso unaffected):\n')

let totalRows = 0

// Get row counts before deletion
for (const table of tablesToDelete) {
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  
  console.log(`- ${table}: ${count?.toLocaleString() || 0} rows`)
  totalRows += count || 0
}

console.log(`\nTotal rows to delete: ${totalRows.toLocaleString()}`)
console.log('\n=== SQL TO EXECUTE IN SUPABASE DASHBOARD ===\n')

const dropSQL = tablesToDelete.map(t => `DROP TABLE IF EXISTS public.${t} CASCADE;`).join('\n')
console.log(dropSQL)

console.log('\n=== After executing SQL above, run this script again to verify ===')
