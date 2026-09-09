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
const ALLOWLIST_IDS = [
  '398', '1576', '369885', '1408', '37135', '37136',
  // جولة استرجاع 2026-09-09 (المرحلة 6): 30 عملاً من دفعة reject-sexual كانت محجوبة
  // بـ erotic_genre/keyword_hard/text_hard حصراً (لا cert_18 ولا manual_block ولا tmdb_adult بينهم).
  // RESTORE_MOVIES (27):
  '1266798', '910571', '250225', '451955', '10876', '1006947', '8653', '1145810',
  '156236', '424762', '179129', '37432', '544575', '14428', '675414', '177248',
  '67415', '46086', '1163263', '304034', '417975', '362714', '624480', '289491',
  '484328', '874490', '911719',
  // RESTORE_TV (3):
  '32766', '10488', '202277',
]

// ─────────────────────────────────────────────────────────────
// 2) TMDB Structured Keywords — المصدر الأدق لأنه tags منظّمة
// ─────────────────────────────────────────────────────────────
// HARD = صفر تسامح، بيتفلتر فورًا بغض النظر عن التقييم أو الشهرة
const EXPLICIT_KEYWORDS_HARD = new Set([
  'graphic sex', 'explicit sex', 'sexual content',
  'sexually explicit', 'erotica', 'erotic film', 'erotic thriller',
  'softcore', 'hardcore', 'hardcore pornography', 'pornography', 'pornographic',
  'porn', 'porn industry', 'xxx', 'adult film', 'adult movie', 'adult entertainment',
  /* جولة الفجوات: أُزيل 'stripping' — نفس معاملة nudity/sex scene (أبواب ذيب وول ستريت)،
     لا باب حذف تلقائي بكلمة stripping وحدها */
  'lap dance', 'orgy', 'gangbang', 'fetish', 'masturbation',
  'sex tape', 'sex work', 'sex worker', 'live sex show'
])
// ملاحظة جولة السياسة: أُزيل من HARD: nudity / female nudity / male nudity /
// full frontal nudity / rear nudity / topless / sex scene / bdsm —
// لا رفض بكلمة nudity أو sex scene وحدها (قرار طبقة 3). تُلتقط الجمل الكاملة
// "Strong Sexual Content" / "Graphic Nudity" في باب strong_sexual_content.

// قائمة أسباب الكلمات الصارمة — مطابقة exact (lower/trim) مع أسماء كلمات TMDB
const KEYWORD_HARD_SET = new Set([
  'erotic movie', 'pink film', 'erotic', 'erotica', 'unsimulated sex',
  'softcore', 'pornography', 'porn', 'hardcore', 'xxx', 'hentai', 'erotic film'
])
// هذه تعود reason='erotic_genre' بدل keyword_hard
const EROTIC_GENRE_KEYWORDS = new Set(['erotic', 'erotica', 'erotic movie', 'erotic film'])
// sex scene لا ترفض وحدها — فقط مع كلمة من KEYWORD_HARD_SET (تركيب)
const SEX_SCENE_COMPOSITE = 'sex scene'

// جُمل الشهادات الكاملة الوحيدة المقبولة كرفض جنسي (لا كلمات مفردة)
const CERT_DESCRIPTOR_HARD_SENTENCES = ['strong sexual content', 'graphic nudity']

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
  'NC-17', 'X', 'X18', 'XXX', 'X18+',
  /* موسّعة — قرارات صريحة فقط، بلا «R» الأمريكي العادي حتى لا تُحجب أعمال عادية */
  'R18', 'R18+', '18+', '청소년관람불가', '18금'
])
/**
 * جولة تصحيح الشهادات: المسح الشامل لشهادات كل الدول يستخدم القائمة الصريحة فقط —
 * بلا «18+» حتى لا تُحجب أعمال بشهادة دولة أجنبية غير صارمة (CZ 18+ كانت تُمسك ذيب وول ستريت).
 * «18+» يُعتدّ بها فقط من الشهادة المعروضة (EG/SA/AE/US عبر pickDisplayCertification،
 * أو age_rating المخزنة — وهي نفس دالة العرض وقت السحب)، أو إن كانت R18/R18+/X18+/الكورية/اليابانية.
 */
