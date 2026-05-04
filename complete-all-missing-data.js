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

async function completeMovies() {
  console.log('🎬 إكمال بيانات الأفلام الناقصة\n');

  // الحصول على جميع الأفلام الناقصة
  const allIncomplete = await turso.execute(`
    SELECT COUNT(*) as total FROM movies 
    WHERE (overview_ar IS NULL OR overview_ar = '' OR poster_path IS NULL OR poster_path = '')
  `);

  const totalIncomplete = allIncomplete.rows[0][0];
  console.log(`📦 إجمالي الأفلام الناقصة: ${totalIncomplete.toLocaleString()}\n`);

  let processed = 0;
  let updated = 0;
  let fromLocal = 0;
  let fromAI = 0;
  const batchSize = 100;

  for (let offset = 0; offset < totalIncomplete; offset += batchSize) {
    const incompleteMovies = await turso.execute(`
      SELECT id, tmdb_id, title_en, title_ar, overview_ar, poster_path 
      FROM movies 
      WHERE (overview_ar IS NULL OR overview_ar = '' OR poster_path IS NULL OR poster_path = '')
      LIMIT ${batchSize} OFFSET ${offset}
    `);

    for (const row of incompleteMovies.rows) {
      const id = row[0];
      const tmdbId = row[1];
      const titleEn = row[2];
      const titleAr = row[3];
      let overviewAr = row[4];
      let posterPath = row[5];

      let updated_this = false;

      // 1️⃣ محاولة من القاعدة المحلية
      if (!overviewAr || !posterPath) {
        const localData = localDb.prepare(`
          SELECT overview_ar, poster_path FROM movies WHERE tmdb_id = ?
        `).get(tmdbId);

        if (localData) {
          if (!overviewAr && localData.overview_ar) {
            overviewAr = localData.overview_ar;
            fromLocal++;
            updated_this = true;
          }
          if (!posterPath && localData.poster_path) {
            posterPath = localData.poster_path;
            fromLocal++;
            updated_this = true;
          }
        }
      }

      // 2️⃣ محاولة من الذكاء الاصطناعي للوصف
      if (!overviewAr) {
        const aiDescription = await generateDescriptionWithAI(titleAr, titleEn, null, 'فيلم');
        if (aiDescription) {
          overviewAr = aiDescription;
          fromAI++;
          updated_this = true;
        }
      }

      // تحديث في Turso
      if (updated_this) {
        try {
          await turso.execute({
            sql: `
              UPDATE movies 
              SET overview_ar = ?, poster_path = ?, updated_at = ?
              WHERE id = ?
            `,
            args: [
              overviewAr || row[4],
              posterPath || row[5],
              new Date().toISOString(),
              id
            ]
          });
          updated++;
        } catch (e) {
          console.error(`❌ خطأ في تحديث الفيلم ${id}: ${e.message}`);
        }
      }

      processed++;
      const percent = ((processed / totalIncomplete) * 100).toFixed(1);
      process.stdout.write(`\r⏳ ${processed.toLocaleString()} / ${totalIncomplete.toLocaleString()} (${percent}%)`);
    }
  }

  console.log(`\n✅ تم تحديث ${updated.toLocaleString()} فيلم`);
  console.log(`   📚 من القاعدة المحلية: ${fromLocal.toLocaleString()}`);
  console.log(`   🤖 من الذكاء الاصطناعي: ${fromAI.toLocaleString()}\n`);
}

async function completeSeries() {
  console.log('📺 إكمال بيانات المسلسلات الناقصة\n');

  // الحصول على جميع المسلسلات الناقصة
  const allIncomplete = await turso.execute(`
    SELECT COUNT(*) as total FROM tv_series 
    WHERE (overview_ar IS NULL OR overview_ar = '' OR poster_path IS NULL OR poster_path = '')
  `);

  const totalIncomplete = allIncomplete.rows[0][0];
  console.log(`📦 إجمالي المسلسلات الناقصة: ${totalIncomplete.toLocaleString()}\n`);

  let processed = 0;
  let updated = 0;
  let fromLocal = 0;
  let fromAI = 0;
  const batchSize = 100;

  for (let offset = 0; offset < totalIncomplete; offset += batchSize) {
    const incompleteSeries = await turso.execute(`
      SELECT id, tmdb_id, name_en, name_ar, overview_ar, poster_path 
      FROM tv_series 
      WHERE (overview_ar IS NULL OR overview_ar = '' OR poster_path IS NULL OR poster_path = '')
      LIMIT ${batchSize} OFFSET ${offset}
    `);

    for (const row of incompleteSeries.rows) {
      const id = row[0];
      const tmdbId = row[1];
      const nameEn = row[2];
      const nameAr = row[3];
      let overviewAr = row[4];
      let posterPath = row[5];

      let updated_this = false;

      // 1️⃣ محاولة من القاعدة المحلية
      if (!overviewAr || !posterPath) {
        const localData = localDb.prepare(`
          SELECT overview_ar, poster_path FROM tv_series WHERE tmdb_id = ?
        `).get(tmdbId);

        if (localData) {
          if (!overviewAr && localData.overview_ar) {
            overviewAr = localData.overview_ar;
            fromLocal++;
            updated_this = true;
          }
          if (!posterPath && localData.poster_path) {
            posterPath = localData.poster_path;
            fromLocal++;
            updated_this = true;
          }
        }
      }

      // 2️⃣ محاولة من الذكاء الاصطناعي للوصف
      if (!overviewAr) {
        const aiDescription = await generateDescriptionWithAI(nameAr, nameEn, null, 'مسلسل');
        if (aiDescription) {
          overviewAr = aiDescription;
          fromAI++;
          updated_this = true;
        }
      }

      // تحديث في Turso
      if (updated_this) {
        try {
          await turso.execute({
            sql: `
              UPDATE tv_series 
              SET overview_ar = ?, poster_path = ?, updated_at = ?
              WHERE id = ?
            `,
            args: [
              overviewAr || row[4],
              posterPath || row[5],
              new Date().toISOString(),
              id
            ]
          });
          updated++;
        } catch (e) {
          console.error(`❌ خطأ في تحديث المسلسل ${id}: ${e.message}`);
        }
      }

      processed++;
      const percent = ((processed / totalIncomplete) * 100).toFixed(1);
      process.stdout.write(`\r⏳ ${processed.toLocaleString()} / ${totalIncomplete.toLocaleString()} (${percent}%)`);
    }
  }

  console.log(`\n✅ تم تحديث ${updated.toLocaleString()} مسلسل`);
  console.log(`   📚 من القاعدة المحلية: ${fromLocal.toLocaleString()}`);
  console.log(`   🤖 من الذكاء الاصطناعي: ${fromAI.toLocaleString()}\n`);
}

async function main() {
  console.log('🔄 بدء إكمال جميع البيانات الناقصة\n');
  console.log('═'.repeat(80));

  await completeMovies();
  await completeSeries();

  console.log('═'.repeat(80));
  console.log('✅ اكتمل إكمال البيانات!\n');

  localDb.close();
}

main().catch(console.error);
