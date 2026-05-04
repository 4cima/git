const Database = require('better-sqlite3');

let previousData = null;

function checkProgress() {
  const db = new Database('./data/4cima-local.db', { readonly: true });
  
  const moviesNotFetched = db.prepare(`
    SELECT COUNT(*) as count FROM movies
    WHERE overview_en IS NULL AND is_filtered = 0
  `).get().count;
  
  const moviesFetched = db.prepare(`
    SELECT COUNT(*) as count FROM movies
    WHERE overview_en IS NOT NULL
  `).get().count;
  
  const moviesComplete = db.prepare(`
    SELECT COUNT(*) as count FROM movies
    WHERE is_complete = 1 AND is_filtered = 0
  `).get().count;
  
  const seriesNotFetched = db.prepare(`
    SELECT COUNT(*) as count FROM tv_series
    WHERE overview_en IS NULL AND is_filtered = 0
  `).get().count;
  
  const seriesFetched = db.prepare(`
    SELECT COUNT(*) as count FROM tv_series
    WHERE overview_en IS NOT NULL
  `).get().count;
  
  const seriesComplete = db.prepare(`
    SELECT COUNT(*) as count FROM tv_series
    WHERE is_complete = 1 AND is_filtered = 0
  `).get().count;
  
  db.close();
  
  const currentData = {
    moviesNotFetched,
    moviesFetched,
    moviesComplete,
    seriesNotFetched,
    seriesFetched,
    seriesComplete
  };
  
  const timestamp = new Date().toLocaleTimeString('ar-SA');
  console.log(`\n[${timestamp}] 📊 فحص التقدم:`);
  console.log('─'.repeat(80));
  
  if (previousData) {
    const moviesFetchedDiff = currentData.moviesFetched - previousData.moviesFetched;
    const moviesCompleteDiff = currentData.moviesComplete - previousData.moviesComplete;
    const moviesNotFetchedDiff = currentData.moviesNotFetched - previousData.moviesNotFetched;
    
    const seriesFetchedDiff = currentData.seriesFetched - previousData.seriesFetched;
    const seriesCompleteDiff = currentData.seriesComplete - previousData.seriesComplete;
    const seriesNotFetchedDiff = currentData.seriesNotFetched - previousData.seriesNotFetched;
    
    console.log('🎬 الأفلام:');
    console.log(`   لم يُسحب: ${currentData.moviesNotFetched.toLocaleString()} (${moviesNotFetchedDiff >= 0 ? '+' : ''}${moviesNotFetchedDiff})`);
    console.log(`   تم السحب: ${currentData.moviesFetched.toLocaleString()} (${moviesFetchedDiff >= 0 ? '+' : ''}${moviesFetchedDiff})`);
    console.log(`   مكتمل: ${currentData.moviesComplete.toLocaleString()} (${moviesCompleteDiff >= 0 ? '+' : ''}${moviesCompleteDiff})`);
    
    console.log('\n📺 المسلسلات:');
    console.log(`   لم يُسحب: ${currentData.seriesNotFetched.toLocaleString()} (${seriesNotFetchedDiff >= 0 ? '+' : ''}${seriesNotFetchedDiff})`);
    console.log(`   تم السحب: ${currentData.seriesFetched.toLocaleString()} (${seriesFetchedDiff >= 0 ? '+' : ''}${seriesFetchedDiff})`);
    console.log(`   مكتمل: ${currentData.seriesComplete.toLocaleString()} (${seriesCompleteDiff >= 0 ? '+' : ''}${seriesCompleteDiff})`);
    
    // تحليل النشاط
    const totalActivity = Math.abs(moviesFetchedDiff) + Math.abs(seriesFetchedDiff) + 
                         Math.abs(moviesCompleteDiff) + Math.abs(seriesCompleteDiff);
    
    if (totalActivity > 0) {
      console.log('\n✅ السحب يعمل بنشاط!');
    } else {
      console.log('\n⚠️  لا يوجد تغيير - قد يكون السحب بطيئاً أو متوقفاً');
    }
  } else {
    console.log('🎬 الأفلام:');
    console.log(`   لم يُسحب: ${currentData.moviesNotFetched.toLocaleString()}`);
    console.log(`   تم السحب: ${currentData.moviesFetched.toLocaleString()}`);
    console.log(`   مكتمل: ${currentData.moviesComplete.toLocaleString()}`);
    
    console.log('\n📺 المسلسلات:');
    console.log(`   لم يُسحب: ${currentData.seriesNotFetched.toLocaleString()}`);
    console.log(`   تم السحب: ${currentData.seriesFetched.toLocaleString()}`);
    console.log(`   مكتمل: ${currentData.seriesComplete.toLocaleString()}`);
    
    console.log('\n⏳ انتظار 30 ثانية للفحص التالي...');
  }
  
  previousData = currentData;
}

console.log('🔍 بدء مراقبة التقدم (كل 30 ثانية)');
console.log('⌨️  اضغط Ctrl+C للإيقاف\n');
console.log('═'.repeat(80));

checkProgress();
setInterval(checkProgress, 30000);
