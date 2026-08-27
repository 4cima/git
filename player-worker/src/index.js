/**
 * ============================================================
 * 4CIMA Player Worker — https://4cima.stream
 * ============================================================
 * Standalone player hosted on the dedicated 4cima.stream domain and
 * completely decoupled from the 4cima.com information pages.
 *
 *  - GET /watch → modern, RTL Arabic player page.
 *  - GET /api/embed-proxy?url=… → protects vidsrc-family embeds.
 *  - Every HTML response carries:
 *      Content-Security-Policy: frame-ancestors 'self' https://4cima.com
 *    so no arbitrary site can embed our player.
 * ============================================================
 */

const PLAY_BASE = 'https://4cima.com';

const CSP_HEADER = "frame-ancestors 'self' https://4cima.com; base-uri 'self'; form-action 'self'";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === '/api/embed-proxy') return await handleEmbedProxy(url);
      if (path === '/' || path === '/watch' || path === '/player') return handlePlayer(url);
      if (path === '/healthz') return new Response('ok', { status: 200 });
      return new Response('Not Found', { status: 404 });
    } catch (err) {
      return new Response('Server error', { status: 500 });
    }
  },
};

// ------------------------------------------------------------------
// Functions below are declared after the default export — hoisting made OK.
// ------------------------------------------------------------------

// Server catalogue — mirrors src/services/streamService.ts on the main site.
const SERVERS = [
  { id: 'vidsrc_vip', name: 'VidSrc', base: 'https://vidrock.net/embed' },
  { id: 'vidrock_ru', name: 'VidRock', base: 'https://vidrock.ru/embed' },
  { id: '111movies', name: '111Movies', base: 'https://111movies.com' },
  { id: 'vidsrc_io', name: 'VidSrc.io', base: 'https://vidsrc.io/embed' },
  { id: 'vidsrc_me', name: 'VidSrc.me', base: 'https://vidsrc.me/embed' },
  { id: 'vidlink', name: 'VidLink', base: 'https://vidlink.pro' },
  { id: 'videasy', name: 'Videasy', base: 'https://player.videasy.net' },
  { id: 'autoembed_co', name: 'AutoEmbed', base: 'https://autoembed.co' },
];

const BASE_OVERRIDES = {
  autoembed_co: 'https://autoembed.co',
  vidsrc_io: 'https://vidsrc.io/embed',
  vidsrc_me: 'https://vidsrc.me/embed',
  vidsrc_vip: 'https://vidrock.net/embed',
  vidrock_ru: 'https://vidrock.ru/embed',
  vidlink: 'https://vidlink.pro',
  videasy: 'https://player.videasy.net',
};

// vidsrc / vidrock embeds are sensitive to ISP blocking → route them
// through our own /api/embed-proxy on this same domain.
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
    const u = mediaType === 'movie'
      ? `${base}/movie/tmdb/${tmdbId}`
      : `${base}/tv/tmdb/${tmdbId}-${season}-${episode}`;
    return withArabic(u, id);
  }
  if (id === 'vidsrc_vip' || id === 'vidsrc_io' || id === 'vidsrc_me' || id === 'vidrock_ru') {
    const u = mediaType === 'movie'
      ? `${base}/movie/${tmdbId}`
      : `${base}/tv/${tmdbId}/${season}/${episode}`;
    return withArabic(u, id);
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
    const u = mediaType === 'movie'
      ? `${base}/movie/${tmdbId}`
      : `https://111movies.net/tv/${tmdbId}/${season}/${episode}`;
    return withArabic(u, id);
  }
  return '';
}

function buildPlayerServer(server, mediaType, tmdbId, season, episode) {
  const raw = buildServerUrl(server, mediaType, tmdbId, season, episode);
  if (!raw) return null;
  const needsProxy = PROXIED_IDS.has(server.id);
  return {
    id: server.id,
    name: server.name,
    src: needsProxy ? `/api/embed-proxy?url=${encodeURIComponent(raw)}` : raw,
  };
}

