---
inclusion: auto
description: "مشكلة حرجة: بيانات الممثلين غير موجودة في قاعدة البيانات"
---

# 🚨 Cast Data Missing - مشكلة حرجة

**Last Updated:** 2026-04-25  
**Priority:** CRITICAL - الممثلين لا يظهرون

---

## 📊 حالة قاعدة البيانات

### الجداول الموجودة:
- ✅ `actors` - 45,963 ممثل
- ❌ `tv_cast` - **0 صفوف** (فارغ تماماً)
- ❌ `movie_cast` - **0 صفوف** (فارغ تماماً)

---

## 🔍 البنية الفعلية

### جدول `actors`:
```
- id (INTEGER, PK)
- name (TEXT)
- name_ar (TEXT)
- biography (TEXT)
- biography_ar (TEXT)
- profile_path (TEXT)
- birthday (TEXT)
- place_of_birth (TEXT)
- popularity (REAL)
- slug (TEXT)
- created_at (TEXT)
- updated_at (TEXT)
```

### جدول `tv_cast`:
```
- id (INTEGER, PK)
- series_id (INTEGER) - FK to tv_series
- actor_id (INTEGER) - FK to actors
- character_name (TEXT)
- cast_order (INTEGER)
- created_at (TEXT)
```

### جدول `movie_cast`:
```
- id (INTEGER, PK)
- movie_id (INTEGER) - FK to movies
- actor_id (INTEGER) - FK to actors
- character_name (TEXT)
- cast_order (INTEGER)
- created_at (TEXT)
```

---

## ❌ المشكلة

**جداول الربط (`tv_cast` و `movie_cast`) فارغة تماماً!**

هذا يعني:
- لا توجد بيانات ربط بين الممثلين والمسلسلات
- لا توجد بيانات ربط بين الممثلين والأفلام
- الـ endpoints تعمل بشكل صحيح لكن ترجع `[]` لأن البيانات غير موجودة

---

## ✅ الحل المطلوب

يجب ملء جداول `tv_cast` و `movie_cast` بالبيانات من TMDB أو مصدر آخر.

**الـ endpoints الحالية:**
- `GET /api/tv/:slug/cast` - تعمل بشكل صحيح
- `GET /api/movies/:slug/cast` - تعمل بشكل صحيح

لكن ترجع بيانات فارغة لأن جداول الربط فارغة.

---

## 📝 ملاحظات

- الـ API endpoints صحيحة 100%
- الـ schema صحيح 100%
- المشكلة **حصراً** في البيانات المفقودة

---

**هذه مشكلة بيانات وليست مشكلة كود**
