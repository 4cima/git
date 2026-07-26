const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addIndexes() {
  console.log('🚀 إضافة Indexes للأداء...\n');

  const indexes = [
    // Movies indexes
    {
      name: 'idx_movies_popularity',
      sql: 'CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies(popularity DESC)',
      desc: 'فهرس الشهرة للأفلام'
    },
    {
      name: 'idx_movies_vote_avg',
      sql: 'CREATE INDEX IF NOT EXISTS idx_movies_vote_avg ON movies(vote_average DESC)',
      desc: 'فهرس التقييم للأفلام'
    },
    {
      name: 'idx_movies_release_year',
      sql: 'CREATE INDEX IF NOT EXISTS idx_movies_release_year ON movies(release_year DESC)',
      desc: 'فهرس سنة الإصدار للأفلام'
    },
    {
      name: 'idx_movies_poster',
      sql: 'CREATE INDEX IF NOT EXISTS idx_movies_poster ON movies(poster_path) WHERE poster_path IS NOT NULL',
      desc: 'فهرس البوستر للأفلام'
    },
    
    // TV Series indexes
    {
      name: 'idx_series_popularity',
      sql: 'CREATE INDEX IF NOT EXISTS idx_series_popularity ON tv_series(popularity DESC)',
      desc: 'فهرس الشهرة للمسلسلات'
    },
    {
      name: 'idx_series_vote_avg',
      sql: 'CREATE INDEX IF NOT EXISTS idx_series_vote_avg ON tv_series(vote_average DESC)',
      desc: 'فهرس التقييم للمسلسلات'
    },
    {
      name: 'idx_series_first_air_year',
      sql: 'CREATE INDEX IF NOT EXISTS idx_series_first_air_year ON tv_series(first_air_year DESC)',
      desc: 'فهرس سنة البداية للمسلسلات'
    },
    {
      name: 'idx_series_poster',
      sql: 'CREATE INDEX IF NOT EXISTS idx_series_poster ON tv_series(poster_path) WHERE poster_path IS NOT NULL',
      desc: 'فهرس البوستر للمسلسلات'
    },
    
    // Composite indexes for common queries
    {
      name: 'idx_movies_rating_popularity',
      sql: 'CREATE INDEX IF NOT EXISTS idx_movies_rating_popularity ON movies(vote_average DESC, popularity DESC)',
      desc: 'فهرس مركب للتقييم والشهرة (أفلام)'
    },
    {
      name: 'idx_series_rating_popularity',
      sql: 'CREATE INDEX IF NOT EXISTS idx_series_rating_popularity ON tv_series(vote_average DESC, popularity DESC)',
      desc: 'فهرس مركب للتقييم والشهرة (مسلسلات)'
    }
  ];

  let success = 0;
  let failed = 0;

  for (const index of indexes) {
    try {
      console.log(`⏳ إضافة: ${index.desc}...`);
      await turso.execute(index.sql);
      console.log(`✅ تم: ${index.name}\n`);
      success++;
    } catch (error) {
      console.error(`❌ فشل: ${index.name}`);
      console.error(`   الخطأ: ${error.message}\n`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 النتيجة:');
  console.log(`   ✅ نجح: ${success}`);
  console.log(`   ❌ فشل: ${failed}`);
  console.log(`   📝 الإجمالي: ${indexes.length}`);
  console.log('='.repeat(60));
}

addIndexes()
  .then(() => {
    console.log('\n✅ اكتملت العملية!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ خطأ:', error);
    process.exit(1);
  });
