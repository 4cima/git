require('dotenv').config({path:'.env.local'});
const {createClient} = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

turso.execute("SELECT slug FROM tv_series LIMIT 10")
  .then(r => {
    console.log('عينة من slugs المسلسلات:');
    r.rows.forEach((row, i) => console.log(`${i+1}. ${row.slug}`));
    process.exit(0);
  })
  .catch(e => {
    console.error('خطأ:', e.message);
    process.exit(1);
  });