const ADULT_CERT_EXPLICIT_SCAN = new Set([...ADULT_CERTIFICATIONS_HARD].filter(v => v !== '18+'))

// أنماط النص الصارم (title ثم overview) — جولة السياسة: بلا nudity/nude/sex/prostitute وحدها
// جولة إصلاح الإيجابيات الكاذبة (2026-09-09): حُذف نمطا النقحرة /بورن/ و/سكس/ —
// «بورن» هي النقحرة المعيارية لـ Bourne/Osbourne/Annapurna (ثلاثية Bourne مُحجوبة خطأً)،
// و«سكس» داخل «الأنجلو-سكسونية». الإنجليزية \bporn\b تلتقط الحقيقي، و/إباحي/ يبقى.
const HARD_TEXT_PATTERNS = [
  /\bporn(?:o|ography)?\b/i, /\bxxx\b/i, /\bhentai\b/i,
  /\bsoftcore\b/i, /\bhardcore\b/i,
  /\bunsimulated sex\b/i, /\bpink film\b/i, /\bvivamax\b/i,
  /إباحي/, /اباحي/
]

/**
 * قائمة إخفاء يدوية (قرارات إدارية موثّقة — الجولة: إخفاء المحتوى غير المناسب).
 * جولة الفجوات: مفصولة حسب النوع — TMDB movie id و TV id فضاءان منفصلان،
 * فمعرّف فيلم ليس معرّف مسلسل (39688 فيلم like-a-brother ≠ 39688 مسلسل South Beach Tow).
 * تُفلتر دائمًا بغض النظر عن أي فحص آخر، حتى لو كان علم adult=false في TMDB.
 * المراجعة يدوية قبل أي إضافة/إزالة هنا.
 */
const MANUAL_BLOCKED_MOVIE_IDS = new Set([
  '226674', // the-adolescent — قاصر في سياق جنسي (أولوية قصوى)
  '39688',  // like-a-brother
  '943315', // taste-of-shellfish
  '269955', // obsessed-2014
  '27',     // 9-songs
])
/** فارغة ما لم يوجد مسلسل يدوي مؤكد — 39688 TV (South Beach Tow) أُلغي حجبه اليدوي بجولة الفجوات */
const MANUAL_BLOCKED_TV_IDS = new Set([])

// ─────────────────────────────────────────────────────────────
// 4) شركات إنتاج إباحية معروفة (خط دفاع إضافي - القائمة مش
//    شاملة بالكامل، وسّعها لو لقيت شركات تانية بتفلت من الفلاتر التانية)
// ─────────────────────────────────────────────────────────────
const ADULT_PRODUCTION_COMPANIES = new Set([
  'vivid entertainment', 'digital playground', 'wicked pictures', 'brazzers',
  'new sensations', 'evil angel', 'elegant angel', 'third world media',
  'private media group', 'hustler video', 'penthouse', 'reality kings',
  'bang bros', 'naughty america',
  /* جولة السياسة — إضافات موثّقة من الأمر (لا استوديوهات مختلَقة) */
  'vivamax', 'viva max', 'pink eiga', 'roman porno'
])

// ─────────────────────────────────────────────────────────────
// جولة السياسة — الدالة الموحّدة shouldRejectWork (انظر الأسفل)
// ترتيب الأسباب: empty_date → year_pre_2000 → manual_block → tmdb_adult →
// cert_18 → strong_sexual_content → keyword_hard/erotic_genre → studio_hard →
// text_hard → minor_sexual → no_runtime_low_votes
// ─────────────────────────────────────────────────────────────
function extractReleaseYear(content, mediaType) {
  const yCol = mediaType === 'tv'
    ? (content.first_air_year ?? content.release_year)
    : (content.release_year ?? content.first_air_year)
  const dCol = mediaType === 'tv' ? content.first_air_date : content.release_date
  const yNum = Number(yCol)
  if (yNum && Number.isFinite(yNum) && yNum >= 1000 && yNum <= 2100) return yNum
  if (typeof dCol === 'string' && /^\d{4}/.test(dCol)) {
    const from = parseInt(dCol.slice(0, 4), 10)
    if (Number.isFinite(from) && from >= 1000 && from <= 2100) return from
  }
  return null
}

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

