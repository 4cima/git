/**
 * 🎬 خدمة روابط التشغيل - فور سيما
 * Stream Service (Unified with Android App)
 * 
 * @description خدمة موحدة 100% لجلب روابط التشغيل من السيرفرات المجانية
 * @author 4Cima Team
 * @version 2.0.0
 */

// Note: No Supabase import needed - content is in Turso via API

// ==========================================
// Types
// ==========================================
export interface StreamSource {
  name: string;
  url: string;
  quality?: string;
  adUrl?: string;
}

export interface StreamServer {
  id: string;
  name: string;
  base: string;
  movie_template?: string;
  tv_template?: string;
}

// ==========================================
// Server List (7 Free Servers)
// ==========================================
export const STREAM_SERVERS: StreamServer[] = [
  { id: 'vidsrc_vip', name: 'VidSrc.vip', base: 'https://vidrock.net/embed' },
  { id: '111movies', name: '111Movies', base: 'https://111movies.com' },
  { id: 'vidsrc_me', name: 'VidSrc.me', base: 'https://vidsrc.me/embed' },
  { id: 'vidlink', name: 'VidLink', base: 'https://vidlink.pro' },
  { id: 'videasy', name: 'Videasy', base: 'https://player.videasy.net' },
  { id: 'autoembed_co', name: 'AutoEmbed', base: 'https://autoembed.co' },
];

// Base URL overrides
const BASE_OVERRIDES: Record<string, string> = {
  autoembed_co: 'https://autoembed.co',
  vidsrc_me: 'https://vidsrc.me/embed',
  vidsrc_vip: 'https://vidrock.net/embed',
  vidlink: 'https://vidlink.pro',
  videasy: 'https://player.videasy.net',
};

const getBase = (server: StreamServer) => BASE_OVERRIDES[server.id] || server.base;

/**
 * Append query parameter if not already present
 */
const appendParam = (url: string, key: string, value: string): string => {
  if (new RegExp(`([?&])${key}=`, 'i').test(url)) { return url; }
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${key}=${value}`;
};

/**
 * Add Arabic subtitle/language parameters
 */
const withArabic = (url: string, serverId: string, _mediaType: 'movie' | 'tv'): string => {
  if (!serverId) return url
  const id = serverId.toLowerCase();

  if (id.startsWith('vidsrc_')) {
    return appendParam(appendParam(url, 'lang', 'ar'), 'sub', 'ar');
  }

  if (id === 'autoembed_co') {
    return appendParam(appendParam(url, 'lang', 'ar'), 'subtitles', 'ar');
  }

  if (id === '111movies') {
    return appendParam(url, 'lang', 'ar');
  }

  return appendParam(url, 'lang', 'ar');
};


/**
 * Build embed URL for a specific server
 */
export const buildServerUrl = (
  server: StreamServer,
  mediaType: 'movie' | 'tv',
  tmdbId: number,
  season = 1,
  episode = 1
): string => {
  const base = getBase(server);
  const id = server.id;

  let url = '';

  // AutoEmbed — movie: /movie/tmdb/{id}, tv: /tv/tmdb/{id}-{season}-{episode}
  if (id === 'autoembed_co') {
    url = mediaType === 'movie'
      ? `${base}/movie/tmdb/${tmdbId}`
      : `${base}/tv/tmdb/${tmdbId}-${season}-${episode}`;
    return withArabic(url, id, mediaType);
  }

  // VidSrc.io and other VidSrc variants (vidsrc_vip)
  if (id.startsWith('vidsrc_')) {
    url = mediaType === 'movie'
      ? `${base}/movie/${tmdbId}`
      : `${base}/tv/${tmdbId}/${season}/${episode}`;
    return withArabic(url, id, mediaType);
  }

  // VidSrc.me
  if (id === 'vidsrc_me') {
    url = mediaType === 'movie'
      ? `${base}/movie/${tmdbId}`
      : `${base}/tv/${tmdbId}/${season}/${episode}`;
    return withArabic(url, id, mediaType);
  }

  // VidLink
  if (id === 'vidlink') {
    url = mediaType === 'movie'
      ? `https://vidlink.pro/movie/${tmdbId}`
      : `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`;
    return url;
  }

  // Videasy
  if (id === 'videasy') {
    url = mediaType === 'movie'
      ? `https://player.videasy.net/movie/${tmdbId}`
      : `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}`;
    return url;
  }

  // 111Movies
  if (id === '111movies') {
    url = mediaType === 'movie'
      ? `${base}/movie/${tmdbId}`
      : `https://111movies.net/tv/${tmdbId}/${season}/${episode}`;
    return withArabic(url, id, mediaType);
  }

  return '';
};

/**
 * Build all server sources for content
 */
export const buildAllServerSources = (
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season = 1,
  episode = 1
): StreamSource[] => {
  return STREAM_SERVERS
    .map((server) => ({
      name: server.name,
      url: buildServerUrl(server, mediaType, tmdbId, season, episode),
      quality: 'Auto',
    }))
    .filter((s) => !!s.url);
};

/**
 * Fetch stream sources (unified with Android app)
 * Builds directly from free servers using TMDB ID.
 */
export async function fetchStreamSources(
  contentId: number,
  contentType: 'movie' | 'tv',
  season = 1,
  episode = 1
): Promise<StreamSource[]> {
  // contentId IS the TMDB ID (schema uses id directly, no separate tmdb_id column)
  // Build sources directly from free servers
  return buildAllServerSources(contentId, contentType, season, episode);
}

/**
 * Fetch stream sources by TMDB ID directly
 */
export async function fetchStreamSourcesByTmdbId(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season = 1,
  episode = 1
): Promise<StreamSource[]> {
  // Build directly from TMDB ID (id IS the tmdb_id in our schema)
  return buildAllServerSources(tmdbId, mediaType, season, episode);
}

export default {
  STREAM_SERVERS,
  buildServerUrl,
  buildAllServerSources,
  fetchStreamSources,
  fetchStreamSourcesByTmdbId,
};