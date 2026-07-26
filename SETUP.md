# 🚀 Setup Guide

## Prerequisites
- Node.js 18+ 
- npm or yarn
- `.env.local` file with required keys

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Verify .env.local
Make sure you have:
```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
TMDB_API_KEY=...
GROQ_API_KEY=...
```

### 3. Initialize Database
```bash
node scripts/services/local-db.js
```

You should see:
```
✅ Database initialized successfully!
📊 Performance optimizations:
   - WAL Mode: Enabled
   ...
```

### 4. Test TMDB API
```bash
node -e "require('dotenv').config({path:'.env.local'}); console.log('TMDB_API_KEY:', process.env.TMDB_API_KEY ? '✅ Found' : '❌ Missing')"
```

## Quick Test Run

Test with a small batch before full run:

```bash
# 1. Download IDs
node scripts/0-download-ids.js

# 2. Check database
sqlite3 data/4cima-local.db "SELECT COUNT(*) FROM movies"

# Should show ~140,000 movies

# 3. Fetch 10 movies (test)
node scripts/1-fetch-and-enrich.js &
# Wait a few minutes, then Ctrl+C
# Script is resumable - it will continue from where it stopped

# 4. Check results
sqlite3 data/4cima-local.db "SELECT tmdb_id, title_en, title_ar FROM movies WHERE is_complete = 1 LIMIT 5"
```

## Full Production Run

```bash
# 1. Download all IDs (~5 min)
npm run download-ids

# 2. Fetch all data (48-72 hours, resumable)
npm run fetch

# 3. Sync to Turso
npm run sync
```

## Monitoring Progress

```bash
# Check progress
sqlite3 data/4cima-local.db "SELECT * FROM ingestion_progress"

# Check completed count
sqlite3 data/4cima-local.db "SELECT COUNT(*) FROM movies WHERE is_complete = 1"

# Check sync status
sqlite3 data/4cima-local.db "SELECT COUNT(*) FROM movies WHERE synced_to_turso = 1"
```

## Troubleshooting

### "Database is locked"
```bash
# Kill all node processes
pkill -f node

# Or on Windows:
taskkill /F /IM node.exe
```

### "TMDB API error 401"
Check your TMDB_API_KEY in .env.local

### "Cannot find module"
```bash
npm install
```

### Start fresh
```bash
rm -rf data/*.db*
node scripts/services/local-db.js
```

## Ready!

Everything is set up. Start with:
```bash
npm run download-ids
```
