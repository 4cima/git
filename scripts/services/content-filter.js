/**
 * ============================================================
 * 🛡️  CONTENT SAFETY FILTER — v2.0 (REWRITTEN)
 * ============================================================
 * الهدف: صفر تسامح مع أي محتوى جنسي أو فيه عري، + فلترة منفصلة
 * للمحتوى الضعيف الجودة (مش ليها علاقة بقرار السلامة).
 *
 * الفرق عن النسخة القديمة (v1):
 *  1) بيقرأ TMDB structured keywords (movie.keywords.keywords /
 *     tv.keywords.results) مش بس نص حر في العنوان والوصف.
 *     دي تاجات منظّمة بتحددها TMDB نفسها زي "nudity" أو
 *     "sex scene" — أدق بكتير من استنتاج من جملة.
 *
 *  2) التصنيف العمري الرسمي (release_dates / content_ratings)
 *     بيتقرا *جوه* الفلتر نفسه قبل أي قرار، مش بعده.
 *
 *  3) BUG FIX: النسخة القديمة كانت بتدوّر على content.cast
 *     وهو مش موجود في استجابة TMDB الخام — البيانات الحقيقية
 *     في content.credits.cast (أفلام ومسلسلات). كانت
 *     hasNoCast بترجع undefined دايمًا يعني الفحص ده عمره
 *     ما اشتغل فعليًا.
 *
 *  4) قائمة شركات إنتاج إباحية معروفة كخط دفاع إضافي (بعض
 *     المحتوى بييجي بعلم adult=false غلط من TMDB نفسها).
 *
 *  5) فصل واضح بين:
 *     - isExplicitContent()   → فلتر السلامة (صفر تسامح)
 *     - isLowQualityContent() → فلتر الجودة (تقييم/بوستر/وصف)
 *     عشان الاثنين يبانوا منفصلين في اللوجز والتقارير، ومحدش
 *     يقدر "يمرر" محتوى جنسي بحجة إنه تقييمه عالي.
 *
 * ملاحظة مهمة: تعديل الفلتر ده وحده مش كافي — لازم تشغّل
 * AUDIT-EXISTING-CONTENT-SAFETY.js عشان تفحص أي محتوى اتسحب
 * قبل كده بالفلتر القديم، لأن سكريبت السحب مش بيعيد فحص أي
 * عنصر already is_complete = 1.
 * ============================================================
 */

// ─────────────────────────────────────────────────────────────
// 1) نصوص صريحة (تُفحص داخل العنوان والوصف)
// ─────────────────────────────────────────────────────────────
const HARD_EXPLICIT_TEXT = [
  /\bporn\b/i, /\bporno\b/i, /\bpornography\b/i, /\bxxx\b/i, /\bhentai\b/i, /\berotic\b/i,
  /\bsoftcore\b/i, /\bhardcore\b/i, /\badult film\b/i, /\bsex tape\b/i,
  /سكس/, /بورن/, /إباحي/, /اباحي/, /عاري/, /عارية/, /علاقة جنسية/
]

const MILD_EXPLICIT_TEXT = [
  /\bsex\b/i, /\bsexy\b/i, /\bsexual\b/i, /\bnudity\b/i, /\bnude\b/i, /\bnaked\b/i,
  /\bstrip\b/i, /\bstripper\b/i, /\bprostitute\b/i, /\bbrothel\b/i
]

const SOFT_KEYWORDS_TEXT = [
  'seduces', 'seduction', 'lust', 'temptation', 'intimate', 'sensual',
  'affair', 'mistress', 'cheating', 'forbidden love'
]

// استثناءات موثّقة يدويًا (أفلام سينمائية معروفة اتصنفت غلط بسبب
// كلمة "xxx" جوه العنوان الأصلي بتاعها - راجع أي ID جديد يدويًا قبل الإضافة)
const ALLOWLIST_IDS = ['398', '1576', '369885', '1408', '37135', '37136']

// ─────────────────────────────────────────────────────────────
// 2) TMDB Structured Keywords — المصدر الأدق لأنه tags منظّمة
// ─────────────────────────────────────────────────────────────
// HARD = صفر تسامح، بيتفلتر فورًا بغض النظر عن التقييم أو الشهرة
const EXPLICIT_KEYWORDS_HARD = new Set([
  'nudity', 'female nudity', 'male nudity', 'full frontal nudity', 'rear nudity',
  'topless', 'sex scene', 'graphic sex', 'explicit sex', 'sexual content',
  'sexually explicit', 'erotica', 'erotic film', 'erotic thriller',
  'softcore', 'hardcore', 'hardcore pornography', 'pornography', 'pornographic',
  'porn', 'porn industry', 'xxx', 'adult film', 'adult movie', 'adult entertainment',
  'stripping', 'lap dance', 'orgy', 'gangbang', 'bdsm', 'fetish', 'masturbation',
  'sex tape', 'sex work', 'sex worker', 'live sex show'
])

