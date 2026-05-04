#!/usr/bin/env node

/**
 * 🤖 AI Overview Generator (Fixed)
 * 
 * يولد وصف عربي للأعمال التي بدون overview_ar
 * باستخدام GROQ (سريع ومجاني)
 */

import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const db = new Database('./data/4cima-local.db');

// إحصائيات
const stats = {
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  startTime: Date.now()
};

/**
 * استدعاء GROQ API
 */
async function callGroq(prompt, retries = 0) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
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
    if (retries < 3) {
      console.log(`⚠️  Retry ${retries + 1}/3...`);
      await sleep(1000 * (retries + 1));
      return callGroq(prompt, retries + 1);
    }
    throw error;
  }
}

/**
 * توليد وصف عربي لعمل واحد
 */
async function generateOverview(work) {
  const { id, type, title, overview_en } = work;

  const prompt = `اكتب وصفاً عربياً جذاباً ومختصراً (2-3 جمل) لـ${type === 'movie' ? 'فيلم' : 'مسلسل'} "${title}"\n\nالوصف الإنجليزي:\n${overview_en}`;

  try {
    const overview_ar = await callGroq(prompt);
    
    // تحديث قاعدة البيانات
    const table = type === 'movie' ? 'movies' : 'tv_series';
    db.prepare(`UPDATE ${table} SET overview_ar = ? WHERE id = ?`).run(overview_ar, id);
    
    stats.success++;
    return { success: true, overview_ar };
  } catch (error) {
    stats.failed++;
    return { success: false, error: error.message };
  }
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
  console.log('🤖 AI Overview Generator (Fixed)');
  console.log('=================================\n');

  // جلب الأعمال مباشرة بدون WHERE على overview_en
  console.log('📊 Fetching works...\n');

  // استخدام استعلام بسيط جداً
  const movies = db.prepare(`
    SELECT id, title_en as title, overview_en, 'movie' as type
    FROM movies
    WHERE (overview_ar IS NULL OR overview_ar = '')
    AND overview_en IS NOT NULL
    AND overview_en != ''
    LIMIT 50000
  `).all();

  const series = db.prepare(`
    SELECT id, title_en as title, overview_en, 'series' as type
    FROM tv_series
    WHERE (overview_ar IS NULL OR overview_ar = '')
    AND overview_en IS NOT NULL
    AND overview_en != ''
    LIMIT 50000
  `).all();

  // تصفية الأعمال التي لديها overview_en
  const allWorks = [...movies, ...series].filter(w => w.overview_en);
  stats.total = allWorks.length;

  console.log(`📊 Found ${stats.total} works (${movies.length} movies + ${series.length} series)\n`);

  if (stats.total === 0) {
    console.log('✅ All works already have overview_ar!');
    db.close();
    return;
  }

  console.log('🚀 Starting generation...\n');

  // معالجة الأعمال واحد تلو الآخر
  for (const work of allWorks) {
    console.log(`Processing: ${work.title}...`);
    
    const result = await generateOverview(work);
    stats.processed++;
    
    if (result.success) {
      console.log(`✅ ${result.overview_ar.substring(0, 60)}...`);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
    
    // عرض التقدم كل 5 أعمال
    if (stats.processed % 5 === 0) {
      showProgress();
    }
    
    // انتظار قصير بين كل عمل
    await sleep(500);
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
