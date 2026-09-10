# 4cima.com

## نظرة عامة
موقع أفلام ومسلسلات عربي (RTL) - Next.js + Cloudflare Workers + D1.

## الستاك
- Next.js (App Router) + OpenNext
- Cloudflare Workers + D1
- DeepLX (Cloudflare Worker) للترجمة
- GitHub Actions (CI/CD)

## المتطلبات
- Node.js 22+
- npm
- wrangler CLI
- حساب Cloudflare

## الإعداد الأولي
1. استنسخ المستودع: `git clone https://github.com/4cima/git.git`
2. ثبّت الحزم: `npm install`
3. انسخ `.env.example` إلى `.env.local` واملأ المتغيرات:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_D1_TOKEN`
   - `TMDB_API_KEY`
4. أنشئ قاعدة بيانات محلية: `npm run setup`

## الأوامر المتاحة
- `npm run dev` — تشغيل بيئة التطوير
- `npm run build:cloudflare` — بناء Worker
- `npx wrangler deploy` — نشر يدوي
- `npm run download-ids` — جلب IDs من TMDB
- `npm run fetch` — جلب التفاصيل والإثراء
- `npm run sync` — مزامنة المحلي إلى D1
- `node scripts/backup-d1.js` — نسخ احتياطي لـ D1

## النشر (CI/CD)
- أي `git push` على فرع `cloudflare-migration` → نشر تلقائي (2-3 دقائق).
- النسخ الاحتياطي اليومي: 2 صباحاً UTC (GitHub Actions).

## الفلاتر
- فلتر السنة: ≥ 2000 فقط.
- فلتر المحتوى: `shouldRejectWork` في `scripts/services/content-filter.js`
- المحميون: قائمة `ALLOWLIST_IDS`.

## المساهمة
- فرع العمل: `cloudflare-migration`
- قبل push: `npx tsc --noEmit` + `node scripts/test-should-reject.js`

---

# 🎬 نظام جلب البيانات (Data Ingestion)

Clean, production-ready data ingestion from TMDB to Cloudflare D1.

## 📁 Project Structure

```
4cima/
├── scripts/
│   ├── 0-download-ids.js           # Download IDs from TMDB exports
│   ├── 1-fetch-and-enrich.js       # Fetch full data from TMDB
│   ├── 2-enrich-incomplete.js      # Update incomplete records
│   ├── 3-sync-to-d1.js             # Sync to Cloudflare D1 production
│   ├── 4-precompute-similar.js     # Precompute similar/recommended (by popularity)
│   ├── 5-precompute-lists.js       # Precompute static lists
│   ├── 6-precompute-genre-lists.js # Precompute genre lists
│   ├── backup-d1.js                # Daily D1 backup (gzip, keep last 7)
│   ├── backup-d1-to-r2.js          # Optional upload to Cloudflare R2
│   ├── test-should-reject.js       # Unit test for shouldRejectWork
│   └── services/
│       ├── local-db.js             # SQLite setup
│       ├── slug-generator.js       # Atomic slug generation
│       ├── tmdb-api.js             # TMDB API wrapper
│       ├── translation-service.js  # Translation with fallback
│       └── content-filter.js       # Content filtering
├── data/                           # SQLite database + backups
├── .env.example                    # Copy to .env.local
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

### 5. Sync to D1
```bash
npm run sync
```

## 📝 Environment Variables

Required in `.env.local` (see `.env.example`):
```
CLOUDFLARE_ACCOUNT_ID=834bca43d616c73db23cf95311cfe17e
CLOUDFLARE_D1_TOKEN=...   # D1:Edit
TMDB_API_KEY=...
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
- Normalized locally, JSON in D1

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
3. **Movies use title_*, Series use name_***: Match D1 schema
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
