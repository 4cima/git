import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env.local' });
dotenv.config({ path: '../.dev.vars' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  process.exit(1);
}

console.log('🔍 Connecting to Turso...');
console.log('URL:', TURSO_DATABASE_URL.substring(0, 50) + '...\n');

const db = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

async function applySchema() {
  try {
    const schemaPath = join(__dirname, 'schema-updated.sql');
    console.log('📄 Reading schema from:', schemaPath);
    const schema = readFileSync(schemaPath, 'utf-8');

    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log('📋 Found', statements.length, 'SQL statements\n');
    console.log('⚠️  WARNING: This will DROP all existing tables!\n');
    console.log('🚀 Starting schema application...\n');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      let actionName = 'Statement';
      if (statement.includes('DROP TABLE')) {
        const match = statement.match(/DROP TABLE IF EXISTS (\w+)/);
        actionName = match ? 'DROP TABLE ' + match[1] : 'DROP TABLE';
      } else if (statement.includes('CREATE TABLE')) {
        const match = statement.match(/CREATE TABLE (\w+)/);
        actionName = match ? 'CREATE TABLE ' + match[1] : 'CREATE TABLE';
      } else if (statement.includes('CREATE INDEX')) {
        const match = statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/);
        actionName = match ? 'CREATE INDEX ' + match[1] : 'CREATE INDEX';
      }

      try {
        await db.execute(statement + ';');
        successCount++;
        console.log('✅ [' + (i + 1) + '/' + statements.length + '] ' + actionName);
      } catch (error) {
        errorCount++;
        console.error('❌ [' + (i + 1) + '/' + statements.length + '] ' + actionName);
        console.error('   Error:', error.message);
      }
    }

    console.log('\n══════════════════════════════════════════════════');
    console.log('✅ Success:', successCount, 'statements');
    console.log('❌ Errors:', errorCount, 'statements');
    console.log('══════════════════════════════════════════════════\n');

    console.log('🔍 Verifying created tables...\n');
    const result = await db.execute('SELECT name FROM sqlite_master WHERE type=\"table\" ORDER BY name');

    console.log('📋 Total tables:', result.rows.length, '\n');
    result.rows.forEach((row, i) => {
      console.log('   ' + (i + 1) + '. ' + row.name);
    });

    console.log('\n✅ Schema application complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

applySchema();
