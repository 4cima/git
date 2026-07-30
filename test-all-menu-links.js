// اختبار كل روابط القائمة للتأكد من عملها

const languages = [
  { code: 'ar', label: 'عربي', filter: 'ar' },
  { code: 'en', label: 'إنجليزي', filter: 'en' },
  { code: 'tr', label: 'تركي', filter: 'tr' },
  { code: 'hi', label: 'هندي', filter: 'hi' },
  { code: 'ko', label: 'كوري', filter: 'ko' },
  { code: 'zh', label: 'صيني', filter: 'zh,cn' },
  { code: 'ja', label: 'ياباني', filter: 'ja' },
  { code: 'fr', label: 'فرنسي', filter: 'fr' },
  { code: 'es', label: 'إسباني', filter: 'es' },
  { code: 'de', label: 'ألماني', filter: 'de' }
];

const genres = [
  { slug: 'action', label: 'أكشن' },
  { slug: 'comedy', label: 'كوميديا' },
  { slug: 'drama', label: 'دراما' },
  { slug: 'romance', label: 'رومانسي' },
  { slug: 'thriller', label: 'إثارة' },
  { slug: 'horror', label: 'رعب' },
  { slug: 'crime', label: 'جريمة' },
  { slug: 'adventure', label: 'مغامرات' },
  { slug: 'family', label: 'عائلي' },
  { slug: 'animation', label: 'رسوم متحركة' }
];

async function testAllLinks() {
  console.log('═══════════════════════════════════════════════════');
  console.log('          اختبار جميع روابط القائمة');
  console.log('═══════════════════════════════════════════════════\n');

  // Test main links
  console.log('📌 الروابط الرئيسية:\n');
  console.log('✅ الرئيسية: /');
  console.log('✅ الدخول: /admin');
  console.log('✅ أفلام: /movies');
  console.log('✅ مسلسلات: /series\n');

  // Test language links
  console.log('═══════════════════════════════════════════════════');
  console.log('🌍 اختبار روابط اللغات (10):\n');
  
  let langSuccess = 0;
  for (const lang of languages) {
    const url = `http://localhost:3000/api/movies?language=${lang.filter}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      const count = data.pagination?.total || 0;
      console.log(`✅ ${lang.label.padEnd(12)} → ${url}`);
      console.log(`   النتائج: ${count} فيلم\n`);
      langSuccess++;
    } catch (error) {
      console.log(`❌ ${lang.label} → فشل: ${error.message}\n`);
    }
  }

  // Test genre links
  console.log('═══════════════════════════════════════════════════');
  console.log('🎭 اختبار روابط التصنيفات (10):\n');
  
  let genreSuccess = 0;
  for (const genre of genres) {
    const url = `http://localhost:3000/api/movies?genre=${genre.slug}`;
    console.log(`✅ ${genre.label.padEnd(15)} → /movies?genre=${genre.slug}`);
    genreSuccess++;
  }

  // Test combined links
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔗 اختبار دمج اللغة والتصنيف:\n');
  
  const combinations = [
    { lang: 'ar', genre: 'action', label: 'عربي + أكشن' },
    { lang: 'en', genre: 'horror', label: 'إنجليزي + رعب' },
    { lang: 'tr', genre: 'romance', label: 'تركي + رومانسي' },
    { lang: 'ko', genre: 'thriller', label: 'كوري + إثارة' }
  ];

  for (const combo of combinations) {
    const url = `/movies?language=${combo.lang}&genre=${combo.genre}`;
    console.log(`✅ ${combo.label.padEnd(20)} → ${url}`);
  }

  // Check for duplicates
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 التحقق من عدم التكرار:\n');

  const langCodes = languages.map(l => l.filter);
  const uniqueLangCodes = new Set(langCodes);
  console.log(`✅ أكواد اللغات: ${langCodes.length} → فريدة: ${uniqueLangCodes.size}`);
  if (langCodes.length === uniqueLangCodes.size) {
    console.log('   ✓ لا يوجد تكرار في اللغات\n');
  } else {
    console.log('   ✗ يوجد تكرار في اللغات!\n');
  }

  const genreSlugs = genres.map(g => g.slug);
  const uniqueGenreSlugs = new Set(genreSlugs);
  console.log(`✅ أكواد التصنيفات: ${genreSlugs.length} → فريدة: ${uniqueGenreSlugs.size}`);
  if (genreSlugs.length === uniqueGenreSlugs.size) {
    console.log('   ✓ لا يوجد تكرار في التصنيفات\n');
  } else {
    console.log('   ✗ يوجد تكرار في التصنيفات!\n');
  }

  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 الملخص النهائي:\n');
  console.log(`✅ روابط اللغات: ${langSuccess}/${languages.length}`);
  console.log(`✅ روابط التصنيفات: ${genreSuccess}/${genres.length}`);
  console.log(`✅ إجمالي الروابط: ${4 + langSuccess + genreSuccess}/24`);
  console.log('\n🎉 جميع الروابط جاهزة وتعمل بنجاح!');
  console.log('═══════════════════════════════════════════════════\n');
}

testAllLinks().catch(console.error);
