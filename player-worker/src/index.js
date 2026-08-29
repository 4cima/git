/**
 * ============================================================
 * 4CIMA Player Worker — https://4cima.stream
 * ============================================================
 * Standalone player on the dedicated 4cima.stream account, fully
 * decoupled from the 4cima.com info pages.
 *
 * Clean-URL routes:
 *   GET /movies/{slug}                        → movie player
 *   GET /series/{slug}/season/{n}/episode/{y} → tv episode player
 *   GET /{slug}                               → bare slug, type resolved via TMDB multi-search
 *   GET /watch?type=&id=&season=&episode=     → legacy query fallback (tmdb id)
 *   GET /                                     → info page
 *   GET /api/embed-proxy?url=…                → ISP-blocked server proxy
 *   GET /healthz                              → liveness probe
 *
 * Resolves {slug} → TMDB id via the public TMDB search API.
 * NOTE: security headers (CSP / frame-ancestors / X-Frame-Options)
 * have been REMOVED from player pages by owner request.
 * ============================================================
 */

const PLAY_BASE = 'https://4cima.com';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/original/';

// Functional headers only (no security restrictions).
const COMMON_HEADERS = {
  'Referrer-Policy': 'no-referrer-when-downgrade',
  'Permissions-Policy': 'fullscreen=*, encrypted-media=*, autoplay=*',
};

const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  ...COMMON_HEADERS,
};

const safeDecode = (s) => {
  try { return decodeURIComponent(s); } catch { return s; }
};

// Single-segment paths that must never be treated as a content slug.
const RESERVED_PATHS = new Set(['api', 'healthz', 'watch', 'movies', 'series', 'admin', 'login']);

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === '/api/embed-proxy') return await handleEmbedProxy(url);
      if (path === '/healthz') return new Response('ok', { status: 200 });

      // Legacy query-based fallback: /watch?type=tv&id=94997&season=3&episode=4
      if (path === '/watch') return await handleWatchFallback(url);

      const mMovie = path.match(/^\/movies\/(.+)$/);
      if (mMovie) return await handlePlayer(url, safeDecode(mMovie[1]), 'movie', 1, 1);

      const mTv = path.match(/^\/series\/(.+?)\/season\/(\d+)(?:\/episode\/(\d+))?$/);
      if (mTv) return await handlePlayer(url, safeDecode(mTv[1]), 'tv', parseInt(mTv[2], 10), mTv[3] ? parseInt(mTv[3], 10) : 1);

      // Bare clean-slug route (e.g. /oppenheimer) — the media type is
      // unknown, so resolve it via TMDB multi-search first.
      const mBare = path.match(/^\/([A-Za-z0-9_-]+)$/);
      if (mBare && !RESERVED_PATHS.has(mBare[1].toLowerCase())) {
        const slug = safeDecode(mBare[1]);
        try {
          const { mediaType, data } = await resolveAnyFromSite(slug);
          return await handlePlayer(url, data.slug || slug, mediaType, 1, 1, data);
        } catch (e) {
          return playerErrorPage(slug, null, e.message);
        }
      }

      if (path === '/' || path === '') {
        const body = '<!doctype html><html><head><meta charset="utf-8"><title>4cima Player</title></head><body style="font-family:sans-serif;text-align:center;padding:4rem;background:#0a0c11;color:#e5e7eb"><h1>4cima Player</h1><p>Open a title from <a href="https://4cima.com">4cima.com</a>.</p></body></html>';
        return new Response(body, { status: 200, headers: HTML_HEADERS });
      }
      return new Response('Not Found', { status: 404, headers: COMMON_HEADERS });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return new Response('Server error', { status: 500, headers: COMMON_HEADERS });
    }
  },
};

// ------------------------------------------------------------------
// Server catalogue — mirrors src/services/streamService.ts
// ------------------------------------------------------------------
const SERVERS = [
  { id: 'vidlink',      name: 'VidLink',   short: 'VL',  base: 'https://vidlink.pro' },
  { id: 'vidsrc_me',    name: 'VidSrc.me', short: 'VS',  base: 'https://vidsrc.me/embed' },
  { id: 'vidsrc_vip',   name: 'VidRock',   short: 'VM',  base: 'https://vidrock.net/embed' },
  { id: 'videasy',      name: 'Videasy',   short: 'VY',  base: 'https://player.videasy.net' },
  { id: '111movies',    name: '111Movies', short: '1M', base: 'https://111movies.com' },
  { id: 'autoembed_co', name: 'AutoEmbed', short: 'AM',  base: 'https://autoembed.co' },
];

const BASE_OVERRIDES = {
  autoembed_co: 'https://autoembed.co',
  vidsrc_me:    'https://vidsrc.me/embed',
  vidsrc_vip:   'https://vidrock.net/embed',
  vidlink:      'https://vidlink.pro',
  videasy:      'https://player.videasy.net',
};

// Servers routed through /api/embed-proxy (often ISP-blocked in Egypt).
// All six servers are direct — the embed-proxy handler is kept but unused.
const PROXIED_IDS = new Set([]);

const appendParam = (url, key, value) =>
  new RegExp(`([?&])${key}=`, 'i').test(url)
    ? url
    : url + (url.includes('?') ? '&' : '?') + `${key}=${value}`;

const withArabic = (url, id) => {
  if (id === 'autoembed_co') return appendParam(appendParam(url, 'lang', 'ar'), 'subtitles', 'ar');
  if (id.startsWith('vidsrc_')) return appendParam(appendParam(url, 'lang', 'ar'), 'sub', 'ar');
  return appendParam(url, 'lang', 'ar');
};

function buildServerUrl(server, mediaType, tmdbId, season, episode) {
  const base = BASE_OVERRIDES[server.id] || server.base;
  const id = server.id;
  if (id === 'autoembed_co') {
    return withArabic(
      mediaType === 'movie'
        ? `${base}/movie/tmdb/${tmdbId}`
        : `${base}/tv/tmdb/${tmdbId}-${season}-${episode}`,
      id
    );
  }
  if (id.startsWith('vidsrc_') || id === 'vidsrc_me') {
    return withArabic(
      mediaType === 'movie'
        ? `${base}/movie/${tmdbId}`
        : `${base}/tv/${tmdbId}/${season}/${episode}`,
      id
    );
  }
  if (id === 'vidlink') {
    return mediaType === 'movie'
      ? `https://vidlink.pro/movie/${tmdbId}`
      : `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`;
  }
  if (id === 'videasy') {
    return mediaType === 'movie'
      ? `https://player.videasy.net/movie/${tmdbId}`
      : `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}`;
  }
  if (id === '111movies') {
    return withArabic(
      mediaType === 'movie'
        ? `${base}/movie/${tmdbId}`
        : `https://111movies.net/tv/${tmdbId}/${season}/${episode}`,
      id
    );
  }
  return '';
}

function buildServerSources(mediaType, tmdbId, season, episode) {
  const out = [];
  for (const srv of SERVERS) {
    const raw = buildServerUrl(srv, mediaType, tmdbId, season, episode);
    if (!raw) continue;
    let src = raw;
    if (PROXIED_IDS.has(srv.id)) {
      const proxy = new URL('https://4cima.stream/api/embed-proxy');
      proxy.searchParams.set('url', raw);
      src = proxy.toString();
    }
    out.push({
      id: srv.id,
      name: srv.name,
      short: srv.short,
      src,
      base: BASE_OVERRIDES[srv.id] || srv.base,
      px: PROXIED_IDS.has(srv.id) ? 1 : 0,
      serverIndex: out.length + 1,
    });
  }
  return out;
}

