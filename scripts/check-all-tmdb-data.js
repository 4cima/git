#!/usr/bin/env node
/**
 * ============================================
 * 🔍 فحص كل البيانات المتاحة من TMDB
 * ============================================
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;

async function checkAllData() {
  console.log('🔍 فحص كل البيانات المتاحة من TMDB\n');
  console.log('═'.repeat(80));
  
  try {
    // 1. Movie with ALL append_to_response
    console.log('\n🎬 الأفلام - كل البيانات المتاحة:\n');
    const movie = await axios.get(`https://api.themoviedb.org/3/movie/550`, {
      params: {
        api_key: TMDB_API_KEY,
        append_to_response: 'credits,translations,keywords,videos,release_dates,images,recommendations,similar,reviews,lists,alternative_titles,external_ids,watch/providers'
      }
    });
    
    console.log('📊 البيانات المتاحة:');
    Object.keys(movie.data).forEach(key => {
      const value = movie.data[key];
      let info = '';
      
      if (Array.isArray(value)) {
        info = `Array (${value.length} items)`;
      } else if (typeof value === 'object' && value !== null) {
        const subKeys = Object.keys(value);
        info = `Object (${subKeys.length} keys: ${subKeys.slice(0, 3).join(', ')}${subKeys.length > 3 ? '...' : ''})`;
      } else {
        info = typeof value;
      }
      
      console.log(`  ✅ ${key}: ${info}`);
    });
    
    // 2. TV Series with ALL append_to_response
    console.log('\n\n📺 المسلسلات - كل البيانات المتاحة:\n');
    const tv = await axios.get(`https://api.themoviedb.org/3/tv/1396`, {
      params: {
        api_key: TMDB_API_KEY,
        append_to_response: 'credits,translations,keywords,videos,external_ids,content_ratings,images,recommendations,similar,reviews,alternative_titles,episode_groups,watch/providers,aggregate_credits,screened_theatrically'
      }
    });
    
    console.log('📊 البيانات المتاحة:');
    Object.keys(tv.data).forEach(key => {
      const value = tv.data[key];
      let info = '';
      
      if (Array.isArray(value)) {
        info = `Array (${value.length} items)`;
      } else if (typeof value === 'object' && value !== null) {
        const subKeys = Object.keys(value);
        info = `Object (${subKeys.length} keys: ${subKeys.slice(0, 3).join(', ')}${subKeys.length > 3 ? '...' : ''})`;
      } else {
        info = typeof value;
      }
      
      console.log(`  ✅ ${key}: ${info}`);
    });
    
    // 3. Check specific data structures
    console.log('\n\n' + '═'.repeat(80));
    console.log('📋 تفاصيل البيانات المهمة:');
    console.log('═'.repeat(80));
    
    // Production Companies
    console.log('\n🏢 شركات الإنتاج (Production Companies):');
    if (movie.data.production_companies?.[0]) {
      console.log('  البيانات المتاحة:', Object.keys(movie.data.production_companies[0]).join(', '));
      console.log('  مثال:', JSON.stringify(movie.data.production_companies[0], null, 2));
    }
    
    // Networks (TV only)
    console.log('\n📡 الشبكات (Networks):');
    if (tv.data.networks?.[0]) {
      console.log('  البيانات المتاحة:', Object.keys(tv.data.networks[0]).join(', '));
      console.log('  مثال:', JSON.stringify(tv.data.networks[0], null, 2));
    }
    
    // Credits
    console.log('\n👥 الطاقم (Credits):');
    if (movie.data.credits) {
      console.log('  Cast:', movie.data.credits.cast?.length || 0, 'ممثل');
      console.log('  Crew:', movie.data.credits.crew?.length || 0, 'عضو');
      if (movie.data.credits.cast?.[0]) {
        console.log('  بيانات الممثل:', Object.keys(movie.data.credits.cast[0]).join(', '));
      }
      if (movie.data.credits.crew?.[0]) {
        console.log('  بيانات الطاقم:', Object.keys(movie.data.credits.crew[0]).join(', '));
      }
    }
    
    // Images
    console.log('\n🖼️ الصور (Images):');
    if (movie.data.images) {
      console.log('  Backdrops:', movie.data.images.backdrops?.length || 0);
      console.log('  Posters:', movie.data.images.posters?.length || 0);
      console.log('  Logos:', movie.data.images.logos?.length || 0);
      if (movie.data.images.backdrops?.[0]) {
        console.log('  بيانات الصورة:', Object.keys(movie.data.images.backdrops[0]).join(', '));
      }
    }
    
    // Videos
    console.log('\n🎥 الفيديوهات (Videos):');
    if (movie.data.videos?.results) {
      console.log('  العدد:', movie.data.videos.results.length);
      const types = [...new Set(movie.data.videos.results.map(v => v.type))];
      console.log('  الأنواع:', types.join(', '));
      if (movie.data.videos.results[0]) {
        console.log('  بيانات الفيديو:', Object.keys(movie.data.videos.results[0]).join(', '));
      }
    }
    
    // Watch Providers
    console.log('\n📺 منصات المشاهدة (Watch Providers):');
    if (movie.data['watch/providers']?.results) {
      const countries = Object.keys(movie.data['watch/providers'].results);
      console.log('  الدول المتاحة:', countries.length);
      console.log('  أمثلة:', countries.slice(0, 5).join(', '));
      const firstCountry = movie.data['watch/providers'].results[countries[0]];
      if (firstCountry) {
        console.log('  البيانات المتاحة:', Object.keys(firstCountry).join(', '));
      }
    }
    
    // Reviews
    console.log('\n⭐ المراجعات (Reviews):');
    if (movie.data.reviews?.results) {
      console.log('  العدد:', movie.data.reviews.results.length);
      if (movie.data.reviews.results[0]) {
        console.log('  بيانات المراجعة:', Object.keys(movie.data.reviews.results[0]).join(', '));
      }
    }
    
    // Alternative Titles
    console.log('\n📝 العناوين البديلة (Alternative Titles):');
    if (movie.data.alternative_titles?.titles) {
      console.log('  العدد:', movie.data.alternative_titles.titles.length);
      if (movie.data.alternative_titles.titles[0]) {
        console.log('  بيانات العنوان:', Object.keys(movie.data.alternative_titles.titles[0]).join(', '));
      }
    }
    
    console.log('\n' + '═'.repeat(80));
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  }
}

checkAllData();
