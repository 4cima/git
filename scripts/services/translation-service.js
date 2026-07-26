/**
 * translation-service.js — v2.0 Fallback Chain
 *
 * Priority order per text:
 *   1. TMDB Arabic (free, instant — checked by caller)
 *   2. Local cache (SQLite — zero API cost)
 *   3. Google Translate unofficial (free, no key, ~200ms)
 *   4. Groq llama-3.1-8b-instant (500K tokens/day free)
 *   5. Mistral mistral-small-latest (free tier)
 *   6. OpenRouter gemma-4-26b:free (fallback, 3 keys rotated)
 *
 * Each provider is tried in order. If it fails/rate-limits/times out,
 * the next is tried automatically. The successful provider is logged.
 */

require('dotenv').config({ path: '.env.local' });
const fs  = require('fs');
const path = require('path');
const db  = require('./local-db');

// ─── Log file (shared with run-ingestion.js) ─────────────────
const LOG_FILE = path.join(__dirname, '../../data/ingestion.log');
function logTranslation(provider, title) {
  const ts   = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const line = `[${ts}] [TRANSLATE] provider=${provider} text="${title.slice(0, 40)}"`;
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch (_) {}
}

// ─── Helpers ─────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const SYSTEM_PROMPT = 'أنت مترجم محترف. ترجم النص من الإنجليزية للعربية الفصحى بشكل طبيعي مناسب لموقع أفلام. أعطِ الترجمة فقط بدون أي شرح أو تعليق.';

// ─── Cache ────────────────────────────────────────────────────
function getCachedTranslation(sourceText, targetLang = 'ar') {
  if (!sourceText) return null;
  const row = db.prepare('SELECT translated_text FROM translation_cache WHERE source_text = ? AND target_lang = ?')
    .get(sourceText, targetLang);
  return row?.translated_text || null;
}

function saveToCache(sourceText, translatedText, targetLang = 'ar') {
  if (!sourceText || !translatedText) return;
  db.prepare('INSERT OR REPLACE INTO translation_cache (source_text, target_lang, translated_text) VALUES (?, ?, ?)')
    .run(sourceText, targetLang, translatedText);
}

