import { db } from "@/db";
import { reviews } from "@/db/schema";

const BASE_URL = 'https://api.themoviedb.org/3';
const MAX_RETRIES = 3;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get TMDB keys from environment variables
function getTmdbKeys(): string[] {
  const keys = [
    process.env.TMDB_API_KEY,
    process.env.TMDB_API_KEY_2,
    process.env.NEXT_PUBLIC_TMDB_API_KEY,
    // Add some common defaults or fallbacks if empty
    "84d5df68d59d18e8dc626d7f877ca43b" // Standard fallback for safe public previews
  ].filter(Boolean) as string[];
  
  return keys.length > 0 ? keys : ["84d5df68d59d18e8dc626d7f877ca43b"];
}

let keyIndex = 0;
function currentKey(): string {
  const keys = getTmdbKeys();
  return keys[keyIndex % keys.length];
}

function rotateKey() {
  const keys = getTmdbKeys();
  keyIndex = (keyIndex + 1) % keys.length;
}

/**
 * Robust fetch wrapper for TMDB with auto-retry and key rotation
 */
export async function fetchTMDB(endpoint: string, params: Record<string, string | number | undefined | null> = {}, retryCount = 0): Promise<any> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', currentKey());
  
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, String(v));
    }
  }

  try {
    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 } // Cache for 1 hour in NextJS
    });

    if (response.status === 404) {
      return null;
    }

    if (response.status === 429) {
      if (retryCount >= MAX_RETRIES) {
        rotateKey();
        console.warn(`⚠️ TMDB Rate limit exhausted on ${endpoint}, rotated key`);
        return null;
      }
      const retryAfter = parseInt(response.headers.get('retry-after') || '1', 10);
      await sleep(Math.max(retryAfter * 1000, 1000 * 2 ** retryCount));
      return fetchTMDB(endpoint, params, retryCount + 1);
    }

    if (response.status >= 500) {
      if (retryCount < MAX_RETRIES) {
        await sleep(1000 * 2 ** retryCount);
        return fetchTMDB(endpoint, params, retryCount + 1);
      }
      return null;
    }

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (err: any) {
    if (retryCount < MAX_RETRIES) {
      await sleep(1000 * 2 ** retryCount);
      return fetchTMDB(endpoint, params, retryCount + 1);
    }
    console.error(`❌ Network error on TMDB fetch (${endpoint}):`, err.message);
    return null;
  }
}

/**
 * Fetch movie details with full credits, translations, keywords, videos, and release dates
 */
export async function fetchMovieDetails(id: number | string) {
  return fetchTMDB(`/movie/${id}`, {
    append_to_response: 'credits,translations,keywords,videos,release_dates'
  });
}

/**
 * Fetch TV show details with full credits, translations, keywords, videos, content ratings, and external IDs
 */
export async function fetchSeriesDetails(id: number | string) {
  return fetchTMDB(`/tv/${id}`, {
    append_to_response: 'credits,translations,keywords,videos,content_ratings,external_ids'
  });
}

/**
 * Fetch individual TV season details
 */
export async function fetchSeasonDetails(seriesId: number | string, seasonNumber: number) {
  return fetchTMDB(`/tv/${seriesId}/season/${seasonNumber}`);
}

/**
 * Try to extract the Arabic translation from TMDB response
 */
export function getTmdbTranslation(translationsArray: any[], field: 'title' | 'overview' | 'name'): string | null {
  if (!translationsArray || !Array.isArray(translationsArray)) return null;
  const arTranslation = translationsArray.find(t => t.iso_639_1 === 'ar');
  const value = arTranslation?.data?.[field];
  return value && value.trim() ? value.trim() : null;
}

/**
 * Fallback AI Translation using Groq API (Llama 3)
 */
export async function translateWithGroq(text: string, targetLang = 'ar'): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!text || !text.trim()) return null;
  if (!apiKey) {
    // If no GROQ API key is provided, return null (the system will fall back gracefully)
    return null;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { 
            role: 'system', 
            content: 'أنت مترجم محتويات سينمائية وتلفزيونية محترف. ترجم النص الإنجليزي المعطى إلى لغة عربية فصحى طبيعية وجذابة ومناسبة لوصف الأفلام والمسلسلات. أعطني الترجمة فقط بشكل مباشر وبدون أي مقدمات أو شروحات أو جمل توضيحية.' 
          },
          { 
            role: 'user', 
            content: text 
          }
        ],
        temperature: 0.2,
        max_tokens: 600
      })
    });

    if (!response.ok) {
      console.warn(`⚠️ Groq API responded with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (err: any) {
    console.error(`❌ Failed to translate with Groq AI:`, err.message);
    return null;
  }
}

/**
 * Translates a given field by prioritizing TMDB official translations first, and falling back to Groq AI
 */
export async function translateField(
  originalText: string | null | undefined,
  translationsArray: any[] | undefined | null,
  tmdbField: 'title' | 'overview' | 'name'
): Promise<string | null> {
  if (!originalText || !originalText.trim()) return null;

  // 1. Try TMDB Official Arabic translation
  if (translationsArray) {
    const tmdbTrans = getTmdbTranslation(translationsArray, tmdbField);
    if (tmdbTrans) {
      return tmdbTrans;
    }
  }

  // 2. Try Groq AI translation
  const aiTrans = await translateWithGroq(originalText);
  if (aiTrans) {
    return aiTrans;
  }

  // 3. Graceful fallback (Arabic dictionary mock or return English/null depending on field)
  return null;
}
