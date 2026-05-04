# 🚀 وصول سريع - المسارات والملفات المهمة

**⭐ ابدأ من هنا دائماً!**

---

## 📍 المسارات الأساسية

### النسخ الاحتياطية:
```
BACKUP/
├── scripts/
│   ├── INGEST-MOVIES-LOGIC.js.backup          ← سحب الأفلام
│   ├── INGEST-SERIES-LOGIC.js.backup          ← سحب المسلسلات
│   ├── sync-to-turso-optimized.js.backup      ← مزامنة محسّنة
│   ├── sync-to-turso-ultra-fast.js.backup     ← مزامنة سريعة
│   └── check-turso-data.js.backup             ← فحص Turso
│
├── sync-remaining-works.js.backup             ← مزامنة الأعمال المتبقية
├── complete-missing-data.js.backup            ← إكمال البيانات الناقصة
└── complete-all-missing-data.js.backup        ← إكمال جميع البيانات
```

### الملفات الأصلية (الحالية):
```
scripts/
├── INGEST-MOVIES-LOGIC.js                     ← سحب الأفلام (الأصلي)
├── INGEST-SERIES-LOGIC.js                     ← سحب المسلسلات (الأصلي)
├── sync-to-turso-optimized.js                 ← مزامنة محسّنة (الأصلي)
├── sync-to-turso-ultra-fast.js                ← مزامنة سريعة (الأصلي)
└── check-turso-data.js                        ← فحص Turso (الأصلي)

sync-remaining-works.js                        ← مزامنة الأعمال المتبقية (الأصلي)
complete-missing-data.js                       ← إكمال البيانات الناقصة (الأصلي)
complete-all-missing-data.js                   ← إكمال جميع البيانات (الأصلي)
```

---

## 📚 ملفات التوثيق والمرجعية

### في مجلد BACKUP:
```
BACKUP/
├── README.md                    ← 📖 دليل سريع (ابدأ من هنا)
├── INDEX.md                     ← 📑 فهرس شامل (ابحث عن اسكريبت)
├── SCRIPTS-DETAILS.md           ← 📋 تفاصيل كل اسكريبت (فهم الاسكريبت)
├── PROBLEMS-IDENTIFIED.md       ← 🚨 المشاكل والحلول (إصلاح الأخطاء)
└── RESTORATION-GUIDE.md         ← 🔄 دليل الاستعادة (استعادة الملفات)
```

### في الجذر:
```
BACKUP-SCRIPTS-REFERENCE.md      ← 📖 مرجعية سريعة (ملخص سريع)
QUICK-ACCESS.md                  ← 🚀 هذا الملف (المسارات المهمة)
```

---

## 🎯 ماذا تفعل في كل حالة؟

### ❓ "أريد استعادة اسكريبت"
```
1. اقرأ: BACKUP/RESTORATION-GUIDE.md
2. استخدم الأمر:
   cp BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup scripts/INGEST-MOVIES-LOGIC.js
```

### ❓ "أريد فهم اسكريبت معين"
```
1. اقرأ: BACKUP/SCRIPTS-DETAILS.md
2. ابحث عن اسم الاسكريبت
3. اقرأ التفاصيل الكاملة
```

### ❓ "أريد معرفة المشاكل"
```
1. اقرأ: BACKUP/PROBLEMS-IDENTIFIED.md
2. ابحث عن المشكلة
3. اقرأ الحل المقترح
```

### ❓ "أريد البحث عن اسكريبت"
```
1. اقرأ: BACKUP/INDEX.md
2. استخدم جدول البحث السريع
3. اعثر على المسار الصحيح
```

### ❓ "أريد مقارنة النسختين"
```
1. اقرأ: BACKUP/RESTORATION-GUIDE.md → قسم "مقارنة النسخ"
2. استخدم الأمر:
   diff BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup scripts/INGEST-MOVIES-LOGIC.js
```

---

## 🔗 الروابط السريعة

### الاسكريبتات الرئيسية:

