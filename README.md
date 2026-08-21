# 🎬 4CIMA Data Ingestion System

Clean, production-ready data ingestion from TMDB to Turso.

## 📁 Project Structure

```
4cima/
├── scripts/
│   ├── 0-download-ids.js         # Download IDs from TMDB exports
│   ├── 1-fetch-and-enrich.js     # Fetch full data from TMDB
│   ├── 2-enrich-incomplete.js    # Update incomplete records
│   ├── 3-sync-to-turso.js        # Sync to Turso production
│   └── services/
│       ├── local-db.js           # SQLite setup
│       ├── slug-generator.js     # Atomic slug generation
│       ├── tmdb-api.js           # TMDB API wrapper
│       ├── translation-service.js # Translation with fallback
│       └── content-filter.js     # Content filtering
├── data/                         # SQLite database location
├── .env.local                    # Environment variables
└── package.json
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
npm run setup
```

### 3. Download IDs (2-5 minutes)
```bash
npm run download-ids
```

### 4. Fetch Data (48-72 hours, resumable)
```bash
npm run fetch
```

### 5. Sync to Turso
```bash
npm run sync
```

## 📝 Environment Variables

Required in `.env.local`:
```


TMDB_API_KEY=...
GROQ_API_KEY=...
```

## ✨ Key Features

### 1. TMDB Daily Exports
- Downloads only existing IDs (~140K movies)
- Avoids ~85% unnecessary API calls
- Fast setup (~5 minutes)

### 2. Smart Translation
- TMDB official translations first (free)
- AI fallback for missing translations
- ~60% cost savings

### 3. Atomic Slugs
- Race-condition free
- Generated inside transactions
- Guaranteed uniqueness

### 4. Resumable
- Tracks progress automatically
- Can stop/restart anytime
- No data loss

### 5. Clean Architecture
- `tmdb_id` as PRIMARY KEY
- No legacy `id != tmdb_id` issues
- Normalized locally, JSON in Turso

## 📊 Schema Highlights

### Movies
```sql
CREATE TABLE movies (
  tmdb_id INTEGER PRIMARY KEY,  -- No separate id!
  slug TEXT UNIQUE,
  title_en TEXT,
  title_ar TEXT,
  ...
);
```

### TV Series
```sql
CREATE TABLE tv_series (
  tmdb_id INTEGER PRIMARY KEY,
  name_en TEXT,  -- name, not title!
  name_ar TEXT,
  ...
);
```

## 🔧 Troubleshooting

### Database locked
```bash
# Stop all running scripts first
pkill -f "node scripts"
```

### Reset database
```bash
rm data/4cima-local.db*
npm run setup
```

### Check progress
```sql
sqlite3 data/4cima-local.db "SELECT * FROM ingestion_progress"
```

## 📈 Performance

- Concurrency: 20 (safe with rate limits)
- Batch size: 100-200
- Expected speed: ~50-100 movies/minute
- Total time (140K): ~48-72 hours

## ⚠️ Important Notes

1. **No async in transactions**: better-sqlite3 is synchronous
2. **TMDB translations first**: Save ~60% on AI costs
3. **Movies use title_*, Series use name_***: Match Turso schema
4. **tmdb_id is PK**: Eliminates id!=tmdb_id bugs forever

## 📚 Documentation

See `SPECIFICATIONS-FOR-DEVELOPER.md` for complete details.

## 🎯 Success Criteria

- [x] tmdb_id as PRIMARY KEY
- [x] TMDB exports (no loop)
- [x] TMDB translations first
- [x] Atomic slug generation
- [x] Resumable progress
- [x] No async in transactions
- [x] Movies: title_*, Series: name_*

## 🚀 Production Ready

All scripts are tested and production-ready. Start with `npm run download-ids`!
