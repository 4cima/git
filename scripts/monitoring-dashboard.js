// ═══════════════════════════════════════════════════════════════════
// 📊 Monitoring Dashboard
// ═══════════════════════════════════════════════════════════════════

require('dotenv').config({ path: './.env.local' })
const express = require('express')
const db = require('./services/local-db')

const app = express()
const PORT = 3001

// ═══════════════════════════════════════════════════════════════════
// API Endpoints
// ═══════════════════════════════════════════════════════════════════

// 📊 إحصائيات عامة
app.get('/api/stats', (req, res) => {
  try {
    const movies = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN overview_en IS NOT NULL THEN 1 ELSE 0 END) as fetched,
        SUM(CASE WHEN is_filtered = 1 THEN 1 ELSE 0 END) as filtered,
        SUM(CASE WHEN is_complete = 1 THEN 1 ELSE 0 END) as complete
      FROM movies
    `).get()
    
    const series = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN overview_en IS NOT NULL THEN 1 ELSE 0 END) as fetched,
        SUM(CASE WHEN is_filtered = 1 THEN 1 ELSE 0 END) as filtered,
        SUM(CASE WHEN is_complete = 1 THEN 1 ELSE 0 END) as complete
      FROM tv_series
    `).get()
    
    const progress = db.prepare(`
      SELECT * FROM ingestion_progress 
      ORDER BY last_run DESC 
      LIMIT 10
    `).all()
    
    const history = db.prepare(`
      SELECT * FROM ingestion_stats_history 
      ORDER BY timestamp DESC 
      LIMIT 20
    `).all()
    
    res.json({ 
      movies, 
      series, 
      progress,
      history,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 🎬 إحصائيات الأفلام التفصيلية
app.get('/api/movies/details', (req, res) => {
  try {
    const byYear = db.prepare(`
      SELECT 
        release_year,
        COUNT(*) as total,
        SUM(CASE WHEN overview_en IS NOT NULL THEN 1 ELSE 0 END) as fetched
      FROM movies
      WHERE release_year IS NOT NULL
      GROUP BY release_year
      ORDER BY release_year DESC
      LIMIT 10
    `).all()
    
    const byGenre = db.prepare(`
      SELECT 
        g.name_en as genre,
        COUNT(*) as total
      FROM content_genres cg
      JOIN genres g ON cg.genre_id = g.id
      WHERE cg.content_type = 'movie'
      GROUP BY g.name_en
      ORDER BY total DESC
      LIMIT 10
    `).all()
    
    res.json({ byYear, byGenre })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 📺 إحصائيات المسلسلات التفصيلية
app.get('/api/series/details', (req, res) => {
  try {
    const byYear = db.prepare(`
      SELECT 
        first_air_year,
        COUNT(*) as total,
        SUM(CASE WHEN overview_en IS NOT NULL THEN 1 ELSE 0 END) as fetched
      FROM tv_series
      WHERE first_air_year IS NOT NULL
      GROUP BY first_air_year
      ORDER BY first_air_year DESC
      LIMIT 10
    `).all()
    
    const seasons = db.prepare(`
      SELECT COUNT(*) as total FROM tv_seasons
    `).get()
    
    const episodes = db.prepare(`
      SELECT COUNT(*) as total FROM tv_episodes
    `).get()
    
    res.json({ byYear, seasons, episodes })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ═══════════════════════════════════════════════════════════════════
// HTML Dashboard
// ═══════════════════════════════════════════════════════════════════

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>📊 4cima Monitoring Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      padding: 20px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    h1 {
      text-align: center;
      color: white;
      margin-bottom: 30px;
      font-size: 2.5em;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .card {
      background: white;
      border-radius: 15px;
      padding: 25px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      transition: transform 0.3s ease;
    }
    
    .card:hover {
      transform: translateY(-5px);
    }
    
    .card h2 {
      color: #667eea;
      margin-bottom: 15px;
      font-size: 1.5em;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    
    .stat {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    
    .stat:last-child {
      border-bottom: none;
    }
    
    .stat-label {
      font-weight: 600;
      color: #666;
    }
    
    .stat-value {
      font-size: 1.3em;
      font-weight: bold;
      color: #667eea;
    }
    
    .progress-bar {
      width: 100%;
      height: 25px;
      background: #eee;
      border-radius: 12px;
      overflow: hidden;
      margin: 10px 0;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.5s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 0.9em;
    }
    
    .status {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: bold;
    }
    
    .status.running {
      background: #4ade80;
      color: white;
    }
    
    .status.idle {
      background: #fbbf24;
      color: white;
    }
    
    .status.done {
      background: #60a5fa;
      color: white;
    }
    
    .timestamp {
      text-align: center;
      color: white;
      margin-top: 20px;
      font-size: 0.9em;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .loading {
      animation: pulse 1.5s ease-in-out infinite;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 4cima Monitoring Dashboard</h1>
    
    <div class="grid">
      <!-- الأفلام -->
      <div class="card">
        <h2>🎬 الأفلام</h2>
        <div class="stat">
          <span class="stat-label">إجمالي:</span>
          <span class="stat-value" id="movies-total">-</span>
        </div>
        <div class="stat">
          <span class="stat-label">مسحوب:</span>
          <span class="stat-value" id="movies-fetched">-</span>
        </div>
        <div class="stat">
          <span class="stat-label">مفلتر:</span>
          <span class="stat-value" id="movies-filtered">-</span>
        </div>
        <div class="stat">
          <span class="stat-label">مكتمل:</span>
          <span class="stat-value" id="movies-complete">-</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" id="movies-progress" style="width: 0%">0%</div>
        </div>
      </div>
      
      <!-- المسلسلات -->
      <div class="card">
        <h2>📺 المسلسلات</h2>
        <div class="stat">
          <span class="stat-label">إجمالي:</span>
          <span class="stat-value" id="series-total">-</span>
        </div>
        <div class="stat">
          <span class="stat-label">مسحوب:</span>
          <span class="stat-value" id="series-fetched">-</span>
        </div>
        <div class="stat">
          <span class="stat-label">مفلتر:</span>
          <span class="stat-value" id="series-filtered">-</span>
        </div>
        <div class="stat">
          <span class="stat-label">مكتمل:</span>
          <span class="stat-value" id="series-complete">-</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" id="series-progress" style="width: 0%">0%</div>
        </div>
      </div>
      
      <!-- التقدم -->
      <div class="card">
        <h2>⏳ التقدم الحالي</h2>
        <div id="progress-list">
          <p class="loading">جاري التحميل...</p>
        </div>
      </div>
    </div>
    
    <div class="timestamp">
      آخر تحديث: <span id="last-update">-</span>
    </div>
  </div>
  
  <script>
    async function updateStats() {
      try {
        const res = await fetch('/api/stats')
        const data = await res.json()
        
        // الأفلام
        document.getElementById('movies-total').textContent = data.movies.total.toLocaleString()
        document.getElementById('movies-fetched').textContent = data.movies.fetched.toLocaleString()
        document.getElementById('movies-filtered').textContent = data.movies.filtered.toLocaleString()
        document.getElementById('movies-complete').textContent = data.movies.complete.toLocaleString()
        
        const moviesProgress = ((data.movies.fetched / data.movies.total) * 100).toFixed(1)
        document.getElementById('movies-progress').style.width = moviesProgress + '%'
        document.getElementById('movies-progress').textContent = moviesProgress + '%'
        
        // المسلسلات
        document.getElementById('series-total').textContent = data.series.total.toLocaleString()
        document.getElementById('series-fetched').textContent = data.series.fetched.toLocaleString()
        document.getElementById('series-filtered').textContent = data.series.filtered.toLocaleString()
        document.getElementById('series-complete').textContent = data.series.complete.toLocaleString()
        
        const seriesProgress = ((data.series.fetched / data.series.total) * 100).toFixed(1)
        document.getElementById('series-progress').style.width = seriesProgress + '%'
        document.getElementById('series-progress').textContent = seriesProgress + '%'
        
        // التقدم
        const progressList = document.getElementById('progress-list')
        if (data.progress.length > 0) {
          progressList.innerHTML = data.progress.map(p => \`
            <div class="stat">
              <span class="stat-label">\${p.script_name}:</span>
              <span class="status \${p.status}">\${p.status}</span>
            </div>
            <div class="stat">
              <span class="stat-label">معالج:</span>
              <span class="stat-value">\${(p.total_fetched || 0).toLocaleString()}</span>
            </div>
            <div class="stat">
              <span class="stat-label">أخطاء:</span>
              <span class="stat-value">\${(p.total_errors || 0).toLocaleString()}</span>
            </div>
          \`).join('<hr style="margin: 15px 0; border: none; border-top: 1px solid #eee;">')
        } else {
          progressList.innerHTML = '<p>لا توجد بيانات</p>'
        }
        
        // الوقت
        document.getElementById('last-update').textContent = new Date(data.timestamp).toLocaleString('ar-EG')
        
      } catch (error) {
        console.error('خطأ في تحديث البيانات:', error)
      }
    }
    
    // تحديث كل 5 ثواني
    setInterval(updateStats, 5000)
    updateStats()
  </script>
</body>
</html>
  `)
})

// ═══════════════════════════════════════════════════════════════════
// Start Server
// ═══════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║              📊 Monitoring Dashboard Started                      ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  🌐 Dashboard: http://localhost:${PORT}                            ║
║  📊 API Stats: http://localhost:${PORT}/api/stats                  ║
║                                                                   ║
║  ✅ تحديث تلقائي كل 5 ثواني                                      ║
║  ✅ إحصائيات مباشرة للأفلام والمسلسلات                           ║
║  ✅ مراقبة التقدم والأخطاء                                        ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
  `)
})
