import { createClient } from '@libsql/client'
import { config } from 'dotenv'

config({ path: '.dev.vars' })

async function checkOverviewLang() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
  
  console.log('📊 Overview Language Analysis\n')
  
  // Movies
  const m1 = await db.execute(`
    SELECT COUNT(*) as cnt 
    FROM movies 
    WHERE is_complete = 0 AND (overview IS NULL OR overview = '')
  `)
  
  const m2 = await db.execute(`
    SELECT COUNT(*) as cnt 
    FROM movies 
    WHERE is_complete = 0 AND (overview_ar IS NULL OR overview_ar = '')
  `)
  
  const m3 = await db.execute(`
    SELECT COUNT(*) as cnt 
    FROM movies 
    WHERE is_complete = 0 AND (overview IS NULL OR overview = '') AND (overview_ar IS NULL OR overview_ar = '')
  `)
  
  console.log('🎬 MOVIES (Incomplete):')
  console.log(`  Missing overview (EN):     ${(m1.rows[0] as any).cnt}`)
  console.log(`  Missing overview_ar (AR):  ${(m2.rows[0] as any).cnt}`)
  console.log(`  Missing BOTH:              ${(m3.rows[0] as any).cnt}`)
  
  // TV Series
  const t1 = await db.execute(`
    SELECT COUNT(*) as cnt 
    FROM tv_series 
    WHERE is_complete = 0 AND (overview IS NULL OR overview = '')
  `)
  
  const t2 = await db.execute(`
    SELECT COUNT(*) as cnt 
    FROM tv_series 
    WHERE is_complete = 0 AND (overview_ar IS NULL OR overview_ar = '')
  `)
  
  const t3 = await db.execute(`
    SELECT COUNT(*) as cnt 
    FROM tv_series 
    WHERE is_complete = 0 AND (overview IS NULL OR overview = '') AND (overview_ar IS NULL OR overview_ar = '')
  `)
  
  console.log('\n📺 TV SERIES (Incomplete):')
  console.log(`  Missing overview (EN):     ${(t1.rows[0] as any).cnt}`)
  console.log(`  Missing overview_ar (AR):  ${(t2.rows[0] as any).cnt}`)
  console.log(`  Missing BOTH:              ${(t3.rows[0] as any).cnt}`)
  
  console.log('\n✅ Done!')
}

checkOverviewLang()
