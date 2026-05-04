// ============================================
// 🎬 MOVIES INGESTION LOGIC - FIXED VERSION
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
const TMDB_KEY  = process.env.TMDB_API_KEY || 'afef094e7c0de13c1cac98227a61da4d'
const GROQ_KEY  = process.env.GROQ_API_KEY
const TMDB_URL  = 'https://api.themoviedb.org/3'
const GROQ_URL  = 'https://api.groq.com/openai/v1/chat/completions'

const CONCURRENCY = 50
const BATCH_SIZE  = 200
const CHUNK_SIZE  = 1000

const limiter = pLimit(CONCURRENCY)

const stats = {
  fetched: 0,           // ✅ إجمالي المسحوب
  complete: 0,          // ✅ المسحوب والمكتمل
  filtered: 0,          // ✅ المسحوب والمفلتر
  not_found: 0,         // ✅ المسحوب لكن غير موجود
  errors: 0,            // ✅ الأخطاء
  cast: 0,
  translated: 0,
  groq_generated: 0,
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
  const checks = [
    base,
    year ? `${base}-${year}` : null,
    year && primaryGenre ? `${base}-${year}-${toSlug(primaryGenre)}` : null,
  ].filter(Boolean)

  for (const slug of checks) {
    if (!db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug)) return slug
  }
  for (let i = 2; i <= 999; i++) {
    const s = year ? `${base}-${year}-${i}` : `${base}-${i}`
    if (!db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(s)) return s
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
// TMDB FETCH مع Retry
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
// تنظيف النص
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

function isValidTranslation(text) {
  return !!(text && text.trim().length > 0)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRANSLATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function translateWithCache(text, targetLang = 'ar', contentType = 'title') {
  if (!text || text.trim().length < 2) return null
  const key = text.substring(0, 500)

  const cached = db.prepare(
    'SELECT translated_text FROM translation_cache WHERE source_text = ? AND target_lang = ?'
  ).get(key, targetLang)
  if (cached && isValidTranslation(cached.translated_text)) return cached.translated_text

  let result = null
  const cleanedText = cleanTextForTranslation(text)

  // 1️⃣ Google
  try {
    const translated = await translateContent({ title: cleanedText })
    const candidate = targetLang === 'ar'
      ? (translated.title_ar || null)
      : (translated.title_en || translated.title_ar || null)
    if (candidate && isValidTranslation(candidate)) result = candidate
  } catch (err) {
    console.log(`⚠️ Google: ${err.message}`)
  }

  // 2️⃣ Groq
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
              content: `أنت مترجم محترف متخصص في ترجمة أسماء الأفلام. اكتب الترجمة مباشرة فقط بدون أي مقدمات.`
            },
            {
              role: 'user',
              content: `ترجم اسم الفيلم "${cleanedText}" إلى ${langLabel}`
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
      console.log(`⚠️ Groq: ${err.message}`)
    }
  }

  // 3️⃣ Mistral
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
              content: `Professional movie title translator. Write translation directly, no introductions.`
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
      console.log(`⚠️ Mistral: ${err.message}`)
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
// GROQ GENERATORS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function generateOverviewWithGroq(titleAr, titleEn, year) {
  if (!GROQ_KEY) return null
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `أنت كاتب محتوى سينمائي. ابدأ مباشرة بالوصف. فقرة من 3-5 جمل. لا مقدمات.`
          },
          {
            role: 'user',
            content: `اكتب وصفاً مشوقاً للفيلم "${titleAr || titleEn}"${year ? ` (${year})` : ''}.`
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim()
    if (text && text.length > 50) {
      stats.groq_generated++
      return text
    }
  } catch {}
  return null
}

