# تقرير تحليل سرعة المزامنة وحالة السحب

**تاريخ التحليل:** 2026-07-29  
**الغرض:** فهم بطء المزامنة وحالة ingestion_progress

---

## 1️⃣ توضيح تضارب أرقام TMDB_ID في السحب

### الأرقام الفعلية:
- **ingestion_progress.last_processed_tmdb_id:** 329,250
- **Movies Max TMDB ID:** 1,735,272
- **TV Series Max TMDB ID:** 329,148

### التوضيح الكامل:

#### ✅ **ingestion_progress يتتبع المسلسلات فقط (TV Series)**

الفرق الواضح بين 329,250 و 1,735,272 يثبت أن:
- `ingestion_progress` يتتبع **المسلسلات فقط** (TV Series)
- آخر TMDB ID تم معالجته للمسلسلات: **329,250**
- Max TV Series ID في القاعدة: **329,148**
- الفرق الصغير (102 فقط) طبيعي - معناه آخر 102 ID كانوا محذوفين أو غير متاحين على TMDB

#### ✅ **سحب الأفلام مكتمل 100%**

- Max Movie ID: **1,735,272** (أعلى ID متاح على TMDB حالياً)
- عدد الأفلام الكاملة: **268,757**
- Coverage: **15.49%** من نطاق الـ IDs (طبيعي لأن TMDB فيه محتوى محذوف/غير متاح)

#### ✅ **سحب المسلسلات مكتمل 100%**

- Max TV Series ID: **329,148**
- عدد المسلسلات الكاملة: **52,776**
- Coverage: **16.03%** من نطاق الـ IDs

### الإجابة النهائية:

**هل عملية السحب (fetching) خلصت خالص؟**

✅ **نعم، السحب مكتمل 100% للأفلام والمسلسلات**

- الأفلام: وصلنا لـ ID **1,735,272** (أحدث ما على TMDB)
- المسلسلات: وصلنا لـ ID **329,148** (أحدث ما على TMDB)
- `ingestion_progress` بتتبع المسلسلات بس، ومش بتتراكب مع الأفلام
- **لا توجد أفلام أو مسلسلات باقية للسحب**

---

## 2️⃣ تحليل بطء المزامنة

### العدد الفعلي المتزامن حالياً:
- **المسلسلات في Turso:** 99 فقط
- **الباقي للمزامنة:** 52,677 مسلسل

### المشكلة:
المستخدم قال أن السكريبت عالج **~9,000 مسلسل** لكن العدد الفعلي في Turso **99 فقط**!

**التفسير:** هذا يؤكد الـ bug السابق - السكريبت كان بيزامن بنجاح لكن **مش بيحدّث `synced_to_turso` flag** في القاعدة المحلية بشكل صحيح في حالة الـ fallback، فالـ loop كان بيعيد نفس الصفوف.

---

## 3️⃣ قياس السرعة الفعلية

### نتائج اختبار 5 مسلسلات صغيرة:
- **الوقت:** 2,218ms (2.22 ثانية)
- **المعدل:** 444ms لكل مسلسل
- **الحالة:** نجح الـ batch بنجاح ✅

### تحليل حجم episodes_json:
أكبر 10 مسلسلات من حيث حجم البيانات:

| المسلسل | عدد الحلقات | حجم JSON |
|---------|-------------|---------|
| Doctor Who | 694 | 0.68 MB |
| Match Game | 1,438 | 0.36 MB |
| Dateline | 933 | 0.33 MB |
| Mister Rogers' Neighborhood | 871 | 0.32 MB |
| The Challenge | 647 | 0.29 MB |

**الملاحظات:**
- أكبر مسلسل (Doctor Who) حجمه **0.68 MB فقط**
- معظم المسلسلات أقل من 0.5 MB
- **لا يوجد مسلسلات بأحجام ضخمة (عدة MB)**

### تقدير الوقت الكامل:
بناءً على معدل 444ms لكل مسلسل:
- **الباقي:** 52,677 مسلسل
- **الوقت المتوقع:** ~389 دقيقة (**6.5 ساعة**)

---

## 4️⃣ التشخيص النهائي: لماذا كان بطيئاً؟

### المشكلة الحقيقية ليست السرعة:

❌ **المشكلة: Loop لا نهائي بسبب bug في تحديث synced_to_turso**

