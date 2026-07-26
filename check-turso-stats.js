require('dotenv').config({path:'.env.local'});
const {createClient} = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('📊 إحصائيات Turso:\n');
  
  // إجمالي
  const total = await turso.execute('SELECT COUNT(*) as c FROM movies');
  console.log('✅ إجمالي الأفلام:', total.rows[0].c);
  
  // Poster
  const poster = await turso.execute('SELECT COUNT(*) as c FROM movies WHERE poster_path IS NOT NULL');
  console.log('🖼️  أفلام مع Poster:', poster.rows[0].c, `(${(poster.rows[0].c/total.rows[0].c*100).toFixed(1)}%)`);
  
  // Backdrop
  const backdrop = await turso.execute('SELECT COUNT(*) as c FROM movies WHERE backdrop_path IS NOT NULL');
  console.log('🎨 أفلام مع Backdrop:', backdrop.rows[0].c, `(${(backdrop.rows[0].c/total.rows[0].c*100).toFixed(1)}%)`);
  
  // عنوان عربي
  const titleAr = await turso.execute("SELECT COUNT(*) as c FROM movies WHERE title_ar IS NOT NULL AND title_ar != ''");
  console.log('📝 أفلام مع عنوان عربي:', titleAr.rows[0].c, `(${(titleAr.rows[0].c/total.rows[0].c*100).toFixed(1)}%)`);
  
  // وصف عربي
  const overviewAr = await turso.execute('SELECT COUNT(*) as c FROM movies WHERE overview_ar IS NOT NULL');
  console.log('📄 أفلام مع وصف عربي:', overviewAr.rows[0].c, `(${(overviewAr.rows[0].c/total.rows[0].c*100).toFixed(1)}%)`);
  
  // Genres
  const genres = await turso.execute('SELECT COUNT(*) as c FROM movies WHERE genres_json IS NOT NULL');
  console.log('🎭 أفلام مع Genres:', genres.rows[0].c, `(${(genres.rows[0].c/total.rows[0].c*100).toFixed(1)}%)`);
  
  // Cast
  const cast = await turso.execute('SELECT COUNT(*) as c FROM movies WHERE cast_json IS NOT NULL');
  console.log('👥 أفلام مع Cast:', cast.rows[0].c, `(${(cast.rows[0].c/total.rows[0].c*100).toFixed(1)}%)`);
  
  // Trailer
  const trailer = await turso.execute('SELECT COUNT(*) as c FROM movies WHERE trailer_key IS NOT NULL');
  console.log('🎬 أفلام مع Trailer:', trailer.rows[0].c, `(${(trailer.rows[0].c/total.rows[0].c*100).toFixed(1)}%)`);
  
  // SEO
  const seo = await turso.execute('SELECT COUNT(*) as c FROM movies WHERE seo_title_ar IS NOT NULL');
  console.log('🔍 أفلام مع SEO:', seo.rows[0].c, `(${(seo.rows[0].c/total.rows[0].c*100).toFixed(1)}%)`);
  
  // عينة عشوائية
  console.log('\n\n📋 عينة عشوائية من 5 أفلام:\n');
  const sample = await turso.execute('SELECT id, title_en, title_ar, poster_path, backdrop_path, vote_average, genres_json, cast_json FROM movies ORDER BY RANDOM() LIMIT 5');
  
  sample.rows.forEach((m, i) => {
    console.log(`${i+1}. ${m.title_ar} (${m.title_en})`);
    console.log(`   ID: ${m.id} | التقييم: ${m.vote_average}`);
    console.log(`   Poster: ${m.poster_path ? '✅' : '❌'} | Backdrop: ${m.backdrop_path ? '✅' : '❌'}`);
    
    if (m.genres_json) {
      const g = JSON.parse(m.genres_json);
      console.log(`   الأنواع (${g.length}): ${g.map(x => x.name_ar).join(', ')}`);
    } else {
      console.log(`   الأنواع: ❌`);
    }
    
    if (m.cast_json) {
      const c = JSON.parse(m.cast_json);
      console.log(`   الممثلين (${c.length}): ${c.slice(0,3).map(x => x.name_ar).join(', ')}...`);
    } else {
      console.log(`   الممثلين: ❌`);
    }
    console.log('');
  });
  
  console.log('✅ تم الفحص!');
}

main().catch(console.error);