// ------------------------------------------------------------------
// Title resolution via the 4cima.com catalogue API (NOT TMDB — the
// old public TMDB key was revoked). The site API resolves text slugs,
// and numeric paths match tmdb_id (used by the /watch fallback).
// ------------------------------------------------------------------
async function fetchSiteJson(path) {
  try {
    const res = await fetch(`${PLAY_BASE}${path}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function normalizeSiteRow(row) {
  const seasons = (Array.isArray(row.seasons) ? row.seasons : [])
    .filter((s) => (s.season_number ?? 0) > 0)
    .map((s) => ({ season_number: s.season_number, episode_count: s.episode_count || 0 }));

  // Year: movies use release_year / release_date; tv uses first_air_date.
  const year =
    (row.release_year ? String(row.release_year) : '') ||
    (row.release_date ? String(row.release_date).slice(0, 4) : '') ||
    (row.first_air_date ? String(row.first_air_date).slice(0, 4) : '') ||
    '';

  // Runtime: movies have runtime (minutes); tv has episode_run_time
  // (number, or a JSON-string/array) — minutes as well.
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

  // Rating: vote_average (0–10).
  const rating = typeof row.vote_average === 'number' && row.vote_average > 0
    ? Math.round(row.vote_average * 10) / 10
    : null;

  // Genres: genres_json is a JSON string (or array) of {name_ar, name_en, name}.
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

async function resolveFromSite(slug, mediaType) {
  const row = mediaType === 'movie'
    ? await fetchSiteJson(`/api/movies/${encodeURIComponent(slug)}`)
    : await fetchSiteJson(`/api/tv/${encodeURIComponent(slug)}`);
  if (!row || !row.tmdb_id) throw new Error(`No catalogue match for slug "${slug}"`);
  return normalizeSiteRow(row);
}

// Bare slug: media type unknown — try movies, then tv.
async function resolveAnyFromSite(slug) {
  const movie = await fetchSiteJson(`/api/movies/${encodeURIComponent(slug)}`);
  if (movie && movie.tmdb_id) return { mediaType: 'movie', data: normalizeSiteRow(movie) };
  const tv = await fetchSiteJson(`/api/tv/${encodeURIComponent(slug)}`);
  if (tv && tv.tmdb_id) return { mediaType: 'tv', data: normalizeSiteRow(tv) };
  throw new Error(`No catalogue match for slug "${slug}"`);
}

// Resolve directly by TMDB id (numeric site-API paths match tmdb_id).
async function resolveByIdFromSite(tmdbId, mediaType) {
  const row = await fetchSiteJson(`${mediaType === 'movie' ? '/api/movies/' : '/api/tv/'}${tmdbId}`);
  if (!row || !row.tmdb_id) throw new Error(`Catalogue has no ${mediaType} with tmdb_id ${tmdbId}`);
  return normalizeSiteRow(row);
}

const slugifyLatin = (text, fallback) => {
  const slug = String(text || '')
    .toLowerCase()
    .replace(/[''’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
};

// Legacy /watch?type=…&id=… handler — resolves by TMDB id, then renders
// the same player page as the clean-slug routes.
async function handleWatchFallback(url) {
  const type = (url.searchParams.get('type') || '').toLowerCase();
  const id = parseInt(url.searchParams.get('id') || '', 10);
  if (type !== 'movie' && type !== 'tv') {
    return new Response('Bad Request — type must be movie or tv', { status: 400, headers: COMMON_HEADERS });
  }
  if (!Number.isFinite(id) || id <= 0) {
    return new Response('Bad Request — missing/invalid id', { status: 400, headers: COMMON_HEADERS });
  }
  const season = parseInt(url.searchParams.get('season') || '1', 10) || 1;
  const episode = parseInt(url.searchParams.get('episode') || '1', 10) || 1;
  const who = url.searchParams.get('who') || '';

  let resolved;
  try {
    resolved = await resolveByIdFromSite(id, type);
  } catch (e) {
    return playerErrorPage(String(id), type, e.message);
  }

  // Prefer the catalogue's canonical slug for in-page navigation.
  const slug = resolved.slug || slugifyLatin(resolved.latinTitle, `${type}-${id}`);
  return await handlePlayer(url, slug, type, season, episode, resolved);
}

// ------------------------------------------------------------------
// Page handler
// ------------------------------------------------------------------
async function handlePlayer(url, slug, mediaType, season = 1, episode = 1, preResolved = null) {
  if (!slug) return new Response('Bad Request — missing slug', { status: 400, headers: COMMON_HEADERS });

  // Optional, non-secret display name forwarded from the 4cima.com watch
  // button via ?who=…, so the player menu can greet the logged-in user.
  const who = url.searchParams.get('who') || '';
  // Optional profile avatar URL (also non-secret, appended by the auth
  // callback) so the player menu shows the real profile picture.
  const avatar = url.searchParams.get('avatar') || '';

  let resolved;
  if (preResolved) {
    // Already resolved (bare-slug multi-try or /watch by-id) — reuse it.
    resolved = preResolved;
  } else {
    try {
      resolved = await resolveFromSite(slug, mediaType);
    } catch (e) {
      return playerErrorPage(slug, mediaType, e.message);
    }
  }

  const { tmdbId, title, backdrop, poster } = resolved;
  const servers = buildServerSources(mediaType, tmdbId, season, episode);

  // Short-lived signed player bridge token (?pt=…). Verified server-side
  // against 4cima.com (worker never checks signatures locally); on failure
  // the page still works — just without the favorites bridge.
  const pt = url.searchParams.get('pt') || '';
  let bridge = null;
  if (pt) {
    try {
      const vRes = await fetch(
        `https://4cima.com/api/player/verify?type=${encodeURIComponent(mediaType)}&id=${encodeURIComponent(tmdbId)}`,
        { headers: { Authorization: `Bearer ${pt}` } },
      );
      if (vRes.ok) bridge = await vRes.json();
    } catch {
      bridge = null;
    }
  }

  let seasonsList = [];
  let epList = [];
  if (mediaType === 'tv') {
    seasonsList = resolved.seasons || [];
    const cnt = (seasonsList.find((s) => s.season_number === season) || {}).episode_count || 0;
    epList = Array.from({ length: cnt }, (_, i) => ({ episode_number: i + 1, name: '' }));
  }

  const backdropUrl = backdrop
    ? `${TMDB_IMAGE_BASE}${backdrop}`
    : poster ? `${TMDB_IMAGE_BASE}${poster}` : '';

  const backUrl = mediaType === 'movie'
    ? `${PLAY_BASE}/movies/${encodeURIComponent(slug)}`
    : `${PLAY_BASE}/series/${encodeURIComponent(slug)}`;

  // Only honor ?ref= deep links that point back to 4cima.com.
  let refUrl = url.searchParams.get('ref') || '';
  if (!/^https:\/\/4cima\.com\//i.test(refUrl)) refUrl = backUrl;

  // Full current watch URL — used as the `next` target for login/logout links.
  const selfUrl = url.toString();
  // Same URL minus session params (who/avatar/pt) — used for the logout
  // redirect so no stale identity remains after signing out.
  const cleanSelf = (() => {
    try {
      const u = new URL(selfUrl);
      u.searchParams.delete('who');
      u.searchParams.delete('avatar');
      u.searchParams.delete('pt');
      return u.toString();
    } catch {
      return selfUrl;
    }
  })();

  return new Response(
    htmlPage({
      slug, mediaType, tmdbId, title, titleEn: resolved.latinTitle, season, episode,
      servers, seasons: seasonsList, episodes: epList,
      backdropUrl, backUrl, refUrl, who, avatar, selfUrl, cleanSelf,
      bridge, pt, posterPath: poster,
      year: resolved.year, runtime: resolved.runtime, rating: resolved.rating, genres: resolved.genres,
    }),
    {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=120', ...HTML_HEADERS },
    }
  );
}

// ------------------------------------------------------------------
// HTML player page
// ------------------------------------------------------------------
const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// Serialize data for an inline <script> without letting "</script>" break out.
const jsonForScript = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

