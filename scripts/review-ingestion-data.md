# 📊 مراجعة البيانات المسحوبة من TMDB

## ✅ البيانات التي يسحبها السكريبت:

### 🎬 الأفلام (INGEST-MOVIES-LOGIC.js):

**البيانات الأساسية:**
- ✅ title_ar, title_en, title_original
- ✅ overview_ar, overview_en
- ✅ slug (فريد)
- ✅ poster_path, backdrop_path
- ✅ release_date, release_year, runtime
- ✅ original_language
- ✅ vote_average, vote_count, popularity

**البيانات الإضافية:**
- ✅ trailer_key, additional_video_key (من videos)
- ✅ imdb_id
- ✅ country_of_origin (أول دولة من production_countries)
- ✅ production_companies (JSON - أسماء الشركات فقط)
- ✅ keywords (JSON - أول 20 كلمة مفتاحية)
- ✅ primary_genre (أول نوع)

**الأنواع (Genres):**
- ✅ يتم ربطها في جدول content_genres
- ✅ كل الأنواع المرتبطة بالفيلم

**الممثلين والطاقم:**
- ✅ أول 10 ممثلين (cast)
- ✅ المخرج (Director)
- ✅ الكاتب (Writer/Screenplay)
- ✅ يتم معالجتهم عبر processPerson()

---

### 📺 المسلسلات (INGEST-SERIES-LOGIC.js):

**البيانات الأساسية:**
- ✅ title_ar, title_en, title_original
- ✅ overview_ar, overview_en
- ✅ slug (فريد)
- ✅ poster_path, backdrop_path
- ✅ first_air_date, last_air_date, first_air_year
- ✅ number_of_seasons, number_of_episodes
- ✅ status (ongoing/ended)
- ✅ original_language
- ✅ vote_average, vote_count, popularity

**البيانات الإضافية:**
- ✅ trailer_key, trailer_key_2, additional_video_key (3 فيديوهات)
- ✅ imdb_id (من external_ids)
- ✅ country_of_origin (أول دولة)
- ✅ production_companies (JSON - أسماء الشركات فقط)
- ✅ keywords (JSON - أول 20 كلمة مفتاحية)
- ✅ primary_genre (أول نوع)

**الأنواع (Genres):**
- ✅ يتم ربطها في جدول content_genres
- ✅ كل الأنواع المرتبطة بالمسلسل

**الممثلين والطاقم:**
- ✅ أول 10 ممثلين (cast)
- ✅ المخرج (Director)
- ✅ الكاتب (Writer/Screenplay)
- ✅ يتم معالجتهم عبر processPerson()

**المواسم والحلقات:**
- ✅ يتم سحب بيانات كل موسم
- ✅ يتم سحب بيانات كل حلقة

---

## ⚠️ البيانات المفقودة أو الناقصة:

### ❌ لم يتم سحبها:

1. **شركات الإنتاج (Production Companies):**
   - ✅ الأسماء فقط (JSON)
   - ❌ logo_path (لوجو الشركة)
   - ❌ id (معرف الشركة)
   - ❌ origin_country (بلد المنشأ)

2. **الشبكات (Networks) - للمسلسلات:**
   - ❌ لم يتم سحبها نهائياً
   - متاحة في TMDB: id, name, logo_path, origin_country

3. **الدول (Production Countries):**
   - ✅ أول دولة فقط في country_of_origin
   - ❌ باقي الدول (بعض الأعمال لها أكثر من دولة)

4. **اللغات المنطوقة (Spoken Languages):**
   - ❌ لم يتم سحبها
   - متاحة في TMDB

5. **التصنيف العمري (Content Rating):**
   - ❌ لم يتم سحبه
   - متاح في TMDB: certification (PG, PG-13, R, etc.)

6. **الطاقم الكامل (Full Crew):**
   - ✅ المخرج والكاتب فقط
   - ❌ باقي الطاقم (مصور، منتج، موسيقى، إلخ)

7. **الممثلين الكاملين:**
   - ✅ أول 10 ممثلين فقط
   - ❌ باقي الممثلين (بعض الأعمال لها 50+ ممثل)

8. **الصور الإضافية (Images):**
   - ✅ poster و backdrop فقط
   - ❌ باقي الصور (stills, logos, etc.)

9. **المراجعات (Reviews):**
   - ❌ لم يتم سحبها

10. **التوصيات (Recommendations):**
    - ❌ لم يتم سحبها

11. **الأعمال المشابهة (Similar):**
    - ❌ لم يتم سحبها

---

## 📋 الخلاصة:

**البيانات الأساسية:** ✅ مكتملة
**البيانات الإضافية:** ⚠️ ناقصة

**النسبة التقريبية:** 70% من البيانات المتاحة

**أهم البيانات المفقودة:**
1. لوجوهات شركات الإنتاج
2. الشبكات (Networks)
3. التصنيف العمري
4. الطاقم الكامل
5. كل الدول المنتجة


اسكريبت الافلام القديم المستقر هو
// ============================================
// 🎬 MOVIES INGESTION LOGIC
// ============================================
// Purpose: Fetch and insert movies into Turso (LibSQL)
// Database: 4cima uses Turso for content
// ============================================

require('dotenv').config({ path: './.env.local' })
const db = require('./services/local-db')
const { translateContent } = require('./services/translation-service-cjs')
const { shouldFilterContent, getFilterReason } = require('./services/content-filter')
const { generateCompleteSEO } = require('./services/seo-generator')
const pLimit = require('p-limit').default || require('p-limit')

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const TMDB_KEY  = process.env.TMDB_API_KEY  || 'afef094e7c0de13c1cac98227a61da4d'
const GROQ_KEY  = process.env.GROQ_API_KEY
const TMDB_URL  = 'https://api.themoviedb.org/3'
const GROQ_URL  = 'https://api.groq.com/openai/v1/chat/completions'
const CONCURRENCY = 100
const limiter = pLimit(CONCURRENCY)

const stats = {
  movies: 0, errors: 0, cast: 0,
  translated: 0, groq_generated: 0,
  start: Date.now()
}
const actorCache = new Map()
const translationMemoryCache = new Map() // Memory cache للترجمة

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SLUG GENERATOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function toSlug(text) {
  if (!text) return 'unknown'
  return text.toString().toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u').replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c').replace(/[&]/g, 'and')
    .replace(/['"''""]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim()
}

function generateUniqueSlug(titleEn, year, primaryGenre, table) {
  const base = toSlug(titleEn)

  // المرحلة 1: الاسم فقط
  const slug1 = base
  const ex1 = db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug1)
  if (!ex1) return slug1

  // المرحلة 2: الاسم + السنة
  if (year) {
    const slug2 = `${base}-${year}`
    const ex2 = db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug2)
    if (!ex2) return slug2

    // المرحلة 3: الاسم + السنة + النوع
    if (primaryGenre) {
      const slug3 = `${base}-${year}-${toSlug(primaryGenre)}`
      const ex3 = db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug3)
      if (!ex3) return slug3

      // المرحلة 4: رقم تسلسلي
      for (let i = 2; i <= 99; i++) {
        const slug4 = `${base}-${year}-${toSlug(primaryGenre)}-${i}`
        const ex4 = db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug4)
        if (!ex4) return slug4
      }
    }

    for (let i = 2; i <= 99; i++) {
      const slug4 = `${base}-${year}-${i}`
      const ex4 = db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug4)
      if (!ex4) return slug4
    }
  }

  // fallback نادر جداً
  for (let i = 2; i <= 999; i++) {
    const slugF = `${base}-${i}`
    const exF = db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slugF)
    if (!exF) return slugF
  }

  return `${base}-${Date.now()}`
}

