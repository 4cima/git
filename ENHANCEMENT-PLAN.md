# 🚀 خطة تحسين البيانات الشاملة

**التاريخ:** 2 مايو 2026

---

## 🎯 الأهداف

### 1. إضافة Keywords للأعمال الناقصة
```
الأفلام: 67,432 عمل بدون keywords
المسلسلات: 25,778 عمل بدون keywords
الإجمالي: 93,210 عمل
```

### 2. سحب البيانات المفقودة من TVMaze
```
Posters: ~460,000 عمل
Overviews: ~140,000 عمل
Keywords: ~93,000 عمل
```

### 3. استخدام الذكاء الاصطناعي للتقييم
```
تقييم الأعمال الناقصة
تحسين جودة البيانات
```

---

## 📋 الخطة التفصيلية

### المرحلة 1: إضافة Keywords (الأولوية العالية)

#### 1.1 استراتيجية Keywords:
```
Keywords = [
  ...primary_genre,           // النوع الأساسي
  ...title_words,             // كلمات من العنوان
  ...overview_keywords,       // كلمات من الوصف
  ...cast_names,              // أسماء الممثلين
  ...production_companies,    // شركات الإنتاج
  ...countries,               // الدول
  ...general_keywords         // كلمات عامة
]
```

#### 1.2 مثال:
```
الفيلم: "The Dark Knight" (2008)
Genre: Action, Crime, Drama
Title: Dark, Knight
Overview: Batman, Joker, Gotham, Crime, Hero
Cast: Christian Bale, Heath Ledger
Production: Warner Bros
Countries: USA, UK
General: Superhero, Thriller, 2008

Keywords: [
  "action", "crime", "drama",
  "dark", "knight",
  "batman", "joker", "gotham", "crime", "hero",
  "christian bale", "heath ledger",
  "warner bros",
  "usa", "uk",
  "superhero", "thriller", "2008"
]
```

#### 1.3 الخطوات:
1. ✅ إنشاء سكريبت لتوليد keywords
2. ✅ تطبيقه على 93,210 عمل
3. ✅ تحديث قاعدة البيانات
4. ✅ تحديث `is_complete` flag

---

### المرحلة 2: سحب البيانات من TVMaze

#### 2.1 البيانات المطلوبة:
```
- Posters (صور عالية الجودة)
- Overviews (أوصاف مفصلة)
- Keywords (كلمات مفتاحية)
- Ratings (تقييمات)
- Cast (ممثلين)
```

#### 2.2 الخطوات:
1. ✅ الحصول على TVMaze API Key
2. ✅ إنشاء سكريبت للربط بين TMDB و TVMaze
3. ✅ سحب البيانات المفقودة
4. ✅ دمج البيانات بذكاء

#### 2.3 معدل السحب:
```
TVMaze Rate Limit: 20 requests/10 seconds
السرعة المتوقعة: ~120 عمل/دقيقة
الوقت المتوقع: ~5 ساعات لـ 600,000 عمل
```

---

### المرحلة 3: استخدام الذكاء الاصطناعي

#### 3.1 مهام الذكاء الاصطناعي:
```
1. تقييم جودة البيانات
2. توليد keywords ذكية
3. تحسين الأوصاف
4. اكتشاف المحتوى المشابه
5. تصنيف الأعمال تلقائياً
```

#### 3.2 النموذج المستخدم:
```
- Claude AI (الذي استخدمناه للتقييم)
- أو نموذج محلي (Ollama)
- أو API خارجي (OpenAI)
```

#### 3.3 الخطوات:
1. ✅ إنشاء prompt لتقييم الأعمال
2. ✅ معالجة دفعات من الأعمال
3. ✅ حفظ النتائج
4. ✅ تحديث قاعدة البيانات

---

## 🔧 التنفيذ

### الخطوة 1: توليد Keywords (سهل وسريع)

