require('dotenv').config({ path: '.env.local' });
const db = require('./scripts/services/local-db');

const REFRESH_INTERVAL = 10000; // 10 ثوانٍ

let lastMovieCount = 0;
let lastCheck = Date.now();

function displayStats() {
  const { movieStats } = getStats();
  
  // حساب السرعة
  const now = Date.now();
  const elapsed = (now - lastCheck) / 1000 / 60; // minutes
  const movieDelta = movieStats.complete - lastMovieCount;
  const movieRate = elapsed > 0 ? Math.round(movieDelta / elapsed) : 0;
  
  lastMovieCount = movieStats.complete;
  lastCheck = now;
  
  const moviesRemaining = movieStats.total - movieStats.has_data - movieStats.filtered;
  const movieETA = movieRate > 0 ? Math.round(moviesRemaining / movieRate) : 0;
  const etaHours = Math.floor(movieETA / 60);
  const etaMins = movieETA % 60;
  
  const time = new Date().toLocaleTimeString('ar-EG');
  const completePercent = (movieStats.complete/movieStats.total*100).toFixed(2);
  
  console.log(
    `[${time}] ` +
    `🎬 مكتمل: ${movieStats.complete.toLocaleString()} (${completePercent}%) | ` +
    `⚡ ${movieRate}/دقيقة | ` +
    `⏱️ ETA: ${etaHours}س ${etaMins}د | ` +
    `📊 المتبقي: ${moviesRemaining.toLocaleString()}`
  );
}

function getStats() {
  const movieStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN is_complete = 1 THEN 1 END) as complete,
      COUNT(CASE WHEN is_filtered = 1 THEN 1 END) as filtered,
      COUNT(CASE WHEN overview_en IS NOT NULL THEN 1 END) as has_data
    FROM movies
  `).get();
  
  return { movieStats };
}

console.log('🚀 بدء مراقبة السحب (تحديث كل 10 ثوانٍ)...\n');
console.log('═'.repeat(100));

// العرض الأولي
displayStats();

// تحديث دوري
setInterval(displayStats, REFRESH_INTERVAL);