function buildServerList(mediaType, tmdbId, season, episode) {
  const list = [];
  for (const s of SERVERS) {
    const item = buildPlayerServer(s, mediaType, tmdbId, season, episode);
    if (item) list.push(item);
  }
  return list;
}
// ------------------------------------------------------------------
// /api/embed-proxy — shields protected embeds from ISP/route blocking
// ------------------------------------------------------------------
async function handleEmbedProxy(url) {
  const target = url.searchParams.get('url');
  if (!target) return new Response('Missing url', { status: 400 });

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return new Response('Bad url', { status: 400 });
  }

  // Only proxy known stream hosts (safety net — never an open proxy).
  if (!/vidrock|vidsrc|111movies/.test(parsed.host)) {
    return new Response('Host not allowed', { status: 403 });
  }

  const upstream = await fetch(parsed.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: parsed.origin + '/',
      Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
    },
  });

  if (!upstream.ok) return new Response('Upstream error: ' + upstream.status, { status: 502 });

  let html = await upstream.text();
  // Resolve relative asset URLs against the target origin via a <base> tag.
  html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${parsed.origin}/">`);
  html = html.replace(/(src|href)=["'](\/\/)/g, `$1="${parsed.protocol}$2`);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': CSP_HEADER,
      'Referrer-Policy': 'no-referrer',
    },
  });
}
// ------------------------------------------------------------------
// /watch handler
// ------------------------------------------------------------------
async function handlePlayer(url) {
  const type = url.searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const tmdbId = Number.parseInt(url.searchParams.get('id') || '', 10);
  const season = Number.parseInt(url.searchParams.get('season') || '1', 10) || 1;
  const episode = Number.parseInt(url.searchParams.get('episode') || '1', 10) || 1;

  if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
    return new Response(
      '<html dir="rtl"><body style="margin:0;display:grid;place-items:center;height:100vh;background:#0b0d12;color:#e5e7eb;font-family:sans-serif">' +
        '<div style="text-align:center"><h2>المعرف غير صالح</h2>' +
        '<p style="color:#9aa3b2">أعد المحاولة من صفحة الفيلم أو المسلسل.</p></div></body></html>',
      {
        status: 400,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': CSP_HEADER,
        },
      }
    );
  }

  const html = playerPage({ type, id: tmdbId, season, episode });
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': CSP_HEADER,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  });
}
// ------------------------------------------------------------------
// Player page (modern, RTL, Arabic)
// ------------------------------------------------------------------
function playerPage({ type, id, season, episode }) {
  const servers = buildServerList(type, id, season, episode);
  const serversJson = JSON.stringify(servers);
  const typeLabel = type === 'tv' ? 'مسلسل' : 'فيلم';

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex, nofollow"/>
<title>مشاهدة ${typeLabel} | 4cima</title>
<style>
  :root{--bg:#0b0d12;--panel:#12151d;--panel2:#171b26;--line:rgba(255,255,255,.08);--text:#f4f5f7;--muted:#9aa3b2;--accent:#e50914;--accent2:#ff6b35}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:radial-gradient(1200px 600px at 85% -10%,rgba(229,9,20,.18),transparent 60%),radial-gradient(1000px 500px at 0% 0%,rgba(59,130,246,.12),transparent 55%),var(--bg);color:var(--text);font-family:'Segoe UI',Tahoma,Arial,sans-serif;min-height:100vh}
  .shell{max-width:1120px;margin:0 auto;padding:24px 16px 60px}
  .top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
  .brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:20px}
  .dot{width:11px;height:11px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));box-shadow:0 0 14px rgba(229,9,20,.7)}
  .back{color:var(--muted);text-decoration:none;display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:8px 14px;border:1px solid var(--line);border-radius:999px;transition:.2s}
  .back:hover{color:#fff;border-color:rgba(255,255,255,.25)}
  .player-wrap{position:relative;background:#000;border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 30px 80px -30px rgba(0,0,0,.85)}
  .stage{position:relative;width:100%;aspect-ratio:16/9;background:#000}
  .stage iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
  .loading{position:absolute;inset:0;display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;background:#0a0c11;z-index:2}
  .spin{width:44px;height:44px;border:3px solid rgba(255,255,255,.12);border-top-color:var(--accent);border-radius:50%;animation:rot .8s linear infinite}
  @keyframes rot{to{transform:rotate(360deg)}}
  .bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;background:var(--panel);border-top:1px solid var(--line)}
  .servers{display:flex;flex-wrap:wrap;gap:8px}
  .srv{background:var(--panel2);border:1px solid var(--line);color:var(--text);font-size:13px;font-weight:600;padding:8px 14px;border-radius:11px;cursor:pointer;transition:.18s;display:inline-flex;align-items:center;gap:7px}
  .srv:hover{border-color:rgba(255,255,255,.3);transform:translateY(-1px)}
  .srv.active{background:linear-gradient(135deg,var(--accent),#b0040d);border-color:transparent;color:#fff;box-shadow:0 6px 18px -6px rgba(229,9,20,.7)}
  .srv .tag{font-size:10px;opacity:.7}
  .actions{display:flex;align-items:center;gap:8px}
  .ghost{background:transparent;border:1px solid var(--line);color:var(--text);font-size:13px;padding:8px 14px;border-radius:11px;cursor:pointer;transition:.18s}
  .ghost:hover{border-color:rgba(255,255,255,.3)}
  .note{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:12.5px;margin-top:16px;line-height:1.7}
  .badge{font-size:10px;padding:2px 8px;border:1px solid var(--line);border-radius:999px;color:var(--muted)}
  @media(max-width:640px){.top{flex-wrap:wrap}.bar{flex-direction:column;align-items:stretch}}
</style>
</head>
<body>
<div class="shell">
  <div class="top">
    <div class="brand"><span class="dot"></span>4cima</div>
    <a class="back" href="${PLAY_BASE}" target="_blank" rel="noopener">&larr; العودة إلى 4cima.com</a>
  </div>
  <div class="player-wrap">
    <div class="stage">
      <div class="loading" id="loading"><div class="spin"></div><span style="color:var(--muted);font-size:13px">جاري تحميل المشغل…</span></div>
      <iframe id="frame" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>
    </div>
    <div class="bar">
      <div class="servers" id="servers"></div>
      <div class="actions"><button class="ghost" id="mode" type="button">وضع السينما</button></div>
    </div>
  </div>
  <div class="note">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l7 3v6c0 4.4-3 8-7 9-4-1-7-4.6-7-9V6l7-3z"/></svg>
    إذا لم يعمل سيرفر معيّن، جرّب سيرفراً آخر من القائمة أعلاه. المشغّل محمي عبر CSP ولا يُضمَّن في مواقع خارجية.
    <span class="badge">4cima.stream</span>
  </div>
</div>
<script>
  var SERVERS = ${serversJson};
  var frame=document.getElementById('frame'),loading=document.getElementById('loading'),serversEl=document.getElementById('servers');
  function setActive(i){var s=SERVERS[i];if(!s)return;loading.style.display='flex';frame.src=s.src;Array.prototype.forEach.call(serversEl.children,function(b,idx){b.classList.toggle('active',idx===i);});}
  SERVERS.forEach(function(s,i){var b=document.createElement('button');b.type='button';b.className='srv'+(i===0?' active':'');b.innerHTML='<span class="tag">سيرفر</span> '+(i+1)+' — '+s.name;b.addEventListener('click',function(){setActive(i);});serversEl.appendChild(b);});
  frame.addEventListener('load',function(){loading.style.display='none';});
  frame.addEventListener('error',function(){loading.style.display='none';});
  document.getElementById('mode').addEventListener('click',function(){if(document.fullscreenElement){document.exitFullscreen();}else if(frame.requestFullscreen){frame.requestFullscreen();}});
  if(SERVERS.length){setActive(0);}
</script>
</body>
</html>`;
}