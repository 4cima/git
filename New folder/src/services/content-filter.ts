/**
 * ============================================================
 * 🛡️ CONTENT SAFETY FILTER — v2.0 (TypeScript Edition)
 * ============================================================
 * Zero tolerance with pornographic or explicit content.
 * Also filters out low-quality/broken items separately.
 */

// 1) Explicit texts (tested inside title & overview)
const HARD_EXPLICIT_TEXT = [
  /\bporn\b/i, /\bporno\b/i, /\bpornography\b/i, /\bxxx\b/i, /\bhentai\b/i, /\berotic\b/i,
  /\bsoftcore\b/i, /\bhardcore\b/i, /\badult film\b/i, /\bsex tape\b/i,
  /سكس/, /بورن/, /إباحي/, /اباحي/, /عاري/, /عارية/, /علاقة جنسية/
];

const MILD_EXPLICIT_TEXT = [
  /\bsex\b/i, /\bsexy\b/i, /\bsexual\b/i, /\bnudity\b/i, /\bnude\b/i, /\bnaked\b/i,
  /\bstrip\b/i, /\bstripper\b/i, /\bprostitute\b/i, /\bbrothel\b/i
];

const SOFT_KEYWORDS_TEXT = [
  'seduces', 'seduction', 'lust', 'temptation', 'intimate', 'sensual',
  'affair', 'mistress', 'cheating', 'forbidden love'
];

// Allowlist for manual exceptions (e.g. valid classical movies with "xxx" in some context or titles like XXX state of union)
const ALLOWLIST_IDS = ['398', '1576', '369885', '1408', '37135', '37136'];

// 2) TMDB Structured Keywords
const EXPLICIT_KEYWORDS_HARD = new Set([
  'nudity', 'female nudity', 'male nudity', 'full frontal nudity', 'rear nudity',
  'topless', 'sex scene', 'graphic sex', 'explicit sex', 'sexual content',
  'sexually explicit', 'erotica', 'erotic film', 'erotic thriller',
  'softcore', 'hardcore', 'hardcore pornography', 'pornography', 'pornographic',
  'porn', 'porn industry', 'xxx', 'adult film', 'adult movie', 'adult entertainment',
  'stripping', 'lap dance', 'orgy', 'gangbang', 'bdsm', 'fetish', 'masturbation',
  'sex tape', 'sex work', 'sex worker', 'live sex show'
]);

const SUGGESTIVE_KEYWORDS_SOFT = new Set([
  'prostitute', 'prostitution', 'brothel', 'stripper', 'mistress',
  'seduction', 'affair', 'lust', 'temptation', 'call girl', 'escort'
]);

// 3) Official Age Certifications
const ADULT_CERTIFICATIONS_HARD = new Set(['NC-17', 'X', 'XXX', 'R18', '18', '18+']);

// 4) Explicit Production Studios
const ADULT_PRODUCTION_COMPANIES = new Set([
  'vivid entertainment', 'digital playground', 'wicked pictures', 'brazzers',
  'new sensations', 'evil angel', 'elegant angel', 'third world media',
  'private media group', 'hustler video', 'penthouse', 'reality kings',
  'bang bros', 'naughty america'
]);

// Helper helpers
function getCastArray(content: any): any[] {
  return content?.credits?.cast || content?.cast || [];
}

function getKeywordNames(content: any): string[] {
  const raw = content?.keywords?.keywords || content?.keywords?.results || content?.keywords || [];
  return Array.isArray(raw) 
    ? raw.map((k: any) => (typeof k === 'string' ? k : k?.name || '').toLowerCase().trim()).filter(Boolean)
    : [];
}

function getCertifications(content: any): { country: string; certification: string; descriptors?: string[] }[] {
  const out: { country: string; certification: string; descriptors?: string[] }[] = [];
  
  // Movies structure
  for (const country of content?.release_dates?.results || []) {
    for (const rd of country.release_dates || []) {
      if (rd?.certification) {
        out.push({
          country: country.iso_3166_1,
          certification: rd.certification,
          descriptors: rd.descriptors || []
        });
      }
    }
  }
  
  // TV structure
  for (const country of content?.content_ratings?.results || []) {
    if (country?.rating) {
      out.push({
        country: country.iso_3166_1,
        certification: country.rating,
        descriptors: []
      });
    }
  }
  
  // If it's already a single string representation
  if (typeof content?.ageRating === 'string' && content.ageRating) {
    out.push({
      country: 'US',
      certification: content.ageRating,
      descriptors: []
    });
  }
  
  return out;
}

function getProductionCompanyNames(content: any): string[] {
  return (content?.production_companies || []).map((c: any) => (c?.name || '').toLowerCase().trim());
}

export function pickDisplayCertification(content: any): string | null {
  const certs = getCertifications(content);
  if (certs.length === 0) return null;
  const preferred = certs.find(c => ['EG', 'SA', 'AE'].includes(c.country))
    || certs.find(c => c.country === 'US')
    || certs[0];
  return preferred?.certification || null;
}

