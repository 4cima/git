const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addBackdropColumn() {
  console.log('='.repeat(80));
  console.log('إضافة عمود backdrop_path إلى Turso');
  console.log('='.repeat(80));
  
  try {
    // Add to movies table
    console.log('\n📽️  إضافة backdrop_path إلى جدول movies...');
    await turso.execute('ALTER TABLE movies ADD COLUMN backdrop_path TEXT');
    console.log('✅ تم بنجاح!');
    
    // Add to tv_series table
    console.log('\n📺 إضافة backdrop_path إلى جدول tv_series...');
    await turso.execute('ALTER TABLE tv_series ADD COLUMN backdrop_path TEXT');
    console.log('✅ تم بنجاح!');
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ تمت إضافة backdrop_path بنجاح للجدولين!');
    console.log('='.repeat(80));
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('⚠️  العمود موجود بالفعل في أحد الجداول أو كليهما');
    } else {
      console.error('❌ خطأ:', error.message);
    }
  }
}

addBackdropColumn().catch(console.error);