function generatePersonSlug(nameEn) {
  const base = toSlug(nameEn)
  const ex1 = db.prepare(`SELECT id FROM people WHERE slug = ?`).get(base)
  if (!ex1) return base

  for (let i = 2; i <= 999; i++) {
    const s = `${base}-${i}`
    const ex = db.prepare(`SELECT id FROM people WHERE slug = ?`).get(s)
    if (!ex) return s
  }
  return `${base}-${Date.now()}`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TMDB FETCH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function fetchTMDB(endpoint, params = {}) {
  const url = new URL(`${TMDB_URL}${endpoint}`)
  url.searchParams.set('api_key', TMDB_KEY)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`)
  return res.json()
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// تنظيف النص قبل الترجمة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function cleanTextForTranslation(text) {
  if (!text) return text;
  
  // إزالة الرموز المربكة مؤقتاً للترجمة
  return text
    .replace(/[.]/g, ' ')           // نقاط → مسافات
    .replace(/[:]/g, ' ')           // نقطتان → مسافات  
    .replace(/[()]/g, ' ')          // أقواس → مسافات
    .replace(/\s+/g, ' ')           // مسافات متعددة → مسافة واحدة
    .trim();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// تحقق من جودة الترجمة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function isValidTranslation(text, targetLang = 'ar') {
  // قبول أي ترجمة غير فارغة
  return text && text.trim().length > 0;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRANSLATION: Google → Groq → Mistral fallback مع تحقق من الجودة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function translateWithCache(text, targetLang = 'ar', contentType = 'title') {
  if (!text || text.trim().length < 2) return null
  const key = text.substring(0, 500)

  // من الـ Cache أولاً
  const cached = db.prepare(
    'SELECT translated_text FROM translation_cache WHERE source_text = ? AND target_lang = ?'
  ).get(key, targetLang)
  
  if (cached && isValidTranslation(cached.translated_text, targetLang)) {
    return cached.translated_text
  }

  let result = null
  const cleanedText = cleanTextForTranslation(text)

  // 1️⃣ Google Translate (مجاني وسريع)
  try {
    const translated = await translateContent({ title: cleanedText })
    const candidate = targetLang === 'ar'
      ? (translated.title_ar || null)
      : (translated.title_en || translated.title_ar || null)
    
    if (candidate && isValidTranslation(candidate, targetLang)) {
      result = candidate
    }
  } catch (err) {
    console.log(`⚠️ Google Translate Error: ${err.message} | Trying Groq fallback...`)
  }

  // 2️⃣ Groq fallback مع prompt محسّن وسياق
  if (!result && process.env.GROQ_API_KEY) {
    try {
      const langLabel = targetLang === 'ar' ? 'العربية' : 'الإنجليزية'
      const contextLabel = contentType === 'title' ? 'عنوان فيلم' : 'نص'
      
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{
            role: 'system',
            content: `أنت مترجم محترف متخصص في ترجمة أسماء الأفلام. 
قواعد صارمة:
- لا تكتب "إليك" أو "بالتأكيد" أو "يمكنني" أو أي مقدمات
- لا تذكر أنك مترجم أو ذكاء اصطناعي
- اكتب الترجمة مباشرة فقط
- إذا كان النص اسم علم، احتفظ به كما هو أو اكتب النطق العربي
- للعناوين القصيرة، استخدم السياق أنه اسم فيلم`
          }, {
            role: 'user',
            content: `ترجم اسم الفيلم "${cleanedText}" إلى ${langLabel}`
          }],
          max_tokens: 500,
          temperature: 0.1
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        const candidate = data.choices?.[0]?.message?.content?.trim() || null
        
        if (candidate && isValidTranslation(candidate, targetLang)) {
          result = candidate
        }
      } else {
        console.log(`⚠️ Groq Error ${res.status} | Trying Mistral fallback...`)
      }
    } catch (err) {
      console.log(`⚠️ Groq Error: ${err.message} | Trying Mistral fallback...`)
    }
  }

  // 3️⃣ Mistral fallback مع prompt محسّن وسياق
  if (!result && process.env.MISTRAL_API_KEY) {
    try {
      const langLabel = targetLang === 'ar' ? 'Arabic' : 'English'
      const contextLabel = contentType === 'title' ? 'movie title' : 'text'
      
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [{
            role: 'system',
            content: `You are a professional translator specialized in movie titles.
Strict rules:
- Do not write "Here is" or "Certainly" or any introductions
- Do not mention you are a translator or AI
- Write the translation directly only
- If the text is a proper name, keep it as is or write the Arabic pronunciation
- For short titles, use context that it's a movie name`
          }, {
            role: 'user',
            content: `Translate the movie title "${cleanedText}" to ${langLabel}`
          }],
          max_tokens: 300,
          temperature: 0.1
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        const candidate = data.choices?.[0]?.message?.content?.trim() || null
        
        if (candidate && isValidTranslation(candidate, targetLang)) {
          result = candidate
        }
      } else {
        console.log(`⚠️ Mistral Error ${res.status}`)
      }
    } catch (err) {
      console.log(`⚠️ Mistral Error: ${err.message}`)
    }
  }

  // حفظ في الـ Cache
  if (result && isValidTranslation(result, targetLang)) {
    try {
      db.prepare(
        'INSERT OR REPLACE INTO translation_cache (source_text, target_lang, translated_text) VALUES (?, ?, ?)'
      ).run(key, targetLang, result)
      stats.translated++
    } catch {}
  } else if (result) {
    result = null
  } else {
    console.log(`❌ Translation failed for: ${text.substring(0, 50)}...`)
  }

  return result
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GROQ CONTENT GENERATOR مع منع توقيعات AI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function generateOverviewWithGroq(titleAr, titleEn, year) {
  let result = null;

  // 1️⃣ Groq مع prompt محسّن
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{
            role: 'system',
            content: `أنت كاتب محتوى سينمائي محترف. اكتب أوصاف جذابة للأفلام.

قواعد صارمة - لا تنتهكها أبداً:
- لا تكتب "إليك" أو "بالتأكيد" أو "هذا الفيلم" أو "هذا المسلسل"
- لا تكتب "يمكنني" أو "سأقوم" أو "دعني" أو "يسعدني"
- لا تذكر أنك ذكاء اصطناعي أو كاتب
- ابدأ مباشرة بالوصف بدون أي مقدمة
- اكتب فقرة واحدة من 3-5 جمل
- أسلوب احترافي كموقع سينمائي`
          }, {
            role: 'user',
            content: `اكتب وصفاً مشوقاً باللغة العربية لفيلم بعنوان "${titleAr || titleEn}"${year ? ` إنتاج ${year}` : ''}.`
          }],
          max_tokens: 300,
          temperature: 0.7
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content?.trim()
        
        if (text && text.length > 50 && isValidTranslation(text, 'ar')) {
          result = text
          stats.groq_generated++
        }
      }
    } catch (err) {
      console.log(`⚠️ Groq Overview Error: ${err.message}`)
    }
  }

  // 2️⃣ Mistral fallback مع prompt محسّن
  if (!result && process.env.MISTRAL_API_KEY) {
    try {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [{
            role: 'system',
            content: `You are a professional cinema content writer. Write engaging descriptions for movies.

Strict rules - never violate:
- Do not write "Here is" or "Certainly" or "This movie"
- Do not write "I can" or "I will" or "Let me"
- Do not mention you are AI or a writer
- Start directly with the description without any introduction
- Write one paragraph of 3-5 sentences
- Professional style like a cinema website`
          }, {
            role: 'user',
            content: `Write an engaging Arabic description for the movie titled "${titleAr || titleEn}"${year ? ` (${year})` : ''}.`
          }],
          max_tokens: 300,
          temperature: 0.7
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content?.trim()
        
        if (text && text.length > 50 && isValidTranslation(text, 'ar')) {
          result = text
          stats.groq_generated++
        }
      }
    } catch (err) {
      console.log(`⚠️ Mistral Overview Error: ${err.message}`)
    }
  }

  return result
}

