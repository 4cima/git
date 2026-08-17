// ============================================
// 📺 SERIES INGESTION LOGIC — v2 (SAFETY FIXED)
// ============================================
// نفس تعديلات سكريبت الأفلام:
//  1) فلتر content-filter.js v2 (keywords + certifications + cast bug مُصلَّح)
//  2) content_rating بقى بيتخزن فعليًا في age_rating
//  3) is_filtered / filter_reason بيترجعوا لـ 0/NULL عند النجاح
// ============================================
require('dotenv').config({ path: './.env.local' })
const db = require('./services/local-db')
const { translateContent } = require('./services/translation-service-cjs')
const { shouldFilterContent, getFilterReason, pickDisplayCertification } = require('./services/content-filter')
const { generateCompleteSEO } = require('./services/seo-generator')
const pLimit = require('p-limit').default || require('p-limit')

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const TMDB_KEY    = process.env.TMDB_API_KEY_2 || '1298554bf3b09eee57972f0876ad096e'
const GROQ_KEY    = process.env.GROQ_API_KEY
const TMDB_URL    = 'https://api.themoviedb.org/3'
const GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions'

const CONCURRENCY        = 1   // طلبات متزامنة
const SEASON_CONCURRENCY = 10   // مواسم متزامنة لكل مسلسل
const BATCH_SIZE         = 200  // حجم الدفعة
const CHUNK_SIZE         = 1000 // سحب من DB دفعة دفعة

const seriesLimiter = pLimit(CONCURRENCY)
const seasonLimiter = pLimit(SEASON_CONCURRENCY)

const stats = {
  series: 0, seasons: 0, episodes: 0,
  errors: 0, filtered: 0, cast: 0,
  translated: 0, groq_generated: 0,
  not_found: 0,
  start: Date.now()
}
const actorCache = new Map()

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
  
  if (!base || base === 'unknown') {
    return `unknown-${Date.now()}`
  }
  
  // السياسة المعتمدة: base → base-year → base-year-genre
  const checks = [
    base,
    year ? `${base}-${year}` : null,
    year && primaryGenre ? `${base}-${year}-${toSlug(primaryGenre)}` : null,
  ].filter(Boolean)

  for (const slug of checks) {
    if (!db.prepare(`SELECT tmdb_id FROM ${table} WHERE slug = ?`).get(slug)) return slug
  }
  
  // رقم تسلسلي (نادر)
  const lastAttempt = checks[checks.length - 1] || base
  for (let i = 2; i <= 999; i++) {
    const s = `${lastAttempt}-${i}`
    if (!db.prepare(`SELECT tmdb_id FROM ${table} WHERE slug = ?`).get(s)) return s
  }
  
  return `${base}-${Date.now()}`
}

