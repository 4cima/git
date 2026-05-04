#!/usr/bin/env node

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

async function checkModels() {
  const apiKey = process.env.OPENROUTER_API_KEY_1;
  
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  
  const data = await response.json();
  const freeModels = data.data.filter(m => 
    m.pricing?.prompt === '0' || 
    m.pricing?.prompt === 0 ||
    m.id.includes(':free')
  );
  
  console.log(`\n📊 Total Models: ${data.data.length}`);
  console.log(`🆓 Free Models: ${freeModels.length}\n`);
  
  console.log('Free Models Available:\n');
  freeModels.forEach((m, i) => {
    console.log(`${i + 1}. ${m.id}`);
    if (m.name) console.log(`   Name: ${m.name}`);
    if (m.context_length) console.log(`   Context: ${m.context_length}`);
  });
}

checkModels().catch(console.error);
