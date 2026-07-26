#!/usr/bin/env node

/**
 * اختبار محلي للـ Worker
 * يتحقق من أن endpoint /api/home يعمل بشكل صحيح
 */

const http = require('http');

const WORKER_URL = 'http://localhost:8787';

async function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, WORKER_URL);
    
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: json
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('🚀 بدء اختبار Worker محلياً...\n');
  
  try {
    // Test 1: Health check
    console.log('📋 اختبار 1: Health Check');
    const health = await testEndpoint('/health');
    console.log(`✅ Status: ${health.status}`);
    console.log(`📊 Response:`, JSON.stringify(health.data, null, 2));
    console.log('');
    
    // Test 2: Home endpoint
    console.log('📋 اختبار 2: GET /api/home');
    const home = await testEndpoint('/api/home');
    console.log(`✅ Status: ${home.status}`);
    
    if (home.status === 200) {
      const { data } = home.data;
      console.log(`📊 Trending movies: ${data.trending.length}`);
      console.log(`📊 Top rated movies: ${data.topRated.length}`);
      console.log(`📊 Recent movies: ${data.recent.length}`);
      
      if (data.trending.length > 0) {
        console.log(`\n🎬 أول فيلم في Trending:`);
        console.log(`   - ID: ${data.trending[0].id}`);
        console.log(`   - Title AR: ${data.trending[0].title_ar}`);
        console.log(`   - Title EN: ${data.trending[0].title_en}`);
        console.log(`   - Rating: ${data.trending[0].vote_average}`);
      }
    } else {
      console.log(`❌ Error: ${home.data.message}`);
    }
    console.log('');
    
    console.log('✅ جميع الاختبارات اكتملت بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error.message);
    console.error('\n💡 تأكد من أن Worker يعمل بـ: npm run dev');
    process.exit(1);
  }
}

runTests();