// SOFT = موضوع درامي ممكن يظهر في أعمال جادة (Pretty Woman, Hustlers...)
// بيتفلتر بس لو التقييم ضعيف (يعني مش عمل معترف بجودته الفنية)
const SUGGESTIVE_KEYWORDS_SOFT = new Set([
  'prostitute', 'prostitution', 'brothel', 'stripper', 'mistress',
  'seduction', 'affair', 'lust', 'temptation', 'call girl', 'escort'
])

// ─────────────────────────────────────────────────────────────
// 3) التصنيف العمري الرسمي (MPA / BBFC / إلخ)
// ─────────────────────────────────────────────────────────────
const ADULT_CERTIFICATIONS_HARD = new Set([
  'NC-17', 'X', 'X18', 'XXX'
])

// ─────────────────────────────────────────────────────────────
// 4) شركات إنتاج إباحية معروفة (خط دفاع إضافي - القائمة مش
//    شاملة بالكامل، وسّعها لو لقيت شركات تانية بتفلت من الفلاتر التانية)
// ─────────────────────────────────────────────────────────────
const ADULT_PRODUCTION_COMPANIES = new Set([
  'vivid entertainment', 'digital playground', 'wicked pictures', 'brazzers',
  'new sensations', 'evil angel', 'elegant angel', 'third world media',
  'private media group', 'hustler video', 'penthouse', 'reality kings',
  'bang bros', 'naughty america'
])

// ─────────────────────────────────────────────────────────────
// Helpers — استخراج بيانات موحّدة (بتشتغل مع أفلام ومسلسلات بنفس الدالة)
// ─────────────────────────────────────────────────────────────

/** الكاست الحقيقي في content.credits.cast — content.cast مش موجود في استجابة TMDB الخام */
function getCastArray(content) {
  return content?.credits?.cast || content?.cast || []
}

/** كلمات TMDB: أفلام keywords.keywords / مسلسلات keywords.results */
function getKeywordNames(content) {
  const raw = content?.keywords?.keywords || content?.keywords?.results || []
  return raw.map(k => (k?.name || '').toLowerCase().trim()).filter(Boolean)
}

/** التصنيف العمري: أفلام release_dates.results[].release_dates[] / مسلسلات content_ratings.results[] */
function getCertifications(content) {
  const out = []
  for (const country of content?.release_dates?.results || []) {
    for (const rd of country.release_dates || []) {
      if (rd?.certification) {
        out.push({
          country: country.iso_3166_1,
          certification: rd.certification,
          descriptors: rd.descriptors || []
        })
      }
    }
  }
  for (const country of content?.content_ratings?.results || []) {
    if (country?.rating) {
      out.push({
        country: country.iso_3166_1,
        certification: country.rating,
        descriptors: country.descriptors || []
      })
    }
  }
  return out
}

function getProductionCompanyNames(content) {
  return (content?.production_companies || []).map(c => (c?.name || '').toLowerCase().trim())
}

/** أفضل تصنيف عمري نعرضه في القاعدة (أولوية: مصر/السعودية/الإمارات ثم أمريكا ثم أول واحد متاح) */
function pickDisplayCertification(content) {
  const certs = getCertifications(content)
  if (certs.length === 0) return null
  const preferred = certs.find(c => ['EG', 'SA', 'AE'].includes(c.country))
    || certs.find(c => c.country === 'US')
    || certs[0]
  return preferred?.certification || null
}

// ─────────────────────────────────────────────────────────────
// فلتر السلامة (صفر تسامح مع أي محتوى جنسي/عري)
// ─────────────────────────────────────────────────────────────
function isExplicitContent(content) {
  // 1) علم TMDB نفسه (غير موثوق 100% لوحده، لكنه أول إشارة)
  if (content.adult === true) {
    return { blocked: true, reason: 'tmdb_adult_flag' }
  }

  const title = (content.title || content.name || '').toLowerCase()
  const overview = (content.overview || '').toLowerCase()
  const tmdbId = String(content.id || '')

  // 2) نص صريح جدًا في العنوان/الوصف
  for (const regex of HARD_EXPLICIT_TEXT) {
    if (regex.test(title) || regex.test(overview)) {
      if (regex.source.toLowerCase().includes('xxx') && ALLOWLIST_IDS.includes(tmdbId)) continue
      return { blocked: true, reason: `text_hard:${regex.source}` }
    }
  }

  // 3) TMDB keywords المنظّمة (أدق مصدر - صفر تسامح)
  const keywordNames = getKeywordNames(content)
  for (const kw of keywordNames) {
    if (EXPLICIT_KEYWORDS_HARD.has(kw)) {
      return { blocked: true, reason: `keyword_hard:${kw}` }
    }
  }

  // 4) التصنيف العمري الرسمي + الـ descriptors المرفقة بيه
  const certs = getCertifications(content)
  for (const c of certs) {
    const cert = (c.certification || '').toUpperCase().trim()
    if (ADULT_CERTIFICATIONS_HARD.has(cert)) {
      return { blocked: true, reason: `certification_hard:${cert}(${c.country})` }
    }
    const descriptorText = (c.descriptors || []).join(',').toLowerCase()
    if (/nudity|sexual content|sex\b/.test(descriptorText)) {
      return { blocked: true, needsReview: true, reason: `descriptor_hard:${descriptorText}(${c.country})` }
    }
  }

  // 5) شركات إنتاج إباحية معروفة
  const companies = getProductionCompanyNames(content)
  for (const c of companies) {
    if (ADULT_PRODUCTION_COMPANIES.has(c)) {
      return { blocked: true, reason: `studio_hard:${c}` }
    }
  }

  // 6) نص "متوسط الصراحة" في العنوان/الوصف
  for (const regex of MILD_EXPLICIT_TEXT) {
    if (regex.test(overview)) return { blocked: true, needsReview: true, reason: `text_mild_overview:${regex.source}` }
    if (regex.test(title) && !ALLOWLIST_IDS.includes(tmdbId)) {
      return { blocked: true, needsReview: true, reason: `text_mild_title:${regex.source}` }
    }
  }

  // 7) مواضيع درامية موحية - بتتفلتر بس لو التقييم ضعيف
  //    (عشان منفلترش أعمال سينمائية جادة بتتناول الموضوع بشكل غير جنسي)
  const rating = Number(content.vote_average || 0)
  const hasSoftText = SOFT_KEYWORDS_TEXT.some(k => title.includes(k) || overview.includes(k))
  const hasSoftKeyword = keywordNames.some(k => SUGGESTIVE_KEYWORDS_SOFT.has(k))
  if ((hasSoftText || hasSoftKeyword) && rating < 6.0) {
    return { blocked: true, reason: 'suggestive_low_rating' }
  }

  return { blocked: false, reason: null }
}

