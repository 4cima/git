const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const TMDB_API_KEY = process.env.TMDB_API_KEY;

async function findFailedMovie() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('        تشخيص: الفيلم الذي فشل في تحديث اللغة');
  console.log('═════════════════════════════════════════════════════════════\n');
  
  // Find movie without original_language
  const missingLang = await turso.execute(`
    SELECT id, tmdb_id, title_ar, title_en 
    FROM movies 
    WHERE original_language IS NULL
    LIMIT 5
  `);
  
  if (missingLang.rows.length === 0) {
    console.log('✅ كل الأفلام لديها original_language!\n');
    return;
  }
  
  console.log(`وجدت ${missingLang.rows.length} فيلم بدون original_language:\n`);
  
  for (const movie of missingLang.rows) {
    console.log(`📽️ الفيلم:`);
    console.log(`   - ID في Turso: ${movie.id}`);
    console.log(`   - TMDB ID: ${movie.tmdb_id}`);
    console.log(`   - العنوان العربي: ${movie.title_ar || 'غير متوفر'}`);
    console.log(`   - العنوان الإنجليزي: ${movie.title_en || 'غير متوفر'}`);
    
    // Try fetching from TMDB to see why it failed
    console.log(`\n🔍 محاولة جلب البيانات من TMDB...\n`);
    
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${TMDB_API_KEY}&language=ar`
      );
      
      if (!response.ok) {
        console.log(`   ❌ فشل الطلب: HTTP ${response.status} ${response.statusText}`);
        if (response.status === 404) {
          console.log(`   💡 السبب: الفيلم غير موجود في TMDB (تم حذفه أو TMDB ID خاطئ)\n`);
        } else if (response.status === 401) {
          console.log(`   💡 السبب: مشكلة في API Key\n`);
        } else {
          console.log(`   💡 السبب: خطأ في الاتصال مع TMDB\n`);
        }
        continue;
      }
      
      const data = await response.json();
      
      console.log(`   ✅ تم جلب البيانات بنجاح:`);
      console.log(`      - original_title: ${data.original_title}`);
      console.log(`      - original_language: ${data.original_language || 'NULL في TMDB!'}`);
      console.log(`      - status: ${data.status}`);
      
      if (!data.original_language) {
        console.log(`\n   💡 السبب: TMDB نفسها لا تحتوي على original_language لهذا الفيلم!\n`);
      } else {
        console.log(`\n   💡 السبب: على الأرجح خطأ مؤقت في الشبكة أثناء المزامنة السابقة\n`);
      }
      
    } catch (error) {
      console.log(`   ❌ خطأ في الاتصال: ${error.message}\n`);
    }
    
    console.log('─'.repeat(65) + '\n');
  }
}

findFailedMovie().catch(console.error);