// ─── Provider 1: Google Translate Unofficial ──────────────────
async function translateGoogle(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(text)}`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(8000)
  });
  if (r.status === 429) throw new Error('RATE_LIMIT');
  if (!r.ok) throw new Error(`HTTP_${r.status}`);
  const data = await r.json();
  const result = data[0]?.map(s => s?.[0]).filter(Boolean).join('').trim();
  if (!result) throw new Error('EMPTY_RESPONSE');
  return result;
}

// ─── Provider 2: Groq ────────────────────────────────────────
let groqRateLimitUntil = 0;

async function translateGroq(text, retryCount = 0) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('NO_KEY');

  const now = Date.now();
  if (now < groqRateLimitUntil) throw new Error('RATE_LIMIT');

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: text }],
      temperature: 0.3, max_tokens: 500
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (r.status === 429) {
    const retryAfter = parseInt(r.headers.get('retry-after') || '60', 10);
    groqRateLimitUntil = Date.now() + retryAfter * 1000;
    throw new Error('RATE_LIMIT');
  }
  if (!r.ok) throw new Error(`HTTP_${r.status}`);

  const data = await r.json();
  const result = data?.choices?.[0]?.message?.content?.trim();
  if (!result) throw new Error('EMPTY_RESPONSE');
  return result;
}

// ─── Provider 3: Mistral ──────────────────────────────────────
let mistralRateLimitUntil = 0;

async function translateMistral(text) {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error('NO_KEY');

  if (Date.now() < mistralRateLimitUntil) throw new Error('RATE_LIMIT');

  const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: text }],
      temperature: 0.3, max_tokens: 500
    }),
    signal: AbortSignal.timeout(20000)
  });

  if (r.status === 429) {
    mistralRateLimitUntil = Date.now() + 60000;
    throw new Error('RATE_LIMIT');
  }
  if (!r.ok) throw new Error(`HTTP_${r.status}`);

  const data = await r.json();
  const result = data?.choices?.[0]?.message?.content?.trim();
  if (!result) throw new Error('EMPTY_RESPONSE');
  return result;
}

// ─── Provider 4: OpenRouter (3 keys rotated) ─────────────────
const OR_KEYS = [
  process.env.OPENROUTER_API_KEY_1,
  process.env.OPENROUTER_API_KEY_2,
  process.env.OPENROUTER_API_KEY_3,
].filter(Boolean);
const OR_MODEL = 'google/gemma-4-26b-a4b-it:free';
let orKeyIndex = 0;
const orRateLimitUntil = [0, 0, 0];

async function translateOpenRouter(text) {
  if (OR_KEYS.length === 0) throw new Error('NO_KEY');

  // Find a non-rate-limited key
  const now = Date.now();
  let attempts = 0;
  while (orRateLimitUntil[orKeyIndex] > now) {
    orKeyIndex = (orKeyIndex + 1) % OR_KEYS.length;
    if (++attempts >= OR_KEYS.length) throw new Error('RATE_LIMIT');
  }

  const key = OR_KEYS[orKeyIndex];
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json',
      'HTTP-Referer': 'https://4cima.online', 'X-Title': '4Cima'
    },
    body: JSON.stringify({
      model: OR_MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: text }],
      temperature: 0.3, max_tokens: 500
    }),
    signal: AbortSignal.timeout(25000)
  });

  if (r.status === 429) {
    orRateLimitUntil[orKeyIndex] = Date.now() + 60000;
    orKeyIndex = (orKeyIndex + 1) % OR_KEYS.length;
    throw new Error('RATE_LIMIT');
  }
  if (!r.ok) throw new Error(`HTTP_${r.status}`);

  const data = await r.json();
  const result = data?.choices?.[0]?.message?.content?.trim();
  if (!result) throw new Error('EMPTY_RESPONSE');
  return result;
}

// ─── Fallback Chain ───────────────────────────────────────────
const PROVIDERS = [
  { name: 'google',      fn: translateGoogle      },
  { name: 'groq',        fn: translateGroq         },
  { name: 'mistral',     fn: translateMistral      },
  { name: 'openrouter',  fn: translateOpenRouter   },
];

// Per-provider skip counters (reset after success to allow retry later)
const skipUntil = { google: 0, groq: 0, mistral: 0, openrouter: 0 };

async function translateWithFallback(text) {
  if (!text || !text.trim()) return null;

  const now = Date.now();
  for (const { name, fn } of PROVIDERS) {
    if (skipUntil[name] > now) continue;
    try {
      const result = await fn(text);
      if (result) {
        logTranslation(name, text);
        return result;
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg === 'RATE_LIMIT') {
        skipUntil[name] = Date.now() + 90000; // skip for 90s on rate limit
      }
      // For any error, just try next provider
    }
  }

  // All providers failed — return null (caller handles missing translation)
  logTranslation('NONE_FAILED', text);
  return null;
}

// ─── TMDB Arabic Helper ───────────────────────────────────────
function getTmdbTranslation(translationsArray, field) {
  if (!translationsArray || !Array.isArray(translationsArray)) return null;
  const ar = translationsArray.find(t => t.iso_639_1 === 'ar');
  const value = ar?.data?.[field];
  return value && value.trim() ? value.trim() : null;
}

// ─── Public API (drop-in replacement for v1) ─────────────────
async function translateField(originalText, tmdbTranslationsArray, tmdbField) {
  if (!originalText || !originalText.trim()) return null;

  // 1. TMDB Arabic (free + instant)
  const tmdbTranslation = getTmdbTranslation(tmdbTranslationsArray, tmdbField);
  if (tmdbTranslation) return tmdbTranslation;

  // 2. Local cache
  const cached = getCachedTranslation(originalText, 'ar');
  if (cached) return cached;

  // 3-6. Fallback chain
  const result = await translateWithFallback(originalText);
  if (result) saveToCache(originalText, result, 'ar');
  return result;
}

module.exports = {
  translateField,
  getTmdbTranslation,
  getCachedTranslation,
  saveToCache,
  translateWithGroq: translateGroq,  // backward-compat alias
};