async function generateBiographyWithGroq(nameAr, nameEn, knownFor = null, country = null) {
  if (!GROQ_KEY) return null
  try {
    // بناء السياق
    let context = `اكتب نبذة مختصرة باللغة العربية عن الممثل "${nameAr || nameEn}"`
    
    if (knownFor) {
      context += ` المعروف بأعماله في "${knownFor}"`
    }
    
    if (country) {
      context += ` من ${country}`
    }
    
    context += `.`
    
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{
          role: 'system',
          content: `أنت كاتب سير ذاتية محترف متخصص في الممثلين والمخرجين.

قواعد صارمة:
- لا تكتب "إليك" أو "بالتأكيد" أو "يمكنني" أو أي مقدمات
- لا تذكر أنك كاتب أو ذكاء اصطناعي
- ابدأ مباشرة بالمعلومات
- فقرة واحدة من 2-3 جمل فقط
- أسلوب احترافي وموضوعي
- إذا لم تعرف معلومات دقيقة، اكتب نبذة عامة قصيرة`
        }, {
          role: 'user',
          content: context
        }],
        max_tokens: 200,
        temperature: 0.7
      })
    })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim()
    
    if (text && text.length > 30 && isValidTranslation(text, 'ar')) {
      return text
    }
  } catch {}
  return null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROCESS PERSON (ACTOR/CREW)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function processPerson(personData, contentId, contentType, castOrder, roleType = 'cast') {
  const id = personData.id

  // Person Cache
  if (!actorCache.has(id)) {
    const exists = db.prepare('SELECT id FROM people WHERE id = ?').get(id)
    if (exists) {
      actorCache.set(id, true)
    } else {
      // سحب التفاصيل من TMDB
      let fullPersonData = null
      try { fullPersonData = await fetchTMDB(`/person/${id}`) } catch {}

      const rawName = personData.name || ''

      // منطق الاسم:
      // إذا كان الاسم الأصلي عربي → هو الاسم العربي
      // ترجم إلى الإنجليزي للـ slug
      const isArabicName = /[\u0600-\u06FF]/.test(rawName)

      let name_ar = null
      let name_en = null

      if (isArabicName) {
        name_ar = rawName
        name_en = await translateWithCache(rawName, 'en')
        if (!name_en) name_en = rawName // fallback
      } else {
        name_en = rawName
        name_ar = await translateWithCache(rawName, 'ar')
        if (!name_ar) name_ar = rawName // fallback
      }

      // الـ slug من الاسم الإنجليزي دايماً
      const slug = generatePersonSlug(name_en || rawName)

      // السيرة الذاتية
      let biography_en = fullPersonData?.biography || null
      let biography_ar = null

      if (biography_en) {
        biography_ar = await translateWithCache(biography_en.substring(0, 500), 'ar')
      }

      // لو مفيش سيرة → Groq يكتبها مع السياق
      if (!biography_ar) {
        const knownFor = personData.character || personData.known_for_department
        const country = fullPersonData?.place_of_birth
        biography_ar = await generateBiographyWithGroq(name_ar, name_en, knownFor, country)
      }

      try {
        db.prepare(`
          INSERT OR IGNORE INTO people
          (id, tmdb_id, slug, name_en, name_ar,
           biography_en, biography_ar,
           profile_path, gender, known_for_department,
           birthday, place_of_birth,
           popularity, is_active)
          VALUES (?,?,?, ?,?, ?,?, ?,?,?, ?,?, ?,?)
        `).run(
          id, id, slug,
          name_en, name_ar,
          biography_en, biography_ar,
          personData.profile_path || null,
          fullPersonData?.gender || null,
          personData.known_for_department || fullPersonData?.known_for_department || 'Acting',
          fullPersonData?.birthday || null,
          fullPersonData?.place_of_birth || null,
          personData.popularity || 0,
          1
        )
        actorCache.set(id, true)
      } catch (e) {
        console.error(`❌ Person ${id}: ${e.message}`)
        stats.errors++
      }
    }
  }

  // Cast/Crew Member
  try {
    if (roleType === 'cast') {
      db.prepare(`
        INSERT OR IGNORE INTO cast_crew
        (content_id, content_type, person_id, role_type, character_name, cast_order)
        VALUES (?, ?, ?, 'cast', ?, ?)
      `).run(contentId, contentType, id, personData.character || null, castOrder)
    } else {
      db.prepare(`
        INSERT OR IGNORE INTO cast_crew
        (content_id, content_type, person_id, role_type, job, department)
        VALUES (?, ?, ?, 'crew', ?, ?)
      `).run(contentId, contentType, id, personData.job || null, personData.department || null)
    }
    stats.cast++
  } catch (e) {
    console.error(`❌ Cast/Crew member ${id}: ${e.message}`)
    stats.errors++
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROCESS MOVIE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function processMovie(id) {
  try {
    const movie = await fetchTMDB(`/movie/${id}`, {
      append_to_response: 'credits,translations,keywords,videos,release_dates,images,recommendations,similar'
    })

    // 🛡️ FILTER CHECK - Mark inappropriate content
    if (shouldFilterContent(movie)) {
      const reason = getFilterReason(movie)
      db.prepare(`UPDATE movies SET is_filtered = 1, filter_reason = ?, is_complete = 0 WHERE id = ?`).run(reason, id)
      stats.errors++
      return // Skip processing
    }

    // ── العنوان ──
    const arTrans = movie.translations?.translations?.find(t => t.iso_639_1 === 'ar')
    let title_ar   = arTrans?.data?.title   || null
    let overview_ar = arTrans?.data?.overview || null

    const rawTitle = movie.title || movie.original_title || ''
    const isArabicTitle = /[\u0600-\u06FF]/.test(rawTitle)

    let title_en = null
    if (isArabicTitle) {
      // العمل عربي
      title_ar = title_ar || rawTitle
      title_en = await translateWithCache(rawTitle, 'en')
      if (!title_en) title_en = rawTitle
    } else {
      // العمل أجنبي
      title_en = rawTitle
      if (!title_ar) {
        title_ar = await translateWithCache(title_en, 'ar')
        if (!title_ar) title_ar = 'TBD'
      }
    }

    // الـ slug من الإنجليزي دايماً
    const release_year   = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null
    const primary_genre  = movie.genres?.[0]?.name?.toLowerCase() || null
    const slug = generateUniqueSlug(title_en, release_year, primary_genre, 'movies')

    // ── الوصف ──
    const overview_en = movie.overview || null
    if (!overview_ar && overview_en) {
      overview_ar = await translateWithCache(overview_en, 'ar')
    }
    // لو مفيش وصف خالص → Groq يكتبه (حتى لو مفيش overview_en)
    if (!overview_ar && (title_ar || title_en)) {
      overview_ar = await generateOverviewWithGroq(title_ar, title_en, release_year)
    }

    // ── باقي البيانات ──
    const videos = (movie.videos?.results || [])
      .filter(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))
    const trailer_key = videos[0]?.key || null
    const additional_video_key = videos[1]?.key || null

    const imdb_id = movie.imdb_id || null
    const budget = movie.budget || 0
    const revenue = movie.revenue || 0
    const tagline = movie.tagline || null
    const status = movie.status || null
    const homepage = movie.homepage || null
    
    // ── السلسلة (Collection) ──
    const belongs_to_collection = movie.belongs_to_collection ? JSON.stringify({
      id: movie.belongs_to_collection.id,
      name: movie.belongs_to_collection.name,
      poster_path: movie.belongs_to_collection.poster_path,
      backdrop_path: movie.belongs_to_collection.backdrop_path
    }) : null
    
    // ── المعرفات الخارجية ──
    const external_ids = movie.external_ids ? JSON.stringify({
      imdb_id: movie.external_ids.imdb_id,
      facebook_id: movie.external_ids.facebook_id,
      instagram_id: movie.external_ids.instagram_id,
      twitter_id: movie.external_ids.twitter_id,
      wikidata_id: movie.external_ids.wikidata_id
    }) : null
    
    // ── العناوين البديلة ──
    const alternative_titles = movie.alternative_titles?.titles?.length > 0
      ? JSON.stringify(movie.alternative_titles.titles.map(t => ({ title: t.title, country: t.iso_3166_1 })))
      : null
    
    // ── منصات المشاهدة ──
    const watch_providers = movie['watch/providers']?.results ? JSON.stringify(movie['watch/providers'].results) : null
    
    // ── التوصيات والأعمال المشابهة ──
    const recommendations = movie.recommendations?.results?.length > 0
      ? JSON.stringify(movie.recommendations.results.slice(0, 20).map(m => ({ id: m.id, title: m.title })))
      : null
    
    const similar = movie.similar?.results?.length > 0
      ? JSON.stringify(movie.similar.results.slice(0, 20).map(m => ({ id: m.id, title: m.title })))
      : null
    
    // ── الدول (كل الدول المنتجة) ──
    const production_countries = movie.production_countries?.length > 0
      ? JSON.stringify(movie.production_countries.map(c => ({ iso: c.iso_3166_1, name: c.name })))
      : null
    const country_of_origin = movie.production_countries?.[0]?.iso_3166_1 || null
    
    // ── شركات الإنتاج (مع اللوجو) ──
    const production_companies = movie.production_companies?.length > 0
      ? JSON.stringify(movie.production_companies.map(c => ({
          id: c.id,
          name: c.name,
          logo_path: c.logo_path,
          origin_country: c.origin_country
        })))
      : null
    
    // ── اللغات المنطوقة ──
    const spoken_languages = movie.spoken_languages?.length > 0
      ? JSON.stringify(movie.spoken_languages.map(l => ({ iso: l.iso_639_1, name: l.english_name })))
      : null
    
    // ── التصنيف العمري ──
    let content_rating = null
    if (movie.release_dates?.results) {
      // أولوية: مصر > السعودية > أمريكا
      const priority = ['EG', 'SA', 'US']
      for (const country of priority) {
        const release = movie.release_dates.results.find(r => r.iso_3166_1 === country)
        if (release?.release_dates?.[0]?.certification) {
          content_rating = release.release_dates[0].certification
          break
        }
      }
    }
    
    // ── الكلمات المفتاحية ──
    const keywords = movie.keywords?.keywords?.length > 0
      ? JSON.stringify(movie.keywords.keywords.slice(0, 20).map(k => k.name))
      : null

    const isComplete = (
      title_ar && title_ar !== 'TBD' &&
      title_en && overview_ar && movie.poster_path &&
      // التحقق من وجود الممثلين والأنواع
      (movie.credits?.cast && movie.credits.cast.length > 0) &&
      (movie.genres && movie.genres.length > 0)
    ) ? 1 : 0

    const syncPriority = (() => {
      const age = new Date().getFullYear() - (release_year || 0)
      const r   = movie.vote_average || 0
      if (age <= 2 && r >= 7.5) return 1
      if (age <= 5 && r >= 7.0) return 2
      if (age <= 10 && r >= 6.5) return 3
      if (r >= 6.0) return 4
      return 5
    })()

    // ── توليد بيانات SEO ──
    const seoData = generateCompleteSEO({
      title_ar, title_en, title_original: movie.original_title,
      overview_ar, release_year, primary_genre, vote_average: movie.vote_average,
      keywords, slug, content_type: 'movie'
    })

    // ── UPDATE قاعدة البيانات ──
    db.prepare(`
      UPDATE movies SET
        title_ar = ?, title_en = ?, title_original = ?, slug = ?,
        overview_ar = ?, overview_en = ?,
        primary_genre = ?, keywords = ?,
        poster_path = ?, backdrop_path = ?,
        trailer_key = ?, additional_video_key = ?, imdb_id = ?,
        release_date = ?, release_year = ?, runtime = ?,
        original_language = ?, country_of_origin = ?,
        production_companies = ?,
        vote_average = ?, vote_count = ?, popularity = ?,
        has_arabic_title = ?, has_arabic_overview = ?,
        has_trailer = ?, has_keywords = ?,
        is_complete = ?, sync_priority = ?,
        seo_keywords_json = ?, seo_title_ar = ?, seo_title_en = ?,
        seo_description_ar = ?, canonical_url = ?
      WHERE id = ?
    `).run(
      title_ar, title_en, movie.original_title, slug,
      overview_ar, overview_en,
      primary_genre, keywords,
      movie.poster_path, movie.backdrop_path,
      trailer_key, additional_video_key, imdb_id,
      movie.release_date, release_year, movie.runtime,
      movie.original_language, country_of_origin,
      production_companies,
      movie.vote_average, movie.vote_count, movie.popularity,
      (title_ar && title_ar !== 'TBD') ? 1 : 0,
      overview_ar ? 1 : 0,
      trailer_key ? 1 : 0,
      keywords ? 1 : 0,
      isComplete, syncPriority,
      seoData.seo_keywords_json, seoData.seo_title_ar, seoData.seo_title_en,
      seoData.seo_description_ar, seoData.canonical_url,
      id
    )

    // ── الأنواع ──
    const insertGenre = db.prepare(`
      INSERT OR IGNORE INTO content_genres (content_id, content_type, genre_id)
      SELECT ?, 'movie', id FROM genres WHERE tmdb_id = ?
    `)
    for (const g of movie.genres || []) {
      insertGenre.run(id, g.id)
    }
    if ((movie.genres || []).length > 0) {
      db.prepare(`UPDATE movies SET has_genres = 1 WHERE id = ?`).run(id)
    }

    // ── الممثلين (أول 10) ──
    const castList = (movie.credits?.cast || []).slice(0, 10)
    for (let i = 0; i < castList.length; i++) {
      await processPerson(castList[i], id, 'movie', i, 'cast')
    }
    if (castList.length > 0) {
      db.prepare(`UPDATE movies SET has_cast = 1 WHERE id = ?`).run(id)
    }

    // ── الطاقم الكامل (أهم الأدوار) ──
    const crew = movie.credits?.crew || []
    const importantJobs = ['Director', 'Writer', 'Screenplay', 'Producer', 'Executive Producer', 
                          'Director of Photography', 'Original Music Composer', 'Editor']
    const importantCrew = crew.filter(c => importantJobs.includes(c.job))
    
    for (const member of importantCrew) {
      await processPerson(member, id, 'movie', 0, 'crew')
    }

    // ── Progress ──
    stats.movies++
    if (stats.movies % 50 === 0) {
      const mins = (Date.now() - stats.start) / 60000
      const rate = (stats.movies / mins).toFixed(0)
      console.log(
        `✅ ${stats.movies} فيلم | ` +
        `${stats.cast} ممثل | ` +
        `${stats.translated} ترجمة | ` +
        `${stats.groq_generated} Groq | ` +
        `${rate}/دقيقة`
      )
      // حفظ التقدم
      db.prepare(`
        INSERT OR REPLACE INTO ingestion_progress
        (script_name, total_fetched, total_errors, last_run, status)
        VALUES ('INGEST-MOVIES', ?, ?, datetime('now'), 'running')
      `).run(stats.movies, stats.errors)
    }

  } catch (e) {
    // ✅ تحسين 4: معالجة 404 بشكل صحيح
    if (e.message.includes('404')) {
      // الفيلم غير موجود في TMDB - ليس خطأ حقيقي
      db.prepare(`
        UPDATE movies 
        SET is_filtered = 1, filter_reason = 'not_found_in_tmdb', is_complete = 0 
        WHERE id = ?
      `).run(id)
    } else {
      // خطأ حقيقي (مشكلة في الشبكة، API، إلخ)
      stats.errors++
      if (process.env.DEBUG) console.error(`❌ فيلم ${id}: ${e.message}`)
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function main() {
  console.log('🎬 بدء تحديث بيانات الأفلام ⚡\n')

  // ✅ تحسين 1: Resume Capability - استئناف من آخر نقطة
  const lastProgress = db.prepare(`
    SELECT last_processed_id FROM ingestion_progress 
    WHERE script_name = 'INGEST-MOVIES'
  `).get()
  const lastId = lastProgress?.last_processed_id || 0

  // ✅ تحسين 2: شرط سحب محسّن
  // 1. لم يُسحب بعد (overview_en IS NULL)
  // 2. يحتاج ترجمة (overview_en موجود لكن title_ar = 'TBD')
  // 3. مسحوب لكن بدون ممثلين (إعادة محاولة)
  const pending = db.prepare(`
    SELECT id FROM movies 
    WHERE id > ? 
      AND (
        -- لم يُسحب بعد
        (overview_en IS NULL AND is_filtered = 0)
        -- أو يحتاج ترجمة
        OR (overview_en IS NOT NULL AND (title_ar = 'TBD' OR title_ar IS NULL))
        -- أو مسحوب لكن بدون ممثلين (إعادة محاولة)
        OR (overview_en IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = movies.id AND content_type = 'movie'))
      )
    ORDER BY id
  `).all(lastId)

  console.log(`📦 ${pending.length.toLocaleString()} فيلم محتاج تحديث`)
  if (lastId > 0) {
    console.log(`🔄 استئناف من ID: ${lastId}`)
  }
  console.log('')

  // ✅ تحسين 3: BATCH SIZE - معالجة دفعات صغيرة
  const BATCH_SIZE = 500
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map(m => limiter(() => processMovie(m.id))))
    
    // حفظ التقدم بعد كل دفعة
    const lastProcessedId = batch[batch.length - 1].id
    db.prepare(`
      INSERT OR REPLACE INTO ingestion_progress
      (script_name, last_processed_id, total_fetched, total_errors, last_run, status)
      VALUES ('INGEST-MOVIES', ?, ?, ?, datetime('now'), 'running')
    `).run(lastProcessedId, stats.movies, stats.errors)
    
    if ((i + BATCH_SIZE) % 2500 === 0 || i + BATCH_SIZE >= pending.length) {
      const progress = (((i + batch.length) / pending.length) * 100).toFixed(1)
      const elapsed = (Date.now() - stats.start) / 60000
      const rate = ((i + batch.length) / elapsed).toFixed(0)
      const remaining = pending.length - (i + batch.length)
      const eta = (remaining / rate).toFixed(0)
      
      console.log(`⏳ ${i + batch.length}/${pending.length} (${progress}%) | ${rate}/دقيقة | ETA: ${eta} دقيقة`)
    }
  }

  const mins = (Date.now() - stats.start) / 60000
  console.log(`
╔══════════════════════════════════════╗
║     ✅ اكتمل تحديث الأفلام          ║
╠══════════════════════════════════════╣
║ محدّث:      ${String(stats.movies).padEnd(25)}║
║ ممثلين:     ${String(stats.cast).padEnd(25)}║
║ ترجمات:     ${String(stats.translated).padEnd(25)}║
║ Groq:       ${String(stats.groq_generated).padEnd(25)}║
║ أخطاء:      ${String(stats.errors).padEnd(25)}║
║ الوقت:      ${mins.toFixed(1)} دقيقة${' '.repeat(Math.max(0, 19 - mins.toFixed(1).length))}║
╚══════════════════════════════════════╝
  `)

  db.prepare(`
    INSERT OR REPLACE INTO ingestion_progress
    (script_name, total_fetched, total_errors, last_run, status)
    VALUES ('INGEST-MOVIES', ?, ?, datetime('now'), 'done')
  `).run(stats.movies, stats.errors)
}

main().catch(console.error)


واسكريبت المسلسلات القديم المستقر هو
// ============================================
// 📺 SERIES INGESTION LOGIC
// ============================================
// Purpose: Fetch and insert series into Turso (LibSQL)
// Database: 4cima uses Turso for content
// Important: episodes table requires BOTH series_id AND season_id
// ============================================

require('dotenv').config({ path: './.env.local' })
const db = require('./services/local-db')
const { translateContent } = require('./services/translation-service-cjs')
const { shouldFilterContent, getFilterReason } = require('./services/content-filter')
const { generateCompleteSEO } = require('./services/seo-generator')
const pLimit = require('p-limit').default || require('p-limit')

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const TMDB_KEY  = process.env.TMDB_API_KEY_2 || '1298554bf3b09eee57972f0876ad096e'
const GROQ_KEY  = process.env.GROQ_API_KEY
const TMDB_URL  = 'https://api.themoviedb.org/3'
const GROQ_URL  = 'https://api.groq.com/openai/v1/chat/completions'
const CONCURRENCY = 100
const BATCH_SIZE = 200  // ✅ تحسين: زيادة من 100 إلى 200
const limiter = pLimit(CONCURRENCY)

const stats = {
  series: 0, seasons: 0, episodes: 0,
  errors: 0, cast: 0,
  translated: 0, groq_generated: 0,
  start: Date.now()
}
const actorCache = new Map()

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SLUG GENERATOR (نفس منطق الأفلام)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function toSlug(text) {
  if (!text) return 'unknown'
  return text.toString().toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u').replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c').replace(/[&]/g, 'and')
    .replace(/['"''""]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim()
}

function generateUniqueSlug(titleEn, year, primaryGenre, table) {
  const base = toSlug(titleEn)

  const slug1 = base
  if (!db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug1)) return slug1

  if (year) {
    const slug2 = `${base}-${year}`
    if (!db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug2)) return slug2

    if (primaryGenre) {
      const slug3 = `${base}-${year}-${toSlug(primaryGenre)}`
      if (!db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug3)) return slug3

      for (let i = 2; i <= 99; i++) {
        const slug4 = `${base}-${year}-${toSlug(primaryGenre)}-${i}`
        if (!db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug4)) return slug4
      }
    }

    for (let i = 2; i <= 99; i++) {
      const slug4 = `${base}-${year}-${i}`
      if (!db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug4)) return slug4
    }
  }

  for (let i = 2; i <= 999; i++) {
    const slugF = `${base}-${i}`
    if (!db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slugF)) return slugF
  }
  return `${base}-${Date.now()}`
}

