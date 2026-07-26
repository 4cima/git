# 4cima Cloudflare Worker

Worker API للتعامل مع قاعدة بيانات Turso وتقديم البيانات للموقع.

## 📦 التثبيت

```bash
cd worker
npm install
```

## ⚙️ الإعداد

1. أنشئ ملف `.dev.vars` في مجلد `worker/`:

```env
TURSO_DATABASE_URL=your_turso_url
TURSO_AUTH_TOKEN=your_turso_token
```

2. حدّث `wrangler.toml` بمعلومات قاعدة البيانات

## 🚀 التشغيل

### Development
```bash
npm run dev
```

### Production
```bash
npm run deploy
```

## 📡 API Endpoints

### Home
- `GET /api/home` - بيانات الصفحة الرئيسية (trending, top rated, recent)

### Movies
- `GET /api/movies?page=1&genre=action&year=2024` - قائمة الأفلام
- `GET /api/movies/{slug}` - تفاصيل فيلم

### Series
- `GET /api/tv?page=1` - قائمة المسلسلات
- `GET /api/tv/{slug}` - تفاصيل مسلسل (مع المواسم والحلقات)

### Search
- `GET /api/search?q=query&type=all` - بحث (type: all, movie, series)

### Genres
- `GET /api/genres` - قائمة الأنواع

## 🔧 Features

- ✅ CORS enabled
- ✅ TypeScript
- ✅ Turso/LibSQL integration
- ✅ Fast edge computing
- ✅ Automatic caching
- ✅ Seasons & Episodes support
- ✅ Cast & Genres relations