// Genre chip colors — ported 1:1 from src/utils/genreColors.ts (getGenreColor).
// Each pair: [background, border] — Tailwind palette hex equivalents.
const GENRE_COLORS = {
  'action': '#450a0a,#7f1d1d',           // bg-red-950 / border-red-900
  'أكشن': '#450a0a,#7f1d1d',
  'drama': '#6b21a8,#7e22ce',            // bg-purple-800 / border-purple-700
  'دراما': '#6b21a8,#7e22ce',
  'comedy': '#a16207,#ca8a04',           // bg-yellow-700 / border-yellow-600
  'كوميديا': '#a16207,#ca8a04',
  'horror': '#1f2937,#374151',           // bg-gray-800 / border-gray-700
  'رعب': '#1f2937,#374151',
  'romance': '#9d174d,#be185d',          // bg-pink-800 / border-pink-700
  'رومانسي': '#9d174d,#be185d',
  'science fiction': '#155e75,#0e7490',  // bg-cyan-800 / border-cyan-700
  'sci-fi': '#155e75,#0e7490',
  'خيال علمي': '#155e75,#0e7490',
  'adventure': '#065f46,#047857',        // bg-emerald-800 / border-emerald-700
  'مغامرة': '#065f46,#047857',
  'thriller': '#9a3412,#c2410c',         // bg-orange-800 / border-orange-700
  'إثارة': '#9a3412,#c2410c',
  'crime': '#450a0a,#7f1d1d',            // bg-red-950 / border-red-900
  'جريمة': '#450a0a,#7f1d1d',
  'fantasy': '#3730a3,#4338ca',          // bg-indigo-800 / border-indigo-700
  'فانتازيا': '#3730a3,#4338ca',
  'animation': '#1e40af,#1d4ed8',        // bg-blue-800 / border-blue-700
  'أنيميشن': '#1e40af,#1d4ed8',
  'رسوم متحركة': '#1e40af,#1d4ed8',
  'family': '#166534,#15803d',           // bg-green-800 / border-green-700
  'عائلي': '#166534,#15803d',
  'war': '#334155,#475569',              // bg-slate-700 / border-slate-600
  'حرب': '#334155,#475569',
  'history': '#92400e,#b45309',          // bg-amber-800 / border-amber-700
  'تاريخي': '#92400e,#b45309',
  'mystery': '#5b21b6,#6d28d9',          // bg-violet-800 / border-violet-700
  'غموض': '#5b21b6,#6d28d9',
  'documentary': '#115e59,#0f766e',      // bg-teal-800 / border-teal-700
  'وثائقي': '#115e59,#0f766e',
  'western': '#7c2d12,#9a3412',          // bg-orange-900 / border-orange-800
  'غربي': '#7c2d12,#9a3412',
  'music': '#86198f,#a21caf',            // bg-fuchsia-800 / border-fuchsia-700
  'موسيقي': '#86198f,#a21caf',
};
const GENRE_DEFAULT = '#3f3f46,#52525b'; // defaultGenreColor: bg-zinc-700 / border-zinc-600

function genreChipStyle(genre) {
  const pair = GENRE_COLORS[String(genre || '').toLowerCase().trim()] || GENRE_DEFAULT;
  const [bg, bd] = pair.split(',');
  return `background:${bg};border:1px solid ${bd};color:#fff;box-shadow:0 4px 10px rgba(0,0,0,.3);`;
}

