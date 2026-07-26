// حذف كل البيانات من قاعدة بيانات Turso
import { createClient } from '@libsql/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function clearDatabase() {
  console.log('⚠️  بدء حذف كل البيانات من قاعدة Turso...\n')
  
  try {
    // حذف جميع الأفلام
    console.log('🗑️  حذف جميع الأفلام...')
    const moviesResult = await turso.execute({
      sql: `DELETE FROM movies`,
      args: []
    })
    console.log(`✅ تم حذف جميع الأفلام`)
    
    // حذف جميع المسلسلات
    console.log('\n🗑️  حذف جميع المسلسلات...')
    const seriesResult = await turso.execute({
      sql: `DELETE FROM tv_series`,
      args: []
    })
    console.log(`✅ تم حذف جميع المسلسلات`)
    
    // التحقق من الحذف
    console.log('\n📊 التحقق من قاعدة البيانات...')
    
    const moviesCount = await turso.execute({
      sql: `SELECT COUNT(*) as count FROM movies`,
      args: []
    })
    
    const seriesCount = await turso.execute({
      sql: `SELECT COUNT(*) as count FROM tv_series`,
      args: []
    })
    
    console.log(`\n✅ إحصائيات بعد الحذف:`)
    console.log(`   - الأفلام: ${moviesCount.rows[0].count}`)
    console.log(`   - المسلسلات: ${seriesCount.rows[0].count}`)
    
    if (moviesCount.rows[0].count === 0 && seriesCount.rows[0].count === 0) {
      console.log('\n✅ تم تنظيف قاعدة البيانات بالكامل!')
    } else {
      console.log('\n⚠️  لم يتم حذف كل البيانات!')
    }
    
  } catch (error) {
    console.error('❌ خطأ في حذف البيانات:', error)
  }
}

clearDatabase().catch(console.error)