/** أفضل تصنيف عمري نعرضه في القاعدة (أولوية: مصر ثم السعودية ثم الإمارات ثم أمريكا — بلا أي fallback)
 *  جولة إصلاح الإيجابيات الكاذبة (2026-09-09): حُذف fallback certs[0] —
 *  كان يُخرج شهادة دولة أجنبية (مثل RU 18+) وتُخزَّن age_rating ثم تُعامَل لاحقاً كأنها
 *  من مصدر مفضّل ⇒ إعادة دخول علّة «18+ CZ» من الباب الخلفي. بلا دولة مفضّلة ⇒ null. */
function pickDisplayCertification(content) {
  const certs = getCertifications(content)
  if (certs.length === 0) return null
  const preferred = certs.find(c => ['EG', 'SA', 'AE'].includes(c.country))
    || certs.find(c => c.country === 'US')
  return preferred?.certification || null
}

/**
 * بوابة السياسة الموحّدة — أول تطابق يفوز.
 * opts.mediaType: 'movie' | 'tv' — opts.mode: 'ingest' | 'purge'
 * (purge: باب no_runtime_low_votes غير موجود؛ لن يدخل قوائم مسح D1/المحلي)
 * لا تستدعي isExplicitContent ولا isLowQualityContent.
 * ALLOWLIST_IDS يستثنى من أبواب النص/الكلمات/الجمل الجنسية/الاستوديو فقط —
 * لا من year_pre_2000 ولا empty_date ولا tmdb_adult ولا minor_sexual.
 */
