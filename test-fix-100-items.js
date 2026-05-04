require('dotenv').config({ path: '.env.local' });

const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');

const localDb = new Database('./data/4cima-local.db', { readonly: true });
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function generateDescriptionWithAI(titleAr, titleEn, year, type = 'فيلم') {
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
            content: `اكتب وصفاً مشوقاً للـ ${type} "${titleAr || titleEn}"${year ? ` (${year})` : ''}.`
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (text && text.length > 50) return text;
  } catch (e) {
    console.error(`❌ خطأ في AI: ${e.message}`);
  }
  return null;
}

async function testFix() {
  console.log('🧪 تجربة الإصلاح على 100 عمل\n');
  console.log('═'.repeat(80));

  // 1️⃣ الفحص قبل الإصلاح
  console.log('\n📊 الفحص قبل الإصلاح:\n');

  const beforeMovies = await turso.execute(`
    SELECT COUNT(*) as count FROM movies 
    WHERE (overview_ar IS NULL OR overview_ar = '')
    LIMIT 100
  `);

  const beforeSeries = await turso.execute(`
    SELECT COUNT(*) as count FROM tv_series 
    WHERE (overview_ar IS NULL OR overview_ar = '')
    LIMIT 100
  `);

  const moviesWithoutAr = beforeMovies.rows[0][0];
  const seriesWithoutAr = beforeSeries.rows[0][0];

  console.log(`🎬 الأفلام بدون وصف عربي: ${moviesWithoutAr}`);
  console.log(`📺 المسلسلات بدون وصف عربي: ${seriesWithoutAr}`);
  console.log(`📦 الإجمالي: ${moviesWithoutAr + seriesWithoutAr}\n`);

  // 2️⃣ الحصول على 100 عمل بدون وصف عربي
  console.log('═'.repeat(80));
  console.log('\n🔧 بدء الإصلاح على 100 عمل:\n');

  const moviesData = await turso.execute(`
    SELECT id, tmdb_id, title_en, title_ar, overview_ar
    FROM movies 
    WHERE (overview_ar IS NULL OR overview_ar = '')
    LIMIT 50
  `);

  const seriesData = await turso.execute(`
    SELECT id, tmdb_id, name_en, name_ar, overview_ar
    FROM tv_series 
    WHERE (overview_ar IS NULL OR overview_ar = '')
    LIMIT 50
  `);

  const itemsToFix = [];
  for (const row of moviesData.rows) {
    itemsToFix.push(['movie', row[0], row[1], row[2], row[3], row[4]]);
  }
  for (const row of seriesData.rows) {
    itemsToFix.push(['series', row[0], row[1], row[2], row[3], row[4]]);
  }

  console.log(`📦 عدد الأعمال المراد إصلاحها: ${itemsToFix.length}\n`);

  let updated = 0;
  let fromLocal = 0;
  let fromAI = 0;
  let failed = 0;

  for (let i = 0; i < itemsToFix.length; i++) {
    const row = itemsToFix[i];
    const type = row[0];
    const id = row[1];
    const tmdbId = row[2];
    const nameEn = row[3];
    const nameAr = row[4];
    let overviewAr = row[5];

    let updated_this = false;

    // 1️⃣ محاولة من القاعدة المحلية
    if (!overviewAr) {
      const table = type === 'movie' ? 'movies' : 'tv_series';
      const localData = localDb.prepare(`
        SELECT overview_ar FROM ${table} WHERE tmdb_id = ?
      `).get(tmdbId);

      if (localData && localData.overview_ar) {
        overviewAr = localData.overview_ar;
        fromLocal++;
        updated_this = true;
      }
    }

    // 2️⃣ محاولة من الذكاء الاصطناعي
    if (!overviewAr) {
      const typeLabel = type === 'movie' ? 'فيلم' : 'مسلسل';
      const aiDescription = await generateDescriptionWithAI(nameAr, nameEn, null, typeLabel);
      if (aiDescription) {
        overviewAr = aiDescription;
        fromAI++;
        updated_this = true;
      }
    }

    // 3️⃣ تحديث في Turso
    if (updated_this && overviewAr) {
      try {
        const table = type === 'movie' ? 'movies' : 'tv_series';
        await turso.execute({
          sql: `UPDATE ${table} SET overview_ar = ?, updated_at = ? WHERE id = ?`,
          args: [overviewAr, new Date().toISOString(), id]
        });
        updated++;
      } catch (e) {
        console.error(`❌ خطأ في تحديث ${type} ${id}: ${e.message}`);
        failed++;
      }
    } else if (!updated_this) {
      failed++;
    }

    const percent = (((i + 1) / itemsToFix.length) * 100).toFixed(1);
    process.stdout.write(`\r⏳ ${i + 1}/${itemsToFix.length} (${percent}%)`);
  }

  console.log('\n\n✅ انتهى الإصلاح!\n');
  console.log(`📊 النتائج:`);
  console.log(`  - تم تحديث: ${updated}`);
  console.log(`  - من القاعدة المحلية: ${fromLocal}`);
  console.log(`  - من الذكاء الاصطناعي: ${fromAI}`);
  console.log(`  - فشل: ${failed}\n`);

  // 3️⃣ الفحص بعد الإصلاح
  console.log('═'.repeat(80));
  console.log('\n📊 الفحص بعد الإصلاح:\n');

  // انتظر قليلاً للتأكد من تحديث البيانات
  await new Promise(r => setTimeout(r, 2000));

  const afterMovies = await turso.execute(`
    SELECT COUNT(*) as count FROM movies 
    WHERE (overview_ar IS NULL OR overview_ar = '')
  `);

  const afterSeries = await turso.execute(`
    SELECT COUNT(*) as count FROM tv_series 
    WHERE (overview_ar IS NULL OR overview_ar = '')
  `);

  const moviesAfter = afterMovies.rows[0][0];
  const seriesAfter = afterSeries.rows[0][0];

  console.log(`🎬 الأفلام بدون وصف عربي: ${moviesAfter}`);
  console.log(`📺 المسلسلات بدون وصف عربي: ${seriesAfter}`);
  console.log(`📦 الإجمالي: ${moviesAfter + seriesAfter}\n`);

  // 4️⃣ المقارنة
  console.log('═'.repeat(80));
  console.log('\n📈 المقارنة:\n');

  const totalBefore = moviesWithoutAr + seriesWithoutAr;
  const totalAfter = moviesAfter + seriesAfter;
  const reduction = totalBefore - totalAfter;
  const reductionPercent = ((reduction / totalBefore) * 100).toFixed(1);

  console.log(`قبل الإصلاح: ${totalBefore}`);
  console.log(`بعد الإصلاح: ${totalAfter}`);
  console.log(`التقليل: ${reduction} (${reductionPercent}%)\n`);

  if (reduction > 0) {
    console.log(`✅ النتيجة: الإصلاح نجح! تم تقليل الأعمال الناقصة بـ ${reduction} عمل`);
  } else if (reduction === 0) {
    console.log(`⚠️ النتيجة: لم يتم تقليل الأعمال الناقصة`);
  } else {
    console.log(`❌ النتيجة: حدث خطأ - زاد عدد الأعمال الناقصة!`);
  }

  console.log('\n═'.repeat(80));
  console.log('\n✅ انتهت التجربة\n');

  localDb.close();
}

testFix().catch(console.error);
