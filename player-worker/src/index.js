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
  { id: 'vidsrc_vip',   name: 'VidSrc',    base: 'https://vidrock.net/embed' },
  { id: 'vidrock_ru',   name: 'VidRock',   base: 'https://vidrock.ru/embed' },
  { id: '111movies',    name: '111Movies', base: 'https://111movies.com' },
  { id: 'vidsrc_io',    name: 'VidSrc.io', base: 'https://vidsrc.io/embed' },
  { id: 'vidsrc_me',    name: 'VidSrc.me', base: 'https://vidsrc.me/embed' },
  { id: 'vidlink',      name: 'VidLink',   base: 'https://vidlink.pro' },
  { id: 'videasy',      name: 'Videasy',   base: 'https://player.videasy.net' },
  { id: 'autoembed_co', name: 'AutoEmbed', base: 'https://autoembed.co/movie/tmdb' },
];

const BASE_OVERRIDES = {
  autoembed_co: 'https://autoembed.co',
  vidsrc_io:    'https://vidsrc.io/embed',
  vidsrc_me:    'https://vidsrc.me/embed',
  vidsrc_vip:   'https://vidrock.net/embed',
  vidrock_ru:   'https://vidrock.ru/embed',
  vidlink:      'https://vidlink.pro',
  videasy:      'https://player.videasy.net',
};

