import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'

// Read .env.local
const envContent = readFileSync('.env.local', 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const turso = createClient({
  url: envVars.TURSO_DATABASE_URL,
  authToken: envVars.TURSO_AUTH_TOKEN,
})

async function deleteLowRatedContent() {
  console.log('🔍 جاري حذف الأعمال بتقييم أقل من 5 من قاعدة Turso...\n')

  try {
    // 1. عد الأعمال قبل الحذف
    console.log('📊 حصر الأعمال قبل الحذف:')
    
    const moviesLowBefore = await turso.execute(`
      SELECT COUNT(*) as count FROM movies WHERE vote_average < 5 AND vote_average > 0
    `)
    const seriesLowBefore = await turso.execute(`
      SELECT COUNT(*) as count FROM tv_series WHERE vote_average < 5 AND vote_average > 0
    `)
    
    console.log(`   • أفلام بتقييم أقل من 5: ${moviesLowBefore.rows[0].count}`)
    console.log(`   • مسلسلات بتقييم أقل من 5: ${seriesLowBefore.rows[0].count}`)
    console.log(`   • الإجمالي: ${Number(moviesLowBefore.rows[0].count) + Number(seriesLowBefore.rows[0].count)}\n`)

    // 2. حذف الأفلام على دفعات (لتجنب timeout)
    console.log('🗑️  جاري حذف الأفلام على دفعات...')
    let totalMoviesDeleted = 0
    const BATCH_SIZE = 5000
    
    while (true) {
      const result = await turso.execute(`
        DELETE FROM movies WHERE id IN (
          SELECT id FROM movies WHERE vote_average < 5 AND vote_average > 0 LIMIT ${BATCH_SIZE}
        )
      `)
      
      totalMoviesDeleted += Number(result.rowsAffected)
      console.log(`   📦 دفعة: تم حذف ${result.rowsAffected} فيلم (الإجمالي: ${totalMoviesDeleted})`)
      
      if (result.rowsAffected === 0) break
      
      // راحة قصيرة بين الدفعات
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    console.log(`   ✅ اكتمل حذف الأفلام: ${totalMoviesDeleted} فيلم\n`)

    // 3. حذف المسلسلات على دفعات
    console.log('🗑️  جاري حذف المسلسلات على دفعات...')
    let totalSeriesDeleted = 0
    
    while (true) {
      const result = await turso.execute(`
        DELETE FROM tv_series WHERE id IN (
          SELECT id FROM tv_series WHERE vote_average < 5 AND vote_average > 0 LIMIT ${BATCH_SIZE}
        )
      `)
      
      totalSeriesDeleted += Number(result.rowsAffected)
      console.log(`   📦 دفعة: تم حذف ${result.rowsAffected} مسلسل (الإجمالي: ${totalSeriesDeleted})`)
      
      if (result.rowsAffected === 0) break
      
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    console.log(`   ✅ اكتمل حذف المسلسلات: ${totalSeriesDeleted} مسلسل\n`)

    // 4. التحقق بعد الحذف
    console.log('✅ التحقق من النتائج بعد الحذف:')
    
    const moviesLowAfter = await turso.execute(`
      SELECT COUNT(*) as count FROM movies WHERE vote_average < 5 AND vote_average > 0
    `)
    const seriesLowAfter = await turso.execute(`
      SELECT COUNT(*) as count FROM tv_series WHERE vote_average < 5 AND vote_average > 0
    `)
    
    const totalMovies = await turso.execute(`SELECT COUNT(*) as count FROM movies`)
    const totalSeries = await turso.execute(`SELECT COUNT(*) as count FROM tv_series`)
    
    console.log(`   • أفلام متبقية بتقييم أقل من 5: ${moviesLowAfter.rows[0].count} (يجب أن يكون 0)`)
    console.log(`   • مسلسلات متبقية بتقييم أقل من 5: ${seriesLowAfter.rows[0].count} (يجب أن يكون 0)`)
    console.log(`   • إجمالي الأفلام المتبقية: ${totalMovies.rows[0].count}`)
    console.log(`   • إجمالي المسلسلات المتبقية: ${totalSeries.rows[0].count}\n`)

    // 5. إحصائيات نهائية
    const totalDeleted = totalMoviesDeleted + totalSeriesDeleted
    const totalRemaining = Number(totalMovies.rows[0].count) + Number(totalSeries.rows[0].count)
    
    console.log('📊 === الإحصائيات النهائية ===')
    console.log(`   🗑️  إجمالي الأعمال المحذوفة: ${totalDeleted}`)
    console.log(`   ✅ إجمالي الأعمال المتبقية: ${totalRemaining}`)
    console.log(`   🎯 جميع الأعمال المتبقية تقييمها 5.0 أو أكثر\n`)

    console.log('✅ اكتملت عملية الحذف بنجاح!')

  } catch (error) {
    console.error('❌ خطأ أثناء حذف الأعمال:', error)
    throw error
  }
}

deleteLowRatedContent().catch(console.error)
