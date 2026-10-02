/**
 * سيرفرات المشاهدة — مرآة لـ src/services/streamService.ts في الموقع الرئيسي.
 * أي تعديل هناك يُنقل هنا حرفيًا.
 */

export const SERVERS = [
  { id: 'vidlink',      name: 'VidLink',   short: 'VL',  base: 'https://vidlink.pro' },
  { id: 'vidsrc_me',    name: 'VidSrc.me', short: 'VS',  base: 'https://vidsrc.me/embed' },
  { id: 'vidsrc_vip',   name: 'VidRock',   short: 'VM',  base: 'https://vidrock.net/embed' },
  { id: 'videasy',      name: 'Videasy',   short: 'VY',  base: 'https://player.videasy.net' },
  { id: '111movies',    name: '111Movies', short: '1M',  base: 'https://111movies.com' },
  { id: 'autoembed_co', name: 'AutoEmbed', short: 'AM',  base: 'https://autoembed.co' },
];

const BASE_OVERRIDES = {
  autoembed_co: 'https://autoembed.co',
  vidsrc_me:    'https://vidsrc.me/embed',
  vidsrc_vip:   'https://vidrock.net/embed',
  vidlink:      'https://vidlink.pro',
  videasy:      'https://player.videasy.net',
};

const appendParam = (url, key, value) =>
  new RegExp(`([?&])${key}=`, 'i').test(url)
    ? url
    : url + (url.includes('?') ? '&' : '?') + `${key}=${value}`;

const withArabic = (url, id) => {
  if (id === 'autoembed_co') return appendParam(appendParam(url, 'lang', 'ar'), 'subtitles', 'ar');
  if (id.startsWith('vidsrc_')) return appendParam(appendParam(url, 'lang', 'ar'), 'sub', 'ar');
  return appendParam(url, 'lang', 'ar');
};

export function buildServerUrl(server, mediaType, tmdbId, season, episode) {
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

export function buildServerSources(mediaType, tmdbId, season, episode) {
  const out = [];
  for (const srv of SERVERS) {
    const raw = buildServerUrl(srv, mediaType, tmdbId, season, episode);
    if (!raw) continue;
    out.push({
      id: srv.id,
      name: srv.name,
      short: srv.short,
      src: raw,
      base: BASE_OVERRIDES[srv.id] || srv.base,
      serverIndex: out.length + 1,
    });
  }
  return out;
}
