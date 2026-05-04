#!/usr/bin/env node

/**
 * 🔑 AI Keys Tester
 * 
 * يختبر جميع مفاتيح الذكاء الاصطناعي ويعرض:
 * - حالة كل مفتاح (يعمل/لا يعمل)
 * - الموديلات المتاحة
 * - الحدود والأسعار
 * - التوصيات
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

// مفاتيح API
const API_KEYS = {
  GROQ: process.env.GROQ_API_KEY,
  OPENROUTER_1: process.env.OPENROUTER_API_KEY_1,
  OPENROUTER_2: process.env.OPENROUTER_API_KEY_2,
  OPENROUTER_3: process.env.OPENROUTER_API_KEY_3,
  XAI: process.env.XAI_API_KEY,
  MISTRAL: process.env.MISTRAL_API_KEY
};

// نتائج الاختبار
const results = {
  working: [],
  failed: [],
  free: [],
  paid: []
};

/**
 * اختبار GROQ
 */
async function testGroq() {
  console.log('\n🧪 Testing GROQ...');
  
  if (!API_KEYS.GROQ) {
    console.log('❌ No API key found');
    return { status: 'no_key' };
  }

  try {
    // اختبار استدعاء بسيط
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEYS.GROQ}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: 'Say "test successful" in Arabic' }
        ],
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Failed: ${response.status} - ${error}`);
      return { status: 'failed', error: `${response.status}: ${error}` };
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    console.log(`✅ Working! Reply: ${reply}`);
    
    // جلب قائمة الموديلات
    const modelsResponse = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${API_KEYS.GROQ}`
      }
    });

    let models = [];
    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      models = modelsData.data.map(m => m.id);
      console.log(`📋 Available models: ${models.length}`);
      models.slice(0, 5).forEach(m => console.log(`   - ${m}`));
    }

    return {
      status: 'working',
      provider: 'GROQ',
      model: 'llama-3.3-70b-versatile',
      reply,
      models,
      pricing: 'FREE',
      limits: 'High rate limits',
      recommended: true
    };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { status: 'error', error: error.message };
  }
}

/**
 * اختبار OpenRouter
 */
async function testOpenRouter(keyName, apiKey) {
  console.log(`\n🧪 Testing ${keyName}...`);
  
  if (!apiKey) {
    console.log('❌ No API key found');
    return { status: 'no_key' };
  }

  try {
    // اختبار استدعاء بسيط
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://4cima.online',
        'X-Title': '4cima AI Test'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [
          { role: 'user', content: 'Say "test successful" in Arabic' }
        ],
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Failed: ${response.status} - ${error}`);
      return { status: 'failed', error: `${response.status}: ${error}` };
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    console.log(`✅ Working! Reply: ${reply}`);

    // جلب قائمة الموديلات المجانية
    const modelsResponse = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    let freeModels = [];
    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      freeModels = modelsData.data
        .filter(m => m.pricing?.prompt === '0' || m.id.includes(':free'))
        .map(m => m.id);
      
      console.log(`📋 Free models available: ${freeModels.length}`);
      freeModels.slice(0, 5).forEach(m => console.log(`   - ${m}`));
    }

    return {
      status: 'working',
      provider: keyName,
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      reply,
      freeModels,
      pricing: 'FREE & PAID',
      limits: 'Varies by model',
      recommended: freeModels.length > 0
    };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { status: 'error', error: error.message };
  }
}

/**
 * اختبار XAI (Grok)
 */
async function testXAI() {
  console.log('\n🧪 Testing XAI (Grok)...');
  
  if (!API_KEYS.XAI) {
    console.log('❌ No API key found');
    return { status: 'no_key' };
  }

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEYS.XAI}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          { role: 'user', content: 'Say "test successful" in Arabic' }
        ],
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Failed: ${response.status} - ${error}`);
      return { status: 'failed', error: `${response.status}: ${error}` };
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    console.log(`✅ Working! Reply: ${reply}`);

    return {
      status: 'working',
      provider: 'XAI',
      model: 'grok-beta',
      reply,
      models: ['grok-beta', 'grok-vision-beta'],
      pricing: 'PAID',
      limits: '$5/month free credits',
      recommended: false
    };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { status: 'error', error: error.message };
  }
}

/**
 * اختبار Mistral
 */
