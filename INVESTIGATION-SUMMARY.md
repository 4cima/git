# 📊 ملخص التحقيق النهائي - 26 يوليو 2026

## 1️⃣ التدقيق الكامل (484/484 فيلم)

### النتيجة النهائية:
- ✅ **إجمالي الأفلام**: 484
- 🚫 **أفلام مفلترة**: 42 (8.7%)
- ✅ **أفلام نظيفة**: 442 (91.3%)

### تفصيل المفلترة:
- **450 الأولى**: 42 فيلم مفلتر
- **34 المتبقية**: 0 فيلم مفلتر

### أسباب الفلترة:
| السبب | العدد | النسبة |
|-------|------|--------|
| `certification_hard:18` (دول مختلفة) | 40 | 95.2% |
| `keyword_hard:pornography` | 1 | 2.4% |
| `text_hard:\badult film\b` | 1 | 2.4% |

### القائمة الكاملة للأفلام المفلترة (42 فيلم):

```
1. Four Rooms (5) - certification_hard:18(GB)
2. American Beauty (14) - certification_hard:18(BE)
3. Kill Bill: Vol. 1 (24) - certification_hard:18(BR)
4. Jarhead (25) - certification_hard:18(BE)
5. Apocalypse Now (28) - certification_hard:18(AR)
6. Unforgiven (33) - certification_hard:18(BE)
7. A History of Violence (59) - certification_hard:18(BR)
8. Twelve Monkeys (63) - certification_hard:18(TH)
9. 8 Mile (65) - certification_hard:18+(CZ)
10. American History X (73) - certification_hard:18(BE)
11. Before Sunrise (76) - certification_hard:18(PL)
12. Memento (77) - certification_hard:18(BE)
13. Blade Runner (78) - certification_hard:18+(CZ)
14. Miami Vice (82) - certification_hard:18(BE)
15. Open Water (83) - certification_hard:18(BE)
16. Beverly Hills Cop (90) - certification_hard:18(HU)
17. Land Without Bread (91) - certification_hard:18(BR)
18. Beverly Hills Cop II (96) - certification_hard:18+(CZ)
19. Gladiator (98) - certification_hard:18(BE) ⭐ 8.2
20. Lock, Stock and Two Smoking Barrels (100) - certification_hard:18(BE)
21. Léon: The Professional (101) - certification_hard:18(ES)
22. **Taxi Driver (103) - keyword_hard:pornography** ⭐ 8.1
23. Predator (106) - certification_hard:18(CH)
24. Snatch (107) - certification_hard:18(ES)
25. Three Colors: Blue (108) - certification_hard:18(BE)
26. Three Colors: White (109) - certification_hard:18(BE)
27. Three Colors: Red (110) - certification_hard:18(BE)
28. Scarface (111) - certification_hard:18(AR)
29. Spring, Summer, Fall, Winter... and Spring (113) - certification_hard:18+(RU)
30. Pretty Woman (114) - certification_hard:18(HU)
31. **The Big Lebowski (115) - text_hard:\badult film\b**
32. Match Point (116) - certification_hard:18(ES)
33. The Untouchables (117) - certification_hard:18(ES)
34. The Lord of the Rings: The Two Towers (121) - certification_hard:18(RO)
35. Princess Mononoke (128) - descriptor_hard:violence,sexual content(BR)
36. Donnie Darko (141) - certification_hard:18+(RU)
37. Brokeback Mountain (142) - certification_hard:18+(CZ)
38. Breaking the Waves (145) - certification_hard:18(GB)
39. Akira (149) - certification_hard:18+(RU)
40. 48 Hrs. (150) - certification_hard:18(GB)
41. The Dark Knight (155) - certification_hard:18+(CZ) ⭐ 9.0
42. Knockin' on Heaven's Door (158) - certification_hard:18+(RU)
```

---

## 2️⃣ السكريبت الحقيقي الذي كتب الـ484 فيلم

### المرشح الوحيد: `scripts/sync-to-turso-ultra-fast.js`

**الأدلة:**
- ✅ يحتوي على `backdrop_path` في INSERT statement (8 مرات)
- ✅ mtime: `2026-07-17T15:51:55.231Z` (قبل تاريخ البيانات)
- ✅ تاريخ البيانات: `2026-07-24T23:53:00Z` (بعد mtime بـ7 أيام)

**المقارنة:**
| السكريبت | backdrop_path | mtime | محتمل؟ |
|----------|---------------|-------|--------|
| `sync-to-turso-ultra-fast.js` | ✅ نعم | 17 يوليو | ✅ **نعم** |
| `sync-to-turso-optimized.js` | ❌ لا | 20 يوليو | ❌ لا |
| `3-sync-to-turso.js` | ❌ لا | 21 يوليو | ❌ لا |
| `BACKUP/.../optimized.js.backup` | ❌ لا | 19 يوليو | ❌ لا |

**الاستنتاج:** `scripts/sync-to-turso-ultra-fast.js` هو السكريبت المسؤول عن كتابة الـ484 فيلم.

---

## 3️⃣ فحص keywords_json في Turso

### النتيجة:
```
إجمالي الأفلام: 484
keywords_json IS NULL: 484 (100%)
keywords_json IS NOT NULL: 0 (0%)
```

