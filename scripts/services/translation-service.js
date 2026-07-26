require('dotenv').config({ path: '.env.local' });
const db = require('./local-db');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';
let groqRateLimitUntil = 0;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getCachedTranslation(sourceText, targetLang = 'ar') {
  if (!sourceText) return null;
  const row = db.prepare(`SELECT translated_text FROM translation_cache WHERE source_text = ? AND target_lang = ?`)
    .get(sourceText, targetLang);
  return row?.translated_text || null;
}

function saveToCache(sourceText, translatedText, targetLang = 'ar') {
  if (!sourceText || !translatedText) return;
  db.prepare(`INSERT OR REPLACE INTO translation_cache (source_text, target_lang, translated_text) VALUES (?, ?, ?)`)
    .run(sourceText, targetLang, translatedText);
}

async function translateWithGroq(text, retryCount = 0) {
  if (!text || !text.trim() || !GROQ_API_KEY) return null;

  const now = Date.now();
  if (now < groqRateLimitUntil) await sleep(groqRateLimitUntil - now);

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'أنت مترجم محترف. ترجم النص من الإنجليزية للعربية الفصحى بشكل طبيعي مناسب لموقع أفلام. أعطِ الترجمة فقط بدون أي شرح.' },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (response.status === 429) {
      if (retryCount >= 3) { groqRateLimitUntil = Date.now() + 60000; return null; }
      const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
      groqRateLimitUntil = Date.now() + retryAfter * 1000;
      await sleep(retryAfter * 1000);
      return translateWithGroq(text, retryCount + 1);
    }

    if (!response.ok) { console.error(`❌ Groq error: ${response.status}`); return null; }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    if (retryCount < 3) { await sleep(1000 * 2 ** retryCount); return translateWithGroq(text, retryCount + 1); }
    console.error('❌ Groq failed:', err.message);
    return null;
  }
}

function getTmdbTranslation(translationsArray, field) {
  if (!translationsArray || !Array.isArray(translationsArray)) return null;
  const ar = translationsArray.find(t => t.iso_639_1 === 'ar');
  const value = ar?.data?.[field];
  return value && value.trim() ? value.trim() : null;
}

async function translateField(originalText, tmdbTranslationsArray, tmdbField) {
  if (!originalText || !originalText.trim()) return null;

  const tmdbTranslation = getTmdbTranslation(tmdbTranslationsArray, tmdbField);
  if (tmdbTranslation) return tmdbTranslation;

  const cached = getCachedTranslation(originalText, 'ar');
  if (cached) return cached;

  const aiTranslation = await translateWithGroq(originalText);
  if (aiTranslation) { saveToCache(originalText, aiTranslation, 'ar'); return aiTranslation; }

  return null;
}

module.exports = { translateField, getTmdbTranslation, getCachedTranslation, saveToCache, translateWithGroq };