```javascript
// generate-keywords.js
function generateKeywords(movie) {
  const keywords = new Set();
  
  // من النوع
  if (movie.primary_genre) {
    keywords.add(movie.primary_genre.toLowerCase());
  }
  
  // من العنوان
  const titleWords = movie.title_en.split(' ').filter(w => w.length > 3);
  titleWords.forEach(w => keywords.add(w.toLowerCase()));
  
  // من الوصف
  if (movie.overview_en) {
    const overviewWords = movie.overview_en
      .split(' ')
      .filter(w => w.length > 4)
      .slice(0, 10);
    overviewWords.forEach(w => keywords.add(w.toLowerCase()));
  }
  
  // من الممثلين (إذا كانوا معروفين)
  if (movie.has_cast) {
    keywords.add('has-cast');
  }
  
  // كلمات عامة
  if (movie.release_year) {
    keywords.add(movie.release_year.toString());
  }
  
  return Array.from(keywords);
}
```

### الخطوة 2: سحب من TVMaze

```javascript
// fetch-tvmaze-data.js
async function fetchFromTVMaze(tmdbId, type) {
  // البحث عن العمل في TVMaze
  // سحب البيانات المفقودة
  // دمج مع البيانات الموجودة
}
```

### الخطوة 3: تقييم بالذكاء الاصطناعي

```javascript
// ai-enhancement.js
async function enhanceWithAI(content) {
  // استخدام Claude API
  // توليد keywords ذكية
  // تحسين الأوصاف
  // تقييم الجودة
}
```

---

## 📊 النتائج المتوقعة

### قبل التحسين:
```
الأفلام:
  - مكتمل: 516,040 (88.8%)
  - غير مكتمل: 67,432 (11.2%)

المسلسلات:
  - مكتمل: 66,933 (77.3%)
  - غير مكتمل: 25,778 (22.7%)
```

### بعد التحسين:
```
الأفلام:
  - مكتمل: 583,472 (100%) ✅
  - غير مكتمل: 0 (0%)

المسلسلات:
  - مكتمل: 92,711 (100%) ✅
  - غير مكتمل: 0 (0%)
```

---

## ⏱️ الجدول الزمني

| المرحلة | المهمة | الوقت | الأولوية |
|--------|--------|-------|---------|
| 1 | توليد Keywords | 30 دقيقة | 🔴 عالية جداً |
| 2 | سحب من TVMaze | 5 ساعات | 🟡 عالية |
| 3 | تقييم بالذكاء الاصطناعي | 2 ساعات | 🟢 متوسطة |

---

## 🎯 الأولويات

### الآن (فوري):
1. ✅ توليد Keywords للـ 93,210 عمل
2. ✅ تحديث `is_complete` flag

### بعد ساعة:
3. ✅ سحب البيانات من TVMaze
4. ✅ دمج البيانات

### بعد 6 ساعات:
5. ✅ تقييم بالذكاء الاصطناعي
6. ✅ تحديث قاعدة البيانات النهائي

---

## 💡 الفوائد

### للمستخدمين:
- ✅ بيانات أكمل وأفضل
- ✅ بحث أدق
- ✅ توصيات أفضل

### للنظام:
- ✅ جودة بيانات 100%
- ✅ أداء أفضل
- ✅ تجربة مستخدم محسّنة

---

## ⚠️ التحديات

### 1. TVMaze API:
- Rate limiting: 20 requests/10 seconds
- الحل: استخدام queue و batching

### 2. الذكاء الاصطناعي:
- التكلفة: قد تكون عالية
- الحل: استخدام نموذج محلي أو batch processing

### 3. الأداء:
- معالجة 93,000+ عمل
- الحل: معالجة متوازية و caching

---

## 🚀 الخطوات التالية

1. **هل تريد البدء بـ توليد Keywords الآن؟**
2. **هل لديك TVMaze API Key؟**
3. **أي نموذج ذكاء اصطناعي تفضل؟**