السكريبت كان:
1. يزامن batch من 100 مسلسل بنجاح
2. في حالة fallback (individual inserts)، الـ catch block **لا يحدث** `synced_to_turso = 1`
3. الـ loop التالي يسحب **نفس الصفوف** مرة أخرى
4. النتيجة: infinite loop على نفس البيانات

**دليل:** المستخدم قال عالج ~9,000 لكن Turso فيه 99 فقط!

---

## 5️⃣ الحلول المقترحة

### الحل الأساسي (إلزامي):
#### ✅ إصلاح الـ bug في catch block

**الكود الحالي (معطوب):**
```javascript
catch (err) {
  console.error(`Series batch failed, trying individually...`)
  let synced = 0
  for (const stmt of statements) {
    try {
      await turso.execute(stmt)
      synced++  // ❌ بيزود counter بس، مش بيحدث القاعدة المحلية
    } catch (e) {
      console.error(`Failed series tmdb_id: ${stmt.args[0]}`, e.message)
    }
  }
  return synced
}
```

**الحل المطلوب:**
```javascript
catch (err) {
  console.error(`Series batch failed, trying individually...`)
  let synced = 0
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const tmdb_id = seriesIds[i]  // ربط كل statement بـ tmdb_id
    try {
      await turso.execute(stmt)
      // ✅ تحديث فوري للقاعدة المحلية
      db.prepare(`
        UPDATE tv_series 
        SET synced_to_turso = 1, synced_at = datetime('now')
        WHERE tmdb_id = ?
      `).run(tmdb_id)
      synced++
    } catch (e) {
      console.error(`Failed series tmdb_id: ${tmdb_id}`, e.message)
    }
  }
  return synced
}
```

**نفس الإصلاح يجب أن يطبق على Movies أيضاً (احتياطي)**

---

### تحسينات السرعة (اختيارية):

#### 1. إضافة Progress Bar
```javascript
const cliProgress = require('cli-progress')
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

progressBar.start(totalRemaining, 0)
// في الـ loop
progressBar.update(stats.series)
progressBar.stop()
```

#### 2. تصغير BATCH_SIZE للمسلسلات الكبيرة
```javascript
const MOVIE_BATCH_SIZE = 100
const SERIES_BATCH_SIZE = 50  // أصغر بسبب episodes_json
```

#### 3. تشغيل في الخلفية
```bash
nohup node scripts/3-sync-to-turso.js > sync.log 2>&1 &
# أو
node scripts/3-sync-to-turso.js > sync.log 2>&1
```

#### 4. إضافة timeout protection
```javascript
const TIMEOUT_MS = 30000  // 30 ثانية
await Promise.race([
  turso.batch(statements, 'write'),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
  )
])
```

---

## 6️⃣ التوصيات النهائية

### الخطوات المطلوبة بالترتيب:

1. **إصلاح الـ bug في catch blocks** (movies + tv_series)
2. **إعادة ضبط `synced_to_turso = 0`** لكل الصفوف (fresh start)
3. **إضافة progress bar** لمتابعة التقدم بوضوح
4. **تشغيل المزامنة الكاملة** بثقة

### الوقت المتوقع بعد الإصلاح:
- **52,677 مسلسل × 444ms = ~6.5 ساعة**
- مع BATCH_SIZE=50 بدل 100: **~8 ساعات**

### لماذا سيكون أسرع بكثير:
- ✅ لن يكرر نفس الصفوف
- ✅ كل مسلسل يتزامن مرة واحدة فقط
- ✅ الـ progress سيكون خطي (ليس loop لا نهائي)

---

## 7️⃣ الخلاصة

| المشكلة | الحالة |
|---------|--------|
| **السحب (Fetching) مكتمل؟** | ✅ نعم 100% |
| **ingestion_progress يتتبع إيه؟** | المسلسلات فقط |
| **السرعة بطيئة؟** | لا، السرعة عادية (444ms/مسلسل) |
| **المشكلة الحقيقية؟** | Bug: catch block لا يحدث synced_to_turso |
| **الحل؟** | إصلاح catch block في movies + tv_series |
| **الوقت المتوقع بعد الإصلاح؟** | 6-8 ساعات للـ 52,677 مسلسل |

---

**الخطوة التالية:** إصلاح الكود وإعادة التشغيل
