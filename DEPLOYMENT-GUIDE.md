# 🚀 دليل نشر 4cima على Cloudflare Pages

## الخطوات المطلوبة

### 1. إنشاء Repository على GitHub

```
https://github.com/new
```

- Repository name: `4cima`
- Private أو Public
- لا تختر "Initialize with README"

### 2. رفع الكود

```powershell
cd D:\4cima
git remote add origin https://github.com/iaaelsadek/4cima.git
git push -u origin main
```

### 3. ربط Cloudflare Pages

1. اذهب إلى: https://dash.cloudflare.com/
2. Pages → Create a project → Connect to Git
3. اختر repository: `4cima`

### 4. إعدادات البناء

```
Framework: Next.js
Build command: npm run build
Build output: .next
```

### 5. متغيرات البيئة

```
NEXT_PUBLIC_API_URL=https://4cima-worker.iaaelsadek.workers.dev
NEXT_PUBLIC_WORKER_URL=https://4cima-worker.iaaelsadek.workers.dev
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_key_for_build_only
```

### 6. النشر

اضغط **Save and Deploy**

### 7. ربط النطاق

Custom domains → Set up a custom domain → `4cima.com`

---

## ✅ تم التنظيف

- حذف 254 ملف غير ضروري
- حذف جميع السكريبتات التطويرية
- حذف قواعد البيانات المحلية
- حذف ملفات الاختبار والمراقبة
- الإبقاء فقط على كود الإنتاج

## 📦 ما تم الإبقاء عليه

- `src/` - كود المشروع
- `public/` - الملفات العامة
- `.kiro/steering/` - التوثيق
- ملفات الإعداد الأساسية