| الاسكريبت | المسار الأصلي | المسار الاحتياطي | الوظيفة |
|----------|-------------|-----------------|--------|
| INGEST-MOVIES | `scripts/INGEST-MOVIES-LOGIC.js` | `BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup` | سحب الأفلام |
| INGEST-SERIES | `scripts/INGEST-SERIES-LOGIC.js` | `BACKUP/scripts/INGEST-SERIES-LOGIC.js.backup` | سحب المسلسلات |
| sync-optimized | `scripts/sync-to-turso-optimized.js` | `BACKUP/scripts/sync-to-turso-optimized.js.backup` | مزامنة محسّنة |
| sync-ultra-fast | `scripts/sync-to-turso-ultra-fast.js` | `BACKUP/scripts/sync-to-turso-ultra-fast.js.backup` | مزامنة سريعة |
| sync-remaining | `sync-remaining-works.js` | `BACKUP/sync-remaining-works.js.backup` | مزامنة الأعمال المتبقية |
| check-turso | `scripts/check-turso-data.js` | `BACKUP/scripts/check-turso-data.js.backup` | فحص Turso |
| complete-missing | `complete-missing-data.js` | `BACKUP/complete-missing-data.js.backup` | إكمال البيانات الناقصة |
| complete-all | `complete-all-missing-data.js` | `BACKUP/complete-all-missing-data.js.backup` | إكمال جميع البيانات |

---

## 💾 أوامر الاستعادة السريعة

### استعادة اسكريبت واحد:
```bash
# سحب الأفلام
cp BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup scripts/INGEST-MOVIES-LOGIC.js

# سحب المسلسلات
cp BACKUP/scripts/INGEST-SERIES-LOGIC.js.backup scripts/INGEST-SERIES-LOGIC.js

# مزامنة محسّنة
cp BACKUP/scripts/sync-to-turso-optimized.js.backup scripts/sync-to-turso-optimized.js

# مزامنة سريعة
cp BACKUP/scripts/sync-to-turso-ultra-fast.js.backup scripts/sync-to-turso-ultra-fast.js

# مزامنة الأعمال المتبقية
cp BACKUP/sync-remaining-works.js.backup sync-remaining-works.js

# فحص Turso
cp BACKUP/scripts/check-turso-data.js.backup scripts/check-turso-data.js

# إكمال البيانات الناقصة
cp BACKUP/complete-missing-data.js.backup complete-missing-data.js

# إكمال جميع البيانات
cp BACKUP/complete-all-missing-data.js.backup complete-all-missing-data.js
```

### استعادة جميع الاسكريبتات:
```bash
# Windows PowerShell
Get-ChildItem BACKUP -Recurse -Filter "*.backup" | ForEach-Object {
    $dest = $_.FullName -replace "\.backup$", "" -replace "BACKUP\\", ""
    Copy-Item $_.FullName $dest
}

# Linux/Mac
find BACKUP -name "*.backup" -exec sh -c 'cp "$1" "${1%.backup}"' _ {} \;
```

---

## 📖 ملفات التوثيق - ماذا تقرأ؟

### للمبتدئين:
1. **QUICK-ACCESS.md** ← أنت هنا الآن
2. **BACKUP/README.md** ← دليل سريع
3. **BACKUP/INDEX.md** ← فهرس شامل

### للمتقدمين:
1. **BACKUP/SCRIPTS-DETAILS.md** ← تفاصيل تقنية
2. **BACKUP/PROBLEMS-IDENTIFIED.md** ← مشاكل وحلول
3. **BACKUP/RESTORATION-GUIDE.md** ← استعادة متقدمة

---

## ✅ قائمة التحقق

- ✅ هل حفظت المسارات؟
- ✅ هل تعرف أين تجد الاسكريبتات الأصلية؟
- ✅ هل تعرف أين تجد النسخ الاحتياطية؟
- ✅ هل تعرف كيفية الاستعادة؟
- ✅ هل تعرف أين تجد التوثيق؟

---

## 🎯 الخطوة التالية

**اختر واحداً:**

1. **أريد تعديل الاسكريبتات** → ابدأ الآن
2. **أريد فهم الاسكريبتات أولاً** → اقرأ `BACKUP/SCRIPTS-DETAILS.md`
3. **أريد معرفة المشاكل** → اقرأ `BACKUP/PROBLEMS-IDENTIFIED.md`
4. **أريد استعادة اسكريبت** → اقرأ `BACKUP/RESTORATION-GUIDE.md`

---

## 📞 ملاحظة مهمة

**هذا الملف (QUICK-ACCESS.md) يحتوي على جميع المسارات والأوامر التي تحتاجها.**

احفظه في مكان آمن وارجع إليه دائماً عندما تنسى المسارات!

---

**آخر تحديث:** 2026-05-03  
**الحالة:** ✅ جاهز للاستخدام
