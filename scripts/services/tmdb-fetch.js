// ═══════════════════════════════════════════════════════════════════
// 🚦 TMDB Fetch with Smart Rate Limiting
// ═══════════════════════════════════════════════════════════════════

const pRetry = require('p-retry')

const TMDB_URL = 'https://api.themoviedb.org/3'

/**
 * Fetch من TMDB مع Rate Limiting الذكي
 * 
 * @param {string} endpoint - المسار (مثل: /movie/123)
 * @param {object} params - المعاملات الإضافية
 * @param {string} apiKey - مفتاح API
 * @returns {Promise<object>} - البيانات من TMDB
 */
async function fetchTMDB(endpoint, params = {}, apiKey) {
  return pRetry(async () => {
    const url = new URL(`${TMDB_URL}${endpoint}`)
    url.searchParams.set('api_key', apiKey)
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }
    
    const res = await fetch(url.toString())
    
    // ✅ معالجة Rate Limit (429)
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '10')
      console.log(`⚠️ Rate Limited - انتظار ${retryAfter} ثانية...`)
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
      throw new Error('Rate Limited - Retrying...')
    }
    
    // ✅ أخطاء دائمة - لا تعيد المحاولة
    if ([400, 401, 403, 404].includes(res.status)) {
      throw new pRetry.AbortError(`TMDB ${res.status}: ${endpoint}`)
    }
    
    // ✅ أخطاء مؤقتة - أعد المحاولة
    if (res.status >= 500) {
      throw new Error(`TMDB ${res.status} - Server Error - Retrying...`)
    }
    
    if (!res.ok) {
      throw new Error(`TMDB ${res.status}: ${endpoint}`)
    }
    
    return res.json()
  }, {
    retries: 3,
    minTimeout: 1000,
    factor: 2, // Exponential backoff
    onFailedAttempt: error => {
      if (error.retriesLeft > 0) {
        console.log(`⚠️ محاولة ${error.attemptNumber} فشلت. ${error.retriesLeft} محاولات متبقية`)
      }
    }
  })
}

module.exports = { fetchTMDB }
