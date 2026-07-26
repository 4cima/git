# 🔄 دليل الاستعادة والمقارنة

**تاريخ الإنشاء:** 2026-05-03  
**الإصدار:** 1.0  
**الحالة:** ✅ دليل شامل

---

## 🚀 الاستعادة السريعة

### استعادة اسكريبت واحد

#### Windows PowerShell:
```powershell
# استعادة اسكريبت الأفلام
Copy-Item "BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup" "scripts/INGEST-MOVIES-LOGIC.js"

# استعادة اسكريبت المسلسلات
Copy-Item "BACKUP/scripts/INGEST-SERIES-LOGIC.js.backup" "scripts/INGEST-SERIES-LOGIC.js"

# استعادة اسكريبت المزامنة
Copy-Item "BACKUP/scripts/sync-to-turso-optimized.js.backup" "scripts/sync-to-turso-optimized.js"
```

#### Linux/Mac:
```bash
# استعادة اسكريبت الأفلام
cp BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup scripts/INGEST-MOVIES-LOGIC.js

# استعادة اسكريبت المسلسلات
cp BACKUP/scripts/INGEST-SERIES-LOGIC.js.backup scripts/INGEST-SERIES-LOGIC.js

# استعادة اسكريبت المزامنة
cp BACKUP/scripts/sync-to-turso-optimized.js.backup scripts/sync-to-turso-optimized.js
```

---

### استعادة جميع الاسكريبتات

#### Windows PowerShell:
```powershell
# استعادة جميع الاسكريبتات
Get-ChildItem BACKUP -Recurse -Filter "*.backup" | ForEach-Object {
    $dest = $_.FullName -replace "\.backup$", "" -replace "BACKUP\\", ""
    Copy-Item $_.FullName $dest
    Write-Host "✅ تم استعادة: $dest"
}
```

#### Linux/Mac:
```bash
# استعادة جميع الاسكريبتات
find BACKUP -name "*.backup" -exec sh -c '
    dest="${1%.backup}"
    dest="${dest#BACKUP/}"
    cp "$1" "$dest"
    echo "✅ تم استعادة: $dest"
' _ {} \;
```

---

## ✅ التحقق من الاستعادة

### 1. التحقق من وجود الملف:
```bash
# Windows
Test-Path "scripts/INGEST-MOVIES-LOGIC.js"

# Linux/Mac
test -f scripts/INGEST-MOVIES-LOGIC.js && echo "✅ الملف موجود"
```

### 2. التحقق من حجم الملف:
```bash
# Windows
(Get-Item "scripts/INGEST-MOVIES-LOGIC.js").Length

# Linux/Mac
ls -lh scripts/INGEST-MOVIES-LOGIC.js
```

### 3. التحقق من محتوى الملف:
```bash
# Windows
Get-Content "scripts/INGEST-MOVIES-LOGIC.js" | Select-Object -First 10

# Linux/Mac
head -10 scripts/INGEST-MOVIES-LOGIC.js
```

### 4. التحقق من أن الاسكريبت يعمل:
```bash
# اختبار الاسكريبت
node scripts/INGEST-MOVIES-LOGIC.js --help

# أو
node -c scripts/INGEST-MOVIES-LOGIC.js  # فقط تحقق من الصيغة
```

---

## 🔍 مقارنة النسخ

### استخدام VS Code:

1. **افتح VS Code**
2. **اضغط Ctrl+Shift+P** (أو Cmd+Shift+P على Mac)
3. **اكتب:** `Compare Files`
4. **اختر الملف الأول:** `BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup`
5. **اختر الملف الثاني:** `scripts/INGEST-MOVIES-LOGIC.js`
6. **سيظهر الفرق بين النسختين**

### استخدام سطر الأوامر:

#### Windows:
```powershell
# استخدام fc (File Compare)
fc /L "BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup" "scripts/INGEST-MOVIES-LOGIC.js"

# أو استخدام diff (إذا كان مثبتاً)
diff "BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup" "scripts/INGEST-MOVIES-LOGIC.js"
```

#### Linux/Mac:
```bash
# استخدام diff
diff BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup scripts/INGEST-MOVIES-LOGIC.js

# أو استخدام vimdiff
vimdiff BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup scripts/INGEST-MOVIES-LOGIC.js

# أو استخدام meld (إذا كان مثبتاً)
meld BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup scripts/INGEST-MOVIES-LOGIC.js
```

---

## 📋 خطوات الاستعادة الكاملة

### السيناريو 1: اسكريبت معطوب تماماً

```bash
# 1. استعادة النسخة الأصلية
cp BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup scripts/INGEST-MOVIES-LOGIC.js

# 2. تحقق من أن الملف موجود
ls -l scripts/INGEST-MOVIES-LOGIC.js

# 3. تحقق من أن الاسكريبت يعمل
node -c scripts/INGEST-MOVIES-LOGIC.js

# 4. اختبر الاسكريبت
node scripts/INGEST-MOVIES-LOGIC.js --help

# 5. إذا كان يعمل، ابدأ الاسكريبت
node scripts/INGEST-MOVIES-LOGIC.js
```

### السيناريو 2: اسكريبت يعمل لكن ببطء

