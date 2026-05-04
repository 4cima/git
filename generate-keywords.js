const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db');

function generateKeywordsForMovie(movie) {
  const keywords = new Set();
  
  // 1. من النوع الأساسي
  if (movie.primary_genre) {
    keywords.add(movie.primary_genre.toLowerCase());
  }
  
  // 2. من العنوان (كلمات > 3 أحرف)
  if (movie.title_en) {
    const titleWords = movie.title_en
      .split(/[\s\-:,]+/)
      .filter(w => w.length > 3 && w.toLowerCase() !== 'the' && w.toLowerCase() !== 'and');
    titleWords.forEach(w => keywords.add(w.toLowerCase()));
  }
  
  // 3. من الوصف (أول 15 كلمة مهمة)
  if (movie.overview_en) {
    const overviewWords = movie.overview_en
      .split(/[\s\-:,]+/)
      .filter(w => w.length > 4)
      .slice(0, 15);
    overviewWords.forEach(w => keywords.add(w.toLowerCase()));
  }
  
  // 4. السنة
  if (movie.release_year) {
    keywords.add(movie.release_year.toString());
  }
  
  // 5. الدولة
  if (movie.country_of_origin) {
    keywords.add(movie.country_of_origin.toLowerCase());
  }
  
  // 6. اللغة الأصلية
  if (movie.original_language) {
    keywords.add(movie.original_language.toLowerCase());
  }
  
  // 7. كلمات عامة بناءً على الخصائص
  if (movie.has_cast) keywords.add('has-cast');
  if (movie.has_trailer) keywords.add('has-trailer');
  if (movie.has_arabic_overview) keywords.add('arabic-overview');
  if (movie.runtime && movie.runtime > 120) keywords.add('long-movie');
  if (movie.runtime && movie.runtime < 90) keywords.add('short-movie');
  
  // 8. تصنيف بناءً على التقييم
  if (movie.vote_average) {
    if (movie.vote_average >= 8) keywords.add('highly-rated');
    if (movie.vote_average >= 7) keywords.add('well-rated');
    if (movie.vote_average < 5) keywords.add('low-rated');
  }
  
  // 9. كلمات من الشركات الإنتاجية
  if (movie.production_companies) {
    try {
      const companies = JSON.parse(movie.production_companies);
      if (Array.isArray(companies)) {
        companies.slice(0, 3).forEach(c => {
          if (c.name) keywords.add(c.name.toLowerCase().replace(/\s+/g, '-'));
        });
      }
    } catch (e) {
      // تجاهل الأخطاء
    }
  }
  
  return Array.from(keywords).slice(0, 50); // حد أقصى 50 كلمة
}

function generateKeywordsForSeries(series) {
  const keywords = new Set();
  
  // 1. من النوع الأساسي
  if (series.primary_genre) {
    keywords.add(series.primary_genre.toLowerCase());
  }
  
  // 2. من الاسم
  if (series.title_en) {
    const titleWords = series.title_en
      .split(/[\s\-:,]+/)
      .filter(w => w.length > 3 && w.toLowerCase() !== 'the' && w.toLowerCase() !== 'and');
    titleWords.forEach(w => keywords.add(w.toLowerCase()));
  }
  
  // 3. من الوصف
  if (series.overview_ar) {
    const overviewWords = series.overview_ar
      .split(/[\s\-:,]+/)
      .filter(w => w.length > 4)
      .slice(0, 15);
    overviewWords.forEach(w => keywords.add(w.toLowerCase()));
  }
  
  // 4. السنة
  if (series.first_air_year) {
    keywords.add(series.first_air_year.toString());
  }
  
  // 5. الدولة
  if (series.country_of_origin) {
    keywords.add(series.country_of_origin.toLowerCase());
  }
  
  // 6. عدد المواسم
  if (series.number_of_seasons) {
    if (series.number_of_seasons === 1) keywords.add('single-season');
    if (series.number_of_seasons > 5) keywords.add('long-series');
    keywords.add(`${series.number_of_seasons}-seasons`);
  }
  
  // 7. عدد الحلقات
  if (series.number_of_episodes) {
    if (series.number_of_episodes > 100) keywords.add('many-episodes');
    keywords.add(`${series.number_of_episodes}-episodes`);
  }
  
  // 8. الحالة
  if (series.status) {
    keywords.add(series.status.toLowerCase());
  }
  
  // 9. كلمات عامة
  if (series.has_cast) keywords.add('has-cast');
  if (series.has_trailer) keywords.add('has-trailer');
  if (series.has_arabic_overview) keywords.add('arabic-overview');
  
  // 10. تصنيف بناءً على التقييم
  if (series.vote_average) {
    if (series.vote_average >= 8) keywords.add('highly-rated');
    if (series.vote_average >= 7) keywords.add('well-rated');
    if (series.vote_average < 5) keywords.add('low-rated');
  }
  
  return Array.from(keywords).slice(0, 50);
}

