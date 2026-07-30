const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function addColumn() {
  try {
    console.log('إضافة عمود original_language إلى جدول movies...\n');
    
    await turso.execute(`
      ALTER TABLE movies ADD COLUMN original_language TEXT
    `);
    
    console.log('✅ تم إضافة العمود بنجاح!');
    
    // Verify
    const schema = await turso.execute("PRAGMA table_info(movies)");
    const hasColumn = schema.rows.some(col => col.name === 'original_language');
    
    if (hasColumn) {
      console.log('✅ تم التحقق: العمود موجود الآن\n');
      
      // Show current count
      const count = await turso.execute('SELECT COUNT(*) as total FROM movies');
      console.log(`إجمالي الأفلام: ${count.rows[0].total}`);
      console.log('يمكنك الآن ملء البيانات من TMDB');
    }
    
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('⚠️ العمود موجود بالفعل');
    } else {
      console.error('❌ خطأ:', error.message);
    }
  }
}

addColumn();
