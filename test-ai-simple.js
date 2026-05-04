#!/usr/bin/env node

import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const db = new Database('./data/4cima-local.db');

async function callGroq(prompt) {
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

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function main() {
  console.log('🤖 AI Overview Generator - Test\n');

  // جلب 10 أفلام فقط
  const movies = db.prepare(`
    SELECT id, title_en, overview_en, release_date
    FROM movies
    WHERE overview_en IS NOT NULL
    AND (overview_ar IS NULL OR overview_ar = '')
    LIMIT 10
  `).all();

  console.log(`Found ${movies.length} movies\n`);

  for (const movie of movies) {
    console.log(`Processing: ${movie.title_en}...`);
    
    const prompt = `اكتب وصفاً عربياً جذاباً ومختصراً (2-3 جمل) لفيلم "${movie.title_en}"\n\nالوصف الإنجليزي:\n${movie.overview_en}`;
    
    try {
      const overview_ar = await callGroq(prompt);
      
      db.prepare('UPDATE movies SET overview_ar = ? WHERE id = ?').run(overview_ar, movie.id);
      
      console.log(`✅ Success: ${overview_ar.substring(0, 50)}...\n`);
    } catch (error) {
      console.log(`❌ Failed: ${error.message}\n`);
    }
  }

  console.log('✅ Done!');
  db.close();
}

main().catch(console.error);
