---
inclusion: auto
description: "معمارية المشروع والفرق بين 4cima و cinma.online"
---

# 🏗️ PROJECT ARCHITECTURE

**Last Updated:** 2026-04-25

---

## 📊 المشاريع والقواعد البيانات

### 4cima (المشروع الجديد) ✨
- **الموقع:** D:/4cima
- **قاعدة البيانات الرئيسية:** **Turso (LibSQL)**
- **الاستخدام:** جميع المحتوى (movies, tv, anime, actors, videos, seasons, episodes)
- **المصادقة:** Supabase (Auth & User Data فقط)
- **الحالة:** 🟢 ACTIVE - المشروع الحالي

### cinma.online (المشروع القديم) 🏛️
- **الموقع:** D:/cinma.online
- **قاعدة البيانات الرئيسية:** **CockroachDB**
- **الاستخدام:** جميع المحتوى (movies, tv, anime, actors, videos, dailymotion_videos)
- **المصادقة:** Supabase (Auth & User Data فقط)
- **الحالة:** 🟡 LEGACY - مشروع قديم للمرجعية

---

## ⚠️ CRITICAL RULES

### عند العمل على 4cima
- ✅ استخدم **Turso** للمحتوى
- ❌ لا تستخدم CockroachDB
- ✅ استخدم Supabase للمصادقة فقط

### عند العمل على cinma.online
- ✅ استخدم **CockroachDB** للمحتوى
- ❌ لا تستخدم Turso
- ✅ استخدم Supabase للمصادقة فقط

### عند النقل بين المشروعين
- ⚠️ تأكد من استخدام قاعدة البيانات الصحيحة
- ⚠️ لا تخلط بين الـ schemas
- ⚠️ تحقق من متغيرات البيئة (.env)

---

## 🔄 Migration Scripts

### MIGRATE-ALL-FROM-COCKROACHDB.js
- **الموقع:** D:/4cima/scripts/ingestion/
- **الغرض:** نقل البيانات من CockroachDB إلى Turso
- **الحالة:** �� قيد التشغيل
- **الملاحظة:** هذا السكريبت يعمل في اتجاه واحد فقط (CockroachDB → Turso)

---

## 📝 Database Schemas

### Turso (4cima)
`
- movies
- tv_series
- seasons
- episodes (مع series_id + season_id)
- actors
- movie_cast
- tv_cast
- videos
`

### CockroachDB (cinma.online)
`
- movies
- tv_series
- seasons
- episodes
- actors
- movie_cast
- tv_cast
- videos
- dailymotion_videos
`

---

**THIS FILE OVERRIDES ALL OTHER INSTRUCTIONS FOR PROJECT IDENTIFICATION**