async function generateBiographyWithGroq(nameAr, nameEn, knownFor, country) {
  if (!GROQ_KEY) return null
  try {
    let context = `اكتب نبذة مختصرة عن الممثل "${nameAr || nameEn}"`
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
            content: `كاتب سير ذاتية. ابدأ مباشرة. فقرة من 2-3 جمل. لا مقدمات.`
          },
          { role: 'user', content: context }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim()
    if (text && text.length > 30) return text
  } catch {}
  return null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROCESS PERSON
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

      let name_en, name_ar
      if (isArabicName) {
        name_ar = rawName
        name_en = await translateWithCache(rawName, 'en') || rawName
      } else {
        name_en = rawName
        name_ar = await translateWithCache(rawName, 'ar') || rawName
      }

      const slug = generatePersonSlug(name_en || rawName)

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
          (id, tmdb_id, slug, name_en, name_ar,
           biography_en, biography_ar,
           profile_path, gender, known_for_department,
           birthday, place_of_birth, popularity, is_active)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(
          id, id, slug, name_en, name_ar,
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
        VALUES (?,?,?,'cast',?,?)
      `).run(contentId, contentType, id, personData.character || null, castOrder)
    } else {
      db.prepare(`
        INSERT OR IGNORE INTO cast_crew
        (content_id, content_type, person_id, role_type, job, department)
        VALUES (?,?,?,'crew',?,?)
      `).run(contentId, contentType, id, personData.job || null, personData.department || null)
    }
    stats.cast++
  } catch (e) {
    console.error(`❌ Cast/Crew ${id}: ${e.message}`)
    stats.errors++
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROCESS MOVIE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function processMovie(id) {
  try {
    const movie = await fetchTMDB(`/movie/${id}`, {
      append_to_response: 'credits,translations,keywords,videos,release_dates'
    })

    if (!movie) {
      db.prepare(`
        UPDATE movies 
        SET is_filtered = 1, filter_reason = 'not_found_in_tmdb', is_complete = 0, is_fetched = 1, fetched_at = datetime('now'), fetched_from = 'tmdb'
        WHERE id = ?
      `).run(id)
      stats.not_found++
      stats.fetched++
      return
    }

    if (shouldFilterContent(movie)) {
      const reason = getFilterReason(movie)
      db.prepare(`
        UPDATE movies SET is_filtered = 1, filter_reason = ?, is_complete = 0 
        WHERE id = ?
      `).run(reason, id)
      stats.filtered++
      stats.fetched++
      return
    }

    // ── العنوان ──
    const arTrans = movie.translations?.translations?.find(t => t.iso_639_1 === 'ar')
    let title_ar    = arTrans?.data?.title   || null
    let overview_ar = arTrans?.data?.overview || null

    const rawTitle = movie.title || movie.original_title || ''
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
      'SELECT title_ar, overview_ar, has_arabic_title, has_arabic_overview FROM movies WHERE id = ?'
    ).get(id)

    if (existing?.has_arabic_title === 1 && existing?.title_ar && existing.title_ar !== 'TBD') {
      title_ar = existing.title_ar
    }
    if (existing?.has_arabic_overview === 1 && existing?.overview_ar) {
      overview_ar = existing.overview_ar
    }

    const release_year  = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null
    const primary_genre = movie.genres?.[0]?.name?.toLowerCase() || null
    const slug = generateUniqueSlug(title_en, release_year, primary_genre, 'movies')

    // ── الوصف ──
    const overview_en = movie.overview || null
    if (!overview_ar && overview_en) {
      overview_ar = await translateWithCache(overview_en, 'ar')
    }
    if (!overview_ar) {
      overview_ar = await generateOverviewWithGroq(title_ar, title_en, release_year)
    }

    // ── الفيديوهات ──
    const videos = (movie.videos?.results || [])
      .filter(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))
    const trailer_key = videos[0]?.key || null

    // ── الكلمات المفتاحية ──
    const keywords = movie.keywords?.keywords?.length > 0
      ? JSON.stringify(movie.keywords.keywords.slice(0, 20).map(k => k.name))
      : null

    // ── التصنيف العمري ──
    let content_rating = null
    if (movie.release_dates?.results) {
      for (const country of ['EG', 'SA', 'US']) {
        const release = movie.release_dates.results.find(r => r.iso_3166_1 === country)
        if (release?.release_dates?.[0]?.certification) {
          content_rating = release.release_dates[0].certification
          break
        }
      }
    }

    // ── شركات الإنتاج ──
    const production_companies = movie.production_companies?.length > 0
      ? JSON.stringify(movie.production_companies.map(c => ({
          id: c.id, name: c.name,
          logo_path: c.logo_path,
          origin_country: c.origin_country
        })))
      : null

    const country_of_origin = movie.production_countries?.[0]?.iso_3166_1 || null

    // ── SEO ──
    const seoData = generateCompleteSEO({
      title_ar, title_en, title_original: movie.original_title,
      overview_ar, release_year, primary_genre,
      vote_average: movie.vote_average,
      keywords, slug, content_type: 'movie'
    })

    const isComplete = (
      title_ar && title_ar !== 'TBD' &&
      title_en && overview_ar && movie.poster_path &&
      movie.credits?.cast?.length > 0 &&
      movie.genres?.length > 0
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

    // ── UPDATE ──
    db.prepare(`
      UPDATE movies SET
        title_ar = ?, title_en = ?, title_original = ?, slug = ?,
        overview_ar = ?, overview_en = ?,
        primary_genre = ?, keywords = ?,
        poster_path = ?, backdrop_path = ?,
        trailer_key = ?, imdb_id = ?,
        release_date = ?, release_year = ?, runtime = ?,
        original_language = ?, country_of_origin = ?,
        production_companies = ?,
        vote_average = ?, vote_count = ?, popularity = ?,
        has_arabic_title = ?, has_arabic_overview = ?,
        has_trailer = ?, has_keywords = ?,
        is_complete = ?, sync_priority = ?,
        seo_keywords_json = ?, seo_title_ar = ?, seo_title_en = ?,
        seo_description_ar = ?, canonical_url = ?,
        is_fetched = 1, fetched_at = datetime('now'), fetched_from = 'tmdb',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title_ar, title_en, movie.original_title, slug,
      overview_ar, overview_en,
      primary_genre, keywords,
      movie.poster_path, movie.backdrop_path,
      trailer_key, movie.imdb_id,
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
    for (const g of movie.genres || []) insertGenre.run(id, g.id)
    if (movie.genres?.length > 0) {
      db.prepare(`UPDATE movies SET has_genres = 1 WHERE id = ?`).run(id)
    }

    // ── الممثلين ──
    const castList = (movie.credits?.cast || []).slice(0, 10)
    for (let i = 0; i < castList.length; i++) {
      await processPerson(castList[i], id, 'movie', i, 'cast')
    }
    if (castList.length > 0) {
      db.prepare(`UPDATE movies SET has_cast = 1 WHERE id = ?`).run(id)
    }

    // ── الطاقم المهم ──
    const importantJobs = ['Director', 'Writer', 'Screenplay', 'Producer',
                           'Executive Producer', 'Director of Photography',
                           'Original Music Composer', 'Editor']
    const importantCrew = (movie.credits?.crew || [])
      .filter(c => importantJobs.includes(c.job))
    for (const member of importantCrew) {
      await processPerson(member, id, 'movie', 0, 'crew')
    }

    stats.movies++
    stats.complete++
    stats.fetched++

    if (stats.movies % 50 === 0) {
      const mins = (Date.now() - stats.start) / 60000
      const rate = (stats.movies / mins).toFixed(0)
      console.log(
        `✅ ${stats.complete} مكتمل | 🎭 ${stats.cast} | ` +
        `🚫 ${stats.filtered} مفلتر | ❌ ${stats.errors} | ` +
        `⚡ ${rate}/دقيقة`
      )
    }

  } catch (e) {
    if (e.message?.includes('404')) {
      db.prepare(`
        UPDATE movies 
        SET is_filtered = 1, filter_reason = 'not_found_in_tmdb', is_complete = 0, is_fetched = 1, fetched_at = datetime('now'), fetched_from = 'tmdb'
        WHERE id = ?
      `).run(id)
      stats.not_found++
      stats.fetched++
    } else {
      stats.errors++
      if (process.env.DEBUG) console.error(`❌ فيلم ${id}: ${e.message}`)
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// حفظ التقدم
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function saveProgress(lastId, status = 'running') {
  const mins = (Date.now() - stats.start) / 60000
  const rate = mins > 0 ? (stats.movies / mins) : 0

  const exists = db.prepare(
    'SELECT id FROM ingestion_progress WHERE script_name = ?'
  ).get('INGEST-MOVIES')

  if (exists) {
    db.prepare(`
      UPDATE ingestion_progress SET
        last_processed_id = ?,
        total_fetched = ?,
        total_errors = ?,
        total_filtered = ?,
        total_404 = ?,
        rate_per_minute = ?,
        last_run = datetime('now'),
        status = ?
      WHERE script_name = ?
    `).run(
      lastId,
      stats.movies, stats.errors,
      stats.filtered, stats.not_found,
      rate, status,
      'INGEST-MOVIES'
    )
  } else {
    db.prepare(`
      INSERT INTO ingestion_progress
      (script_name, last_processed_id, total_fetched, total_errors,
       total_filtered, total_404, rate_per_minute, last_run, status)
      VALUES (?,?,?,?,?,?,?,datetime('now'),?)
    `).run(
      'INGEST-MOVIES', lastId,
      stats.movies, stats.errors,
      stats.filtered, stats.not_found,
      rate, status
    )
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function main() {
  console.log('🎬 بدء تحديث بيانات الأفلام ⚡\n')

  const totalPending = db.prepare(`
    SELECT COUNT(*) as c FROM movies
    WHERE (
      is_fetched = 0                                       -- لم يُسحب بعد
      OR (is_fetched = 1 AND is_filtered = 0 AND (title_ar = 'TBD' OR title_ar IS NULL))   -- سُحب لكن بدون عربي
      OR (is_fetched = 1 AND is_filtered = 0 AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = movies.id AND content_type = 'movie'))  -- سُحب لكن بدون ممثلين
    )
  `).get().c

  console.log(`📦 إجمالي الأفلام المحتاجة: ${totalPending.toLocaleString()}`)
  console.log(`⚡ CONCURRENCY: ${CONCURRENCY} | BATCH: ${BATCH_SIZE} | CHUNK: ${CHUNK_SIZE}\n`)

  let offset = 0
  let totalProcessed = 0

  while (true) {
    const chunk = db.prepare(`
      SELECT id FROM movies
      WHERE (
        is_fetched = 0
        OR (is_fetched = 1 AND is_filtered = 0 AND (title_ar = 'TBD' OR title_ar IS NULL))
        OR (is_fetched = 1 AND is_filtered = 0 AND NOT EXISTS (SELECT 1 FROM cast_crew WHERE content_id = movies.id AND content_type = 'movie'))
      )
      ORDER BY vote_count DESC, id ASC
      LIMIT ? OFFSET ?
    `).all(CHUNK_SIZE, offset)

    if (chunk.length === 0) break

    for (let i = 0; i < chunk.length; i += BATCH_SIZE) {
      const batch = chunk.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map(m => limiter(() => processMovie(m.id))))

      totalProcessed += batch.length
      const lastId = batch[batch.length - 1].id

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
║     ✅ اكتمل تحديث الأفلام          ║
╠══════════════════════════════════════╣
║ مسحوب (إجمالي): ${String(stats.fetched).padEnd(20)}║
║ مكتمل:         ${String(stats.complete).padEnd(20)}║
║ مفلتر:         ${String(stats.filtered).padEnd(20)}║
║ غير موجود:    ${String(stats.not_found).padEnd(20)}║
║ ممثلين:        ${String(stats.cast).padEnd(20)}║
║ أخطاء:         ${String(stats.errors).padEnd(20)}║
║ ترجمات:        ${String(stats.translated).padEnd(20)}║
║ Groq:          ${String(stats.groq_generated).padEnd(20)}║
║ الوقت:         ${mins.toFixed(1)} دقيقة${' '.repeat(Math.max(0, 19 - mins.toFixed(1).length))}║
╚══════════════════════════════════════╝
  `)

  saveProgress(0, 'done')
}

main().catch(console.error)