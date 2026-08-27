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
 *   GET /                                     → info page
 *   GET /api/embed-proxy?url=…                → ISP-blocked server proxy
 *   GET /healthz                              → liveness probe
 *
 * Resolves {slug} → TMDB id via the public TMDB search API.
 * Every HTML response carries:
 *   Content-Security-Policy: frame-ancestors 'self' https://4cima.com
 *   (+ frame-src * so external media iframes work)
 * ============================================================
 */

const PLAY_BASE = 'https://4cima.com';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/original/';
const TMDB_API_KEY = 'd1cf50a073ebf6c00401a9a74f8e3c24'; // public web key

// Strict CSP: lock player frame-ancestors to 4cima.com, but allow
// external media iframes (frame-src) so vidsrc/vidlink embeds work.
// TMDB backdrops (img-src) and the Google "Cairo" font
// (style-src / font-src) are explicitly whitelisted.
const CSP_HEADER =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline'; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' data: https://fonts.gstatic.com; " +
  "img-src 'self' data: https://image.tmdb.org; " +
  "frame-ancestors 'self' https://4cima.com; " +
  "base-uri 'self'; " +
  "form-action 'self'; " +
  "frame-src * data: blob:; " +
  "child-src * data: blob:; " +
  "connect-src *";

const COMMON_HEADERS = {
  'Content-Security-Policy': CSP_HEADER,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'ALLOW-FROM https://4cima.com',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'encrypted-media *, fullscreen *',
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
          const mediaType = await resolveAnyFromTmdb(slug);
          return await handlePlayer(url, slug, mediaType, 1, 1);
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
// TMDB resolution: slug → tmdb_id + title + artwork
// ------------------------------------------------------------------
async function resolveFromTmdb(slug, mediaType) {
  const searchPath = mediaType === 'movie' ? 'search/movie' : 'search/tv';
  const apiUrl = new URL(`https://api.themoviedb.org/3/${searchPath}`);
  apiUrl.searchParams.set('api_key', TMDB_API_KEY);
  apiUrl.searchParams.set('query', slug.replace(/[-_]/g, ' '));
  apiUrl.searchParams.set('language', 'ar-MA');
  apiUrl.searchParams.set('include_adult', 'false');

  const fetchJson = async (u) => {
    const res = await fetch(u, { method: 'GET' });
    if (!res.ok) return null;
    try { return await res.json(); } catch { return null; }
  };

  let json = await fetchJson(apiUrl.toString());
  if (!json || !(json.results || []).length) {
    apiUrl.searchParams.set('language', 'en-US');
    json = await fetchJson(apiUrl.toString());
  }
  if (!json || !(json.results || []).length) throw new Error(`No TMDB match for slug "${slug}"`);
  const hit = json.results[0];
  return {
    tmdbId: hit.id,
    title: hit.title || hit.name || '',
    backdrop: hit.backdrop_path,
    poster: hit.poster_path,
  };
}

// Resolve a bare slug whose media type is unknown via TMDB multi-search.
// Returns 'movie' | 'tv' (person/other results are skipped).
async function resolveAnyFromTmdb(slug) {
  const url = new URL('https://api.themoviedb.org/3/search/multi');
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('query', slug.replace(/[-_]/g, ' '));
  url.searchParams.set('include_adult', 'false');
  let data = null;
  try {
    const res = await fetch(url.toString(), { method: 'GET' });
    if (res.ok) data = await res.json();
  } catch { /* fall through */ }
  const hit = ((data && data.results) || []).find(
    (r) => r.media_type === 'movie' || r.media_type === 'tv'
  );
  if (!hit) throw new Error(`No TMDB match for slug "${slug}"`);
  return hit.media_type;
}

async function fetchSeasonsList(tmdbId) {
  const url = new URL(`https://api.themoviedb.org/3/tv/${tmdbId}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('language', 'ar-MA');
  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.seasons || [])
    .filter((s) => s.season_number > 0)
    .map((s) => ({ season_number: s.season_number, episode_count: s.episode_count }));
}

async function fetchSeasonEpisodes(tmdbId, seasonNumber) {
  const out = { season: null, episodes: [] };
  if (!seasonNumber) return out;
  const url = new URL(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('language', 'ar-MA');
  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) return out;
  const data = await res.json();
  out.season = {
    season_number: data.season_number,
    name: data.name,
    episode_count: (data.episodes || []).length,
  };
  out.episodes = (data.episodes || []).map((e) => ({
    id: e.id,
    episode_number: e.episode_number,
    name: e.name,
    still_path: e.still_path,
  }));
  return out;
}

// ------------------------------------------------------------------
// Page handler
// ------------------------------------------------------------------
async function handlePlayer(url, slug, mediaType, season = 1, episode = 1) {
  if (!slug) return new Response('Bad Request — missing slug', { status: 400, headers: COMMON_HEADERS });

  let resolved;
  try {
    resolved = await resolveFromTmdb(slug, mediaType);
  } catch (e) {
    return playerErrorPage(slug, mediaType, e.message);
  }

  const { tmdbId, title, backdrop, poster } = resolved;
  const servers = buildServerSources(mediaType, tmdbId, season, episode);

  let seasonsList = [];
  let epList = [];
  if (mediaType === 'tv') {
    const [sList, sDetail] = await Promise.all([
      fetchSeasonsList(tmdbId),
      fetchSeasonEpisodes(tmdbId, season),
    ]);
    seasonsList = sList;
    epList = sDetail.episodes;
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
      slug, mediaType, tmdbId, title, season, episode,
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

function htmlPage({ slug, mediaType, tmdbId, title, season, episode, servers, seasons, episodes, backdropUrl, backUrl, refUrl }) {
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
.logo{font-size:18px;font-weight:900;background:linear-gradient(135deg,var(--red),var(--orange));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;white-space:nowrap}
.title{font-size:14px;font-weight:600;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:40vw}
.back-btn{margin-right:auto;padding:7px 16px;border-radius:8px;background:var(--card);border:1px solid var(--border);color:var(--muted);font-size:13px;font-weight:600;text-decoration:none;transition:all .2s;white-space:nowrap}
.back-btn:hover{background:rgba(255,255,255,.1);color:#fff}
main{flex:1;display:flex;flex-direction:column;min-height:0}
.server-bar{display:flex;gap:6px;padding:10px 16px;overflow-x:auto;background:rgba(0,0,0,.4);border-bottom:1px solid var(--border);scrollbar-width:thin;scrollbar-color:#333 transparent}
.server-tab{flex-shrink:0;padding:7px 14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--muted);font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;transition:all .2s}
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
  <span class="logo">🎬 4cima</span>
  ${title ? `<span class="title" dir="auto">${esc(title)}</span>` : ''}
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
<footer>جميع المحتويات من <a href="https://www.themoviedb.org" target="_blank" rel="noopener">TMDb</a>. المشغّل من <a href="https://4cima.stream" target="_blank" rel="noopener">4cima.stream</a></footer>
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
    D.servers.forEach(function (s) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'server-tab';
      btn.textContent = s.name;
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
async function handleEmbedProxy(url) {
  const target = url.searchParams.get('url');
  if (!target) return new Response('Bad Request — missing url', { status: 400, headers: COMMON_HEADERS });
  try {
    const u = new URL(target);
    const upstream = await fetch(u.toString(), {
      method: 'GET', redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (4cima-stream-proxy)' },
    });
    const ct = upstream.headers.get('content-type') || 'text/html';
    const body = await upstream.text();
    return new Response(body, { status: upstream.status, headers: { 'Content-Type': ct, 'X-Frame-Options': 'SAMEORIGIN' } });
  } catch (e) {
    return new Response('Upstream error', { status: 502, headers: COMMON_HEADERS });
  }
}
