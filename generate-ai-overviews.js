#!/usr/bin/env node

/**
 * 🤖 AI Overview Generator
 * 
 * يولد وصف عربي للأعمال التي بدون overview_ar
 * باستخدام الذكاء الاصطناعي (GROQ أو OpenRouter)
 */

import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const db = new Database('./data/4cima-local.db');

// إعدادات الذكاء الاصطناعي
const AI_PROVIDER = process.env.AI_PROVIDER || 'GROQ'; // GROQ, OPENROUTER, XAI, MISTRAL
const BATCH_SIZE = 50; // عدد الأعمال في كل دفعة
const DELAY_BETWEEN_BATCHES = 2000; // 2 ثانية بين كل دفعة
const MAX_RETRIES = 3;

// مفاتيح API
const API_KEYS = {
  GROQ: process.env.GROQ_API_KEY,
  OPENROUTER: [
    process.env.OPENROUTER_API_KEY_1,
    process.env.OPENROUTER_API_KEY_2,
    process.env.OPENROUTER_API_KEY_3
  ],
  XAI: process.env.XAI_API_KEY,
  MISTRAL: process.env.MISTRAL_API_KEY
};

// إعدادات API لكل مزود
const API_CONFIGS = {
  GROQ: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    })
  },
  OPENROUTER: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://4cima.online',
      'X-Title': '4cima AI Overview Generator'
    })
  },
  XAI: {
    url: 'https://api.x.ai/v1/chat/completions',
    model: 'grok-2-1212',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    })
  },
  MISTRAL: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-large-latest',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    })
  }
};

// إحصائيات
const stats = {
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  startTime: Date.now()
};

/**
 * استدعاء API الذكاء الاصطناعي
 */
async function callAI(prompt, retries = 0) {
  const config = API_CONFIGS[AI_PROVIDER];
  
  // اختيار مفتاح API
  let apiKey;
  if (AI_PROVIDER === 'OPENROUTER') {
    // استخدام المفاتيح بالتناوب
    const keyIndex = stats.processed % API_KEYS.OPENROUTER.length;
    apiKey = API_KEYS.OPENROUTER[keyIndex];
  } else {
    apiKey = API_KEYS[AI_PROVIDER];
  }

  if (!apiKey) {
    throw new Error(`API key not found for ${AI_PROVIDER}`);
  }

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: config.headers(apiKey),
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'أنت كاتب محترف متخصص في كتابة أوصاف الأفلام والمسلسلات باللغة العربية. اكتب وصفاً جذاباً ومختصراً (2-3 جمل) بدون مقدمات.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(`⚠️  Retry ${retries + 1}/${MAX_RETRIES}...`);
      await sleep(1000 * (retries + 1));
      return callAI(prompt, retries + 1);
    }
    throw error;
  }
}

/**
 * توليد وصف عربي لعمل واحد
 */
async function generateOverview(work) {
  const { id, type, title, overview_en, release_date, genres } = work;

  // بناء prompt
  let prompt = `اكتب وصفاً عربياً جذاباً ومختصراً (2-3 جمل) لـ${type === 'movie' ? 'فيلم' : 'مسلسل'} "${title}"`;
  
  if (overview_en) {
    prompt += `\n\nالوصف الإنجليزي:\n${overview_en}`;
  }
  
  if (release_date) {
    prompt += `\n\nسنة الإصدار: ${release_date.split('-')[0]}`;
  }
  
  if (genres) {
    prompt += `\n\nالتصنيفات: ${genres}`;
  }

  try {
    const overview_ar = await callAI(prompt);
    
    // تحديث قاعدة البيانات
    const table = type === 'movie' ? 'movies' : 'tv_series';
    db.prepare(`UPDATE ${table} SET overview_ar = ? WHERE id = ?`).run(overview_ar, id);
    
    stats.success++;
    return { success: true, overview_ar };
  } catch (error) {
    stats.failed++;
    console.error(`❌ Failed for ${type} ${id}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * معالجة دفعة من الأعمال
 */
async function processBatch(works) {
  const promises = works.map(work => generateOverview(work));
  return Promise.all(promises);
}

/**
 * Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * عرض التقدم
 */
function showProgress() {
  const elapsed = (Date.now() - stats.startTime) / 1000;
  const rate = stats.processed / elapsed;
  const remaining = stats.total - stats.processed;
  const eta = remaining / rate;

  console.log(`\n📊 Progress: ${stats.processed}/${stats.total} (${((stats.processed / stats.total) * 100).toFixed(1)}%)`);
  console.log(`✅ Success: ${stats.success} | ❌ Failed: ${stats.failed}`);
  console.log(`⚡ Rate: ${rate.toFixed(1)} works/sec`);
  console.log(`⏱️  ETA: ${(eta / 60).toFixed(1)} minutes`);
}

/**
 * Main function
 */
async function main() {
  console.log('🤖 AI Overview Generator');
  console.log('========================\n');
  console.log(`🔧 Provider: ${AI_PROVIDER}`);
  console.log(`📦 Batch Size: ${BATCH_SIZE}`);
  console.log(`⏱️  Delay: ${DELAY_BETWEEN_BATCHES}ms\n`);

  // جلب الأعمال التي بدون overview_ar
  console.log('📊 Fetching works without overview_ar...\n');

  const movies = db.prepare(`
    SELECT 
      id, 
      'movie' as type,
      title_en as title,
      overview_en,
      release_date,
      primary_genre as genres
    FROM movies
    WHERE overview_en IS NOT NULL
    AND (overview_ar IS NULL OR overview_ar = '')
    LIMIT 100
  `).all();

  const series = db.prepare(`
    SELECT 
      id, 
      'series' as type,
      title_en as title,
      overview_en,
      first_air_date as release_date,
      primary_genre as genres
    FROM tv_series
    WHERE overview_en IS NOT NULL
    AND (overview_ar IS NULL OR overview_ar = '')
    LIMIT 100
  `).all();

  const allWorks = [...movies, ...series];
  stats.total = allWorks.length;

  console.log(`📊 Found ${stats.total} works (${movies.length} movies + ${series.length} series)\n`);

  if (stats.total === 0) {
    console.log('✅ All works already have overview_ar!');
    return;
  }

  console.log('🚀 Starting generation...\n');

  // معالجة الأعمال في دفعات
  for (let i = 0; i < allWorks.length; i += BATCH_SIZE) {
    const batch = allWorks.slice(i, i + BATCH_SIZE);
    
    await processBatch(batch);
    stats.processed += batch.length;
    
    showProgress();
    
    // انتظار بين الدفعات
    if (i + BATCH_SIZE < allWorks.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  // النتائج النهائية
  const elapsed = (Date.now() - stats.startTime) / 1000;
  console.log('\n\n✅ Generation Complete!');
  console.log('======================\n');
  console.log(`📊 Total: ${stats.total}`);
  console.log(`✅ Success: ${stats.success} (${((stats.success / stats.total) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);
  console.log(`⏱️  Time: ${(elapsed / 60).toFixed(1)} minutes`);
  console.log(`⚡ Rate: ${(stats.processed / elapsed).toFixed(1)} works/sec`);

  db.close();
}

main().catch(console.error);
