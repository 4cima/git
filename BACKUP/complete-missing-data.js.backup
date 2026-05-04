require('dotenv').config({ path: '.env.local' });

const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');
const axios = require('axios');

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

  const incompleteMovies = await turso.execute(`
    SELECT id, tmdb_id, title_en, title_ar, overview_ar, poster_path 
    FROM movies 
    WHERE (overview_ar IS NULL OR overview_ar = '' OR poster_path IS NULL OR poster_path = '')
    LIMIT 100
  `);

  console.log(`📦 عدد الأفلام الناقصة: ${incompleteMovies.rows.length}\n`);

  let updated = 0;
  let fromLocal = 0;
  let fromAI = 0;

  for (const row of incompleteMovies.rows) {
    const id = row[0];
    const tmdbId = row[1];
    const titleEn = row[2];
    const titleAr = row[3];
    const overviewAr = row[4];
    const posterPath = row[5];
    let newOverviewAr = overviewAr;
    let newPosterPath = posterPath;

    // 1️⃣ محاولة من القاعدة المحلية
    if (!newOverviewAr || !newPosterPath) {
      const localData = localDb.prepare(`
        SELECT overview_ar, poster_path FROM movies WHERE tmdb_id = ?
      `).get(tmdbId);

      if (localData) {
        if (!newOverviewAr && localData.overview_ar) {
          newOverviewAr = localData.overview_ar;
          fromLocal++;
        }
        if (!newPosterPath && localData.poster_path) {
          newPosterPath = localData.poster_path;
          fromLocal++;
        }
      }
    }

    // 2️⃣ محاولة من الذكاء الاصطناعي للوصف
    if (!newOverviewAr) {
      newOverviewAr = await generateDescriptionWithAI(titleAr, titleEn, null, 'فيلم');
      if (newOverviewAr) fromAI++;
    }

    // تحديث في Turso
    if (newOverviewAr || newPosterPath) {
      try {
        await turso.execute({
          sql: `
            UPDATE movies 
            SET overview_ar = ?, poster_path = ?, updated_at = ?
            WHERE id = ?
          `,
          args: [
            newOverviewAr || overviewAr,
            newPosterPath || posterPath,
            new Date().toISOString(),
            id
          ]
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
  console.log(`   🤖 من الذكاء الاصطناعي: ${fromAI}\n`);
}

async function completeSeries() {
  console.log('📺 إكمال بيانات المسلسلات الناقصة\n');

  const incompleteSeries = await turso.execute(`
    SELECT id, tmdb_id, name_en, name_ar, overview_ar, poster_path 
    FROM tv_series 
    WHERE (overview_ar IS NULL OR overview_ar = '' OR poster_path IS NULL OR poster_path = '')
    LIMIT 100
  `);

  console.log(`📦 عدد المسلسلات الناقصة: ${incompleteSeries.rows.length}\n`);

  let updated = 0;
  let fromLocal = 0;
  let fromAI = 0;

  for (const row of incompleteSeries.rows) {
    const id = row[0];
    const tmdbId = row[1];
    const nameEn = row[2];
    const nameAr = row[3];
    const overviewAr = row[4];
    const posterPath = row[5];
    let newOverviewAr = overviewAr;
    let newPosterPath = posterPath;

    // 1️⃣ محاولة من القاعدة المحلية
    if (!newOverviewAr || !newPosterPath) {
      const localData = localDb.prepare(`
        SELECT overview_ar, poster_path FROM tv_series WHERE tmdb_id = ?
      `).get(tmdbId);

      if (localData) {
        if (!newOverviewAr && localData.overview_ar) {
          newOverviewAr = localData.overview_ar;
          fromLocal++;
        }
        if (!newPosterPath && localData.poster_path) {
          newPosterPath = localData.poster_path;
          fromLocal++;
        }
      }
    }

    // 2️⃣ محاولة من الذكاء الاصطناعي للوصف
    if (!newOverviewAr) {
      newOverviewAr = await generateDescriptionWithAI(nameAr, nameEn, null, 'مسلسل');
      if (newOverviewAr) fromAI++;
    }

    // تحديث في Turso
    if (newOverviewAr || newPosterPath) {
      try {
        await turso.execute({
          sql: `
            UPDATE tv_series 
            SET overview_ar = ?, poster_path = ?, updated_at = ?
            WHERE id = ?
          `,
          args: [
            newOverviewAr || overviewAr,
            newPosterPath || posterPath,
            new Date().toISOString(),
            id
          ]
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
  console.log(`   🤖 من الذكاء الاصطناعي: ${fromAI}\n`);
}

async function main() {
  console.log('🔄 بدء إكمال البيانات الناقصة\n');
  console.log('═'.repeat(80));

  await completeMovies();
  await completeSeries();

  console.log('═'.repeat(80));
  console.log('✅ اكتمل إكمال البيانات!\n');

  localDb.close();
}

main().catch(console.error);
