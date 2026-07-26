require('dotenv').config({path:'.env.local'});
const {createClient} = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

turso.execute('SELECT slug FROM tv_series')
  .then(r => {
    const asciiRegex = /^[a-z0-9-]+$/;
    let nonAscii = 0;
    const examples = [];
    
    r.rows.forEach(row => {
      if (!asciiRegex.test(row.slug)) {
        nonAscii++;
        if (examples.length < 10) {
          examples.push(row.slug);
        }
      }
    });
    
    console.log('📊 الضرر:');
    console.log(`   إجمالي المسلسلات: ${r.rows.length.toLocaleString()}`);
    console.log(`   ❌ slugs بحروف غير ASCII: ${nonAscii.toLocaleString()}`);
    console.log(`   ✅ slugs صحيحة: ${(r.rows.length - nonAscii).toLocaleString()}\n`);
    
    if (examples.length > 0) {
      console.log('أمثلة من الفاسد:');
      examples.forEach((s, i) => console.log(`   ${i+1}. ${s}`));
    }
    
    process.exit(0);
  })
  .catch(e => {
    console.error('خطأ:', e.message);
    process.exit(1);
  });
