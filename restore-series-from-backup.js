require('dotenv').config({path:'.env.local'});
const {createClient} = require('@libsql/client');
const fs = require('fs');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔄 استرجاع slugs المسلسلات من Backup\n');
console.log('═'.repeat(70));

async function main() {
  // قراءة CSV
  const csv = fs.readFileSync('BACKUP-tv_series-turso.csv', 'utf8');
  const lines = csv.split('\n').filter(l => l.trim());
  const header = lines[0].split(',');
  const idIndex = header.indexOf('id');
  const slugIndex = header.indexOf('slug');
  
  console.log(`\n📦 الـ Backup: ${lines.length - 1} مسلسل\n`);
  console.log('🚀 بدء الاسترجاع...\n');
  
  let restored = 0;
  let errors = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const id = cols[idIndex];
    const slug = cols[slugIndex];
    
    if (!id || !slug) continue;
    
    try {
      await turso.execute({
        sql: 'UPDATE tv_series SET slug = ? WHERE id = ?',
        args: [slug, id]
      });
      restored++;
      
      if (restored % 1000 === 0) {
        console.log(`   ${restored.toLocaleString()}/${lines.length - 1} (${(restored/(lines.length-1)*100).toFixed(1)}%)`);
      }
    } catch (e) {
      errors++;
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 النتائج:');
  console.log(`   ✅ تم الاسترجاع: ${restored.toLocaleString()}`);
  console.log(`   ❌ أخطاء: ${errors.toLocaleString()}`);
  console.log('═'.repeat(70));
  
  process.exit(0);
}

main().catch(e => {
  console.error('❌ خطأ:', e.message);
  process.exit(1);
});
