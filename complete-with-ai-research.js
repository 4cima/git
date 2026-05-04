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

// 1️⃣ محاولة بسيطة: توليد وصف من العنوان فقط
async function generateSimpleDescription(titleAr, titleEn, type = 'فيلم') {
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
    const text = data.choices?.[0]?.message?.content?.trim();
    if (text && text.length > 50) return text;
  } catch (e) {
    console.error(`❌ خطأ في AI البسيط: ${e.message}`);
  }
  return null;
}

// 2️⃣ محاولة متقدمة: البحث عن معلومات العمل
async function generateAdvancedDescription(titleAr, titleEn, type = 'فيلم') {
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
            content: `أنت محقق سينمائي متخصص. مهمتك:
1. البحث عن معلومات عن ${type} بناءً على العنوان
2. تجميع المعلومات (النوع، الفترة الزمنية، الممثلين المشهورين، إلخ)
3. كتابة وصف مشوق بناءً على المعلومات المجمعة

ابدأ مباشرة بالوصف. فقرة من 3-5 جمل. لا مقدمات.`
          },
          {
            role: 'user',
            content: `ابحث عن معلومات عن ${type} بعنوان "${titleAr || titleEn}" واكتب وصفاً مشوقاً بناءً على ما تجده.`
          }
        ],
        max_tokens: 400,
        temperature: 0.7
      })
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (text && text.length > 50) return text;
  } catch (e) {
    console.error(`❌ خطأ في AI المتقدم: ${e.message}`);
  }
  return null;
}

async function completeMovies() {
  console.log('🎬 إكمال بيانات الأفلام الناقصة\n');

  const incompleteMovies = await turso.execute(`
    SELECT id, tmdb_id, title_en, title_ar, overview_ar
    FROM movies 
    WHERE (overview_ar IS NULL OR overview_ar = '')
    LIMIT 100
  `);

  console.log(`📦 عدد الأفلام الناقصة: ${incompleteMovies.rows.length}\n`);

  let updated = 0;
  let fromLocal = 0;
  let fromSimpleAI = 0;
  let fromAdvancedAI = 0;

  for (const row of incompleteMovies.rows) {
    const id = row[0];
    const tmdbId = row[1];
    const titleEn = row[2];
    const titleAr = row[3];
    let overviewAr = row[4];

    // 1️⃣ محاولة من القاعدة المحلية
    if (!overviewAr) {
      const localData = localDb.prepare(`
        SELECT overview_ar FROM movies WHERE tmdb_id = ?
      `).get(tmdbId);

      if (localData && localData.overview_ar) {
        overviewAr = localData.overview_ar;
        fromLocal++;
      }
    }

    // 2️⃣ محاولة AI بسيطة
    if (!overviewAr) {
      overviewAr = await generateSimpleDescription(titleAr, titleEn, 'فيلم');
      if (overviewAr) fromSimpleAI++;
    }

    // 3️⃣ محاولة AI متقدمة (البحث)
    if (!overviewAr) {
      overviewAr = await generateAdvancedDescription(titleAr, titleEn, 'فيلم');
      if (overviewAr) fromAdvancedAI++;
    }

    // تحديث في Turso
    if (overviewAr) {
      try {
        await turso.execute({
          sql: `UPDATE movies SET overview_ar = ?, updated_at = ? WHERE id = ?`,
          args: [overviewAr, new Date().toISOString(), id]
        });
        updated++;
      } catch (e) {
        console.error(`❌ خطأ في تحديث الفيلم ${id}: ${e.message}`);
      }
    }

    process.stdout.write(`\r⏳ ${updated}/${incompleteMovies.rows.length}`);
  }

  console.log(`\n✅ تم تحديث ${updated} فيلم`);
  console.log(`   📚 من القاعدة المحلية: ${fromLocal}`);
  console.log(`   🤖 من AI البسيط: ${fromSimpleAI}`);
  console.log(`   🔍 من AI المتقدم (البحث): ${fromAdvancedAI}\n`);
}

async function completeSeries() {
  console.log('📺 إكمال بيانات المسلسلات الناقصة\n');

  const incompleteSeries = await turso.execute(`
    SELECT id, tmdb_id, name_en, name_ar, overview_ar
    FROM tv_series 
    WHERE (overview_ar IS NULL OR overview_ar = '')
    LIMIT 100
  `);

  console.log(`📦 عدد المسلسلات الناقصة: ${incompleteSeries.rows.length}\n`);

  let updated = 0;
  let fromLocal = 0;
  let fromSimpleAI = 0;
  let fromAdvancedAI = 0;

  for (const row of incompleteSeries.rows) {
    const id = row[0];
    const tmdbId = row[1];
    const nameEn = row[2];
    const nameAr = row[3];
    let overviewAr = row[4];

    // 1️⃣ محاولة من القاعدة المحلية
    if (!overviewAr) {
      const localData = localDb.prepare(`
        SELECT overview_ar FROM tv_series WHERE tmdb_id = ?
      `).get(tmdbId);

      if (localData && localData.overview_ar) {
        overviewAr = localData.overview_ar;
        fromLocal++;
      }
    }

    // 2️⃣ محاولة AI بسيطة
    if (!overviewAr) {
      overviewAr = await generateSimpleDescription(nameAr, nameEn, 'مسلسل');
      if (overviewAr) fromSimpleAI++;
    }

    // 3️⃣ محاولة AI متقدمة (البحث)
    if (!overviewAr) {
      overviewAr = await generateAdvancedDescription(nameAr, nameEn, 'مسلسل');
      if (overviewAr) fromAdvancedAI++;
    }

    // تحديث في Turso
    if (overviewAr) {
      try {
        await turso.execute({
          sql: `UPDATE tv_series SET overview_ar = ?, updated_at = ? WHERE id = ?`,
          args: [overviewAr, new Date().toISOString(), id]
        });
        updated++;
      } catch (e) {
        console.error(`❌ خطأ في تحديث المسلسل ${id}: ${e.message}`);
      }
    }

    process.stdout.write(`\r⏳ ${updated}/${incompleteSeries.rows.length}`);
  }

  console.log(`\n✅ تم تحديث ${updated} مسلسل`);
  console.log(`   📚 من القاعدة المحلية: ${fromLocal}`);
  console.log(`   🤖 من AI البسيط: ${fromSimpleAI}`);
  console.log(`   🔍 من AI المتقدم (البحث): ${fromAdvancedAI}\n`);
}

async function main() {
  console.log('🔄 بدء إكمال البيانات بـ AI متقدم\n');
  console.log('═'.repeat(80));

  await completeMovies();
  await completeSeries();

  console.log('═'.repeat(80));
  console.log('✅ اكتمل إكمال البيانات!\n');

  localDb.close();
}

main().catch(console.error);
