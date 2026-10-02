/**
 * جلب الأعمال من كتالوج 4cima.com (وليس TMDB — المفتاح العام القديم أُلغي).
 * مرآة لمنطق streamService في الموقع الرئيسي: مسارات نصية عبر السلاج،
 * والمسارات الرقمية تطابق tmdb_id (يستخدمها الراوت القديم /watch).
 */

export const PLAY_BASE = 'https://4cima.com';

// أحجام صور TMDB المضبوطة: w780 للخلفية، w500 للبوستر الاحتياطي.
export const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w780/';
export const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w500/';

export const safeDecode = (s) => {
  try { return decodeURIComponent(s); } catch { return s; }
};

// GET من كتالوج 4cima.com مع إعادة محاولة للأعطال اللحظية (شبكة/5xx/429)
// حتى لا تظهر خللة/momenta للزائر كـ«لا يوجد تطابق» زائفة. النتائج:
//   { ok: true,  row }              → 200 + JSON
//   { ok: false, notFound: true }   → 404 حقيقي (غير موجود)
//   { ok: false, notFound: false }  → عطل لحظي (يزيّن بإعادة المحاولة)
//
// طبقة كاش محلية (نفس فلسفة كاش الحافة في الموقع الرئيسي — قرار اسلام
// «تقليل استهلاك قاعدة البيانات»): بيانات الكتالوج بتتغير بالمزامنة فقط،
// فبيتخزن الرد محليًا على دومين المشغّل — الضغطات المتكررة مبتوصلش لـD1
// إطلاقًا، والبيانات تفضل متاحة حتى لو الموقع الرئيسي تعطل لحظيًا.
const CATALOGUE_TTL = 6 * 60 * 60; // 6 ساعات
const cacheKeyFor = (path) =>
  new Request(`https://4cima.stream/__catalogue${path}`, { method: 'GET' });

async function fetchSiteJson(path) {
  let notFound = false;
  try {
    const cached = await caches.default.match(cacheKeyFor(path));
    if (cached) return { ok: true, row: await cached.json() };
  } catch { /* الكاش غير متاح — نكمل عادي */ }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${PLAY_BASE}${path}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const row = await res.json();
        try {
          await caches.default.put(
            cacheKeyFor(path),
            new Response(JSON.stringify(row), {
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': `public, max-age=${CATALOGUE_TTL}`,
              },
            })
          );
        } catch { /* التخزين اختياري — لا يعطل الصفحة أبدًا */ }
        return { ok: true, row };
      }
      if (res.status === 404) { notFound = true; break; }
      // 5xx / 429 / غيره — أعد المحاولة
    } catch { /* خللة شبكة — أعد المحاولة */ }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
  }
  return { ok: false, notFound };
}

export function normalizeSiteRow(row) {
  const seasons = (Array.isArray(row.seasons) ? row.seasons : [])
    .filter((s) => (s.season_number ?? 0) > 0)
    .map((s) => ({ season_number: s.season_number, episode_count: s.episode_count || 0 }));

  // السنة: الأفلام release_year/release_date، والمسلسلات first_air_date.
  const year =
    (row.release_year ? String(row.release_year) : '') ||
    (row.release_date ? String(row.release_date).slice(0, 4) : '') ||
    (row.first_air_date ? String(row.first_air_date).slice(0, 4) : '') ||
    '';

  // المدة بالدقائق: الأفلام runtime، والمسلسلات episode_run_time.
  let runtime = null;
  if (typeof row.runtime === 'number' && row.runtime > 0) {
    runtime = row.runtime;
  } else {
    let ert = row.episode_run_time;
    if (typeof ert === 'string') {
      try { ert = JSON.parse(ert); } catch { /* keep raw */ }
    }
    if (Array.isArray(ert)) ert = ert[0];
    if (typeof ert === 'number' && ert > 0) runtime = ert;
  }

  // التقييم: vote_average (0–10).
  const rating = typeof row.vote_average === 'number' && row.vote_average > 0
    ? Math.round(row.vote_average * 10) / 10
    : null;

  // التصنيفات: genres_json نص JSON (أو مصفوفة) من {name_ar, name_en, name}.
  let genres = [];
  let gj = row.genres_json;
  if (typeof gj === 'string') {
    try { gj = JSON.parse(gj); } catch { gj = []; }
  }
  if (Array.isArray(gj)) {
    genres = gj
      .map((g) => (g && typeof g === 'object' ? (g.name_ar || g.name_en || g.name || '') : String(g || '')))
      .filter(Boolean)
      .slice(0, 6);
  }

  return {
    tmdbId: row.tmdb_id,
    slug: row.slug || '',
    title: row.title_ar || row.name_ar || row.title_en || row.name_en || row.title || row.name || '',
    latinTitle: row.title_en || row.name_en || row.name_original || row.original_name || row.title_ar || row.name_ar || '',
    backdrop: row.backdrop_path || null,
    poster: row.poster_path || null,
    seasons,
    year,
    runtime,
    rating,
    genres,
  };
}

export async function resolveFromSite(slug, mediaType) {
  const path = mediaType === 'movie'
    ? `/api/movies/${encodeURIComponent(slug)}`
    : `/api/tv/${encodeURIComponent(slug)}`;
  const res = await fetchSiteJson(path);
  if (res.ok && res.row && res.row.tmdb_id) return normalizeSiteRow(res.row);
  if (res.ok || res.notFound) throw new Error(`No catalogue match for slug "${slug}"`);
  throw new Error('Catalogue temporarily unavailable — please retry in a moment');
}

// سلاج مباشر بدون نوع — جرب الأفلام ثم المسلسلات.
export async function resolveAnyFromSite(slug) {
  const s = encodeURIComponent(slug);
  const movie = await fetchSiteJson(`/api/movies/${s}`);
  if (movie.ok && movie.row && movie.row.tmdb_id) return { mediaType: 'movie', data: normalizeSiteRow(movie.row) };
  const tv = await fetchSiteJson(`/api/tv/${s}`);
  if (tv.ok && tv.row && tv.row.tmdb_id) return { mediaType: 'tv', data: normalizeSiteRow(tv.row) };
  // «غير موجود» فقط عندما يجيب الكتالوج 404 حقيقيًا للاثنين؛
  // غير ذلك العطل لحظي والزائر يعيد المحاولة.
  if ((movie.ok || movie.notFound) && (tv.ok || tv.notFound)) {
    throw new Error(`No catalogue match for slug "${slug}"`);
  }
  throw new Error('Catalogue temporarily unavailable — please retry in a moment');
}

// حل مباشر برقم TMDB (المسارات الرقمية في API الموقع تطابق tmdb_id).
export async function resolveByIdFromSite(tmdbId, mediaType) {
  const res = await fetchSiteJson(`${mediaType === 'movie' ? '/api/movies/' : '/api/tv/'}${tmdbId}`);
  if (res.ok && res.row && res.row.tmdb_id) return normalizeSiteRow(res.row);
  if (res.ok || res.notFound) throw new Error(`Catalogue has no ${mediaType} with tmdb_id ${tmdbId}`);
  throw new Error('Catalogue temporarily unavailable — please retry in a moment');
}

export const slugifyLatin = (text, fallback) => {
  const slug = String(text || '')
    .toLowerCase()
    .replace(/[''’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
};
