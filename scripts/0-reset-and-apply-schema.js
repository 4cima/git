#!/usr/bin/env node
/**
 * ============================================
 * 🔄 RESET TURSO & APPLY FINAL SCHEMA
 * ============================================
 * Purpose: Delete all data and recreate with optimized schema
 * WARNING: This will delete EVERYTHING in Turso
 * ============================================
 */

const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('🔄 إعادة تعيين Turso وتطبيق Schema النهائي\n');
  console.log('⚠️  تحذير: سيتم حذف جميع البيانات!\n');
  console.log('═'.repeat(80));

  try {
    // 1. Get all existing tables
    console.log('\n🔍 فحص الجداول الموجودة...');
    const tables = await turso.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    console.log(`   وجدنا ${tables.rows.length} جدول`);

    // 2. Drop all tables
    console.log('\n🗑️  حذف الجداول القديمة...');
    for (const table of tables.rows) {
      try {
        await turso.execute(`DROP TABLE IF EXISTS ${table.name}`);
        console.log(`   ✅ حذف: ${table.name}`);
      } catch (e) {
        console.log(`   ⚠️  ${table.name}: ${e.message}`);
      }
    }

    // 3. Apply new schema
    console.log('\n📝 تطبيق Schema الجديد...');
    const schemaPath = path.join(__dirname, 'turso-schema-final.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');

    // Remove comments
    schema = schema.replace(/--.*$/gm, '');
    
    // Split by semicolon
    const statements = [];
    let current = '';
    
    for (const line of schema.split('\n')) {
      current += line + '\n';
      if (line.trim().endsWith(';')) {
        const stmt = current.trim();
        if (stmt.length > 20 && !stmt.startsWith('PRAGMA')) {
          statements.push(stmt);
        }
        current = '';
      }
    }

    let tableCount = 0;
    for (const stmt of statements) {
      try {
        await turso.execute(stmt);
        
        if (stmt.includes('CREATE TABLE')) {
          const match = stmt.match(/CREATE TABLE.*?(\w+)\s*\(/i);
          if (match) {
            tableCount++;
            console.log(`   ✅ ${tableCount}. جدول: ${match[1]}`);
          }
        }
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error(`   ⚠️  خطأ: ${error.message}`);
        }
      }
    }

    // 4. Verify
    console.log('\n🔍 التحقق من الجداول الجديدة...');
    const newTables = await turso.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    console.log('\n   الجداول المُنشأة:');
    newTables.rows.forEach(t => console.log(`   - ${t.name}`));

    console.log('\n' + '═'.repeat(80));
    console.log('✅ تم إعادة تعيين Turso بنجاح!');
    console.log(`📊 تم إنشاء ${tableCount} جدول فارغ`);
    console.log('\n💡 الخطوة التالية: تشغيل sync-static-data-from-local.js');
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    process.exit(1);
  }
}

main();