**الاستنتاج الحاسم:** 
- ❌ **كل الأفلام في Turso ليس لديها keywords_json**
- السكريبت الذي كتب البيانات (`sync-to-turso-ultra-fast.js`) **لم يكتب** هذا العمود
- التدقيق (`AUDIT-TURSO-CONTENT.js`) يسحب البيانات **من TMDB مباشرة** وليس من Turso

### المفارقة الكبرى:
**Taxi Driver (103):**
- في TMDB: يحتوي على keyword "pornography" (كموضوع درامي - الفيلم يتناول صناعة الإباحة)
- في Turso: `keywords_json = NULL`
- التدقيق: فلتره لأنه فحص TMDB مباشرة، **مش البيانات المخزنة**

---

## 4️⃣ الكود الفعلي لفحص keyword_hard:pornography

### من `content-filter.js` (السطور 180-184):

```javascript
// 3) TMDB keywords المنظّمة (أدق مصدر - صفر تسامح)
const keywordNames = getKeywordNames(content)  // ← يسحب من TMDB response
for (const kw of keywordNames) {
  if (EXPLICIT_KEYWORDS_HARD.has(kw)) {      // ← مقارنة نصية بسيطة
    return { blocked: true, reason: `keyword_hard:${kw}` }
  }
}
```

### القائمة الكاملة `EXPLICIT_KEYWORDS_HARD` (السطور 68-73):

```javascript
const EXPLICIT_KEYWORDS_HARD = new Set([
  'nudity', 'female nudity', 'male nudity', 'full frontal nudity', 'rear nudity',
  'topless', 'sex scene', 'graphic sex', 'explicit sex', 'sexual content',
  'sexually explicit', 'erotica', 'erotic film', 'erotic thriller',
  'softcore', 'hardcore', 'hardcore pornography', 'pornography', 'pornographic',
  'porn', 'porn industry', 'xxx', 'adult film', 'adult movie', 'adult entertainment',
  'stripping', 'lap dance', 'orgy', 'gangbang', 'bdsm', 'fetish', 'masturbation',
  'sex tape', 'sex work', 'sex worker', 'live sex show'
])
```

### المشكلة:
- ❌ **مقارنة كلمة واحدة بدون سياق**
- كلمة "pornography" في TMDB keywords يمكن أن تعني:
  1. **محتوى إباحي فعلي** (يجب فلترته) ✅
  2. **موضوع درامي** (فيلم يتناول الصناعة بشكل نقدي) ❌ false positive

**Taxi Driver** مثال حي على False Positive:
- فيلم كلاسيكي ⭐ 8.1 (IMDB: 8.2)
- يتناول الانحطاط الأخلاقي في نيويورك السبعينات
- keyword "pornography" موجود كـ**موضوع** مش كمحتوى

---

## 🔴 المشاكل الحرجة المكتشفة

### 1. الفلتر الحالي صارم جداً
- **40 من 42 فيلم** مفلترين بسبب `certification:18` من دول أوروبية
- `18` في أوروبا ≠ محتوى جنسي (عنف، لغة، دراما)
- أفلام مشهورة مثل:
  - The Dark Knight ⭐ 9.0
  - Gladiator ⭐ 8.2
  - Léon: The Professional ⭐ 8.5

### 2. False Positives في keyword matching
- Taxi Driver: keyword "pornography" كموضوع، ليس كمحتوى
- The Big Lebowski: نص "adult film" في overview (الفيلم يسخر من صناعة الإباحة)

### 3. keywords_json غير موجود في Turso
- لا يمكن استخدامه في queries
- التدقيق يعتمد على TMDB API فقط (بطيء، rate-limited)

---

## ✅ التوصيات

### خيارات الفلتر:

#### الخيار 1: الرجوع للفلتر الأصلي (موصى به)
```javascript
const ADULT_CERTIFICATIONS_HARD = new Set([
  'NC-17',  // أمريكا - محتوى جنسي صريح
  'X',      // أفلام إباحية
  'X18',    // UK - محتوى إباحي
  'XXX',    // أفلام إباحية
  'R18'     // UK - محتوى جنسي صريح للغاية
])
// إزالة '18' و '18+' (عنف/دراما، ليس بالضرورة جنسي)
```

**النتيجة المتوقعة:** 
- سيبقى 2-5 أفلام فقط مفلترة (بدلاً من 42)
- Princess Mononoke قد يبقى مفلتر (descriptor: sexual content)

#### الخيار 2: إضافة استثناءات يدوية
```javascript
const ALLOWLIST_HIGH_RATED = new Set([
  '103',  // Taxi Driver
  '155',  // The Dark Knight
  '98',   // Gladiator
  // ... إلخ
])
```

#### الخيار 3: فلتر بالسياق (تطوير مستقبلي)
- فحص keywords مع التقييم (`vote_average >= 7.0`)
- فحص genres (Documentary, Biography = سياق تعليمي)

---

## 📋 الحالة الحالية

- ✅ **id = tmdb_id**: 100% صحيح (484/484)
- ✅ **backdrop_path**: موجود في كل الأفلام (484/484)
- ❌ **keywords_json**: NULL في كل الأفلام (484/484)
- ⚠️ **الفلتر**: صارم جداً (42 فيلم مفلتر، معظمها false positives)

---

**تاريخ التقرير:** 26 يوليو 2026  
**الملف:** `INVESTIGATION-SUMMARY.md`