function shouldRejectWork(content, opts = {}) {
  const mediaType = opts.mediaType || (content.first_air_date !== undefined || content.name !== undefined ? 'tv' : 'movie')
  const mode = opts.mode || 'ingest'
  const tmdbId = String(content?.id ?? content?.tmdb_id ?? '')
  const allowlisted = ALLOWLIST_IDS.includes(tmdbId)

  // 1) empty_date — لا سنة صالحة
  const year = extractReleaseYear(content, mediaType)
  if (!year) return { reject: true, reason: 'empty_date' }

  // 2) year_pre_2000 — السنة عدد < 2000 (2000 تعدّي)
  if (year < 2000) return { reject: true, reason: 'year_pre_2000' }

  // 3) manual_block — المجموعة حسب النوع (movie id و tv id فضاءان منفصلان)
  const manualSet = mediaType === 'tv' ? MANUAL_BLOCKED_TV_IDS : MANUAL_BLOCKED_MOVIE_IDS
  if (manualSet.has(tmdbId)) return { reject: true, reason: 'manual_block' }

  // 4) tmdb_adult — العلم الصريح فقط
  if (content.adult === true) return { reject: true, reason: 'tmdb_adult' }

  // 5) cert_18 — جولة تصحيح الشهادات: لا رفض بسبب «18+» من دولة خارج EG/SA/AE/US
  //    (R / R-rated / TV-MA لا ترفض إطلاقاً — ليست في القائمتين)
  //    جولة إصلاح الإيجابيات الكاذبة (2026-09-09) — باب القيمة المخزنة age_rating:
  //    • القيمة ضمن القائمة الصريحة (NC-17, X, X18, XXX, X18+, R18, R18+, 청소년관람불가, 18금) → cert_18
  //    • القيمة «18+» أو «18» بلا دولة معروفة EG/SA/AE/US → لا ترفض (كانت تُمسك 39 مسلسلاً
  //      بـ age_rating='18+' التُقطت من دولة أجنبية عبر fallback certs[0] القديم)
  //    • شهادة عرض من دولة مفضّلة (EG/SA/AE/US) تُطبَّق القاعدة كاملة (18+ منها ترفض)
  const certs = getCertifications(content)
  const storedCert = String(content.age_rating || '').toUpperCase().trim()
  const displayCert = String(pickDisplayCertification(content) || storedCert || '').toUpperCase().trim()
  if (displayCert) {
    const picked = certs.find(c => String(c.certification || '').toUpperCase().trim() === displayCert)
    const pickCountry = picked?.country || null
    const fromPreferred = pickCountry !== null && ['EG', 'SA', 'AE', 'US'].includes(pickCountry)
    // القائمة الصريحة ترفض أياً كان مصدرها (تشمل R18/R18+/X18+/الكورية/اليابانية — بلا 18+)
    if (ADULT_CERT_EXPLICIT_SCAN.has(displayCert)) {
      return { reject: true, reason: pickCountry ? `cert_18:${displayCert}(${pickCountry})` : `cert_18:${displayCert}` }
    }
    // 18+/18 ترفض فقط إن ثبت مصدرها من دولة مفضّلة؛ المخزنة بلا دولة لا ترفض
    if ((displayCert === '18+' || displayCert === '18') && fromPreferred) {
      return { reject: true, reason: `cert_18:${displayCert}(${pickCountry})` }
    }
  }
  // مسح شهادات كل الدول — القائمة الصريحة فقط (بلا 18+)
  for (const c of certs) {
    const cert = String(c.certification || '').toUpperCase().trim()
    if (ADULT_CERT_EXPLICIT_SCAN.has(cert)) return { reject: true, reason: `cert_18:${cert}(${c.country})` }
  }

  // 6) strong_sexual_content — الجملة الكاملة فقط داخل ملاحظات الشهادة
  if (!allowlisted) {
    for (const c of certs) {
      const d = (c.descriptors || []).join(',').toLowerCase()
      for (const sentence of CERT_DESCRIPTOR_HARD_SENTENCES) {
        if (d.includes(sentence)) return { reject: true, reason: 'strong_sexual_content' }
      }
    }
  }

  // 7) keyword_hard / erotic_genre — أسماء كلمات TMDB (exact، lower)
  if (!allowlisted) {
    const keywordNames = getKeywordNames(content)
    // جولة تضييق erotic على TV (2026-09-09): الكلمة «erotic» وحدها ترفض الأفلام فقط —
    // TMDB يعطي keyword «erotic» لأعمال TV شائعة (موشوكو تينسي 94664، My Dress-Up Darling 123249).
    // البقية ترفض للنوعين: hentai, erotica, erotic movie, erotic film, pink film,
    // porn, pornography, xxx, softcore, hardcore, unsimulated sex.
    const hardHit = keywordNames.find(kw => KEYWORD_HARD_SET.has(kw) && kw !== 'erotic')
    if (hardHit) {
      const eroticKw = keywordNames.find(kw => EROTIC_GENRE_KEYWORDS.has(kw))
      return { reject: true, reason: eroticKw ? 'erotic_genre' : `keyword_hard:${hardHit}` }
    }
    if (keywordNames.includes('erotic') && mediaType === 'movie') {
      return { reject: true, reason: 'erotic_genre' }
    }
    // sex scene: فقط مع كلمة صارمة مرافقة (تركيب) — وحدها لا ترفض
    if (keywordNames.includes(SEX_SCENE_COMPOSITE) && hardHit) {
      return { reject: true, reason: `keyword_hard:${SEX_SCENE_COMPOSITE}` }
    }
  }

  // 8) studio_hard
  if (!allowlisted) {
    const companies = getProductionCompanyNames(content)
    for (const c of companies) {
      if (ADULT_PRODUCTION_COMPANIES.has(c) || /vivamax|pink eiga|roman porno/.test(c)) {
        return { reject: true, reason: `studio_hard:${c}` }
      }
    }
  }

  // 9) text_hard — العنوان أولاً ثم الوصف. /\berotic\b/ على العنوان ⇒ erotic_genre،
  //    وعلى الوصف وحده لا يرفض (تفادي إيجابيات كاذبة). sex/nudity/nude/prostitute وحدها لا ترفض.
  if (!allowlisted) {
    const title = String(content.title || content.name || '')
    const overview = String(content.overview || '')
    if (/\berotic\b/i.test(title)) return { reject: true, reason: 'erotic_genre' }
    for (const rx of HARD_TEXT_PATTERNS) {
      if (rx.test(title)) return { reject: true, reason: `text_hard:${rx.source}` }
    }
    for (const rx of HARD_TEXT_PATTERNS) {
      if (rx.test(overview)) return { reject: true, reason: `text_hard:${rx.source}` }
    }
  }

  // 10) minor_sexual — دقة عالية فقط، لا bulk على teen/adolescent/مراهق
  {
    const keywordNames = getKeywordNames(content)
    const MINOR_KW = ['child pornography', 'lolicon', 'shotacon', 'underage', 'child nudity']
    if (keywordNames.some(kw => MINOR_KW.includes(kw))) return { reject: true, reason: 'minor_sexual' }
    const overview = String(content.overview || '')
    const minorAge = /\b(?:aged|age)\s*1[0-7]\b/i.test(overview)
    const explicitContext = /(child pornography|underage sex)/i.test(overview)
      || (minorAge && /(sex|sexual|erotic|porn|جنس)/i.test(overview))
    if (explicitContext) return { reject: true, reason: 'minor_sexual' }
  }

  // 11) no_runtime_low_votes — ingest فقط، أفلام فقط
  if (mode === 'ingest' && mediaType === 'movie') {
    const voteCount = Number(content.vote_count || 0)
    const runtimeRaw = content.runtime
    const noRuntime = runtimeRaw == null || Number(runtimeRaw) === 0
    if (voteCount < 20 && noRuntime) return { reject: true, reason: 'no_runtime_low_votes' }
  }

  return { reject: false, reason: null }
}

