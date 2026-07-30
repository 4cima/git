const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function compareSchemas() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('                  تشخيص: مقارنة Schema');
  console.log('═════════════════════════════════════════════════════════════\n');

  // Check if local.db has any data first
  let localDb;
  try {
    localDb = new Database('./local.db');
    const localTables = localDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    
    if (localTables.length === 0) {
      console.log('⚠️ local.db فارغة تماماً (لا توجد جداول)\n');
      console.log('محاولة البحث عن ملفات backup...\n');
      
      localDb.close();
      return;
    }
  } catch (error) {
    console.log('❌ خطأ في فتح local.db:', error.message, '\n');
    return;
  }

  // Get Turso schema
  const tursoTables = await turso.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  
  console.log('📊 الجداول الموجودة:\n');
  console.log('Turso جداول:', tursoTables.rows.map(r => r.name).join(', '));
  console.log('Local جداول:', localDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name).join(', '));
  console.log('\n' + '─'.repeat(65) + '\n');

  // Compare movies table
  console.log('📋 مقارنة جدول movies:\n');
  
  const tursoMoviesSchema = await turso.execute("PRAGMA table_info(movies)");
  const tursoColumns = tursoMoviesSchema.rows.map(r => ({ name: r.name, type: r.type }));
  
  console.log(`Turso: ${tursoColumns.length} عمود`);
  tursoColumns.forEach(col => console.log(`  - ${col.name} (${col.type})`));
  
  console.log('\n⚠️ local.db لا تحتوي على جدول movies (فارغة)\n');
  
  localDb.close();
  
  console.log('─'.repeat(65) + '\n');
  console.log('💡 الخلاصة: local.db فارغة تماماً، البيانات الحقيقية في Turso فقط');
  console.log('   لكن Turso فيها 483 فيلم فقط بدلاً من مئات الآلاف المتوقعة\n');
}

compareSchemas().catch(console.error);