// Servers routed through /api/embed-proxy (often ISP-blocked in Egypt).
const PROXIED_IDS = new Set(['vidsrc_vip', 'vidrock_ru', 'vidsrc_io', 'vidsrc_me']);

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
  if (id === 'vidsrc_io' || id.startsWith('vidsrc_') || id === 'vidrock_ru' || id === 'vidsrc_me') {
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
  return {
    tmdbId: row.tmdb_id,
    slug: row.slug || '',
    title: row.title_ar || row.name_ar || row.title_en || row.name_en || row.title || row.name || '',
    latinTitle: row.title_en || row.name_en || row.name_original || row.original_name || row.title_ar || row.name_ar || '',
    backdrop: row.backdrop_path || null,
    poster: row.poster_path || null,
    seasons,
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

  return new Response(
    htmlPage({
      slug, mediaType, tmdbId, title, titleEn: resolved.latinTitle, season, episode,
      servers, seasons: seasonsList, episodes: epList,
      backdropUrl, backUrl, refUrl,
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

function htmlPage({ slug, mediaType, tmdbId, title, titleEn, season, episode, servers, seasons, episodes, backdropUrl, backUrl, refUrl }) {
  const isTv = mediaType === 'tv';
  const pageTitle = title
    ? (isTv
        ? `مشاهدة ${title} — موسم ${season} حلقة ${episode}`
        : `مشاهدة ${title}`) + ' | 4cima'
    : '4cima Player';

  const bgStyle = backdropUrl
    ? `background:linear-gradient(to bottom,rgba(10,12,17,.55),#0a0c11),url('${esc(backdropUrl)}') center/cover no-repeat fixed;`
    : 'background:radial-gradient(ellipse at center,#1a1a2e 0%,#0a0c11 100%);';

  const boot = jsonForScript({
    slug, mediaType, tmdbId, season, episode,
    servers, seasons, episodes,
  });

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(pageTitle)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--red:#dc2626;--orange:#f97316;--cyan:#22d3ee;--bg:#0a0c11;--card:rgba(255,255,255,.04);--border:rgba(255,255,255,.08);--text:#e5e7eb;--muted:#9ca3af}
html,body{height:100%;font-family:Cairo,sans-serif;background:var(--bg);color:var(--text)}
body{display:flex;flex-direction:column}
header{display:flex;align-items:center;gap:12px;padding:12px 20px;background:rgba(0,0,0,.5);border-bottom:1px solid var(--border);backdrop-filter:blur(12px);position:sticky;top:0;z-index:50}
.logo-wrap{display:flex;align-items:center;gap:8px;height:44px}
.logo{display:inline-flex;align-items:center;gap:8px;font-size:22px;font-weight:900;background:linear-gradient(135deg,var(--red),var(--orange));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;white-space:nowrap;text-decoration:none;cursor:pointer;transition:transform .15s}
.logo:hover{transform:scale(1.05)}
.title-col{display:flex;flex-direction:column;justify-content:center;min-width:0}
.title-ar{font-size:14px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
.title-en{font-size:12px;font-weight:600;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:ltr;line-height:1.2}
.back-btn{margin-right:auto;padding:9px 20px;border-radius:10px;background:linear-gradient(135deg,var(--red),var(--orange));border:none;color:#fff;font-size:14px;font-weight:800;text-decoration:none;transition:all .2s;white-space:nowrap;box-shadow:0 4px 12px rgba(220,38,38,.35);height:44px;display:flex;align-items:center}
.back-btn:hover{filter:brightness(1.1);transform:scale(1.03)}
main{flex:1;display:flex;flex-direction:column;min-height:0}
.server-bar{display:flex;gap:6px;padding:10px 16px;overflow-x:auto;background:rgba(0,0,0,.4);border-bottom:1px solid var(--border);scrollbar-width:thin;scrollbar-color:#333 transparent}
.server-tab{flex-shrink:0;padding:7px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.055);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:var(--muted);font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;transition:all .2s}
.server-tab:hover{border-color:var(--red);color:#fff}
.server-tab.active{background:linear-gradient(135deg,var(--red),var(--orange));border-color:transparent;color:#fff;box-shadow:0 4px 12px rgba(220,38,38,.35)}
.ep-picker{display:flex;gap:8px;padding:10px 16px;flex-wrap:wrap;align-items:center;background:rgba(0,0,0,.3);border-bottom:1px solid var(--border)}
.ep-label{font-size:12px;font-weight:700;color:var(--cyan);white-space:nowrap}
select{padding:5px 10px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:#fff;font-size:12px;font-family:inherit;cursor:pointer}
select option{background:#111827;color:#e5e7eb}
.ep-btns{display:flex;flex-wrap:wrap;gap:6px}
.ep-btn{min-width:48px;padding:5px 10px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--muted);font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;transition:all .15s}
.ep-btn:hover{border-color:var(--cyan);color:#fff}
.ep-btn.active{background:var(--cyan);border-color:var(--cyan);color:#000;font-weight:900}
.player-wrap{flex:1;display:flex;min-height:0;position:relative}
iframe{width:100%;height:100%;border:none;display:block;background:#000}
.status{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(0,0,0,.85);color:var(--muted);font-size:14px;text-align:center;padding:20px}
.spinner{width:36px;height:36px;border:3px solid rgba(255,255,255,.15);border-top-color:var(--red);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.error-msg{color:#f87171;font-weight:700;font-size:16px}
footer{padding:10px;text-align:center;font-size:11px;color:#4b5563;border-top:1px solid var(--border)}
footer a{color:#6b7280;text-decoration:none}
footer a:hover{color:var(--muted)}
</style>
</head>
<body style="${bgStyle}">
<header>
  <div class="logo-wrap">
    <a class="logo" href="https://4cima.com" target="_blank" rel="noopener" title="4cima.com">🎬 4cima</a>
    <div class="title-col">
      ${title ? `<span class="title-ar" dir="auto">${esc(title)}</span>` : ''}
      ${titleEn && titleEn !== title ? `<span class="title-en" dir="ltr">${esc(titleEn)}</span>` : ''}
    </div>
  </div>
  <a class="back-btn" href="${esc(refUrl)}">↩ العودة للصفحة</a>
</header>
<main>
  <div class="server-bar" id="serverBar" aria-label="مصادر المشاهدة"></div>
  ${isTv ? `<div class="ep-picker" id="epPicker">
    <span class="ep-label">الموسم:</span>
    <select id="seasonSelect" aria-label="الموسم"></select>
    <span class="ep-label">الحلقة:</span>
    <div class="ep-btns" id="epBtns"></div>
  </div>` : ''}
  <div class="player-wrap">
    <div class="status" id="status"><div class="spinner"></div><span>جاري تحميل المشغّل…</span></div>
    <iframe id="player" allow="fullscreen;autoplay;encrypted-media" allowfullscreen title="4cima Player"></iframe>
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
  var E = document.getElementById('epPicker');
  var active = null;

  function hideStatus() { if (S) S.style.display = 'none'; }
  function showStatus(html) { if (!S) return; S.style.display = 'flex'; S.innerHTML = html; }
  function loadingStatus() {
    showStatus('<div class="spinner"></div><span>جاري تحميل المشغّل…</span>');
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
    if (id === 'autoembed_co') {
      u = m ? b + '/movie/tmdb/' + t : b + '/tv/tmdb/' + t + '-' + sn + '-' + ep;
    } else if (id === 'vidlink') {
      u = m ? 'https://vidlink.pro/movie/' + t : 'https://vidlink.pro/tv/' + t + '/' + sn + '/' + ep;
    } else if (id === 'videasy') {
      u = m ? 'https://player.videasy.net/movie/' + t : 'https://player.videasy.net/tv/' + t + '/' + sn + '/' + ep;
    } else if (id === '111movies') {
      u = m ? b + '/movie/' + t : 'https://111movies.net/tv/' + t + '/' + sn + '/' + ep;
    } else {
      u = m ? b + '/movie/' + t : b + '/tv/' + t + '/' + sn + '/' + ep;
    }
    if (id === 'autoembed_co') {
      u += (u.indexOf('?') >= 0 ? '&' : '?') + 'lang=ar&subtitles=ar';
    } else if (id.lastIndexOf('vidsrc_', 0) === 0) {
      u += (u.indexOf('?') >= 0 ? '&' : '?') + 'lang=ar&sub=ar';
    } else if (id === 'vidrock_ru' || id === '111movies') {
      u += (u.indexOf('?') >= 0 ? '&' : '?') + 'lang=ar';
    }
    if (s.px) u = '/api/embed-proxy?url=' + encodeURIComponent(u);
    return u;
  }

  function load(u) { loadingStatus(); P.src = u; }

  function selectServer(btn, s) {
    active = s;
    var tabs = B.querySelectorAll('button');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    btn.classList.add('active');
    load(s.src || srcFor(s));
  }

  function renderTabs() {
    if (!B) return;
    B.innerHTML = '';
    D.servers.forEach(function (s, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'server-tab';
      // Visitor-facing label only — real server names stay in D.servers
      // (used by selectServer/srcFor) but are never rendered.
      btn.textContent = 'سيرفر ' + (idx + 1);
      btn.addEventListener('click', function () { selectServer(btn, s); });
      B.appendChild(btn);
    });
    if (D.servers.length) {
      var first = B.querySelector('button');
      if (first) selectServer(first, D.servers[0]);
    } else {
      showStatus('<span class="error-msg">⚠ لا توجد مصادر متاحة الآن</span>');
    }
  }

  function renderEps() {
    var wrap = document.getElementById('epBtns');
    if (!wrap) return;
    wrap.innerHTML = '';
    (D.episodes || []).forEach(function (ep) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ep-btn' + (ep.episode_number === D.episode ? ' active' : '');
      btn.textContent = ep.episode_number;
      btn.title = ep.name || ('الحلقة ' + ep.episode_number);
      btn.addEventListener('click', function () {
        D.episode = ep.episode_number;
        var all = wrap.querySelectorAll('button');
        for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
        btn.classList.add('active');
        history.replaceState(null, '', pageUrl());
        if (active) load(srcFor(active));
      });
      wrap.appendChild(btn);
    });
  }

  function renderPicker() {
    if (!E) return;
    var ss = document.getElementById('seasonSelect');
    (D.seasons || []).forEach(function (s) {
      var o = document.createElement('option');
      o.value = s.season_number;
      o.textContent = 'موسم ' + s.season_number + ' (' + (s.episode_count || 0) + ')';
      if (s.season_number === D.season) o.selected = true;
      ss.appendChild(o);
    });
    ss.addEventListener('change', function () {
      // Full navigation so the worker serves the fresh episode list.
      window.location.href = pageUrl(parseInt(this.value, 10) || 1, 1);
    });
    renderEps();
  }

  renderTabs();
  renderPicker();
  P.addEventListener('load', hideStatus);
  setTimeout(hideStatus, 6000);
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
      finalBody = new TextEncoder().encode(rewrittenHtml);
    }
    
    return new Response(finalBody, { status, headers: responseHeaders });
  } catch (e) {
    return new Response('Upstream error', { status: 502, headers: COMMON_HEADERS });
  }
}