// ─────────────────────────────────────────────────────────────
// فلتر الجودة (منفصل تمامًا عن فلتر السلامة - معايير مختلفة)
// ─────────────────────────────────────────────────────────────
function isLowQualityContent(content) {
  const title = (content.title || content.name || '').toLowerCase()
  const overview = (content.overview || '').trim()
  const rating = Number(content.vote_average || 0)
  const voteCount = Number(content.vote_count || 0)
  const runtime = Number(content.runtime || 0)
  const popularity = Number(content.popularity || 0)
  const cast = getCastArray(content) // ← مُصلَّح: كان content.cast (باگ)

  if (title.includes('making of') ||
      title.includes('behind the scenes') ||
      title.includes(': a look through') ||
      title.includes('from book to film') ||
      title.includes('special features')) {
    return { blocked: true, reason: 'bonus_features' }
  }

  if (runtime > 0 && runtime < 30 && voteCount < 5 && popularity < 5) {
    return { blocked: true, reason: 'short_film_low_votes_low_popularity' }
  }

  if (rating === 10 && voteCount <= 1 && popularity < 5) {
    return { blocked: true, reason: 'fake_perfect_rating_low_popularity' }
  }

  const hasNoGenres = !content.genres || content.genres.length === 0
  const hasNoCast = cast.length === 0
  const hasZeroRating = rating === 0
  const problems = [hasZeroRating, hasNoGenres, hasNoCast].filter(Boolean).length

  if (problems >= 2) {
    const reasons = []
    if (hasZeroRating) reasons.push('zero_rating')
    if (hasNoGenres) reasons.push('no_genres')
    if (hasNoCast) reasons.push('no_cast')
    return { blocked: true, reason: reasons.join('+') }
  }

  if (rating < 4.0) return { blocked: true, reason: 'low_rating' }
  if (!content.poster_path) return { blocked: true, reason: 'no_poster' }
  if (!overview || overview.length < 10) return { blocked: true, reason: 'no_overview' }

  return { blocked: false, reason: null }
}

// ─────────────────────────────────────────────────────────────
// الواجهة العامة — نفس أسماء الدوال القديمة (توافق كامل مع
// السكريبتات الحالية بدون أي تعديل في call-sites)
// ─────────────────────────────────────────────────────────────
function shouldFilterContent(content) {
  return isExplicitContent(content).blocked || isLowQualityContent(content).blocked
}

function getFilterReason(content) {
  const explicit = isExplicitContent(content)
  if (explicit.blocked) return explicit.reason

  const quality = isLowQualityContent(content)
  if (quality.blocked) return quality.reason

  return 'unknown'
}

function getFilterDetails(content) {
  const explicit = isExplicitContent(content)
  if (explicit.blocked) {
    return {
      blocked: true,
      needsReview: explicit.needsReview || false,
      reason: explicit.reason,
      type: 'explicit'
    }
  }

  const quality = isLowQualityContent(content)
  if (quality.blocked) {
    return {
      blocked: true,
      needsReview: false,
      reason: quality.reason,
      type: 'quality'
    }
  }

  return {
    blocked: false,
    needsReview: false,
    reason: null,
    type: null
  }
}

module.exports = {
  shouldFilterContent,
  getFilterReason,
  getFilterDetails,
  isExplicitContent,
  isLowQualityContent,
  getCastArray,
  getKeywordNames,
  getCertifications,
  pickDisplayCertification
}
