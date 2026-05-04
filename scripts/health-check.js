// ═══════════════════════════════════════════════════════════════════
// 🏥 Health Check Endpoint
// ═══════════════════════════════════════════════════════════════════

require('dotenv').config({ path: './.env.local' })
const express = require('express')
const db = require('./services/local-db')

const app = express()
const PORT = 3002

app.get('/health', async (req, res) => {
  try {
    // 1️⃣ فحص قاعدة البيانات
    db.prepare('SELECT 1').get()
    
    // 2️⃣ فحص آخر تشغيل
    const lastRun = db.prepare(`
      SELECT * FROM ingestion_progress 
      WHERE script_name IN ('INGEST-MOVIES', 'INGEST-SERIES')
      ORDER BY last_run DESC 
      LIMIT 1
    `).get()
    
    const hoursSinceLastRun = lastRun 
      ? (Date.now() - new Date(lastRun.last_run).getTime()) / (1000 * 60 * 60)
      : null
    
    // 3️⃣ فحص TMDB API
    let tmdbHealth = 'unknown'
    try {
      const tmdbRes = await fetch(
        `https://api.themoviedb.org/3/configuration?api_key=${process.env.TMDB_API_KEY}`
      )
      tmdbHealth = tmdbRes.ok ? 'available' : 'unavailable'
    } catch {
      tmdbHealth = 'unavailable'
    }
    
    // 4️⃣ إحصائيات سريعة
    const moviesCount = db.prepare('SELECT COUNT(*) as count FROM movies WHERE overview_en IS NOT NULL').get()
    const seriesCount = db.prepare('SELECT COUNT(*) as count FROM tv_series WHERE overview_en IS NOT NULL').get()
    
    res.json({
      status: 'healthy',
      database: 'connected',
      tmdb_api: tmdbHealth,
      last_run: lastRun?.last_run,
      hours_since_last_run: hoursSinceLastRun?.toFixed(1),
      uptime_seconds: process.uptime(),
      movies_fetched: moviesCount.count,
      series_fetched: seriesCount.count,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                🏥 Health Check Started                            ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  🌐 Health Check: http://localhost:${PORT}/health                  ║
║                                                                   ║
║  ✅ فحص قاعدة البيانات                                            ║
║  ✅ فحص TMDB API                                                  ║
║  ✅ فحص آخر تشغيل                                                 ║
║  ✅ إحصائيات سريعة                                                ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
  `)
})
