#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('🗑️ حذف المحتوى من Turso')
  console.log('═══════════════════════════════════════════\n')
  
  // ============================================================
  // Check counts before delete
  // ============================================================
  console.log('📊 الحالة قبل الحذف:')
  console.log('───────────────────────────────────────────')
  
  const moviesBeforeResult = await turso.execute('SELECT COUNT(*) as count FROM movies')
  const moviesBeforeCount = Number(moviesBeforeResult.rows[0].count)
  console.log(`🎬 Movies: ${moviesBeforeCount} صف`)
  
  const seriesBeforeResult = await turso.execute('SELECT COUNT(*) as count FROM tv_series')
  const seriesBeforeCount = Number(seriesBeforeResult.rows[0].count)
  console.log(`📺 TV Series: ${seriesBeforeCount} صف`)
  
  // ============================================================
  // DELETE
  // ============================================================
  console.log('\n🗑️ جاري الحذف...')
  
  console.log('   حذف Movies...')
  const moviesDeleteResult = await turso.execute('DELETE FROM movies')
  console.log(`   ✅ تم حذف Movies (rows affected: ${moviesDeleteResult.rowsAffected})`)
  
  console.log('   حذف TV Series...')
  const seriesDeleteResult = await turso.execute('DELETE FROM tv_series')
  console.log(`   ✅ تم حذف TV Series (rows affected: ${seriesDeleteResult.rowsAffected})`)
  
  // ============================================================
  // Verify empty
  // ============================================================
  console.log('\n🔍 التحقق من الحذف:')
  console.log('───────────────────────────────────────────')
  
  const moviesAfterResult = await turso.execute('SELECT COUNT(*) as count FROM movies')
  const moviesAfterCount = Number(moviesAfterResult.rows[0].count)
  console.log(`🎬 Movies: ${moviesAfterCount} صف (يجب أن يكون 0)`)
  
  const seriesAfterResult = await turso.execute('SELECT COUNT(*) as count FROM tv_series')
  const seriesAfterCount = Number(seriesAfterResult.rows[0].count)
  console.log(`📺 TV Series: ${seriesAfterCount} صف (يجب أن يكون 0)`)
  
  // ============================================================
  // Summary
  // ============================================================
  console.log('\n═══════════════════════════════════════════')
  console.log('📋 الملخص:')
  console.log('═══════════════════════════════════════════')
  
  if (moviesAfterCount === 0 && seriesAfterCount === 0) {
    console.log('✅ تم الحذف بنجاح')
    console.log(`   Movies: ${moviesBeforeCount} → 0`)
    console.log(`   TV Series: ${seriesBeforeCount} → 0`)
    console.log('')
    console.log('✅ Turso الآن فارغ تماماً وجاهز لإعادة البناء')
    console.log('')
    console.log('⏸️ متوقف: في انتظار موافقة المستخدم لتشغيل full sync')
  } else {
    console.log('❌ خطأ: الجداول ليست فارغة!')
    console.log(`   Movies: ${moviesAfterCount} (متوقع 0)`)
    console.log(`   TV Series: ${seriesAfterCount} (متوقع 0)`)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('❌ خطأ:', err)
  process.exit(1)
})
