require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function generateWithAIResearch(titleAr, titleEn, type = 'فيلم') {
  if (!GROQ_KEY) return null;
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `أنت كاتب محتوى سينمائي. ابدأ مباشرة بالوصف. فقرة من 3-5 جمل. لا مقدمات.`
          },
          {
            role: 'user',
            content: `اكتب وصفاً مشوقاً للـ ${type} "${titleAr || titleEn}".`
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });
    const data = await res.json();
    if (data.error) {
      console.error(`❌ خطأ API: ${data.error.message}`);
      return null;
    }
    const text = data.choices?.[0]?.message?.content?.trim();
    if (text && text.length > 50) return text;
  } catch (e) {
    console.error(`❌ خطأ في AI: ${e.message}`);
  }
  return null;
}

(async () => {
  console.log('🧪 تجربة AI المتقدم على 100 عمل\n');
  console.log('═'.repeat(80));

  // الفحص قبل
  console.log('\n📊 الفحص قبل الإصلاح:\n');

  const beforeMovies = await turso.execute(`
    SELECT COUNT(*) as count FROM movies WHERE (overview_ar IS NULL OR overview_ar = '')
  `);
  const beforeSeries = await turso.execute(`
    SELECT COUNT(*) as count FROM tv_series WHERE (overview_ar IS NULL OR overview_ar = '')
  `);

  const moviesBefore = beforeMovies.rows[0][0];
  const seriesBefore = beforeSeries.rows[0][0];

  console.log(`🎬 الأفلام بدون وصف عربي: ${moviesBefore}`);
  console.log(`📺 المسلسلات بدون وصف عربي: ${seriesBefore}`);
  console.log(`📦 الإجمالي: ${moviesBefore + seriesBefore}\n`);

  // الحصول على 100 عمل
  console.log('═'.repeat(80));
  console.log('\n🔧 بدء الإصلاح مع AI المتقدم:\n');

  const moviesData = await turso.execute(`
    SELECT id, title_en, title_ar FROM movies 
    WHERE (overview_ar IS NULL OR overview_ar = '')
    LIMIT 50
  `);

  const seriesData = await turso.execute(`
    SELECT id, name_en, name_ar FROM tv_series 
    WHERE (overview_ar IS NULL OR overview_ar = '')
    LIMIT 50
  `);

  const items = [];
  for (const row of moviesData.rows) {
    items.push(['movie', row[0], row[1], row[2]]);
  }
  for (const row of seriesData.rows) {
    items.push(['series', row[0], row[1], row[2]]);
  }

  console.log(`📦 عدد الأعمال: ${items.length}\n`);

  let updated = 0;
  let fromAI = 0;

  for (let i = 0; i < items.length; i++) {
    const [type, id, nameEn, nameAr] = items[i];
    const typeLabel = type === 'movie' ? 'فيلم' : 'مسلسل';

    const description = await generateWithAIResearch(nameAr, nameEn, typeLabel);

    if (description) {
      try {
        const table = type === 'movie' ? 'movies' : 'tv_series';
        await turso.execute({
          sql: `UPDATE ${table} SET overview_ar = ?, updated_at = ? WHERE id = ?`,
          args: [description, new Date().toISOString(), id]
        });
        updated++;
        fromAI++;
      } catch (e) {
        console.error(`❌ خطأ في تحديث ${type} ${id}`);
      }
    }

    const percent = (((i + 1) / items.length) * 100).toFixed(1);
    process.stdout.write(`\r⏳ ${i + 1}/${items.length} (${percent}%) - تم تحديث: ${updated}`);
  }

  console.log('\n\n✅ انتهى الإصلاح!\n');
  console.log(`📊 النتائج:`);
  console.log(`  - تم تحديث: ${updated}`);
  console.log(`  - من AI المتقدم: ${fromAI}\n`);

  // الفحص بعد
  console.log('═'.repeat(80));
  console.log('\n📊 الفحص بعد الإصلاح:\n');

  await new Promise(r => setTimeout(r, 2000));

  const afterMovies = await turso.execute(`
    SELECT COUNT(*) as count FROM movies WHERE (overview_ar IS NULL OR overview_ar = '')
  `);
  const afterSeries = await turso.execute(`
    SELECT COUNT(*) as count FROM tv_series WHERE (overview_ar IS NULL OR overview_ar = '')
  `);

  const moviesAfter = afterMovies.rows[0][0];
  const seriesAfter = afterSeries.rows[0][0];

  console.log(`🎬 الأفلام بدون وصف عربي: ${moviesAfter}`);
  console.log(`📺 المسلسلات بدون وصف عربي: ${seriesAfter}`);
  console.log(`📦 الإجمالي: ${moviesAfter + seriesAfter}\n`);

  // المقارنة
  console.log('═'.repeat(80));
  console.log('\n📈 المقارنة:\n');

  const totalBefore = moviesBefore + seriesBefore;
  const totalAfter = moviesAfter + seriesAfter;
  const reduction = totalBefore - totalAfter;
  const percent = ((reduction / totalBefore) * 100).toFixed(1);

  console.log(`قبل: ${totalBefore}`);
  console.log(`بعد: ${totalAfter}`);
  console.log(`التقليل: ${reduction} (${percent}%)\n`);

  if (reduction > 0) {
    console.log(`✅ النتيجة: نجح! تم تقليل الأعمال الناقصة بـ ${reduction} عمل`);
  } else {
    console.log(`⚠️ النتيجة: لم يتم تقليل الأعمال الناقصة`);
  }

  console.log('\n═'.repeat(80));
  console.log('\n✅ انتهت التجربة\n');
})();