async function main() {
  console.log('🚀 توليد Keywords للأعمال الناقصة\n');
  
  // الأفلام
  console.log('🎬 معالجة الأفلام...');
  const moviesWithoutKeywords = db.prepare(`
    SELECT id FROM movies 
    WHERE is_complete = 0 AND is_filtered = 0 
    AND (keywords IS NULL OR keywords = '[]')
  `).all();
  
  console.log(`   📊 إجمالي: ${moviesWithoutKeywords.length.toLocaleString()}`);
  
  let moviesUpdated = 0;
  for (const item of moviesWithoutKeywords) {
    try {
      const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(item.id);
      const keywords = generateKeywordsForMovie(movie);
      
      db.prepare('UPDATE movies SET keywords = ? WHERE id = ?').run(
        JSON.stringify(keywords),
        item.id
      );
      
      moviesUpdated++;
      
      if (moviesUpdated % 1000 === 0) {
        console.log(`   ⏳ ${moviesUpdated.toLocaleString()} / ${moviesWithoutKeywords.length.toLocaleString()}`);
      }
    } catch (error) {
      console.error(`   ❌ خطأ في الفيلم ${item.id}:`, error.message);
    }
  }
  
  console.log(`   ✅ تم تحديث: ${moviesUpdated.toLocaleString()}\n`);
  
  // المسلسلات
  console.log('📺 معالجة المسلسلات...');
  const seriesWithoutKeywords = db.prepare(`
    SELECT id FROM tv_series 
    WHERE is_complete = 0 AND is_filtered = 0 
    AND (keywords IS NULL OR keywords = '[]')
  `).all();
  
  console.log(`   📊 إجمالي: ${seriesWithoutKeywords.length.toLocaleString()}`);
  
  let seriesUpdated = 0;
  for (const item of seriesWithoutKeywords) {
    try {
      const series = db.prepare('SELECT * FROM tv_series WHERE id = ?').get(item.id);
      const keywords = generateKeywordsForSeries(series);
      
      db.prepare('UPDATE tv_series SET keywords = ? WHERE id = ?').run(
        JSON.stringify(keywords),
        item.id
      );
      
      seriesUpdated++;
      
      if (seriesUpdated % 1000 === 0) {
        console.log(`   ⏳ ${seriesUpdated.toLocaleString()} / ${seriesWithoutKeywords.length.toLocaleString()}`);
      }
    } catch (error) {
      console.error(`   ❌ خطأ في المسلسل ${item.id}:`, error.message);
    }
  }
  
  console.log(`   ✅ تم تحديث: ${seriesUpdated.toLocaleString()}\n`);
  
  // تحديث is_complete flag
  console.log('🔄 تحديث is_complete flag...');
  
  const moviesCompleteUpdate = db.prepare(`
    UPDATE movies 
    SET is_complete = 1 
    WHERE is_complete = 0 AND is_filtered = 0 
    AND keywords IS NOT NULL AND keywords != '[]'
  `).run();
  
  const seriesCompleteUpdate = db.prepare(`
    UPDATE tv_series 
    SET is_complete = 1 
    WHERE is_complete = 0 AND is_filtered = 0 
    AND keywords IS NOT NULL AND keywords != '[]'
  `).run();
  
  console.log(`   ✅ أفلام محدثة: ${moviesCompleteUpdate.changes.toLocaleString()}`);
  console.log(`   ✅ مسلسلات محدثة: ${seriesCompleteUpdate.changes.toLocaleString()}`);
  
  console.log('\n✅ اكتملت العملية!');
  console.log(`   🎬 أفلام: ${moviesUpdated.toLocaleString()}`);
  console.log(`   📺 مسلسلات: ${seriesUpdated.toLocaleString()}`);
  console.log(`   📊 الإجمالي: ${(moviesUpdated + seriesUpdated).toLocaleString()}`);
  
  db.close();
}

main().catch(console.error);
