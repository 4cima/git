/**
 * 🎬 خدمة روابط التشغيل - فور سيما
 * Stream Service (Unified with Android App)
 * 
 * @description خدمة موحدة 100% لجلب روابط التشغيل من السيرفرات المجانية
 * @author 4Cima Team
 * @version 1.0.0
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
// Server List (10 Free Servers)
// ==========================================
export const STREAM_SERVERS: StreamServer[] = [
  { id: 'vidsrc_vip', name: 'VidSrc.vip', base: 'https://vidrock.net/embed' },
  { id: 'autoembed_co', name: 'AutoEmbed', base: 'https://autoembed.co/movie/tmdb' },
  { id: 'vidsrc_net', name: 'VidSrc.net', base: 'https://vidsrc.net/embed' },
  { id: '2embed_cc', name: '2Embed', base: 'https://www.2embed.cc/embed' },
  { id: '111movies', name: '111Movies', base: 'https://111movies.com' },
  { id: 'smashystream', name: 'SmashyStream', base: 'https://player.smashy.stream' },
  { id: 'vidsrc_io', name: 'VidSrc.io', base: 'https://vidsrc.io/embed' },
  { id: 'vidsrc_cc', name: 'VidSrc.cc', base: 'https://vidsrc.cc/v2/embed' },
  { id: 'vidsrc_xyz', name: 'VidSrc.xyz', base: 'https://vidsrc.xyz/embed' },
  { id: '2embed_skin', name: '2Embed.skin', base: 'https://www.2embed.skin/embed' },
  { id: 'vidsrc_me', name: 'VidSrc.me', base: 'https://vidsrc.me/embed' },
];

// Base URL overrides
const BASE_OVERRIDES: Record<string, string> = {
  autoembed_co: 'https://autoembed.co',
  vidsrc_net: 'https://vidsrc.net/embed',
  vidsrc_io: 'https://vidsrc.io/embed',
  vidsrc_cc: 'https://vidsrc.cc/v2/embed',
  vidsrc_xyz: 'https://vidsrc.xyz/embed',
  vidsrc_me: 'https://vidsrc.me/embed',
  vidsrc_vip: 'https://vidrock.net/embed',
  '2embed_cc': 'https://www.2embed.cc/embed',
  '2embed_skin': 'https://www.2embed.skin/embed',
  smashystream: 'https://player.smashy.stream',
  '111movies': 'https://111movies.com',
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
  const id = serverId.toLowerCase();

  if (id === 'autoembed_co') {
    return appendParam(appendParam(url, 'lang', 'ar'), 'subtitles', 'ar');
  }

  if (id.startsWith('vidsrc_')) {
    return appendParam(appendParam(url, 'lang', 'ar'), 'sub', 'ar');
  }

  if (id.startsWith('2embed')) {
    return appendParam(appendParam(url, 'lang', 'ar'), 'subtitles', 'ar');
  }

  if (id === 'smashystream') {
    return appendParam(appendParam(url, 'lang', 'ar'), 'sub', 'ar');
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

  // SmashyStream
  if (id === 'smashystream') {
    url = mediaType === 'movie'
      ? `${server.base}/movie/${tmdbId}`
      : `https://smashy.stream/tv/${tmdbId}/${season}/${episode}/player`;
    return mediaType === 'tv' ? url : withArabic(url, id, mediaType);
  }

  // AutoEmbed
  if (id === 'autoembed_co') {
    url = mediaType === 'movie'
      ? `${base}/movie/tmdb/${tmdbId}`
      : `${base}/tv/tmdb/${tmdbId}-${season}-${episode}`;
    return withArabic(url, id, mediaType);
  }

  // 2Embed variants
  if (id.startsWith('2embed')) {
    url = mediaType === 'movie'
      ? `${base}/${tmdbId}`
      : `${base}/${tmdbId}/${season}/${episode}`;
    return withArabic(url, id, mediaType);
  }

  // VidSrc.cc
  if (id === 'vidsrc_cc') {
    url = mediaType === 'movie'
      ? `${base}/movie/${tmdbId}`
      : `${base}/tv/${tmdbId}?autoPlay=false&s=${season}&e=${episode}`;
    return withArabic(url, id, mediaType);
  }

  // VidSrc.io
  if (id === 'vidsrc_io') {
    url = mediaType === 'movie'
      ? `${base}/movie/${tmdbId}`
      : `${base}/tv/${tmdbId}/${season}/${episode}`;
    return withArabic(url, id, mediaType);
  }

  // Other VidSrc variants
  if (id.startsWith('vidsrc_')) {
    url = mediaType === 'movie'
      ? `${base}/movie/${tmdbId}`
      : `${base}/tv/${tmdbId}/${season}/${episode}`;
    return withArabic(url, id, mediaType);
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
 * 1. Try to get from embed_links table first
 * 2. Fallback to building from free servers
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
