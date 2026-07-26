require('dotenv').config({ path: '.env.local' });

const TMDB_KEYS = [process.env.TMDB_API_KEY, process.env.TMDB_API_KEY_2].filter(Boolean);
const BASE_URL = 'https://api.themoviedb.org/3';
const MAX_RETRIES = 5;
let keyIndex = 0;

function currentKey() { return TMDB_KEYS[keyIndex]; }
function rotateKey() { keyIndex = (keyIndex + 1) % TMDB_KEYS.length; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchTMDB(endpoint, params = {}, retryCount = 0) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', currentKey());
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }

  let response;
  try {
    response = await fetch(url.toString());
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      await sleep(Math.min(1000 * 2 ** retryCount, 30000));
      return fetchTMDB(endpoint, params, retryCount + 1);
    }
    console.error(`❌ Network error on ${endpoint}:`, err.message);
    return null;
  }

  if (response.status === 404) return null;

  if (response.status === 429) {
    if (retryCount >= MAX_RETRIES) {
      rotateKey();
      console.error(`❌ Rate limit exhausted on ${endpoint}, rotated key`);
      return null;
    }
    const retryAfter = parseInt(response.headers.get('retry-after') || '1', 10);
    await sleep(Math.max(retryAfter * 1000, 1000 * 2 ** retryCount));
    return fetchTMDB(endpoint, params, retryCount + 1);
  }

  if (response.status >= 500) {
    if (retryCount < MAX_RETRIES) {
      await sleep(Math.min(1000 * 2 ** retryCount, 30000));
      return fetchTMDB(endpoint, params, retryCount + 1);
    }
    console.error(`❌ Server error ${response.status} on ${endpoint}`);
    return null;
  }

  if (!response.ok) {
    console.error(`❌ Status ${response.status} on ${endpoint}`);
    return null;
  }

  try {
    return await response.json();
  } catch (err) {
    console.error(`❌ JSON parse error on ${endpoint}:`, err.message);
    return null;
  }
}

const fetchMovieDetails = (id) => fetchTMDB(`/movie/${id}`, {
  append_to_response: 'credits,translations,keywords,videos,release_dates'
});

const fetchSeriesDetails = (id) => fetchTMDB(`/tv/${id}`, {
  append_to_response: 'credits,translations,keywords,videos,content_ratings,external_ids'
});

const fetchSeasonDetails = (id, seasonNumber) => fetchTMDB(`/tv/${id}/season/${seasonNumber}`);

module.exports = { fetchTMDB, fetchMovieDetails, fetchSeriesDetails, fetchSeasonDetails };