// 5) Safety Filter - Zero tolerance for explicit material
export function isExplicitContent(content: any): { blocked: boolean; reason: string | null } {
  if (!content) return { blocked: true, reason: 'no_content' };
  
  // 1) TMDB Adult Flag
  if (content.adult === true) {
    return { blocked: true, reason: 'tmdb_adult_flag' };
  }

  const title = (content.title || content.name || '').toLowerCase();
  const overview = (content.overview || '').toLowerCase();
  const tmdbId = String(content.id || content.tmdbId || '');

  // 2) Hard explicit texts
  for (const regex of HARD_EXPLICIT_TEXT) {
    if (regex.test(title) || regex.test(overview)) {
      if (regex.source.toLowerCase().includes('xxx') && ALLOWLIST_IDS.includes(tmdbId)) continue;
      return { blocked: true, reason: `text_hard:${regex.source}` };
    }
  }

  // 3) TMDB Organized Keywords
  const keywordNames = getKeywordNames(content);
  for (const kw of keywordNames) {
    if (EXPLICIT_KEYWORDS_HARD.has(kw)) {
      return { blocked: true, reason: `keyword_hard:${kw}` };
    }
  }

  // 4) Official certifications and descriptors
  const certs = getCertifications(content);
  for (const c of certs) {
    const cert = (c.certification || '').toUpperCase().trim();
    if (ADULT_CERTIFICATIONS_HARD.has(cert)) {
      return { blocked: true, reason: `certification_hard:${cert}(${c.country})` };
    }
    const descriptorText = (c.descriptors || []).join(',').toLowerCase();
    if (/nudity|sexual content|sex\b/.test(descriptorText)) {
      return { blocked: true, reason: `descriptor_hard:${descriptorText}(${c.country})` };
    }
  }

  // 5) Production Studios
  const companies = getProductionCompanyNames(content);
  for (const c of companies) {
    if (ADULT_PRODUCTION_COMPANIES.has(c)) {
      return { blocked: true, reason: `studio_hard:${c}` };
    }
  }

  // 6) Mild explicit text in overview/title
  for (const regex of MILD_EXPLICIT_TEXT) {
    if (regex.test(overview)) return { blocked: true, reason: `text_mild_overview:${regex.source}` };
    if (regex.test(title) && !ALLOWLIST_IDS.includes(tmdbId)) {
      return { blocked: true, reason: `text_mild_title:${regex.source}` };
    }
  }

  // 7) Suggestive/soft keywords with low rating (low quality suggestive content)
  const rating = Number(content.vote_average || content.voteAverage || 0);
  const hasSoftText = SOFT_KEYWORDS_TEXT.some(k => title.includes(k) || overview.includes(k));
  const hasSoftKeyword = keywordNames.some(k => SUGGESTIVE_KEYWORDS_SOFT.has(k));
  if ((hasSoftText || hasSoftKeyword) && rating < 6.0) {
    return { blocked: true, reason: 'suggestive_low_rating' };
  }

  return { blocked: false, reason: null };
}

// 6) Quality Filter
export function isLowQualityContent(content: any): { blocked: boolean; reason: string | null } {
  if (!content) return { blocked: true, reason: 'no_content' };

  const title = (content.title || content.name || '').toLowerCase();
  const overview = (content.overview || '').trim();
  const rating = Number(content.vote_average || content.voteAverage || 0);
  const voteCount = Number(content.vote_count || content.voteCount || 0);
  const runtime = Number(content.runtime || 0);
  const popularity = Number(content.popularity || 0);
  const cast = getCastArray(content);

  if (
    title.includes('making of') ||
    title.includes('behind the scenes') ||
    title.includes(': a look through') ||
    title.includes('from book to film') ||
    title.includes('special features')
  ) {
    return { blocked: true, reason: 'bonus_features' };
  }

  // Allow short/empty runtime only if it has high votes/popularity, to prevent random junk clips
  if (runtime > 0 && runtime < 25 && voteCount < 5 && popularity < 5) {
    return { blocked: true, reason: 'short_film_low_votes_low_popularity' };
  }

  if (rating === 10 && voteCount <= 1 && popularity < 5) {
    return { blocked: true, reason: 'fake_perfect_rating_low_popularity' };
  }

  const hasNoGenres = !content.genres || content.genres.length === 0;
  const hasNoCast = cast.length === 0;
  const hasZeroRating = rating === 0;
  
  // If there are multiple problems combined
  const problems = [hasZeroRating, hasNoGenres, hasNoCast].filter(Boolean).length;
  if (problems >= 2) {
    const reasons = [];
    if (hasZeroRating) reasons.push('zero_rating');
    if (hasNoGenres) reasons.push('no_genres');
    if (hasNoCast) reasons.push('no_cast');
    return { blocked: true, reason: reasons.join('+') };
  }

  if (rating < 3.5 && voteCount > 10) return { blocked: true, reason: 'low_rating' };
  if (!content.poster_path && !content.posterPath) return { blocked: true, reason: 'no_poster' };
  if (!overview || overview.length < 5) return { blocked: true, reason: 'no_overview' };

  return { blocked: false, reason: null };
}

// 7) Public interface functions
export function shouldFilterContent(content: any): boolean {
  return isExplicitContent(content).blocked || isLowQualityContent(content).blocked;
}

export function getFilterReason(content: any): string {
  const explicit = isExplicitContent(content);
  if (explicit.blocked) return explicit.reason || 'explicit_content';
  
  const quality = isLowQualityContent(content);
  if (quality.blocked) return quality.reason || 'low_quality';
  
  return 'unknown';
}
