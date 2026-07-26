require('dotenv').config({path:'.env.local'});
const {createClient} = require('@libsql/client');
const fs = require('fs');
const readline = require('readline');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔄 استرجاع slugs المسلسلات من Backup\n');

async function main() {
  const fileStream = fs.createReadStream('BACKUP-tv_series-turso.csv');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let header = null;
  let restored = 0;
  let errors = 0;
  let batch = [];
  const BATCH_SIZE = 50;

  for await (const line of rl) {
    if (!header) {
      header = line.split(',');
      continue;
    }

    const cols = line.split(',');
    const id = cols[0];
    const slug = cols[header.indexOf('slug')];

    if (id && slug) {
      batch.push({ id, slug });
    }

    if (batch.length >= BATCH_SIZE) {
      await Promise.all(batch.map(async ({ id, slug }) => {
        try {
          await turso.execute({
            sql: 'UPDATE tv_series SET slug = ? WHERE id = ?',
            args: [slug, id]
          });
          restored++;
        } catch {
          errors++;
        }
      }));

      if (restored % 1000 === 0) {
        console.log(`   ${restored.toLocaleString()}`);
      }

      batch = [];
    }
  }

  // الباقي
  if (batch.length > 0) {
    await Promise.all(batch.map(async ({ id, slug }) => {
      try {
        await turso.execute({
          sql: 'UPDATE tv_series SET slug = ? WHERE id = ?',
          args: [slug, id]
        });
        restored++;
      } catch {
        errors++;
      }
    }));
  }

  console.log(`\n✅ اكتمل: ${restored.toLocaleString()}`);
  console.log(`❌ أخطاء: ${errors.toLocaleString()}`);
  process.exit(0);
}

main().catch(e => {
  console.error('خطأ:', e.message);
  process.exit(1);
});