function generatePersonSlug(nameEn) {
  const base = toSlug(nameEn)
  if (!db.prepare(`SELECT id FROM people WHERE slug = ?`).get(base)) return base
  for (let i = 2; i <= 999; i++) {
    const s = `${base}-${i}`
    if (!db.prepare(`SELECT id FROM people WHERE slug = ?`).get(s)) return s
  }
  return `${base}-${Date.now()}`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TMDB FETCH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function fetchTMDB(endpoint, params = {}) {
  const url = new URL(`${TMDB_URL}${endpoint}`)
  url.searchParams.set('api_key', TMDB_KEY)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`)
  return res.json()
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// تحقق من جودة الترجمة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function isValidTranslation(text, targetLang = 'ar') {
  // قبول أي ترجمة غير فارغة
  return text && text.trim().length > 0;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRANSLATION: Google → Groq → Mistral fallback مع تحقق من الجودة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function translateWithCache(text, targetLang = 'ar', contentType = 'title') {
  if (!text || text.trim().length < 2) return null
  const key = text.substring(0, 500)

  const cached = db.prepare(
    'SELECT translated_text FROM translation_cache WHERE source_text = ? AND target_lang = ?'
  ).get(key, targetLang)
  
  if (cached && isValidTranslation(cached.translated_text, targetLang)) {
    return cached.translated_text
  }

  let result = null
  const cleanedText = cleanTextForTranslation(text)

  // 1️⃣ Google Translate (مجاني وسريع)
  try {
    const translated = await translateContent({ title: cleanedText })
    const candidate = targetLang === 'ar'
      ? (translated.title_ar || null)
      : (translated.title_en || translated.title_ar || null)
    
    if (candidate && isValidTranslation(candidate, targetLang)) {
      result = candidate
    }
  } catch (err) {
    console.log(`⚠️ Google Translate Error: ${err.message} | Trying Groq...`)
  }

  // 2️⃣ Groq fallback مع prompt محسّن وسياق
  if (!result && process.env.GROQ_API_KEY) {
    try {
      const langLabel = targetLang === 'ar' ? 'العربية' : 'الإنجليزية'
      
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{
            role: 'system',
            content: `أنت مترجم محترف متخصص في ترجمة أسماء المسلسلات. 
قواعد صارمة:
- لا تكتب "إليك" أو "بالتأكيد" أو "يمكنني" أو أي مقدمات
- لا تذكر أنك مترجم أو ذكاء اصطناعي
- اكتب الترجمة مباشرة فقط
- إذا كان النص اسم علم، احتفظ به كما هو أو اكتب النطق العربي
- للعناوين القصيرة، استخدم السياق أنه اسم مسلسل`
          }, {
            role: 'user',
            content: `ترجم اسم المسلسل "${cleanedText}" إلى ${langLabel}`
          }],
          max_tokens: 500,
          temperature: 0.1
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        const candidate = data.choices?.[0]?.message?.content?.trim() || null
        
        if (candidate && isValidTranslation(candidate, targetLang)) {
          result = candidate
        }
      } else {
        console.log(`⚠️ Groq Error ${res.status} | Trying Mistral fallback...`)
      }
    } catch (err) {
      console.log(`⚠️ Groq Error: ${err.message} | Trying Mistral fallback...`)
    }
  }

  // 3️⃣ Mistral fallback مع prompt محسّن وسياق
  if (!result && process.env.MISTRAL_API_KEY) {
    try {
      const langLabel = targetLang === 'ar' ? 'Arabic' : 'English'
      
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [{
            role: 'system',
            content: `You are a professional translator specialized in TV series titles.
Strict rules:
- Do not write "Here is" or "Certainly" or any introductions
- Do not mention you are a translator or AI
- Write the translation directly only
- If the text is a proper name, keep it as is or write the Arabic pronunciation
- For short titles, use context that it's a TV series name`
          }, {
            role: 'user',
            content: `Translate the TV series title "${cleanedText}" to ${langLabel}`
          }],
          max_tokens: 300,
          temperature: 0.1
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        const candidate = data.choices?.[0]?.message?.content?.trim() || null
        
        if (candidate && isValidTranslation(candidate, targetLang)) {
          result = candidate
        }
      } else {
        console.log(`⚠️ Mistral Error ${res.status}`)
      }
    } catch (err) {
      console.log(`⚠️ Mistral Error: ${err.message}`)
    }
  }

  if (result && isValidTranslation(result, targetLang)) {
    try {
      db.prepare(
        'INSERT OR REPLACE INTO translation_cache (source_text, target_lang, translated_text) VALUES (?, ?, ?)'
      ).run(key, targetLang, result)
      stats.translated++
    } catch {}
  } else if (result) {
    result = null
  } else {
    console.log(`❌ Translation failed for: ${text.substring(0, 50)}...`)
  }

  return result
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GROQ CONTENT GENERATOR مع منع توقيعات AI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function generateOverviewWithGroq(titleAr, titleEn, year, type = 'مسلسل') {
  if (!GROQ_KEY) return null
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{
          role: 'system',
          content: `أنت كاتب محتوى سينمائي محترف. اكتب أوصاف جذابة للمسلسلات.

قواعد صارمة - لا تنتهكها أبداً:
- لا تكتب "إليك" أو "بالتأكيد" أو "هذا الفيلم" أو "هذا المسلسل"
- لا تكتب "يمكنني" أو "سأقوم" أو "دعني" أو "يسعدني"
- لا تذكر أنك ذكاء اصطناعي أو كاتب
- ابدأ مباشرة بالوصف بدون أي مقدمة
- اكتب فقرة واحدة من 3-5 جمل
- أسلوب احترافي كموقع سينمائي`
        }, {
          role: 'user',
          content: `اكتب وصفاً مشوقاً باللغة العربية لـ ${type} بعنوان "${titleAr || titleEn}"${year ? ` إنتاج ${year}` : ''}.`
        }],
        max_tokens: 300,
        temperature: 0.7
      })
    })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim()
    
    if (text && text.length > 50 && isValidTranslation(text, 'ar')) {
      stats.groq_generated++
      return text
    }
  } catch {}
  return null
}