```bash
# 1. قارن النسختين
diff BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup scripts/INGEST-MOVIES-LOGIC.js

# 2. ابحث عن التغييرات
grep -n "TODO\|FIXME\|XXX" scripts/INGEST-MOVIES-LOGIC.js

# 3. إذا كانت التغييرات سيئة، استعد النسخة الأصلية
cp BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup scripts/INGEST-MOVIES-LOGIC.js

# 4. اختبر الاسكريبت
node scripts/INGEST-MOVIES-LOGIC.js
```

### السيناريو 3: اسكريبت يعطي نتائج خاطئة

```bash
# 1. قارن النسختين بالتفصيل
diff -u BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup scripts/INGEST-MOVIES-LOGIC.js > changes.diff

# 2. اقرأ الفروقات
cat changes.diff

# 3. إذا كانت التغييرات خاطئة، استعد النسخة الأصلية
cp BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup scripts/INGEST-MOVIES-LOGIC.js

# 4. اختبر الاسكريبت
node scripts/INGEST-MOVIES-LOGIC.js
```

---

## 🔄 الرجوع للنسخة المعدلة

### إذا أردت العودة للنسخة المعدلة بعد الاستعادة:

```bash
# 1. احفظ النسخة الأصلية مرة أخرى
cp scripts/INGEST-MOVIES-LOGIC.js BACKUP/scripts/INGEST-MOVIES-LOGIC.js.original

# 2. استعد النسخة المعدلة من Git (إذا كانت موجودة)
git checkout scripts/INGEST-MOVIES-LOGIC.js

# 3. أو استعد من نسخة احتياطية أخرى
cp BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup.v2 scripts/INGEST-MOVIES-LOGIC.js
```

---

## 📊 جدول الاستعادة السريعة

| الاسكريبت | الأمر |
|----------|------|
| INGEST-MOVIES | `cp BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup scripts/INGEST-MOVIES-LOGIC.js` |
| INGEST-SERIES | `cp BACKUP/scripts/INGEST-SERIES-LOGIC.js.backup scripts/INGEST-SERIES-LOGIC.js` |
| sync-optimized | `cp BACKUP/scripts/sync-to-turso-optimized.js.backup scripts/sync-to-turso-optimized.js` |
| sync-ultra-fast | `cp BACKUP/scripts/sync-to-turso-ultra-fast.js.backup scripts/sync-to-turso-ultra-fast.js` |
| sync-remaining | `cp BACKUP/sync-remaining-works.js.backup sync-remaining-works.js` |
| check-turso | `cp BACKUP/scripts/check-turso-data.js.backup scripts/check-turso-data.js` |
| complete-missing | `cp BACKUP/complete-missing-data.js.backup complete-missing-data.js` |
| complete-all | `cp BACKUP/complete-all-missing-data.js.backup complete-all-missing-data.js` |

---

## 🛡️ نصائح الأمان

### 1. قبل الاستعادة:
```bash
# احفظ نسخة من الملف الحالي
cp scripts/INGEST-MOVIES-LOGIC.js scripts/INGEST-MOVIES-LOGIC.js.current
```

### 2. بعد الاستعادة:
```bash
# تحقق من أن الملف صحيح
node -c scripts/INGEST-MOVIES-LOGIC.js

# اختبر الاسكريبت
node scripts/INGEST-MOVIES-LOGIC.js --help
```

### 3. احتفظ بنسخ متعددة:
```bash
# احفظ نسخة من كل إصدار
cp scripts/INGEST-MOVIES-LOGIC.js scripts/INGEST-MOVIES-LOGIC.js.v1
cp scripts/INGEST-MOVIES-LOGIC.js scripts/INGEST-MOVIES-LOGIC.js.v2
```

---

## 🔗 الملفات المرجعية

- **BACKUP-SCRIPTS-REFERENCE.md** - قائمة الاسكريبتات المحفوظة
- **SCRIPTS-DETAILS.md** - تفاصيل كل اسكريبت
- **PROBLEMS-IDENTIFIED.md** - المشاكل المكتشفة
- **INDEX.md** - فهرس شامل

---

## ❓ الأسئلة الشائعة

### س: كيف أعرف أن الاستعادة نجحت؟
**ج:** تحقق من:
1. وجود الملف: `ls -l scripts/INGEST-MOVIES-LOGIC.js`
2. حجم الملف: يجب أن يكون ~30KB
3. محتوى الملف: يجب أن يبدأ بـ `// ============================================`

### س: ماذا لو كان الملف الأصلي معطوباً أيضاً؟
**ج:** 
1. تحقق من النسخة الاحتياطية الأخرى
2. استخدم Git للعودة لإصدار سابق
3. اطلب مساعدة من فريق التطوير

### س: هل يمكن استعادة ملف واحد فقط؟
**ج:** نعم، استخدم الأمر:
```bash
cp BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup scripts/INGEST-MOVIES-LOGIC.js
```

### س: كيف أقارن النسختين؟
**ج:** استخدم:
```bash
diff BACKUP/scripts/INGEST-MOVIES-LOGIC.js.backup scripts/INGEST-MOVIES-LOGIC.js
```

---

**آخر تحديث:** 2026-05-03