async function testMistral() {
  console.log('\n🧪 Testing Mistral...');
  
  if (!API_KEYS.MISTRAL) {
    console.log('❌ No API key found');
    return { status: 'no_key' };
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEYS.MISTRAL}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          { role: 'user', content: 'Say "test successful" in Arabic' }
        ],
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Failed: ${response.status} - ${error}`);
      return { status: 'failed', error: `${response.status}: ${error}` };
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    console.log(`✅ Working! Reply: ${reply}`);

    // جلب قائمة الموديلات
    const modelsResponse = await fetch('https://api.mistral.ai/v1/models', {
      headers: {
        'Authorization': `Bearer ${API_KEYS.MISTRAL}`
      }
    });

    let models = [];
    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      models = modelsData.data.map(m => m.id);
      console.log(`📋 Available models: ${models.length}`);
      models.slice(0, 5).forEach(m => console.log(`   - ${m}`));
    }

    return {
      status: 'working',
      provider: 'MISTRAL',
      model: 'mistral-small-latest',
      reply,
      models,
      pricing: 'PAID',
      limits: 'Pay as you go',
      recommended: false
    };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { status: 'error', error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔑 AI Keys Tester');
  console.log('==================\n');
  console.log('Testing all AI API keys...\n');

  const allResults = [];

  // اختبار GROQ
  const groqResult = await testGroq();
  if (groqResult.status === 'working') {
    results.working.push(groqResult);
    if (groqResult.pricing === 'FREE') results.free.push(groqResult);
  } else {
    results.failed.push({ provider: 'GROQ', ...groqResult });
  }
  allResults.push(groqResult);

  // اختبار OpenRouter (3 مفاتيح)
  for (let i = 1; i <= 3; i++) {
    const keyName = `OPENROUTER_${i}`;
    const result = await testOpenRouter(keyName, API_KEYS[keyName]);
    if (result.status === 'working') {
      results.working.push(result);
      if (result.freeModels?.length > 0) results.free.push(result);
    } else {
      results.failed.push({ provider: keyName, ...result });
    }
    allResults.push(result);
  }

  // اختبار XAI
  const xaiResult = await testXAI();
  if (xaiResult.status === 'working') {
    results.working.push(xaiResult);
    if (xaiResult.pricing === 'FREE') results.free.push(xaiResult);
    else results.paid.push(xaiResult);
  } else {
    results.failed.push({ provider: 'XAI', ...xaiResult });
  }
  allResults.push(xaiResult);

  // اختبار Mistral
  const mistralResult = await testMistral();
  if (mistralResult.status === 'working') {
    results.working.push(mistralResult);
    if (mistralResult.pricing === 'FREE') results.free.push(mistralResult);
    else results.paid.push(mistralResult);
  } else {
    results.failed.push({ provider: 'MISTRAL', ...mistralResult });
  }
  allResults.push(mistralResult);

  // عرض النتائج النهائية
  console.log('\n\n📊 FINAL REPORT');
  console.log('================\n');

  console.log(`✅ Working Keys: ${results.working.length}/6`);
  console.log(`❌ Failed Keys: ${results.failed.length}/6`);
  console.log(`🆓 Free Options: ${results.free.length}`);
  console.log(`💰 Paid Options: ${results.paid.length}\n`);

  // تفاصيل المفاتيح العاملة
  if (results.working.length > 0) {
    console.log('✅ WORKING KEYS:');
    console.log('================\n');
    results.working.forEach((r, i) => {
      console.log(`${i + 1}. ${r.provider}`);
      console.log(`   Model: ${r.model}`);
      console.log(`   Pricing: ${r.pricing}`);
      console.log(`   Limits: ${r.limits}`);
      console.log(`   Recommended: ${r.recommended ? '⭐ YES' : 'No'}`);
      if (r.models) console.log(`   Models: ${r.models.length} available`);
      if (r.freeModels) console.log(`   Free Models: ${r.freeModels.length} available`);
      console.log('');
    });
  }

  // تفاصيل المفاتيح الفاشلة
  if (results.failed.length > 0) {
    console.log('❌ FAILED KEYS:');
    console.log('===============\n');
    results.failed.forEach((r, i) => {
      console.log(`${i + 1}. ${r.provider}`);
      console.log(`   Status: ${r.status}`);
      console.log(`   Error: ${r.error || 'Unknown'}`);
      console.log('');
    });
  }

  // التوصيات
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('===================\n');

  const recommended = results.working.filter(r => r.recommended);
  if (recommended.length > 0) {
    console.log('⭐ Best Options (Free & Fast):');
    recommended.forEach(r => {
      console.log(`   - ${r.provider}: ${r.model}`);
    });
  }

  console.log('\n📝 Usage Commands:');
  console.log('==================\n');
  
  if (results.working.some(r => r.provider === 'GROQ')) {
    console.log('# Use GROQ (Recommended - Fast & Free):');
    console.log('node generate-ai-overviews.js\n');
  }

  if (results.working.some(r => r.provider.startsWith('OPENROUTER'))) {
    const orCount = results.working.filter(r => r.provider.startsWith('OPENROUTER')).length;
    console.log(`# Use OpenRouter (${orCount} keys - ${orCount}× speed):`);
    console.log('AI_PROVIDER=OPENROUTER node generate-ai-overviews.js\n');
  }

  if (results.working.some(r => r.provider === 'XAI')) {
    console.log('# Use XAI (Grok):');
    console.log('AI_PROVIDER=XAI node generate-ai-overviews.js\n');
  }

  if (results.working.some(r => r.provider === 'MISTRAL')) {
    console.log('# Use Mistral:');
    console.log('AI_PROVIDER=MISTRAL node generate-ai-overviews.js\n');
  }

  // حفظ التقرير
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: 6,
      working: results.working.length,
      failed: results.failed.length,
      free: results.free.length,
      paid: results.paid.length
    },
    results: allResults
  };

  const fs = await import('fs');
  fs.writeFileSync('ai-keys-report.json', JSON.stringify(report, null, 2));
  console.log('📄 Full report saved to: ai-keys-report.json\n');
}

main().catch(console.error);
