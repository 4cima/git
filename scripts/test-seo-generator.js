const db = require('./services/local-db');
const { generateCompleteSEO } = require('./services/seo-generator');

console.log('🧪 اختبار دالة توليد SEO...\n');

// جلب فيلم عشوائي
const movie = db.prepare(`
  SELECT * FROM movies 
  WHERE title_ar IS NOT NULL 
  AND title_ar != 'TBD'
  AND release_year IS NOT NULL
  LIMIT 1
`).get();

console.log('📽️ الفيلم المختار:');
console.log(`   العنوان: ${movie.title_ar} (${movie.title_en})`);
console.log(`   السنة: ${movie.release_year}`);
console.log(`   النوع: ${movie.primary_genre}`);
console.log(`   التقييم: ${movie.vote_average}/10\n`);

// توليد بيانات SEO
const seoData = generateCompleteSEO(movie);

console.log('🎯 بيانات SEO المولدة:\n');

console.log('1️⃣ العنوان العربي:');
console.log(`   ${seoData.seo_title_ar}`);
console.log(`   الطول: ${seoData.seo_title_ar?.length || 0} حرف\n`);

console.log('2️⃣ العنوان الإنجليزي:');
console.log(`   ${seoData.seo_title_en}`);
console.log(`   الطول: ${seoData.seo_title_en?.length || 0} حرف\n`);

console.log('3️⃣ الوصف:');
console.log(`   ${seoData.seo_description_ar}`);
console.log(`   الطول: ${seoData.seo_description_ar?.length || 0} حرف\n`);

console.log('4️⃣ الرابط الكانونيكال:');
console.log(`   ${seoData.canonical_url}\n`);

console.log('5️⃣ الكلمات المفتاحية:');
const keywords = JSON.parse(seoData.seo_keywords_json);
console.log(`   العدد: ${keywords.length} كلمة`);
keywords.forEach((kw, i) => {
  console.log(`   ${i + 1}. ${kw}`);
});

console.log('\n✅ الاختبار مكتمل!');
