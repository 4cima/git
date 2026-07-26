require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔍 فحص تصادمات المسلسلات بالتفصيل\n');
console.log('═'.repeat(70));

async function main() {
  try {
    // جلب المسلسلات المتصادمة
    const result = await turso.execute(`
      SELECT 
        id, 
        tmdb_id, 
        name_ar, 
        name_en,
        updated_at,
        created_at,
        first_air_year,
        vote_average,
        number_of_seasons,
        number_of_episodes,
        CASE WHEN name_ar IS NOT NULL AND name_ar != '' THEN 'نعم' ELSE 'لا' END as has_arabic,
        CASE WHEN overview_ar IS NOT NULL AND overview_ar != '' THEN 'نعم' ELSE 'لا' END as has_overview
      FROM tv_series  
      WHERE tmdb_id IN (
        SELECT tmdb_id 
        FROM tv_series 
        GROUP BY tmdb_id 
        HAVING COUNT(*) > 1
      )
      ORDER BY tmdb_id, id
    `);
    
    if (result.rows.length === 0) {
      console.log('\n✅ لا توجد تصادمات!');
      process.exit(0);
    }
    
    console.log(`\n📊 عدد الصفوف المتصادمة: ${result.rows.length}\n`);
    
    // تجميع حسب tmdb_id
    const collisions = {};
    result.rows.forEach(row => {
      if (!collisions[row.tmdb_id]) {
        collisions[row.tmdb_id] = [];
      }
      collisions[row.tmdb_id].push(row);
    });
    
    console.log(`🔢 عدد الـ tmdb_id المتصادمة: ${Object.keys(collisions).length}\n`);
    console.log('═'.repeat(70));
    
    // عرض كل تصادم
    Object.keys(collisions).forEach((tmdb_id, index) => {
      const rows = collisions[tmdb_id];
      
      console.log(`\n${index + 1}️⃣  التصادم #${index + 1} - tmdb_id=${tmdb_id}`);
      console.log('─'.repeat(70));
      
      rows.forEach((row, i) => {
        console.log(`\n   النسخة ${String.fromCharCode(65 + i)}:`);
        console.log(`   • id: ${row.id}`);
        console.log(`   • العنوان: ${row.name_ar || row.name_en || 'بدون عنوان'}`);
        console.log(`   • الاسم الإنجليزي: ${row.name_en || 'غير متوفر'}`);
        console.log(`   • سنة البدء: ${row.first_air_year || 'غير محدد'}`);
        console.log(`   • التقييم: ${row.vote_average || 0}`);
        console.log(`   • المواسم: ${row.number_of_seasons || 0}`);
        console.log(`   • الحلقات: ${row.number_of_episodes || 0}`);
        console.log(`   • عنوان عربي: ${row.has_arabic}`);
        console.log(`   • وصف عربي: ${row.has_overview}`);
        console.log(`   • تاريخ الإنشاء: ${row.created_at}`);
        console.log(`   • آخر تحديث: ${row.updated_at}`);
      });
      
      console.log('\n   💡 التوصية:');
      
      // تحديد الأفضل
      const sortedByDate = [...rows].sort((a, b) => 
        new Date(b.updated_at) - new Date(a.updated_at)
      );
      const mostRecent = sortedByDate[0];
      
      const hasArabicData = rows.filter(r => r.has_arabic === 'نعم' && r.has_overview === 'نعم');
      const mostComplete = rows.sort((a, b) => 
        (b.number_of_seasons || 0) - (a.number_of_seasons || 0)
      )[0];
      
      if (hasArabicData.length === 1) {
        console.log(`   → احتفظ بـ id=${hasArabicData[0].id} (لديه بيانات عربية كاملة)`);
        console.log(`   → احذف البقية`);
      } else if (mostComplete.number_of_seasons > 0) {
        console.log(`   → احتفظ بـ id=${mostComplete.id} (الأكثر اكتمالاً)`);
        console.log(`   → احذف البقية`);
      } else {
        console.log(`   → احتفظ بـ id=${mostRecent.id} (الأحدث)`);
        console.log(`   → احذف البقية`);
      }
    });
    
    console.log('\n' + '═'.repeat(70));
    console.log('\n📋 الخلاصة:');
    console.log(`   - ${Object.keys(collisions).length} تصادم tmdb_id`);
    console.log(`   - ${result.rows.length} صف متأثر`);
    console.log(`   - يجب حذف ${result.rows.length - Object.keys(collisions).length} صف`);
    console.log('═'.repeat(70));
    
    process.exit(0);
  } catch (e) {
    console.error('\n❌ خطأ:', e.message);
    process.exit(1);
  }
}

main();