function generatePersonSlug(nameEn) {
  // People table doesn't have slug column - just use name
  return toSlug(nameEn) || `person-${Date.now()}`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TMDB FETCH مع Retry للـ 429
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchTMDB(endpoint, params = {}, retries = 3) {
  const url = new URL(`${TMDB_URL}${endpoint}`)
  url.searchParams.set('api_key', TMDB_KEY)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url.toString())

      if (res.status === 429) {
        const wait = (attempt + 1) * 10000
        console.log(`⏳ Rate limit - انتظار ${wait / 1000}s...`)
        await sleep(wait)
        continue
      }

      if (res.status === 404) return null
      if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`)
      return res.json()

    } catch (e) {
      if (attempt === retries - 1) throw e
      await sleep(2000 * (attempt + 1))
    }
  }
  return null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// تنظيف النص قبل الترجمة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function cleanTextForTranslation(text) {
  if (!text) return text
  return text
    .replace(/[.]/g, ' ')
    .replace(/[:]/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// تحقق من جودة الترجمة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function isValidTranslation(text) {
  return !!(text && text.trim().length > 0)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRANSLATION مع Cache
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function translateWithCache(text, targetLang = 'ar', contentType = 'title') {
  if (!text || text.trim().length < 2) return null
  const key = text.substring(0, 500)

  const cached = db.prepare(
    'SELECT translated_text FROM translation_cache WHERE source_text = ? AND target_lang = ?'
  ).get(key, targetLang)

  if (cached && isValidTranslation(cached.translated_text)) {
    return cached.translated_text
  }

  let result = null
  const cleanedText = cleanTextForTranslation(text)

  // 1️⃣ Google Translate
  try {
    const translated = await translateContent({ title: cleanedText })
    const candidate = targetLang === 'ar'
      ? (translated.title_ar || null)
      : (translated.title_en || translated.title_ar || null)
    if (candidate && isValidTranslation(candidate)) result = candidate
  } catch (err) {
    console.log(`⚠️ Google Translate Error: ${err.message}`)
  }

  // 2️⃣ Groq fallback
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
          messages: [
            {
              role: 'system',
              content: `أنت مترجم محترف متخصص في ترجمة أسماء المسلسلات.
قواعد صارمة:
- لا تكتب أي مقدمات أو تعليقات
- اكتب الترجمة مباشرة فقط
- إذا كان النص اسم علم، احتفظ به أو اكتب النطق العربي`
            },
            {
              role: 'user',
              content: `ترجم اسم المسلسل "${cleanedText}" إلى ${langLabel}`
            }
          ],
          max_tokens: 500,
          temperature: 0.1
        })
      })
      if (res.ok) {
        const data = await res.json()
        const candidate = data.choices?.[0]?.message?.content?.trim() || null
        if (candidate && isValidTranslation(candidate)) result = candidate
      }
    } catch (err) {
      console.log(`⚠️ Groq Error: ${err.message}`)
    }
  }

  // 3️⃣ Mistral fallback
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
          messages: [
            {
              role: 'system',
              content: `You are a professional translator for TV series titles. Write translation directly, no introductions.`
            },
            {
              role: 'user',
              content: `Translate "${cleanedText}" to ${langLabel}`
            }
          ],
          max_tokens: 300,
          temperature: 0.1
        })
      })
      if (res.ok) {
        const data = await res.json()
        const candidate = data.choices?.[0]?.message?.content?.trim() || null
        if (candidate && isValidTranslation(candidate)) result = candidate
      }
    } catch (err) {
      console.log(`⚠️ Mistral Error: ${err.message}`)
    }
  }

  if (result && isValidTranslation(result)) {
    try {
      db.prepare(
        'INSERT OR REPLACE INTO translation_cache (source_text, target_lang, translated_text) VALUES (?, ?, ?)'
      ).run(key, targetLang, result)
      stats.translated++
    } catch {}
  }

  return result || null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GROQ CONTENT GENERATOR
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
        messages: [
          {
            role: 'system',
            content: `أنت كاتب محتوى سينمائي محترف.
قواعد صارمة:
- ابدأ مباشرة بالوصف بدون أي مقدمة
- فقرة واحدة من 3-5 جمل
- لا تذكر أنك ذكاء اصطناعي`
          },
          {
            role: 'user',
            content: `اكتب وصفاً مشوقاً باللغة العربية لـ ${type} بعنوان "${titleAr || titleEn}"${year ? ` إنتاج ${year}` : ''}.`
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim()
    if (text && text.length > 50 && isValidTranslation(text)) {
      stats.groq_generated++
      return text
    }
  } catch {}
  return null
}

async function generateBiographyWithGroq(nameAr, nameEn, knownFor, country) {
  if (!GROQ_KEY) return null
  try {
    let context = `اكتب نبذة مختصرة باللغة العربية عن الممثل "${nameAr || nameEn}"`
    if (knownFor) context += ` المعروف بـ "${knownFor}"`
    if (country) context += ` من ${country}`
    context += '.'

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: `أنت كاتب سير ذاتية محترف. ابدأ مباشرة بالمعلومات. فقرة واحدة من 2-3 جمل فقط. لا تذكر أنك ذكاء اصطناعي.`
          },
          { role: 'user', content: context }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim()
    if (text && text.length > 30 && isValidTranslation(text)) return text
  } catch {}
  return null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROCESS PERSON
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function processPerson(personData, contentTmdbId, contentType, castOrder, roleType = 'cast') {
  const tmdb_id = personData.id

  if (!actorCache.has(tmdb_id)) {
    const exists = db.prepare('SELECT tmdb_id FROM people WHERE tmdb_id = ?').get(tmdb_id)
    if (exists) {
      actorCache.set(tmdb_id, true)
    } else {
      // سحب التفاصيل الكاملة من TMDB
      let fullPersonData = null
      try { fullPersonData = await fetchTMDB(`/person/${id}`) } catch {}

      const rawName = personData.name || ''
      const isArabicName = /[\u0600-\u06FF]/.test(rawName)

      let name_en, name_ar
      if (isArabicName) {
        name_ar = rawName
        name_en = await translateWithCache(rawName, 'en') || rawName
      } else {
        name_en = rawName
        name_ar = await translateWithCache(rawName, 'ar') || rawName
      }

      let biography_en = fullPersonData?.biography || null
      let biography_ar = null
      if (biography_en) {
        biography_ar = await translateWithCache(biography_en.substring(0, 500), 'ar')
      }
      if (!biography_ar) {
        biography_ar = await generateBiographyWithGroq(
          name_ar, name_en,
          personData.character || personData.known_for_department,
          fullPersonData?.place_of_birth
        )
      }

      try {
        db.prepare(`
          INSERT OR IGNORE INTO people
          (tmdb_id, name_en, name_ar,
           profile_path, gender, known_for_department,
           popularity)
          VALUES (?,?,?,?,?,?,?)
        `).run(
          tmdb_id, name_en, name_ar,
          personData.profile_path || null,
          fullPersonData?.gender || null,
          personData.known_for_department || fullPersonData?.known_for_department || 'Acting',
          personData.popularity || 0
        )
        actorCache.set(tmdb_id, true)
      } catch (e) {
        console.error(`❌ Person ${tmdb_id}: ${e.message}`)
        stats.errors++
      }
    }
  }

  try {
    if (roleType === 'cast') {
      db.prepare(`
        INSERT OR IGNORE INTO cast_crew
        (content_tmdb_id, content_type, person_tmdb_id, role_type, character_name, cast_order)
        VALUES (?,?,?,'cast',?,?)
      `).run(contentTmdbId, contentType, tmdb_id, personData.character || null, castOrder)
    } else {
      db.prepare(`
        INSERT OR IGNORE INTO cast_crew
        (content_tmdb_id, content_type, person_tmdb_id, role_type, job, department)
        VALUES (?,?,?,'crew',?,?)
      `).run(contentTmdbId, contentType, tmdb_id, personData.job || null, personData.department || null)
    }
    stats.cast++
  } catch (e) {
    console.error(`❌ Cast/Crew ${tmdb_id}: ${e.message}`)
    stats.errors++
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROCESS SERIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function processSeries(tmdbId) {
  try {
    // append_to_response بيجيب content_ratings (للتصنيف العمري) و keywords
    const series = await fetchTMDB(`/tv/${tmdbId}`, {
      append_to_response: 'credits,translations,keywords,videos,external_ids,content_ratings'
    })

    // 404 - مش موجود في TMDB
    if (!series) {
      db.prepare(`
        UPDATE tv_series 
        SET is_filtered = 1, filter_reason = 'not_found_in_tmdb', is_complete = 0 
        WHERE tmdb_id = ?
      `).run(tmdbId)
      stats.not_found++
      return
    }

    // ── فحص السلامة/الجودة قبل أي معالجة أو ترجمة ──
    if (shouldFilterContent(series)) {
      const reason = getFilterReason(series)
      db.prepare(`
        UPDATE tv_series 
        SET is_filtered = 1, filter_reason = ?, is_complete = 0 
        WHERE tmdb_id = ?
      `).run(reason, tmdbId)
      stats.filtered++ // ← منفصل عن errors
      return
    }

    // ── العنوان ──
    const arTrans = series.translations?.translations?.find(t => t.iso_639_1 === 'ar')
    let title_ar    = arTrans?.data?.name     || null
    let overview_ar = arTrans?.data?.overview || null

    const rawTitle = series.name || series.original_name || ''
    const isArabicTitle = /[\u0600-\u06FF]/.test(rawTitle)

    let title_en
    if (isArabicTitle) {
      title_ar = title_ar || rawTitle
      title_en = await translateWithCache(rawTitle, 'en') || rawTitle
    } else {
      title_en = rawTitle
      if (!title_ar) {
        title_ar = await translateWithCache(title_en, 'ar') || 'TBD'
      }
    }

    // ━━━ حماية الترجمات الموجودة ━━━
    const existing = db.prepare(
      'SELECT name_ar, overview_ar FROM tv_series WHERE tmdb_id = ?'
    ).get(tmdbId)

    if (existing?.name_ar && existing.name_ar !== 'TBD') {
      title_ar = existing.name_ar // لا تكتب فوق ترجمة موجودة
    }
    if (existing?.overview_ar) {
      overview_ar = existing.overview_ar // لا تكتب فوق ترجمة موجودة
    }

    const first_air_year = series.first_air_date
      ? parseInt(series.first_air_date.split('-')[0])
      : null
    const primary_genre  = series.genres?.[0]?.name?.toLowerCase() || null
    const slug = generateUniqueSlug(title_en, first_air_year, primary_genre, 'tv_series')

    // ── الوصف ──
    const overview_en = series.overview || null
    if (!overview_ar && overview_en) {
      overview_ar = await translateWithCache(overview_en, 'ar')
    }
    if (!overview_ar) {
      overview_ar = await generateOverviewWithGroq(title_ar, title_en, first_air_year, 'مسلسل')
    }

    // ── الفيديوهات ──
    const videos = (series.videos?.results || [])
      .filter(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))
    const trailer_key    = videos[0]?.key || null
    const trailer_key_2  = videos[1]?.key || null

    const imdb_id = series.external_ids?.imdb_id || null

    // ── شركات الإنتاج ──
    const production_companies = series.production_companies?.length > 0
      ? JSON.stringify(series.production_companies.map(c => ({
          id: c.id, name: c.name,
          logo_path: c.logo_path,
          origin_country: c.origin_country
        })))
      : null

    const country_of_origin = series.origin_country?.[0] || null

    // ── الكلمات المفتاحية ──
    const keywords = series.keywords?.results?.length > 0
      ? JSON.stringify(series.keywords.results.slice(0, 20).map(k => k.name))
      : null

    // ── التصنيف العمري (نفس منطق الفلتر بالظبط - مصدر واحد للحقيقة) ──
    const content_rating = pickDisplayCertification(series)

    // ── SEO ──
    const seoData = generateCompleteSEO({
      title_ar, title_en, title_original: series.original_name,
      overview_ar, first_air_year, primary_genre,
      vote_average: series.vote_average,
      keywords, slug, content_type: 'series'
    })

    // ── is_complete (مبدئي - بدون مواسم) ──
    const isComplete = (
      title_ar && title_ar !== 'TBD' &&
      title_en && overview_ar && series.poster_path &&
      series.credits?.cast?.length > 0 &&
      series.genres?.length > 0
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

    // ── UPDATE tv_series ──
    db.prepare(`
      UPDATE tv_series SET
        name_ar = ?, name_en = ?, name_original = ?, slug = ?,
        overview_ar = ?, overview_en = ?,
        primary_genre = ?,
        poster_path = ?, backdrop_path = ?,
        trailer_key = ?, imdb_id = ?,
        first_air_date = ?, last_air_date = ?, first_air_year = ?,
        number_of_seasons = ?, number_of_episodes = ?, status = ?,
        original_language = ?, country_of_origin = ?,
        production_companies = ?,
        vote_average = ?, vote_count = ?, popularity = ?,
        age_rating = ?,
        is_fetched = 1, is_filtered = 0, filter_reason = NULL,
        is_complete = ?, sync_priority = ?,
        seo_keywords_json = ?, seo_title_ar = ?,
        seo_description_ar = ?, canonical_url = ?,
        updated_at = datetime('now')
      WHERE tmdb_id = ?
    `).run(
      title_ar, title_en, series.original_name, slug,
      overview_ar, overview_en,
      primary_genre,
      series.poster_path, series.backdrop_path,
      trailer_key, imdb_id,
      series.first_air_date, series.last_air_date, first_air_year,
      series.number_of_seasons, series.number_of_episodes,
      series.status || 'ongoing',
      series.original_language, country_of_origin,
      production_companies,
      series.vote_average, series.vote_count, series.popularity,
      content_rating || 'PG',
      isComplete, syncPriority,
      seoData.seo_keywords_json, seoData.seo_title_ar,
      seoData.seo_description_ar, seoData.canonical_url,
      tmdbId
    )

    // ── الأنواع ──
    const insertGenre = db.prepare(`
      INSERT OR IGNORE INTO content_genres (content_tmdb_id, content_type, genre_tmdb_id)
      SELECT ?, 'tv', tmdb_id FROM genres WHERE tmdb_id = ?
    `)
    for (const g of series.genres || []) insertGenre.run(tmdbId, g.id)

    // ── الممثلين ──
    const castList = (series.credits?.cast || []).slice(0, 10)
    for (let i = 0; i < castList.length; i++) {
      await processPerson(castList[i], tmdbId, 'tv', i, 'cast')
    }

    // ── الطاقم المهم ──
    const importantJobs = ['Director', 'Writer', 'Screenplay', 'Producer',
                           'Executive Producer', 'Director of Photography',
                           'Original Music Composer', 'Editor']
    const importantCrew = (series.credits?.crew || [])
      .filter(c => importantJobs.includes(c.job))
    for (const member of importantCrew) {
      await processPerson(member, tmdbId, 'tv', 0, 'crew')
    }

    // ── المواسم والحلقات (limiter منفصل) ──
    const validSeasons = (series.seasons || []).filter(s => s.season_number > 0)

    const insertSeason = db.prepare(`
      INSERT OR IGNORE INTO seasons
      (series_tmdb_id, season_number, name_en, overview_en,
       poster_path, air_date, air_year, episode_count)
      VALUES (?,?,?,?,?,?,?,?)
    `)

    // سحب المواسم بـ limiter منفصل لمنع الـ deadlock
    const seasonResults = await Promise.all(
      validSeasons.map(season =>
        seasonLimiter(async () => {
          try {
            const details = await fetchTMDB(`/tv/${tmdbId}/season/${season.season_number}`)
            return { season, details }
          } catch {
            return { season, details: null }
          }
        })
      )
    )

    for (const { season, details } of seasonResults) {
      insertSeason.run(
        tmdbId, season.season_number,
        season.name, season.overview,
        season.poster_path, season.air_date,
        season.air_date ? parseInt(season.air_date.split('-')[0]) : null,
        season.episode_count || 0
      )
      stats.seasons++
    }

    // ── تحديث is_complete بعد المواسم ──
    const seasonsCount = db.prepare(
      'SELECT COUNT(*) as c FROM seasons WHERE series_tmdb_id = ?'
    ).get(tmdbId).c

    db.prepare(`
      UPDATE tv_series SET is_complete = ? WHERE tmdb_id = ?
    `).run(
      (isComplete === 1 && seasonsCount > 0) ? 1 : 0,
      tmdbId
    )

    stats.series++

    // ── تقرير كل 20 مسلسل ──
    if (stats.series % 20 === 0) {
      const mins = (Date.now() - stats.start) / 60000
      const rate = (stats.series / mins).toFixed(0)
      console.log(
        `✅ ${stats.series} | 🎬 ${stats.seasons} موسم | ` +
        `📺 ${stats.episodes} حلقة | ` +
        `🚫 ${stats.filtered} مفلتر | ` +
        `❌ ${stats.errors} خطأ | ` +
        `⚡ ${rate}/دقيقة`
      )
    }

  } catch (e) {
    if (e.message?.includes('404')) {
      db.prepare(`
        UPDATE tv_series 
        SET is_filtered = 1, filter_reason = 'not_found_in_tmdb' 
        WHERE tmdb_id = ?
      `).run(tmdbId)
      stats.not_found++
    } else {
      stats.errors++
      if (process.env.DEBUG) console.error(`❌ مسلسل ${tmdbId}: ${e.message}`)
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// حفظ التقدم بشكل صحيح
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function saveProgress(lastId, status = 'running') {
  const mins = (Date.now() - stats.start) / 60000
  const rate = mins > 0 ? (stats.series / mins) : 0

  // تحقق هل السجل موجود
  const exists = db.prepare(
    'SELECT script_name FROM ingestion_progress WHERE script_name = ?'
  ).get('INGEST-SERIES')

  if (exists) {
    db.prepare(`
      UPDATE ingestion_progress SET
        last_processed_tmdb_id = ?,
        total_fetched = ?,
        total_errors = ?,
        total_filtered = ?,
        total_not_found = ?,
        rate_per_minute = ?,
        last_run = datetime('now'),
        status = ?
      WHERE script_name = ?
    `).run(
      lastId,
      stats.series, stats.errors,
      stats.filtered, stats.not_found,
      rate, status,
      'INGEST-SERIES'
    )
  } else {
    db.prepare(`
      INSERT INTO ingestion_progress
      (script_name, last_processed_tmdb_id, total_fetched, total_errors,
       total_filtered, total_not_found, rate_per_minute, last_run, status)
      VALUES (?,?,?,?,?,?,?,datetime('now'),?)
    `).run(
      'INGEST-SERIES', lastId,
      stats.series, stats.errors,
      stats.filtered, stats.not_found,
      rate, status
    )
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function main() {
  console.log('📺 بدء تحديث بيانات المسلسلات ⚡ (فلتر سلامة v2)\n')

  // إجمالي المحتاج معالجة
  const totalPending = db.prepare(`
    SELECT COUNT(*) as c FROM tv_series
    WHERE (
      (overview_en IS NULL AND is_filtered = 0)
      OR (overview_en IS NOT NULL AND (name_ar = 'TBD' OR name_ar IS NULL))
      OR (overview_en IS NOT NULL AND number_of_seasons > 0
          AND NOT EXISTS (SELECT 1 FROM seasons WHERE series_tmdb_id = tv_series.tmdb_id))
      OR (overview_en IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_tmdb_id = tv_series.tmdb_id AND content_type = 'tv'))
    )
  `).get().c

  console.log(`📦 إجمالي المسلسلات المحتاجة: ${totalPending.toLocaleString()}`)
  console.log(`⚡ CONCURRENCY: ${CONCURRENCY} | SEASON: ${SEASON_CONCURRENCY}`)
  console.log(`📦 BATCH: ${BATCH_SIZE} | CHUNK: ${CHUNK_SIZE}\n`)
  console.log('ℹ️  ملاحظة: العناصر المكتملة (is_complete=1) مش هتتفحص تاني هنا.')
  console.log('   لفحص المحتوى المسحوب مسبقًا بالفلتر الجديد، شغّل AUDIT-EXISTING-CONTENT-SAFETY.js\n')

  let offset = 0
  let totalProcessed = 0

  // ━━━ Loop يسحب من DB دفعة دفعة (بدون تحميل كل شيء في الذاكرة) ━━━
  while (true) {
    // سحب CHUNK_SIZE من القاعدة
    const chunk = db.prepare(`
      SELECT tmdb_id FROM tv_series
      WHERE (
        (overview_en IS NULL AND is_filtered = 0)
        OR (overview_en IS NOT NULL AND (name_ar = 'TBD' OR name_ar IS NULL))
        OR (overview_en IS NOT NULL AND number_of_seasons > 0
            AND NOT EXISTS (SELECT 1 FROM seasons WHERE series_tmdb_id = tv_series.tmdb_id))
        OR (overview_en IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_tmdb_id = tv_series.tmdb_id AND content_type = 'tv'))
      )
      ORDER BY vote_count DESC, tmdb_id ASC
      LIMIT ? OFFSET ?
    `).all(CHUNK_SIZE, offset)

    if (chunk.length === 0) break

    // معالجة الـ chunk في batches
    for (let i = 0; i < chunk.length; i += BATCH_SIZE) {
      const batch = chunk.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map(s => seriesLimiter(() => processSeries(s.tmdb_id))))

      totalProcessed += batch.length
      const lastId = batch[batch.length - 1].tmdb_id

      // حفظ التقدم بعد كل batch
      saveProgress(lastId, 'running')

      const progress = ((totalProcessed / totalPending) * 100).toFixed(1)
      const elapsed  = (Date.now() - stats.start) / 60000
      const rate     = (totalProcessed / elapsed).toFixed(0)
      const eta      = elapsed > 0
        ? ((totalPending - totalProcessed) / (totalProcessed / elapsed)).toFixed(0)
        : '?'

      console.log(
        `⏳ ${totalProcessed}/${totalPending} (${progress}%) | ` +
        `${rate}/دقيقة | ETA: ${eta} دقيقة`
      )
    }

    offset += CHUNK_SIZE
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
║ مفلتر:      ${String(stats.filtered).padEnd(25)}║
║ غير موجود:  ${String(stats.not_found).padEnd(25)}║
║ أخطاء:      ${String(stats.errors).padEnd(25)}║
║ ترجمات:     ${String(stats.translated).padEnd(25)}║
║ Groq:       ${String(stats.groq_generated).padEnd(25)}║
║ الوقت:      ${mins.toFixed(1)} دقيقة${' '.repeat(Math.max(0, 19 - mins.toFixed(1).length))}║
╚══════════════════════════════════════╝
  `)

  saveProgress(0, 'done')
}

main().catch(console.error)