function htmlPage({ slug, mediaType, tmdbId, title, titleEn, season, episode, servers, seasons, episodes, backdropUrl, backUrl, refUrl, who, avatar, selfUrl, cleanSelf, bridge, pt, posterPath, year, runtime, rating, genres }) {
  const isTv = mediaType === 'tv';
  // Active player session = a valid bridge token verified against 4cima.com.
  // Identity shown in the menu comes from the token first, then ?who/?avatar.
  const sessionUser = (bridge && bridge.user) || null;
  const displayName = (sessionUser?.name || safeDecode(who || '')).trim();
  const avatarUrl = (sessionUser?.avatar || safeDecode(avatar || '')).trim();
  const heartState = (bridge && bridge.heartState) || 'neutral';
  // Login/logout target back to this exact watch URL (4cima.stream only).
  const nextParam = encodeURIComponent(selfUrl || 'https://4cima.stream/');
  const loginUrl = `https://4cima.com/login?next=${nextParam}`;
  const logoutUrl = `https://4cima.com/api/auth/logout?next=${encodeURIComponent(cleanSelf || selfUrl || 'https://4cima.stream/')}`;
  const pageTitle = title
    ? (isTv
        ? `مشاهدة ${title} — موسم ${season} حلقة ${episode}`
        : `مشاهدة ${title}`) + ' | 4cima'
    : '4cima Player';

  const bgStyle = backdropUrl
    ? `background:linear-gradient(to bottom,rgba(10,12,17,.55),#0a0c11),url('${esc(backdropUrl)}') center/cover no-repeat fixed;`
    : `background:linear-gradient(to bottom,rgba(10,12,17,.75),#0a0c11),url('https://4cima.com/6565.jpg') center/cover no-repeat fixed;`;

  const boot = jsonForScript({
    slug, mediaType, tmdbId, season, episode,
    servers, seasons, episodes, who: displayName, avatar: avatarUrl,
    loginUrl, pt, heartState, title, posterPath: posterPath || '',
  });

  // Work info row (above the player): only render a chip when the API
  // actually returned a value — no N/A, no invented data.
  const runtimeLabel = typeof runtime === 'number' && runtime > 0
    ? `${Math.floor(runtime / 60)}س ${runtime % 60}د`
    : '';
  // Type badge + AR/EN title frame now live in the header, next to the logo,
  // using the same title/titleEn/type that used to feed info-row.
  const arHtml = title ? `<span class="info-title-ar" dir="auto">${esc(title)}</span>` : '';
  const enHtml = titleEn && titleEn !== title ? `<span class="info-title-en" dir="ltr">${esc(titleEn)}</span>` : '';
  const titlesRow = (arHtml || enHtml)
    ? `<span class="info-titles info-titles-${isTv ? 'tv' : 'movie'}">${arHtml}${enHtml}</span>` : '';
  const headerBadge = (arHtml || enHtml)
    ? `<span class="info-badge info-badge-${isTv ? 'tv' : 'movie'}">${isTv ? 'مسلسل' : 'فيلم'}</span>` : '';
  // Action controls (details-page style, ported to CSS here).
  // The heart renders ONLY for an active verified player session and toggles
  // the same favorites state as the work page via the signed bridge token.
  const heartBtn = sessionUser
    ? `<button type="button" id="favBtn" class="fav-btn" data-state="${esc(heartState)}" title="إضافة للمفضلة" aria-label="إضافة للمفضلة"><span class="fav-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span></button>`
    : '';
  // Titles bar: a full-width second row under the header carrying the type
  // badge, AR/EN titles and the favorite heart beside the name.
  const titlesBar = (arHtml || enHtml || heartBtn)
    ? `<div class="titles-bar">${headerBadge}${titlesRow}${heartBtn}</div>` : '';
  // info-row keeps only the fact chips (genres + year + runtime + rating),
  // balanced to fill the width now that the name has moved to the header.
  const infoGenres = (genres || []).map((g) => `<span class="info-genre" style="${genreChipStyle(g)}">${esc(g)}</span>`).join('');
  const infoRight = [
    (year ? `<span class="info-chip info-chip-year" dir="ltr">${esc(year)}</span>` : ''),
    (runtimeLabel ? `<span class="info-chip info-chip-runtime">${runtimeLabel}</span>` : ''),
    (rating ? `<span class="info-chip info-chip-rating" dir="ltr">★ ${esc(rating)}</span>` : ''),
  ].filter(Boolean).join('');
  const chevSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
  const seasonSelect = isTv
    ? `<div class="dd-wrap"><select id="seasonSelect" class="dd-select" aria-label="اختر الموسم"></select>${chevSvg}</div>`
    : '';
  const episodeSelect = isTv
    ? `<div class="dd-wrap"><select id="episodeSelect" class="dd-select" aria-label="اختر الحلقة"></select>${chevSvg}</div>`
    : '';
  const backLabel = isTv ? 'العودة لصفحة المسلسل' : 'العودة لصفحة الفيلم';
  const infoRowHtml = (infoGenres || infoRight)
    ? `<div class="info-row">${infoGenres}${infoRight}</div>` : '';

  // Menu links — absolute URLs on 4cima.com (mirror of QuantumNavbar sidebar,
  // minus SearchBox). Login is not synchronized across domains this round.
  const menuNav = [
    { to: '/', label: 'الرئيسية', color: '#00ffcc', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>' },
    { to: '/movies', label: 'أفلام', color: '#00ccff', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="4" x2="7" y2="20"/><line x1="17" y1="4" x2="17" y2="20"/><line x1="3" y1="9" x2="7" y2="9"/><line x1="3" y1="15" x2="7" y2="15"/><line x1="17" y1="9" x2="21" y2="9"/><line x1="17" y1="15" x2="21" y2="15"/></svg>' },
    { to: '/series', label: 'مسلسلات', color: '#aa00ff', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>' },
  ];
  const menuLangs = [
    { code: 'ar', label: 'عربي', filter: 'ar' },
    { code: 'en', label: 'أجنبي', filter: 'en' },
    { code: 'tr', label: 'تركي', filter: 'tr' },
    { code: 'hi', label: 'هندي', filter: 'hi' },
    { code: 'ko', label: 'كوري', filter: 'ko' },
    { code: 'zh', label: 'صيني', filter: 'zh,cn' },
    { code: 'ja', label: 'ياباني', filter: 'ja' },
    { code: 'fr', label: 'فرنسي', filter: 'fr' },
    { code: 'es', label: 'إسباني', filter: 'es' },
    { code: 'de', label: 'ألماني', filter: 'de' },
  ];
  const menuGenres = [
    { slug: 'action', label: 'أكشن' },
    { slug: 'comedy', label: 'كوميديا' },
    { slug: 'drama', label: 'دراما' },
    { slug: 'romance', label: 'رومانسي' },
    { slug: 'thriller', label: 'إثارة' },
    { slug: 'horror', label: 'رعب' },
    { slug: 'crime', label: 'جريمة' },
    { slug: 'adventure', label: 'مغامرات' },
    { slug: 'fantasy', label: 'فانتازيا' },
    { slug: 'animation', label: 'أنمي' },
  ];
  const loginSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>';
  // Header: login link when anonymous; a user chip + profile/logout when a
  // display name was forwarded via ?who= (or a direct player link, who empty).
  // Login/logout target back to this exact watch URL (4cima.stream only).
  const menuHeadHtml = displayName
    ? `<div class="menu-user">
         ${avatarUrl
           ? `<img class="menu-avatar" src="${esc(avatarUrl)}" alt="" referrerpolicy="no-referrer"/>`
           : `<span class="menu-avatar">${esc(displayName.charAt(0).toUpperCase())}</span>`}
         <span class="menu-user-name" title="${esc(displayName)}">${esc(displayName)}</span>
         <button type="button" id="menuUserToggle" class="menu-user-btn" aria-label="حساب المستخدم" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg></button>
         <div class="menu-dropdown" id="menuDropdown" hidden>
           <a href="https://4cima.com/profile" target="_blank" rel="noopener" class="menu-drop-link">الملف الشخصي</a>
           ${(sessionUser && (sessionUser.role === 'admin' || sessionUser.role === 'supervisor'))
             ? `<a href="https://4cima.com/admin" target="_blank" rel="noopener" class="menu-drop-link menu-drop-admin">لوحة التحكم</a>`
             : ''}
           <a href="${logoutUrl}" class="menu-drop-link menu-drop-danger">تسجيل الخروج</a>
         </div>
       </div>`
    : `<a href="${loginUrl}" class="menu-login">${loginSvg}<span>الدخول</span></a>`;
  const menuNavHtml = `<div class="menu-grid-3">${menuNav.map((l) => `<a href="https://4cima.com${l.to}" target="_blank" rel="noopener" style="flex-direction:column;gap:4px"><span style="display:inline-flex;width:18px;height:18px;color:${l.color}">${l.svg}</span>${l.label}</a>`).join('')}</div>`;
  const menuLangsHtml = `<div class="menu-grid-2">${menuLangs.map((l) => `<a href="https://4cima.com/movies?language=${encodeURIComponent(l.filter)}" target="_blank" rel="noopener">${l.label}</a>`).join('')}</div>`;
  const menuGenresHtml = `<div class="menu-grid-2">${menuGenres.map((g) => `<a href="https://4cima.com/movies/genres/${encodeURIComponent(g.slug)}" target="_blank" rel="noopener">${g.label}</a>`).join('')}</div>`;
  const menuHtml = `<div class="menu-backdrop" id="menuBackdrop" hidden></div>
<aside class="menu-panel" id="menuPanel" aria-hidden="true">
  <div class="menu-head">
    ${menuHeadHtml}
    <button type="button" id="menuClose" class="menu-close" aria-label="إغلاق">✕</button>
  </div>
  <div class="menu-body">
    <div class="menu-section">
      <div class="menu-label">القائمة</div>
      ${menuNavHtml}
    </div>
    <div class="menu-section">
      <div class="menu-label">اللغات</div>
      ${menuLangsHtml}
    </div>
    <div class="menu-section">
      <div class="menu-label">التصنيفات</div>
      ${menuGenresHtml}
    </div>
  </div>
</aside>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(pageTitle)}</title>
<link rel="icon" href="https://4cima.com/icons/favicon.ico"/>
<link rel="shortcut icon" href="https://4cima.com/icons/favicon.ico"/>
<link rel="apple-touch-icon" href="https://4cima.com/icons/favicon.ico"/>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--red:#dc2626;--orange:#f97316;--cyan:#22d3ee;--bg:#0a0c11;--card:rgba(255,255,255,.04);--border:rgba(255,255,255,.08);--text:#e5e7eb;--muted:#9ca3af}
html,body{height:100%;font-family:Cairo,sans-serif;background:var(--bg);color:var(--text)}
body{display:flex;flex-direction:column}
header{display:flex;align-items:center;gap:12px;padding:12px 20px;background:rgba(0,0,0,.5);border-bottom:1px solid var(--border);backdrop-filter:blur(12px);position:sticky;top:0;z-index:50}
.logo-wrap{display:flex;align-items:center;gap:8px;height:44px}
.logo{display:inline-flex;align-items:center;gap:8px;font-size:26px;font-weight:900;line-height:1.2;background:linear-gradient(135deg,var(--red),var(--orange));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;white-space:nowrap;text-decoration:none;cursor:pointer;transition:transform .15s;flex-shrink:0}
.logo:hover{transform:scale(1.05)}
.menu-btn{width:auto;height:36px;padding:0 8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:1px solid rgba(148,163,184,.5);border-radius:6px;background:linear-gradient(135deg,rgba(30,41,59,.95),rgba(51,65,85,.95));color:#22d3ee;cursor:pointer;transition:all .2s;box-shadow:0 4px 10px rgba(0,0,0,.35)}
.menu-btn:hover{background:linear-gradient(135deg,rgba(51,65,85,.95),rgba(71,85,105,.95));color:#67e8f9;border-color:rgba(148,163,184,.8)}
.menu-btn svg{width:26px;height:26px}
.title-col{display:flex;flex-direction:column;justify-content:center;min-width:0}
.title-ar{font-size:14px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
.title-en{font-size:12px;font-weight:600;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:ltr;line-height:1.2}
.back-btn{margin-right:auto;padding:8px 20px;border-radius:10px;background:linear-gradient(135deg,var(--red),var(--orange));border:none;color:#fff;font-size:16px;font-weight:800;text-decoration:none;transition:all .2s;white-space:nowrap;box-shadow:0 4px 12px rgba(220,38,38,.35);height:44px;display:flex;align-items:center;flex-shrink:0}
.back-btn:hover{filter:brightness(1.1);transform:scale(1.03)}
.info-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-start;gap:10px;padding:14px 16px;background:rgba(0,0,0,.35);border-bottom:1px solid var(--border)}
.info-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:800;white-space:nowrap;flex-shrink:0}
.info-badge-movie{background:rgba(220,38,38,.15);border:1px solid rgba(220,38,38,.3);color:#f87171}
.info-badge-tv{background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.3);color:#22d3ee}
.info-genre{padding:3.6px 12px;border-radius:8px;font-size:12px;font-weight:800;letter-spacing:.05em;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:var(--text);white-space:nowrap}
.info-chip{display:inline-flex;align-items:center;gap:4px;padding:3.6px 12px;border-radius:999px;font-size:14.4px;font-weight:700;background:rgba(255,255,255,.1);color:#e4e4e7;white-space:nowrap}
.info-chip-rating{background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.2);color:#eab308}
.info-sep{width:1px;height:16px;background:rgba(255,255,255,.15);flex-shrink:0}
.fav-btn{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;padding:3.6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);cursor:pointer;transition:background .15s,border-color .15s;color:#a1a1aa}
.fav-btn:hover{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3)}
.fav-ico{display:flex;align-items:center;justify-content:center}
.fav-ico svg{width:24px;height:24px;fill:none;stroke:currentColor}
.fav-btn[data-state="favorite"] .fav-ico{color:#ef4444}
.fav-btn[data-state="favorite"] .fav-ico svg,.fav-btn[data-state="completed"] .fav-ico svg{fill:currentColor}
.fav-btn[data-state="completed"] .fav-ico{color:#22c55e}
.dd-wrap{position:relative;height:64px;width:130px;flex-shrink:0}
.dd-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:#a1a1aa;pointer-events:none}
.dd-select{appearance:none;-webkit-appearance:none;height:100%;width:100%;padding-inline-start:12px;padding-inline-end:32px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:#18181b;color:#fff;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;transition:border-color .15s}
.dd-select:hover{border-color:rgba(255,255,255,.3)}
.dd-select option{background:#18181b;color:#fff}
.info-titles{display:inline-flex;align-items:baseline;gap:8px;padding:4px 14px;border-radius:999px;white-space:nowrap;max-width:100%;overflow:hidden;min-width:0;flex:0 1 auto}
.info-titles-movie{background:rgba(220,38,38,.12);border:1px solid rgba(220,38,38,.35)}
.info-titles-tv{background:rgba(34,211,238,.1);border:1px solid rgba(34,211,238,.35)}
.info-title-ar{font-size:18px;font-weight:900;color:#f4f4f5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.info-title-en{font-size:16.2px;font-weight:700;direction:ltr;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.info-titles-movie .info-title-en{color:#f87171}
.titles-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-start;gap:10px;padding:10px 20px;background:rgba(0,0,0,.45);border-bottom:1px solid var(--border);position:sticky;top:68px;z-index:40;backdrop-filter:blur(12px)}
.titles-bar .fav-btn{margin-right:4px}
.info-titles-tv .info-title-en{color:#22d3ee}
main{flex:1;display:flex;flex-direction:column;min-height:0}
.server-row{display:flex;flex-wrap:nowrap;align-items:center;gap:10px;padding:10px 16px;background:rgba(0,0,0,.4);border-bottom:1px solid var(--border)}
/* --- Advanced servers dropdown --- */
.srv-dd{position:relative;flex-shrink:0}
.srv-dd-btn{display:inline-flex;align-items:center;gap:10px;padding:8.4px 16.8px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(135deg,rgba(220,38,38,.18),rgba(249,115,22,.12));color:#fff;font-size:14.4px;font-weight:800;font-family:inherit;cursor:pointer;transition:all .2s;white-space:nowrap}
.srv-dd-btn:hover{border-color:var(--red);box-shadow:0 4px 14px rgba(220,38,38,.25)}
.srv-dd-btn[aria-expanded="true"]{border-color:var(--red);background:linear-gradient(135deg,rgba(220,38,38,.3),rgba(249,115,22,.2))}
.srv-dd-btn .srv-live{width:8px;height:8px;border-radius:999px;background:#22c55e;box-shadow:0 0 6px #22c55e;flex-shrink:0;animation:pulse 1.6s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
.srv-dd-chev{width:16px;height:16px;transition:transform .2s}
.srv-dd-btn[aria-expanded="true"] .srv-dd-chev{transform:rotate(180deg)}
.srv-dd-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:230px;background:rgba(10,12,17,.97);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.14);border-radius:14px;overflow:hidden;z-index:1500;box-shadow:0 18px 40px rgba(0,0,0,.6);padding:6px;animation:srvIn .18s ease-out}
.srv-dd-menu[hidden]{display:none}
@keyframes srvIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.srv-dd-head{padding:6px 10px 8px;font-size:11px;font-weight:800;color:#71717a;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:4px}
.srv-item{display:flex;align-items:center;gap:10px;width:100%;padding:4px 10px;border:none;border-radius:8px;background:transparent;color:#e5e7eb;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;text-align:right;transition:background .15s,color .15s}
.srv-item:hover{background:rgba(255,255,255,.08);color:#fff}
.srv-item.active{background:linear-gradient(135deg,rgba(220,38,38,.25),rgba(249,115,22,.15));color:#fff}
.srv-num{width:22px;height:22px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:6px;background:rgba(255,255,255,.08);font-size:11px;font-weight:900;color:#a1a1aa}
.srv-item.active .srv-num{background:linear-gradient(135deg,var(--red),var(--orange));color:#fff}
.srv-item .srv-check{width:16px;height:16px;flex-shrink:0;opacity:0;transition:opacity .15s}
.srv-item.active .srv-check{opacity:1;color:#22c55e}
/* Compact season/episode selects inside the server bar row */
.server-row .dd-wrap{height:40px;width:92px}
.server-row .dd-select{font-size:13px;border-radius:8px;padding-inline-start:10px;padding-inline-end:26px}
.srv-dd-legend{display:flex;align-items:center;gap:8px;padding:8px 10px 6px;font-size:12px;font-weight:700;color:#a1a1aa;border-top:1px solid rgba(255,255,255,.08);margin-top:4px}
.back-btn{flex-shrink:0;display:inline-flex;align-items:center;gap:6px;margin-right:0;padding:8.4px 16.8px;border-radius:8px;border:1px solid transparent;background:linear-gradient(135deg,var(--red),var(--orange));color:#fff;font-size:14.4px;font-weight:800;font-family:inherit;text-decoration:none;transition:all .2s;white-space:nowrap;box-shadow:0 4px 12px rgba(220,38,38,.35)}
.back-btn:hover{filter:brightness(1.1);transform:scale(1.03)}
.layout{flex:1;display:grid;grid-template-columns:1fr 180px;grid-template-rows:auto 1fr auto;grid-template-areas:"servers servers" "player ad" "hint .";gap:10px 12px;padding:0 16px;min-height:0;min-width:0}
.server-row{grid-area:servers}
.player-wrap{grid-area:player;position:relative;display:flex;min-height:0;min-width:0}
iframe{width:100%;height:100%;border:none;display:block;background:#000}
.ad-col{grid-area:ad;width:180px;border:1px solid var(--border);border-radius:10px;background:rgba(255,255,255,.02);display:block}
.sub-hint{grid-area:hint}
@media(max-width:860px){
  .layout{grid-template-columns:1fr;grid-template-rows:auto auto 1fr auto;grid-template-areas:"servers" "player" "hint"}
  .ad-col{display:none}
  .server-row{flex-wrap:wrap}
  .back-btn{margin-right:auto}
}
.error-msg{color:#f87171;font-weight:700;font-size:16px}
.status{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(0,0,0,.85);color:var(--muted);font-size:14px;text-align:center;padding:20px;z-index:5}
.status-title{font-size:15px;font-weight:800;color:#fff}
.spinner{width:36px;height:36px;border:3px solid rgba(255,255,255,.15);border-top-color:var(--red);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.sub-hint{display:flex;align-items:flex-start;gap:6px;margin:14px 16px;font-size:18.72px;font-weight:700;line-height:1.45;text-align:right}
.sub-hint span.hint-text{background:linear-gradient(90deg,#5a6e2b,#16a34a);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:.35px rgba(255,255,255,.75)}
.sub-hint svg{width:22px;height:22px;flex-shrink:0;margin-top:4px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;color:#fff}
.sub-hint svg.ico-cc rect{fill:rgba(255,255,255,.08);stroke:#fff;stroke-width:2}
.sub-hint svg.ico-cc text{fill:#fff;stroke:none;font-size:9px;font-weight:900;font-family:Cairo,sans-serif}
.sub-hint svg.ico-gear .gear-bg{stroke:rgba(255,255,255,.85);stroke-width:2.6}
.sub-hint svg.ico-gear .gear-fg{stroke:url(#gearGrad);stroke-width:2}
.menu-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1200}
.menu-panel{position:fixed;top:0;right:0;height:100%;width:240px;background:rgba(0,0,0,.95);border-left:1px solid rgba(255,255,255,.1);z-index:1300;display:flex;flex-direction:column;box-shadow:-8px 0 24px rgba(0,0,0,.4)}
.menu-panel[aria-hidden="true"]{display:none}
.menu-head{display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid var(--border)}
.menu-login{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:8px;background:rgba(16,185,129,.2);border:1px solid rgba(16,185,129,.35);color:#34d399;font-weight:700;font-size:14px;text-decoration:none}
.menu-login svg{width:18px;height:18px;flex-shrink:0}
.menu-user{display:flex;align-items:center;gap:8px;position:relative;min-width:0;flex:1}
.menu-avatar{width:24px;height:24px;flex-shrink:0;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;background:linear-gradient(135deg,var(--red),var(--orange));object-fit:cover}
.menu-user-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:700;color:#fff}
.menu-user-btn{width:26px;height:26px;flex-shrink:0;border:none;border-radius:6px;background:rgba(255,255,255,.1);color:#fff;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.menu-user-btn svg{width:14px;height:14px}
.menu-dropdown{position:absolute;top:calc(100% + 6px);right:0;min-width:160px;background:#0a0c11;border:1px solid rgba(255,255,255,.12);border-radius:10px;overflow:hidden;z-index:1400;display:flex;flex-direction:column;padding:4px}
.menu-dropdown[hidden]{display:none}
.menu-drop-link{display:flex;align-items:center;gap:8px;padding:9px 10px;color:#e5e7eb;font-size:13px;font-weight:600;text-decoration:none;border-radius:6px}
.menu-drop-link:hover{background:rgba(255,255,255,.08);color:#fff}
.menu-drop-danger{color:#f87171}
.menu-drop-danger:hover{background:rgba(239,68,68,.12);color:#ef4444}
.menu-drop-admin{color:#67e8f9}
.menu-drop-admin:hover{background:rgba(34,211,238,.12);color:#22d3ee}
.menu-close{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:none;border-radius:8px;background:transparent;color:#fff;font-size:18px;cursor:pointer}
.menu-close:hover{color:#ef4444}
.menu-body{flex:1;overflow-y:auto;padding:12px}
.menu-section{margin-bottom:16px}
.menu-label{font-size:11px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}
.menu-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.menu-grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
.menu-grid-3 a,.menu-grid-2 a{display:flex;align-items:center;justify-content:center;padding:8px 6px;border-radius:8px;background:rgba(255,255,255,.06);color:#d4d4d8;font-size:12px;font-weight:700;text-decoration:none;text-align:center;transition:background .15s}
.menu-grid-3 a:hover,.menu-grid-2 a:hover{background:rgba(255,255,255,.14);color:#fff}
@media(max-width:860px){.ad-col{display:none}}
@media(min-width:861px){.ad-col{display:block}}
footer{padding:10px;text-align:center;font-size:11px;color:#4b5563;border-top:1px solid var(--border)}
footer a{color:#6b7280;text-decoration:none}
footer a:hover{color:var(--muted)}
</style>
</head>
<body style="${bgStyle}">
${menuHtml}
<header>
  <button type="button" id="menuBtn" class="menu-btn" aria-label="القائمة" aria-expanded="false">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
  </button>
  <a class="logo" href="https://4cima.com" target="_blank" rel="noopener" title="4cima.com">🎬 4cima</a>
</header>
${titlesBar}
<main>
  ${infoRowHtml}
  <div class="layout">
    <div class="server-row">
      ${seasonSelect}${episodeSelect}
      <div class="srv-dd" id="serverBar" aria-label="مصادر المشاهدة">
        <button type="button" id="srvDdBtn" class="srv-dd-btn" aria-expanded="false">
          <span class="srv-live" aria-hidden="true"></span>
          <span id="srvDdLabel">اختر السيرفر</span>
          <svg class="srv-dd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="srv-dd-menu" id="srvDdMenu" hidden></div>
      </div>
      <a class="back-btn" href="${esc(refUrl)}">↩ ${backLabel}</a>
    </div>
    <div class="player-wrap">
      <div class="status" id="status">
        <div class="spinner"></div>
        <span class="status-title">جاري تحميل المشغّل…</span>
      </div>
      <iframe id="player" allow="fullscreen;autoplay;encrypted-media" allowfullscreen title="4cima Player"></iframe>
    </div>
    <aside class="ad-col" id="adCol" aria-label="إعلان"></aside>
    <div class="sub-hint" id="subHint">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M9.5 9h1.5M13 9h1.5M6 12h12"/></svg>
      <span class="hint-text">لتفعيل الترجمة العربية ابحث عن زر الترجمة <svg class="ico-cc" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><text x="12" y="15" text-anchor="middle">CC</text></svg> او داخل زر الاعدادات <svg class="ico-gear" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><defs><linearGradient id="gearGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e3a5f"/><stop offset="1" stop-color="#9ca3af"/></linearGradient></defs><path class="gear-bg" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/><circle cx="12" cy="12" r="3"/><path class="gear-fg" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> بالفيديو اسفل شريط التقدم. إن لم تجدها جرب تغيّر السيرفر وابحث بنفس الطريقة.</span>
    </div>
  </div>
</main>
<footer>شاهد أحدث الأفلام والمسلسلات بجودة عالية على <a href="https://4cima.com" target="_blank" rel="noopener"><strong>4cima.com</strong></a> — بث مباشر عبر <a href="https://4cima.stream" target="_blank" rel="noopener"><strong>4cima.stream</strong></a></footer>
<script>
(function () {
  'use strict';
  var D = ${boot};
  var P = document.getElementById('player');
  var S = document.getElementById('status');
  var B = document.getElementById('serverBar');
  var seasonSel = document.getElementById('seasonSelect');
  var episodeSel = document.getElementById('episodeSelect');
  var favBtn = document.getElementById('favBtn');
  var menuBtn = document.getElementById('menuBtn');
  var menuPanel = document.getElementById('menuPanel');
  var menuBackdrop = document.getElementById('menuBackdrop');
  var menuClose = document.getElementById('menuClose');
  var active = null;
  var hideTimer = null;

  // Spinner auto-hides within 5000ms no matter what (even if iframe never fires load).
  function hideStatus() {
    if (S) S.style.display = 'none';
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  }
  function showStatus() {
    if (!S) return;
    S.style.display = 'flex';
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(hideStatus, 5000);
  }

  function pageUrl(sn, en) {
    var s = (sn === undefined) ? D.season : sn;
    var e = (en === undefined) ? D.episode : en;
    if (D.mediaType === 'movie') return '/movies/' + D.slug;
    return '/series/' + D.slug + '/season/' + s + '/episode/' + e;
  }

  // Mirrors buildServerUrl() on the server, incl. Arabic params and
  // the /api/embed-proxy wrap for ISP-blocked servers (s.px).
  function srcFor(s) {
    if (!s) return '';
    var b = s.base || '';
    var id = s.id;
    var t = D.tmdbId, sn = D.season, ep = D.episode;
    var m = (D.mediaType === 'movie');
    var u = '';
    if (id === 'vidlink') {
      u = m ? 'https://vidlink.pro/movie/' + t : 'https://vidlink.pro/tv/' + t + '/' + sn + '/' + ep;
    } else if (id === 'videasy') {
      u = m ? 'https://player.videasy.net/movie/' + t : 'https://player.videasy.net/tv/' + t + '/' + sn + '/' + ep;
    } else if (id === '111movies') {
      u = m ? b + '/movie/' + t : 'https://111movies.net/tv/' + t + '/' + sn + '/' + ep;
    } else if (id === 'autoembed_co') {
      u = m ? b + '/movie/tmdb/' + t : b + '/tv/tmdb/' + t + '-' + sn + '-' + ep;
    } else {
      u = m ? b + '/movie/' + t : b + '/tv/' + t + '/' + sn + '/' + ep;
    }
    if (id.lastIndexOf('vidsrc_', 0) === 0) {
      u += (u.indexOf('?') >= 0 ? '&' : '?') + 'lang=ar&sub=ar';
    } else if (id === 'autoembed_co') {
      u += (u.indexOf('?') >= 0 ? '&' : '?') + 'lang=ar&subtitles=ar';
    } else if (id === '111movies') {
      u += (u.indexOf('?') >= 0 ? '&' : '?') + 'lang=ar';
    }
    if (s.px) u = '/api/embed-proxy?url=' + encodeURIComponent(u);
    return u;
  }

  function load(u) {
    showStatus();
    // Serve the iframe without a sandbox for every server (1–7): some sources
    // reject sandboxed frames, so we always clear it. No CSP on this page.
    P.removeAttribute('sandbox');
    P.src = u;
  }

  function selectServer(btn, s) {
    active = s;
    var items = B.querySelectorAll('.srv-item');
    for (var i = 0; i < items.length; i++) items[i].classList.remove('active');
    if (btn) btn.classList.add('active');
    var label = document.getElementById('srvDdLabel');
    if (label) label.textContent = btn ? btn.getAttribute('data-label') : 'اختر السيرفر';
    load(s.src || srcFor(s));
    closeSrvDd();
  }

  function badgeSvg() {
    return '<svg viewBox="0 0 24 24" style="width:12px;height:12px;flex-shrink:0" aria-hidden="true"><path d="M12 2.5 22 21H2Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.5" stroke-linejoin="round"/><line x1="12" y1="9" x2="12" y2="14.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.5" r="1.3" fill="#fff"/></svg>';
  }

  function renderTabs() {
    if (!B) return;
    var menu = document.getElementById('srvDdMenu');
    if (!menu) return;
    menu.innerHTML = '';
    if (!D.servers.length) {
      menu.innerHTML = '<div class="srv-dd-head">⚠ لا توجد مصادر متاحة الآن</div>';
      return;
    }
    var head = document.createElement('div');
    head.className = 'srv-dd-head';
    head.textContent = 'مصادر المشاهدة';
    menu.appendChild(head);
    var checkSvg = '<svg class="srv-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
    D.servers.forEach(function (s, idx) {
      var shortName = s.short || s.name || ('سيرفر ' + (idx + 1));
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'srv-item';
      btn.setAttribute('data-label', 'سيرفر ' + shortName);
      var num = document.createElement('span');
      num.className = 'srv-num';
      num.textContent = String(idx + 1);
      btn.appendChild(num);
      var name = document.createElement('span');
      name.textContent = 'سيرفر ' + shortName;
      btn.appendChild(name);
      // +18 warning triangle badge on 111movies (server 5) and AutoEmbed (server 6).
      if (s.id === 'autoembed_co' || s.id === '111movies') {
        var b = document.createElement('span');
        b.style.cssText = 'display:inline-flex;align-items:center;flex-shrink:0';
        b.title = '+18';
        b.innerHTML = badgeSvg();
        btn.appendChild(b);
      }
      btn.insertAdjacentHTML('beforeend', checkSvg);
      btn.addEventListener('click', function () { selectServer(btn, s); });
      menu.appendChild(btn);
    });
    // Legend row: explain the red triangle (+18 ads) badge used on 111Movies
    // and AutoEmbed, so users understand what it means.
    var legend = document.createElement('div');
    legend.className = 'srv-dd-legend';
    legend.innerHTML = badgeSvg() + '<span>إعلانات للكبار</span>';
    menu.appendChild(legend);
    var first = menu.querySelector('.srv-item');
    if (first) selectServer(first, D.servers[0]);
  }

  function closeSrvDd() {
    var btn = document.getElementById('srvDdBtn');
    var menu = document.getElementById('srvDdMenu');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (menu) menu.hidden = true;
  }

  function initSrvDd() {
    var btn = document.getElementById('srvDdBtn');
    var menu = document.getElementById('srvDdMenu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !menu.hidden;
      menu.hidden = open;
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
    menu.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', closeSrvDd);
  }

  function renderEpSelect() {
    if (!episodeSel) return;
    episodeSel.innerHTML = '';
    (D.episodes || []).forEach(function (ep) {
      var o = document.createElement('option');
      o.value = ep.episode_number;
      o.textContent = 'حلقة ' + ep.episode_number;
      if (ep.episode_number === D.episode) o.selected = true;
      episodeSel.appendChild(o);
    });
    episodeSel.addEventListener('change', function () {
      // Episode change: reload the active server src without full navigation
      // (mirrors the old ep-btn behaviour).
      D.episode = parseInt(this.value, 10) || 1;
      history.replaceState(null, '', pageUrl());
      if (active) load(srcFor(active));
    });
  }

  function renderSeasonSelect() {
    if (!seasonSel) return;
    seasonSel.innerHTML = '';
    (D.seasons || []).forEach(function (s) {
      var o = document.createElement('option');
      o.value = s.season_number;
      o.textContent = 'الموسم ' + s.season_number + ' (' + (s.episode_count || 0) + ')';
      if (s.season_number === D.season) o.selected = true;
      seasonSel.appendChild(o);
    });
    seasonSel.addEventListener('change', function () {
      // Season change: full navigation so the worker serves the fresh episode list.
      window.location.href = pageUrl(parseInt(this.value, 10) || 1, 1);
    });
  }

  function initMenu() {
    if (!menuPanel || !menuBtn) return;
    function open() {
      menuPanel.setAttribute('aria-hidden', 'false');
      if (menuBackdrop) menuBackdrop.hidden = false;
      menuBtn.setAttribute('aria-expanded', 'true');
    }
    function close() {
      menuPanel.setAttribute('aria-hidden', 'true');
      if (menuBackdrop) menuBackdrop.hidden = true;
      menuBtn.setAttribute('aria-expanded', 'false');
    }
    menuBtn.addEventListener('click', function () {
      if (menuPanel.getAttribute('aria-hidden') === 'true') open(); else close();
    });
    if (menuBackdrop) menuBackdrop.addEventListener('click', close);
    if (menuClose) menuClose.addEventListener('click', close);
  }

  function initFav() {
    if (!favBtn) return;
    var apply = function (state) {
      if (state === 'favorite' || state === 'completed' || state === 'neutral') {
        favBtn.setAttribute('data-state', state);
      }
    };
    apply(D.heartState);
    favBtn.addEventListener('click', function () {
      // Toggle the same favorites state as the work page via the signed
      // player bridge. Never navigates and never opens the profile — on
      // failure it silently keeps the current state.
      if (!D.pt) return;
      fetch('https://4cima.com/api/player/card-action', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + D.pt, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: D.mediaType,
          tmdb_id: D.tmdbId,
          title: D.title || '',
          poster_path: D.posterPath || '',
        }),
      }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j && j.newState) apply(j.newState); })
        .catch(function () { /* keep current state */ });
    });
  }

  function initUserMenu() {
    var toggle = document.getElementById('menuUserToggle');
    var dd = document.getElementById('menuDropdown');
    if (!toggle || !dd) return;
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      dd.hidden = !dd.hidden;
      toggle.setAttribute('aria-expanded', dd.hidden ? 'false' : 'true');
    });
    document.addEventListener('click', function () {
      dd.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    });
  }

  renderTabs();
  renderSeasonSelect();
  renderEpSelect();
  initSrvDd();
  initMenu();
  initFav();
  initUserMenu();
  P.addEventListener('load', hideStatus);
  showStatus();
})();
</script>
</body>
</html>`;
}

// ------------------------------------------------------------------
// Error page (bad slug / no TMDB match)
// ------------------------------------------------------------------
function playerErrorPage(slug, mediaType, message) {
  const backUrl = mediaType === 'movie'
    ? `${PLAY_BASE}/movies/${encodeURIComponent(slug)}`
    : mediaType === 'tv'
    ? `${PLAY_BASE}/series/${encodeURIComponent(slug)}`
    : PLAY_BASE;
  const body = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>تعذر العثور على العنوان | 4cima</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;background:radial-gradient(ellipse at center,#1a1a2e 0%,#0a0c11 100%);color:#e5e7eb;text-align:center;padding:2rem}
.card{max-width:520px;padding:2.5rem;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
h1{font-size:22px;margin:0 0 10px}
p{font-size:14px;color:#9ca3af;margin:0 0 8px;line-height:1.8;word-break:break-word}
a.btn{display:inline-block;margin-top:14px;padding:10px 26px;border-radius:10px;background:linear-gradient(135deg,#dc2626,#f97316);color:#fff;font-weight:700;font-size:14px;text-decoration:none}
code{font-size:12px;color:#6b7280}
</style>
</head>
<body>
<div class="card">
  <h1>⚠ تعذر العثور على هذا العنوان</h1>
  <p>لم نتمكن من مطابقة «<code>${esc(slug)}</code>» على TMDb.</p>
  <p>${esc(message || '')}</p>
  <a class="btn" href="${esc(backUrl)}">العودة إلى 4cima</a>
</div>
</body>
</html>`;
  return new Response(body, {
    status: 404,
    headers: { 'Cache-Control': 'no-store', ...HTML_HEADERS },
  });
}

// ------------------------------------------------------------------
// Embed proxy
// ------------------------------------------------------------------
// MIME type mapping for proper Content-Type headers
const MIME_TYPES = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

function getMimeType(pathname) {
  const ext = pathname.substring(pathname.lastIndexOf('.')).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function rewriteHtmlUrls(html, baseUrl, proxyPrefix) {
  const base = new URL(baseUrl);
  const origin = base.origin;

  const toProxied = (rawUrl) => {
    // Skip absolute URLs (http://, https://, //), data:, blob:, javascript:, mailto:
    if (/^(https?:)?\/\//i.test(rawUrl) || /^(data|blob|javascript|mailto):/i.test(rawUrl)) return null;
    // Skip already proxied URLs (prevent loops)
    if (rawUrl.startsWith('/api/embed-proxy')) return null;
    // Only rewrite root-relative ("/...") and document-relative paths
    let absoluteUrl;
    try {
      absoluteUrl = new URL(rawUrl, origin).toString();
    } catch {
      return null;
    }
    return `${proxyPrefix}?url=${encodeURIComponent(absoluteUrl)}`;
  };

  // Rewrite simple attributes: src, href, action, poster, data-src, data-href
  let out = html.replace(
    /(src|href|action|poster|data-src|data-href)\s*=\s*(["'])([^"']+)\2/gi,
    (match, attr, quote, rawUrl) => {
      const proxied = toProxied(rawUrl);
      return proxied ? `${attr}=${quote}${proxied}${quote}` : match;
    }
  );

  // Rewrite srcset (each candidate: "url descriptor")
  out = out.replace(
    /(srcset)\s*=\s*(["'])([^"']+)\2/gi,
    (match, attr, quote, value) => {
      const rewritten = value.split(',').map((candidate) => {
        const parts = candidate.trim().split(/\s+/);
        const proxied = toProxied(parts[0]);
        if (proxied) parts[0] = proxied;
        return parts.join(' ');
      }).join(', ');
      return `${attr}=${quote}${rewritten}${quote}`;
    }
  );

  return out;
}

// Insert <base href="ORIGIN/"> so any runtime-created relative URLs
// (dynamically injected scripts, fetches, sbx.js …) resolve against the
// original server instead of 4cima.stream.
function insertBaseTag(html, baseUrl) {
  const origin = new URL(baseUrl).origin;
  const baseTag = `<base href="${origin}/">`;
  if (/<base\s/i.test(html)) return html; // already has a base tag
  const headOpen = html.match(/<head[^>]*>/i);
  if (headOpen && headOpen.index !== undefined) {
    const idx = headOpen.index + headOpen[0].length;
    return html.slice(0, idx) + baseTag + html.slice(idx);
  }
  const htmlOpen = html.match(/<html[^>]*>/i);
  if (htmlOpen && htmlOpen.index !== undefined) {
    const idx = htmlOpen.index + htmlOpen[0].length;
    return html.slice(0, idx) + baseTag + html.slice(idx);
  }
  return baseTag + html;
}

async function handleEmbedProxy(url) {
  const target = url.searchParams.get('url');
  if (!target) return new Response('Bad Request — missing url', { status: 400, headers: COMMON_HEADERS });
  
  try {
    const u = new URL(target);
    const proxyPrefix = '/api/embed-proxy';
    
    // Known ad scripts (notably AutoEmbed's aclib.js): serve an empty JS
    // body instead of the ad. Everything else passes through untouched.
    const adNeedles = ['aclib.js', 'ads.js', 'adsbygoogle', 'popunder', 'googlesyndication', 'doubleclick', 'pop.js'];
    const adHaystack = (u.hostname + u.pathname).toLowerCase();
    if (adNeedles.some((n) => adHaystack.includes(n))) {
      return new Response('', {
        status: 200,
        headers: {
          'Content-Type': 'text/javascript; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          ...COMMON_HEADERS,
        },
      });
    }

    const upstream = await fetch(u.toString(), {
      method: 'GET', redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        // Some video servers reject requests without a same-origin Referer.
        'Referer': u.origin + '/',
      },
    });
    
    const contentType = upstream.headers.get('content-type') || '';
    const isHtml = contentType.includes('text/html');
    const status = upstream.status;
    
    // Get body as array buffer to handle binary content properly
    const body = await upstream.arrayBuffer();
    
    // Determine correct MIME type: never let a wrong upstream type
    // (missing, octet-stream, or text/plain) break JS/CSS/images.
    const guessed = getMimeType(u.pathname);
    const looksWrong =
      !contentType ||
      contentType === 'application/octet-stream' ||
      contentType.startsWith('text/plain');
    const finalContentType = looksWrong && guessed !== 'application/octet-stream'
      ? guessed
      : contentType;
    
    const responseHeaders = {
      'Content-Type': finalContentType,
      'X-Content-Type-Options': 'nosniff',
      // Minimum headers only — no CSP / X-Frame-Options on proxied responses.
      'Cache-Control': isHtml ? 'no-store' : 'public, max-age=3600',
    };
    
    // For HTML: force proper charset, inject <base href="ORIGIN/"> so
    // runtime-created relative URLs resolve against the original server,
    // and rewrite root-relative asset URLs to go through the proxy.
    let finalBody = body;
    if (isHtml) {
      responseHeaders['Content-Type'] = 'text/html; charset=utf-8';
      let htmlText = new TextDecoder('utf-8').decode(body);
      htmlText = insertBaseTag(htmlText, u.origin + '/');
      const rewrittenHtml = rewriteHtmlUrls(htmlText, u.toString(), proxyPrefix);
      // Inject a one-time window.open no-op into proxied pages only (AutoEmbed,
      // server 8). This blocks ad popups without touching the main htmlPage and
      // without breaking fullscreen.
      let finalHtml = rewrittenHtml;
      const popupBlock = '<script>window.open=function(){return null;};</script>';
      const headClose = finalHtml.match(/<\/head>/i);
      if (headClose && headClose.index !== undefined) {
        finalHtml = finalHtml.slice(0, headClose.index) + popupBlock + finalHtml.slice(headClose.index);
      } else {
        finalHtml = popupBlock + finalHtml;
      }
      finalBody = new TextEncoder().encode(finalHtml);
    }
    
    return new Response(finalBody, { status, headers: responseHeaders });
  } catch (e) {
    return new Response('Upstream error', { status: 502, headers: COMMON_HEADERS });
  }
}
