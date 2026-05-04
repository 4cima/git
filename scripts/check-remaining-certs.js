#!/usr/bin/env node
const db = require('./services/local-db');

console.log('🔍 فحص التصنيفات المتبقية\n');

const remaining = db.prepare(`
  SELECT country_code, content_type, certification, meaning_en 
  FROM certifications 
  WHERE meaning_ar IS NULL
  LIMIT 20
`).all();

console.log(`📊 عدد التصنيفات المتبقية: ${remaining.length}\n`);

remaining.forEach((cert, i) => {
  console.log(`${i+1}. [${cert.country_code}] ${cert.content_type} - ${cert.certification}`);
  console.log(`   meaning_en: "${cert.meaning_en}"`);
  console.log('');
});

const stats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN meaning_ar IS NOT NULL THEN 1 ELSE 0 END) as translated,
    SUM(CASE WHEN meaning_en IS NULL OR meaning_en = '' THEN 1 ELSE 0 END) as empty_en
  FROM certifications
`).get();

console.log('📊 الإحصائيات:');
console.log(`   الإجمالي: ${stats.total}`);
console.log(`   مترجم: ${stats.translated}`);
console.log(`   فارغ (meaning_en): ${stats.empty_en}`);
console.log(`   متبقي: ${stats.total - stats.translated}`);
