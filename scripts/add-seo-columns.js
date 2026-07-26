const db = require('./services/local-db');

console.log('🔧 إضافة أعمدة SEO لقاعدة البيانات...\n');

const alterations = [
  // Movies
  { table: 'movies', column: 'seo_keywords_json', type: 'TEXT' },
  { table: 'movies', column: 'seo_title_ar', type: 'TEXT' },
  { table: 'movies', column: 'seo_title_en', type: 'TEXT' },
  { table: 'movies', column: 'seo_description_ar', type: 'TEXT' },
  { table: 'movies', column: 'canonical_url', type: 'TEXT' },
  
  // TV Series
  { table: 'tv_series', column: 'seo_keywords_json', type: 'TEXT' },
  { table: 'tv_series', column: 'seo_title_ar', type: 'TEXT' },
  { table: 'tv_series', column: 'seo_title_en', type: 'TEXT' },
  { table: 'tv_series', column: 'seo_description_ar', type: 'TEXT' },
  { table: 'tv_series', column: 'canonical_url', type: 'TEXT' }
];

let added = 0;
let skipped = 0;

alterations.forEach(({ table, column, type }) => {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    console.log(`✅ ${table}.${column}`);
    added++;
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      console.log(`⏭️  ${table}.${column} (موجود بالفعل)`);
      skipped++;
    } else {
      console.log(`❌ ${table}.${column}: ${e.message}`);
    }
  }
});

console.log(`\n📊 النتيجة: ${added} عمود جديد، ${skipped} موجود مسبقاً`);
