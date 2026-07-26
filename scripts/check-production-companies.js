#!/usr/bin/env node
const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;

async function checkCompanies() {
  console.log('🏢 فحص بيانات شركات الإنتاج من TMDB\n');
  
  try {
    // Get a popular movie to see company data structure
    const response = await axios.get(`https://api.themoviedb.org/3/movie/550`, {
      params: { api_key: TMDB_API_KEY }
    });
    
    const movie = response.data;
    
    console.log('🎬 مثال: Fight Club');
    console.log('\n🏢 شركات الإنتاج:');
    
    if (movie.production_companies && movie.production_companies.length > 0) {
      movie.production_companies.forEach(company => {
        console.log('\n  📊 الشركة:');
        console.log('    - ID:', company.id);
        console.log('    - Name:', company.name);
        console.log('    - Logo:', company.logo_path ? `✅ ${company.logo_path}` : '❌ لا يوجد');
        console.log('    - Origin Country:', company.origin_country || 'N/A');
      });
      
      console.log('\n' + '═'.repeat(80));
      console.log('📋 البيانات المتاحة لكل شركة:');
      console.log('═'.repeat(80));
      console.log('  ✅ id - معرف الشركة');
      console.log('  ✅ name - اسم الشركة');
      console.log('  ✅ logo_path - مسار اللوجو (إذا كان متاح)');
      console.log('  ✅ origin_country - بلد المنشأ');
      
      console.log('\n📊 مثال URL للوجو:');
      const firstCompanyWithLogo = movie.production_companies.find(c => c.logo_path);
      if (firstCompanyWithLogo) {
        console.log(`  https://image.tmdb.org/t/p/original${firstCompanyWithLogo.logo_path}`);
      }
    } else {
      console.log('  ❌ لا توجد شركات إنتاج');
    }
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  }
}

checkCompanies();