async function generateBiographyWithGroq(nameAr, nameEn, knownFor = null, country = null) {
  if (!GROQ_KEY) return null
  try {
    // بناء السياق
    let context = `اكتب نبذة مختصرة باللغة العربية عن الممثل "${nameAr || nameEn}"`
    
    if (knownFor) {
      context += ` المعروف بأعماله في "${knownFor}"`
    }
    
    if (country) {
      context += ` من ${country}`
    }
    
    context += `.`
    
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{
          role: 'system',
          content: `أنت كاتب سير ذاتية محترف متخصص في الممثلين والمخرجين.

قواعد صارمة:
- لا تكتب "إليك" أو "بالتأكيد" أو "يمكنني" أو أي مقدمات
- لا تذكر أنك كاتب أو ذكاء اصطناعي
- ابدأ مباشرة بالمعلومات
- فقرة واحدة من 2-3 جمل فقط
- أسلوب احترافي وموضوعي
- إذا لم تعرف معلومات دقيقة، اكتب نبذة عامة قصيرة`
        }, {
          role: 'user',
          content: context
        }],
        max_tokens: 200,
        temperature: 0.7
      })
    })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim()
    
    if (text && text.length > 30 && isValidTranslation(text, 'ar')) {
      return text
    }
  } catch {}
  return null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROCESS PERSON (ACTOR/CREW)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function processPerson(personData, contentId, contentType, castOrder, roleType = 'cast') {
  const id = personData.id

  if (!actorCache.has(id)) {
    const exists = db.prepare('SELECT id FROM people WHERE id = ?').get(id)
    if (exists) {
      actorCache.set(id, true)
    } else {
      let fullPersonData = null
      try { fullPersonData = await fetchTMDB(`/person/${id}`) } catch {}

      const rawName = personData.name || ''
      const isArabicName = /[\u0600-\u06FF]/.test(rawName)

      let name_ar = null
      let name_en = null

      if (isArabicName) {
        name_ar = rawName
        name_en = await translateWithCache(rawName, 'en')
        if (!name_en) name_en = rawName
      } else {
        name_en = rawName
        name_ar = await translateWithCache(rawName, 'ar')
        if (!name_ar) name_ar = rawName
      }

      const slug = generatePersonSlug(name_en || rawName)

      let biography_en = fullPersonData?.biography || null
      let biography_ar = null

      if (biography_en) {
        biography_ar = await translateWithCache(biography_en.substring(0, 500), 'ar')
      }
      if (!biography_ar) {
        const knownFor = personData.character || personData.known_for_department
        const country = fullPersonData?.place_of_birth
        biography_ar = await generateBiographyWithGroq(name_ar, name_en, knownFor, country)
      }

      try {
        db.prepare(`
          INSERT OR IGNORE INTO people
          (id, tmdb_id, slug, name_en, name_ar,
           biography_en, biography_ar,
           profile_path, gender, known_for_department,
           birthday, place_of_birth,
           popularity, is_active)
          VALUES (?,?,?, ?,?, ?,?, ?,?,?, ?,?, ?,?)
        `).run(
          id, id, slug,
          name_en, name_ar,
          biography_en, biography_ar,
          personData.profile_path || null,
          fullPersonData?.gender || null,
          personData.known_for_department || fullPersonData?.known_for_department || 'Acting',
          fullPersonData?.birthday || null,
          fullPersonData?.place_of_birth || null,
          personData.popularity || 0,
          1
        )
        actorCache.set(id, true)
      } catch (e) {
        console.error(`❌ Person ${id}: ${e.message}`)
        stats.errors++
      }
    }
  }

  try {
    if (roleType === 'cast') {
      db.prepare(`
        INSERT OR IGNORE INTO cast_crew
        (content_id, content_type, person_id, role_type, character_name, cast_order)
        VALUES (?, ?, ?, 'cast', ?, ?)
      `).run(contentId, contentType, id, personData.character || null, castOrder)
    } else {
      db.prepare(`
        INSERT OR IGNORE INTO cast_crew
        (content_id, content_type, person_id, role_type, job, department)
        VALUES (?, ?, ?, 'crew', ?, ?)
      `).run(contentId, contentType, id, personData.job || null, personData.department || null)
    }
    stats.cast++
  } catch (e) {
    console.error(`❌ Cast/Crew member ${id}: ${e.message}`)
    stats.errors++
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROCESS SERIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function processSeries(id) {
  try {
    const series = await fetchTMDB(`/tv/${id}`, {
      append_to_response: 'credits,translations,keywords,videos,external_ids,content_ratings,images,recommendations,similar'
    })

    // 🛡️ FILTER CHECK
    if (shouldFilterContent(series)) {
      const reason = getFilterReason(series)
      db.prepare(`UPDATE tv_series SET is_filtered = 1, filter_reason = ?, is_complete = 0 WHERE id = ?`).run(reason, id)
      // ✅ لا نحسبها كخطأ - هي فلترة مقصودة
      return
    }
 // ── العنوان ──
    const arTrans = series.translations?.translations?.find(t => t.iso_639_1 === 'ar')
    let title_ar    = arTrans?.data?.name     || null
    let overview_ar = arTrans?.data?.overview || null

    const rawTitle = series.name || series.original_name || ''
    const isArabicTitle = /[\u0600-\u06FF]/.test(rawTitle)

    let title_en = null
    if (isArabicTitle) {
      title_ar = title_ar || rawTitle
      title_en = await translateWithCache(rawTitle, 'en')
      if (!title_en) title_en = rawTitle
    } else {
      title_en = rawTitle
      if (!title_ar) {
        title_ar = await translateWithCache(title_en, 'ar')
        if (!title_ar) title_ar = 'TBD'
      }
    }

    const first_air_year  = series.first_air_date ? parseInt(series.first_air_date.split('-')[0]) : null
    const primary_genre   = series.genres?.[0]?.name?.toLowerCase() || null
    const slug = generateUniqueSlug(title_en, first_air_year, primary_genre, 'tv_series')

    // ── الوصف ──
    const overview_en = series.overview || null
    if (!overview_ar && overview_en) {
      overview_ar = await translateWithCache(overview_en, 'ar')
    }
    if (!overview_ar) {
      overview_ar = await generateOverviewWithGroq(title_ar, title_en, first_air_year, 'مسلسل')
    }

    // ── باقي البيانات ──
    const videos = (series.videos?.results || [])
      .filter(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))
    const trailer_key = videos[0]?.key || null
    const trailer_key_2 = videos[1]?.key || null
    const additional_video_key = videos[2]?.key || null

    const imdb_id = series.external_ids?.imdb_id || null
    const tagline = series.tagline || null
    const homepage = series.homepage || null
    const type = series.type || null
    
    // ── المنشئ (Created By) ──
    const created_by = series.created_by?.length > 0
      ? JSON.stringify(series.created_by.map(c => ({ id: c.id, name: c.name, profile_path: c.profile_path })))
      : null
    
    // ── آخر حلقة وحلقة قادمة ──
    const last_episode = series.last_episode_to_air ? JSON.stringify({
      id: series.last_episode_to_air.id,
      name: series.last_episode_to_air.name,
      episode_number: series.last_episode_to_air.episode_number,
      season_number: series.last_episode_to_air.season_number,
      air_date: series.last_episode_to_air.air_date
    }) : null
    
    const next_episode = series.next_episode_to_air ? JSON.stringify({
      id: series.next_episode_to_air.id,
      name: series.next_episode_to_air.name,
      episode_number: series.next_episode_to_air.episode_number,
      season_number: series.next_episode_to_air.season_number,
      air_date: series.next_episode_to_air.air_date
    }) : null
    
    // ── المعرفات الخارجية ──
    const external_ids_full = series.external_ids ? JSON.stringify({
      imdb_id: series.external_ids.imdb_id,
      facebook_id: series.external_ids.facebook_id,
      instagram_id: series.external_ids.instagram_id,
      twitter_id: series.external_ids.twitter_id,
      tvdb_id: series.external_ids.tvdb_id,
      tvrage_id: series.external_ids.tvrage_id
    }) : null
    
    // ── العناوين البديلة ──
    const alternative_titles = series.alternative_titles?.results?.length > 0
      ? JSON.stringify(series.alternative_titles.results.map(t => ({ title: t.title, country: t.iso_3166_1 })))
      : null
    
    // ── منصات المشاهدة ──
    const watch_providers = series['watch/providers']?.results ? JSON.stringify(series['watch/providers'].results) : null
    
    // ── التوصيات والأعمال المشابهة ──
    const recommendations = series.recommendations?.results?.length > 0
      ? JSON.stringify(series.recommendations.results.slice(0, 20).map(s => ({ id: s.id, name: s.name })))
      : null
    
    const similar = series.similar?.results?.length > 0
      ? JSON.stringify(series.similar.results.slice(0, 20).map(s => ({ id: s.id, name: s.name })))
      : null
    
    // ── الدول (كل الدول المنتجة) ──
    const production_countries = series.origin_country?.length > 0
      ? JSON.stringify(series.origin_country.map(c => c))
      : null
    const country_of_origin = series.origin_country?.[0] || null
    
    // ── شركات الإنتاج (مع اللوجو) ──
    const production_companies = series.production_companies?.length > 0
      ? JSON.stringify(series.production_companies.map(c => ({
          id: c.id,
          name: c.name,
          logo_path: c.logo_path,
          origin_country: c.origin_country
        })))
      : null
    
    // ── الشبكات (Networks) ──
    const networks = series.networks?.length > 0
      ? JSON.stringify(series.networks.map(n => ({
          id: n.id,
          name: n.name,
          logo_path: n.logo_path,
          origin_country: n.origin_country
        })))
      : null
    
    // ── اللغات المنطوقة ──
    const spoken_languages = series.spoken_languages?.length > 0
      ? JSON.stringify(series.spoken_languages.map(l => ({ iso: l.iso_639_1, name: l.english_name })))
      : null
    
    // ── التصنيف العمري ──
    let content_rating = null
    if (series.content_ratings?.results) {
      const priority = ['EG', 'SA', 'US']
      for (const country of priority) {
        const rating = series.content_ratings.results.find(r => r.iso_3166_1 === country)
        if (rating?.rating) {
          content_rating = rating.rating
          break
        }
      }
    }
    
    // ── الكلمات المفتاحية ──
    const keywords = series.keywords?.results?.length > 0
      ? JSON.stringify(series.keywords.results.slice(0, 20).map(k => k.name))
      : null

    // ✅ تحسين: لا نضع is_complete = 1 إلا بعد التأكد من سحب المواسم
    // نحسب is_complete الأولي بدون شرط المواسم
    let isComplete = (
      title_ar && title_ar !== 'TBD' &&
      title_en && overview_ar && series.poster_path &&
      (series.credits?.cast && series.credits.cast.length > 0) &&
      (series.genres && series.genres.length > 0)
    ) ? 1 : 0

    const syncPriority = (() => {
      const age = new Date().getFullYear() - (first_air_year || 0)
      const r   = series.vote_average || 0
      if (age <= 2 && r >= 7.5) return 1
      if (age <= 5 && r >= 7.0) return 2
      if (age <= 10 && r >= 6.5) return 3
      if (r >= 6.0) return 4
      return 5
    })()

    // ── توليد بيانات SEO ──
    const seoData = generateCompleteSEO({
      title_ar, title_en, title_original: series.original_name,
      overview_ar, first_air_year, primary_genre, vote_average: series.vote_average,
      keywords, slug, content_type: 'series'
    })

    // ── UPDATE tv_series ──
    db.prepare(`
      UPDATE tv_series SET
        title_ar = ?, title_en = ?, title_original = ?, slug = ?,
        overview_ar = ?, overview_en = ?,
        primary_genre = ?, keywords = ?,
        poster_path = ?, backdrop_path = ?,
        trailer_key = ?, trailer_key_2 = ?, additional_video_key = ?, imdb_id = ?,
        first_air_date = ?, last_air_date = ?, first_air_year = ?,
        number_of_seasons = ?, number_of_episodes = ?, status = ?,
        original_language = ?, country_of_origin = ?,
        production_companies = ?,
        vote_average = ?, vote_count = ?, popularity = ?,
        has_arabic_title = ?, has_arabic_overview = ?,
        has_trailer = ?, has_keywords = ?,
        is_complete = ?, sync_priority = ?,
        seo_keywords_json = ?, seo_title_ar = ?, seo_title_en = ?,
        seo_description_ar = ?, canonical_url = ?
      WHERE id = ?
    `).run(
      title_ar, title_en, series.original_name, slug,
      overview_ar, overview_en,
      primary_genre, keywords,
      series.poster_path, series.backdrop_path,
      trailer_key, trailer_key_2, additional_video_key, imdb_id,
      series.first_air_date, series.last_air_date, first_air_year,
      series.number_of_seasons, series.number_of_episodes,
      series.status || 'ongoing',
      series.original_language, country_of_origin,
      production_companies,
      series.vote_average, series.vote_count, series.popularity,
      (title_ar && title_ar !== 'TBD') ? 1 : 0,
      overview_ar ? 1 : 0,
      trailer_key ? 1 : 0,
      keywords ? 1 : 0,
      isComplete, syncPriority,
      seoData.seo_keywords_json, seoData.seo_title_ar, seoData.seo_title_en,
      seoData.seo_description_ar, seoData.canonical_url,
      id
    )

    // ── الأنواع ──
    const insertGenre = db.prepare(`
      INSERT OR IGNORE INTO content_genres (content_id, content_type, genre_id)
      SELECT ?, 'tv', id FROM genres WHERE tmdb_id = ?
    `)
    for (const g of series.genres || []) insertGenre.run(id, g.id)
    if ((series.genres || []).length > 0) {
      db.prepare(`UPDATE tv_series SET has_genres = 1 WHERE id = ?`).run(id)
    }

    // ── الممثلين ──
    const castList = (series.credits?.cast || []).slice(0, 10)
    for (let i = 0; i < castList.length; i++) {
      await processPerson(castList[i], id, 'tv', i, 'cast')
    }
    if (castList.length > 0) {
      db.prepare(`UPDATE tv_series SET has_cast = 1 WHERE id = ?`).run(id)
    }

    // ── الطاقم الكامل (أهم الأدوار) ──
    const crew = series.credits?.crew || []
    const importantJobs = ['Director', 'Writer', 'Screenplay', 'Producer', 'Executive Producer', 
                          'Director of Photography', 'Original Music Composer', 'Editor']
    const importantCrew = crew.filter(c => importantJobs.includes(c.job))
    
    for (const member of importantCrew) {
      await processPerson(member, id, 'tv', 0, 'crew')
    }

    // ── المواسم والحلقات ──
    const validSeasons = (series.seasons || []).filter(s => s.season_number > 0)

    const insertSeason = db.prepare(`
      INSERT OR IGNORE INTO seasons
      (series_id, tmdb_id, season_number, title_en, overview_en,
       poster_path, air_date, air_year, episode_count, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `)

    const insertEpisode = db.prepare(`
      INSERT OR IGNORE INTO episodes
      (series_id, season_id, tmdb_id, episode_number, season_number,
       title_en, overview_en, still_path, air_date, runtime,
       vote_average, is_active, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'tmdb')
    `)

    // ✅ تحسين: سحب كل المواسم بشكل متزامن
    const seasonDetailsPromises = validSeasons.map(season => 
      limiter(async () => {
        try {
          const seasonDetails = await fetchTMDB(`/tv/${id}/season/${season.season_number}`)
          return { season, seasonDetails }
        } catch {
          return { season, seasonDetails: null }
        }
      })
    )
    
    const seasonResults = await Promise.all(seasonDetailsPromises)

    for (const { season, seasonDetails } of seasonResults) {
      insertSeason.run(
        id, season.id, season.season_number,
        season.name, season.overview,
        season.poster_path, season.air_date,
        season.air_date ? parseInt(season.air_date.split('-')[0]) : null,
        season.episode_count || 0
      )

      const seasonRecord = db.prepare(
        'SELECT id FROM seasons WHERE series_id = ? AND season_number = ?'
      ).get(id, season.season_number)

      if (!seasonRecord) continue
      stats.seasons++

      // حفظ الحلقات
      const episodesData = seasonDetails?.episodes || []
      for (const ep of episodesData) {
        insertEpisode.run(
          id, seasonRecord.id, ep.id,
          ep.episode_number, ep.season_number,
          ep.name, ep.overview,
          ep.still_path, ep.air_date,
          ep.runtime, ep.vote_average || 0
        )
        stats.episodes++
      }
    }

    // ✅ تحديث is_complete بعد سحب المواسم
    // إذا لم يتم سحب أي مواسم، is_complete = 0
    const seasonsInDB = db.prepare(
      'SELECT COUNT(*) as count FROM seasons WHERE series_id = ?'
    ).get(id).count
    
    if (seasonsInDB === 0 && isComplete === 1) {
      // المسلسل كان مكتمل لكن بدون مواسم → غير مكتمل
      isComplete = 0
      db.prepare('UPDATE tv_series SET is_complete = 0 WHERE id = ?').run(id)
    } else if (seasonsInDB > 0 && isComplete === 1) {
      // المسلسل مكتمل ولديه مواسم → مكتمل فعلاً ✅
      db.prepare('UPDATE tv_series SET is_complete = 1 WHERE id = ?').run(id)
    }

    // ── Progress ──
    // ── Progress ──
    stats.series++
    if (stats.series % 20 === 0) {
      const mins = (Date.now() - stats.start) / 60000
      const rate = (stats.series / mins).toFixed(0)
      
      // ✅ تحسين: إضافة النسبة المئوية و ETA
      const totalPending = db.prepare(`
        SELECT COUNT(*) as count FROM tv_series 
        WHERE (overview_en IS NULL AND is_filtered = 0)
           OR (overview_en IS NOT NULL AND (title_ar = 'TBD' OR title_ar IS NULL))
      `).get().count
      
      const progress = ((stats.series / totalPending) * 100).toFixed(1)
      const remaining = totalPending - stats.series
      const eta = remaining > 0 ? (remaining / rate).toFixed(0) : 0
      
      console.log(
        `✅ ${stats.series}/${totalPending} (${progress}%) | ` +
        `${stats.seasons} موسم | ` +
        `${stats.episodes} حلقة | ` +
        `${rate}/دقيقة | ` +
        `ETA: ${eta} دقيقة`
      )
      db.prepare(`
        INSERT OR REPLACE INTO ingestion_progress
        (script_name, total_fetched, total_errors, last_run, status)
        VALUES ('INGEST-SERIES', ?, ?, datetime('now'), 'running')
      `).run(stats.series, stats.errors)
    }

  } catch (e) {
    // ✅ تسجيل الأخطاء الحقيقية فقط (فشل API)
    if (e.message.includes('404')) {
      // المسلسل غير موجود في TMDB - نضع علامة عليه
      db.prepare(`UPDATE tv_series SET is_filtered = 1, filter_reason = 'not_found_in_tmdb' WHERE id = ?`).run(id)
    } else {
      stats.errors++
      if (process.env.DEBUG) console.error(`❌ مسلسل ${id}: ${e.message}`)
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function main() {
  console.log('📺 بدء تحديث بيانات المسلسلات ⚡\n')

  // ✅ تحسين 1: Resume Capability - استئناف من آخر نقطة
  const lastProgress = db.prepare(`
    SELECT last_processed_id FROM ingestion_progress 
    WHERE script_name = 'INGEST-SERIES'
  `).get()
  const lastId = lastProgress?.last_processed_id || 0

  // ✅ معالجة المسلسلات التي:
  // 1. لم يتم سحبها بعد (بدون بيانات أساسية)
  // 2. تحتاج ترجمة (لديها overview_en لكن بدون title_ar)
  // 3. مسحوبة لكن بدون مواسم (إعادة محاولة)
  // 4. مسحوبة لكن بدون ممثلين (إعادة محاولة)
  const pending = db.prepare(`
    SELECT id FROM tv_series 
    WHERE id > ?
      AND (
        -- لم يُسحب بعد
        (overview_en IS NULL AND is_filtered = 0)
        -- أو يحتاج ترجمة
        OR (overview_en IS NOT NULL AND (title_ar = 'TBD' OR title_ar IS NULL))
        -- أو مسحوب لكن بدون مواسم (number_of_seasons > 0 لكن لا مواسم في الجدول)
        OR (overview_en IS NOT NULL 
            AND number_of_seasons > 0 
            AND NOT EXISTS (SELECT 1 FROM seasons WHERE series_id = tv_series.id))
        -- أو مسحوب لكن بدون ممثلين
        OR (overview_en IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = tv_series.id AND content_type = 'tv'))
      )
    ORDER BY id
  `).all(lastId)

  console.log(`📦 ${pending.length.toLocaleString()} مسلسل محتاج تحديث`)
  if (lastId > 0) {
    console.log(`🔄 استئناف من ID: ${lastId}`)
  }
  console.log('')

  // معالجة دفعات صغيرة لتجنب تجميد الذاكرة
  // ✅ تحسين: استخدام BATCH_SIZE من الأعلى (200 بدلاً من 100)
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map(s => limiter(() => processSeries(s.id))))
    
    // ✅ حفظ التقدم بعد كل دفعة
    const lastProcessedId = batch[batch.length - 1].id
    db.prepare(`
      INSERT OR REPLACE INTO ingestion_progress
      (script_name, last_processed_id, total_fetched, total_errors, last_run, status)
      VALUES ('INGEST-SERIES', ?, ?, ?, datetime('now'), 'running')
    `).run(lastProcessedId, stats.series, stats.errors)
    
    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= pending.length) {
      const progress = (((i + batch.length) / pending.length) * 100).toFixed(1)
      const elapsed = (Date.now() - stats.start) / 60000
      const rate = ((i + batch.length) / elapsed).toFixed(0)
      const remaining = pending.length - (i + batch.length)
      const eta = remaining > 0 ? (remaining / rate).toFixed(0) : 0
      
      console.log(`⏳ ${i + batch.length}/${pending.length} (${progress}%) | ${rate}/دقيقة | ETA: ${eta} دقيقة`)
    }
  }

  const mins = (Date.now() - stats.start) / 60000
  console.log(`
╔══════════════════════════════════════╗
║     ✅ اكتمل تحديث المسلسلات        ║
╠══════════════════════════════════════╣
║ محدّث:      ${String(stats.series).padEnd(25)}║
║ مواسم:      ${String(stats.seasons).padEnd(25)}║
║ حلقات:      ${String(stats.episodes).padEnd(25)}║
║ ممثلين:     ${String(stats.cast).padEnd(25)}║
║ ترجمات:     ${String(stats.translated).padEnd(25)}║
║ Groq:       ${String(stats.groq_generated).padEnd(25)}║
║ أخطاء:      ${String(stats.errors).padEnd(25)}║
║ الوقت:      ${mins.toFixed(1)} دقيقة${' '.repeat(Math.max(0, 19 - mins.toFixed(1).length))}║
╚══════════════════════════════════════╝
  `)

  db.prepare(`
    INSERT OR REPLACE INTO ingestion_progress
    (script_name, total_fetched, total_errors, last_run, status)
    VALUES ('INGEST-SERIES', ?, ?, datetime('now'), 'done')
  `).run(stats.series, stats.errors)
}

main().catch(console.error)