// ─────────────────────────────────────────────────────────────
// فلتر السلامة — الآن غلاف رقيق فوق shouldRejectWork (مصدر السياسة الوحيد)
// ─────────────────────────────────────────────────────────────
function isExplicitContent(content, opts = {}) {
  const policy = shouldRejectWork(content, { mode: 'ingest', ...opts })
  if (policy.reject) {
    // جُمل الشهادة الكاملة (Strong Sexual Content / Graphic Nudity) → دلو مراجعة
    // لا رفض نهائي ولا حذف تلقائي من D1 (قرار جولة السياسة).
    if (policy.reason === 'strong_sexual_content') {
      return { blocked: false, needsReview: true, reason: 'cert_descriptor_sexual' }
    }
    return { blocked: true, needsReview: false, reason: policy.reason }
  }

  // مواضيع درامية موحية مع تقييم ضعيف — سلوك قديم محفوظ (خارج نطاق shouldRejectWork)
  const title = (content.title || content.name || '').toLowerCase()
  const overview = (content.overview || '').toLowerCase()
  const rating = Number(content.vote_average || 0)
  const hasSoftText = SOFT_KEYWORDS_TEXT.some(k => title.includes(k) || overview.includes(k))
  const hasSoftKeyword = getKeywordNames(content).some(k => SUGGESTIVE_KEYWORDS_SOFT.has(k))
  if ((hasSoftText || hasSoftKeyword) && rating < 6.0) {
    return { blocked: true, needsReview: false, reason: 'suggestive_low_rating' }
  }

  return { blocked: false, needsReview: false, reason: null }
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
function shouldFilterContent(content, opts = {}) {
  return isExplicitContent(content, opts).blocked || isLowQualityContent(content).blocked
}

function getFilterReason(content, opts = {}) {
  const explicit = isExplicitContent(content, opts)
  if (explicit.blocked) return explicit.reason

  const quality = isLowQualityContent(content)
  if (quality.blocked) return quality.reason

  return 'unknown'
}

function getFilterDetails(content, opts = {}) {
  const explicit = isExplicitContent(content, opts)
  if (explicit.blocked) {
    return {
      blocked: true,
      needsReview: false,
      reason: explicit.reason,
      type: 'explicit'
    }
  }
  if (explicit.needsReview) {
    return {
      blocked: false,
      needsReview: true,
      reason: explicit.reason,
      type: 'review'
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
  shouldRejectWork,
  extractReleaseYear,
  isExplicitContent,
  isLowQualityContent,
  getCastArray,
  getKeywordNames,
  getCertifications,
  pickDisplayCertification,
  // مصادر الحقيقة للقوائم — لتُستهلك من سكربتات المسح دون نسخ يدوي
  KEYWORD_HARD_SET,
  EROTIC_GENRE_KEYWORDS,
  ADULT_PRODUCTION_COMPANIES,
  ADULT_CERTIFICATIONS_HARD,
  ADULT_CERT_EXPLICIT_SCAN
}
