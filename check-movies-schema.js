const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function check() {
  console.log('فحص بنية جدول movies في Turso:\n');
  
  // Get table schema
  const schema = await turso.execute("PRAGMA table_info(movies)");
  
  console.log('الأعمدة الموجودة:');
  schema.rows.forEach(col => {
    console.log(`- ${col.name} (${col.type})`);
  });
  
  // Check if we have language-related columns
  console.log('\n\nالبحث عن أعمدة متعلقة باللغة:');
  const langColumns = schema.rows.filter(col => 
    col.name.toLowerCase().includes('lang') || 
    col.name.toLowerCase().includes('country')
  );
  
  if (langColumns.length > 0) {
    langColumns.forEach(col => {
      console.log(`✓ ${col.name} (${col.type})`);
    });
  } else {
    console.log('❌ لا يوجد عمود للغة!');
  }
}

check().catch(console.error);
