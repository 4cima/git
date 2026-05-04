#!/usr/bin/env node
/**
 * ============================================
 * 📦 PREPARE CONTENT FOR TURSO - FIXED
 * ============================================
 * Purpose: Prepare content with embedded JSON data
 * Reduces writes by 90% (from 10 writes to 1 write per content)
 * ============================================
 */

const db = require('./services/local-db');

/**
 * دمج بيانات الفيلم في JSON
 */
function prepareMovieForTurso(movieId) {
  // 1. جلب بيانات الفيلم الأساسية
  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(movieId);
  if (!movie) return null;

  // 2. جلب الأنواع
  const genres = db.prepare(`
    SELECT g.id, g.tmdb_id, g.name_en, g.name_ar, g.slug
    FROM genres g
    JOIN content_genres cg ON g.id = cg.genre_id
    WHERE cg.content_id = ? AND cg.content_type = 'movie'
  `).all(movieId);

  // 3. جلب الممثلين (أول 10)
  const cast = db.prepare(`
    SELECT 
      p.id, p.tmdb_id, p.name_en, p.name_ar, p.profile_path, p.popularity,
      cc.character_name, cc.character_name_ar, cc.cast_order
    FROM people p
    JOIN cast_crew cc ON p.id = cc.person_id
    WHERE cc.content_id = ? 
    AND cc.content_type = 'movie' 
    AND cc.role_type = 'cast'
    ORDER BY cc.cast_order
    LIMIT 10
  `).all(movieId);

  // 4. جلب الطاقم (مخرج، كاتب)
  const crew = db.prepare(`
    SELECT 
      p.id, p.tmdb_id, p.name_en, p.name_ar, p.profile_path,
      cc.job, cc.department
    FROM people p
    JOIN cast_crew cc ON p.id = cc.person_id
    WHERE cc.content_id = ? 
    AND cc.content_type = 'movie' 
    AND cc.role_type = 'crew'
    AND cc.job IN ('Director', 'Writer', 'Screenplay', 'Producer')
    LIMIT 5
  `).all(movieId);

  // 5. جلب الدول (من العمود المباشر)
  let countries = [];
  if (movie.country_of_origin) {
    countries = [{ iso: movie.country_of_origin }];
  }

  // 6. جلب الكلمات المفتاحية (من العمود المباشر)
  let keywords = [];
  if (movie.keywords) {
    try { keywords = JSON.parse(movie.keywords); } catch {}
  }

  // 7. جلب شركات الإنتاج (من العمود المباشر)
  let companies = [];
  if (movie.production_companies) {
    try { companies = JSON.parse(movie.production_companies); } catch {}
  }

  // 8. إرجاع البيانات المدمجة (محسّنة - بدون أعمدة اختيارية)
  return {
    // البيانات الأساسية
    id: movie.id,
    tmdb_id: movie.tmdb_id,
    slug: movie.slug,
    
    // العناوين
    title_en: movie.title_en,
    title_ar: movie.title_ar,
    
    // الأوصاف
    overview_ar: movie.overview_ar,
    
    // الصور
    poster_path: movie.poster_path,
    
    // التواريخ
    release_date: movie.release_date,
    release_year: movie.release_year,
    
    // التقييمات
    vote_average: movie.vote_average,
    
    // الفيديوهات
    trailer_key: movie.trailer_key,
    
    // البيانات المدمجة (JSON)
    genres_json: JSON.stringify(genres),
    cast_json: JSON.stringify(cast),
    crew_json: JSON.stringify(crew),
    countries_json: JSON.stringify(countries),
    keywords_json: JSON.stringify(keywords),
    companies_json: JSON.stringify(companies),
    
    // SEO Data
    seo_title_ar: movie.seo_title_ar,
    seo_description_ar: movie.seo_description_ar,
    seo_keywords_json: movie.seo_keywords_json,
    canonical_url: movie.canonical_url,
    
    // التواريخ
    created_at: movie.created_at,
    updated_at: movie.updated_at
  };
}

/**
 * دمج بيانات المسلسل في JSON
 */
function prepareTVSeriesForTurso(seriesId) {
  // 1. جلب بيانات المسلسل الأساسية
  const series = db.prepare('SELECT * FROM tv_series WHERE id = ?').get(seriesId);
  if (!series) return null;

  // 2. جلب الأنواع
  const genres = db.prepare(`
    SELECT g.id, g.tmdb_id, g.name_en, g.name_ar, g.slug
    FROM genres g
    JOIN content_genres cg ON g.id = cg.genre_id
    WHERE cg.content_id = ? AND cg.content_type = 'tv'
  `).all(seriesId);

  // 3. جلب الممثلين
  const cast = db.prepare(`
    SELECT 
      p.id, p.tmdb_id, p.name_en, p.name_ar, p.profile_path, p.popularity,
      cc.character_name, cc.character_name_ar, cc.cast_order
    FROM people p
    JOIN cast_crew cc ON p.id = cc.person_id
    WHERE cc.content_id = ? 
    AND cc.content_type = 'tv' 
    AND cc.role_type = 'cast'
    ORDER BY cc.cast_order
    LIMIT 10
  `).all(seriesId);

  // 4. جلب الطاقم
  const crew = db.prepare(`
    SELECT 
      p.id, p.tmdb_id, p.name_en, p.name_ar, p.profile_path,
      cc.job, cc.department
    FROM people p
    JOIN cast_crew cc ON p.id = cc.person_id
    WHERE cc.content_id = ? 
    AND cc.content_type = 'tv' 
    AND cc.role_type = 'crew'
    AND cc.job IN ('Director', 'Writer', 'Screenplay', 'Producer', 'Creator')
    LIMIT 5
  `).all(seriesId);

  // 5. جلب المواسم من الجدول الجديد (seasons)
  const seasons = db.prepare(`
    SELECT 
      id, series_id, tmdb_id, season_number,
      title_en, title_ar, overview_ar,
      poster_path, air_date, air_year, episode_count
    FROM seasons
    WHERE series_id = ? AND is_active = 1
    ORDER BY season_number
  `).all(seriesId);

  // 6. جلب الحلقات من الجدول الجديد (episodes) - حد أقصى 500
  const MAX_EPISODES = 500;
  const episodes = db.prepare(`
    SELECT 
      id, series_id, season_id, tmdb_id,
      episode_number, season_number,
      title_en, title_ar, overview_ar,
      still_path, air_date, runtime, vote_average
    FROM episodes
    WHERE series_id = ? AND is_active = 1
    ORDER BY season_number, episode_number
    LIMIT ?
  `).all(seriesId, MAX_EPISODES);

  // 7. جلب الدول (من العمود المباشر)
  let countries = [];
  if (series.country_of_origin) {
    countries = [{ iso: series.country_of_origin }];
  }

  // 8. جلب الكلمات المفتاحية (من العمود المباشر)
  let keywords = [];
  if (series.keywords) {
    try { keywords = JSON.parse(series.keywords); } catch {}
  }

  // 9. جلب شركات الإنتاج (من العمود المباشر)
  let companies = [];
  if (series.production_companies) {
    try { companies = JSON.parse(series.production_companies); } catch {}
  }

  // 10. الشبكات - استخدام companies كبديل
  const networks = [];

  return {
    // البيانات الأساسية
    id: series.id,
    tmdb_id: series.tmdb_id,
    slug: series.slug,
    
    // العناوين (الأسماء الصحيحة من القاعدة المحلية)
    name_en: series.title_en,
    name_ar: series.title_ar,
    
    // الأوصاف
    overview_ar: series.overview_ar,
    
    // الصور
    poster_path: series.poster_path,
    
    // التواريخ
    first_air_date: series.first_air_date,
    first_air_year: series.first_air_year,
    
    // المعلومات
    number_of_seasons: series.number_of_seasons,
    number_of_episodes: series.number_of_episodes,
    status: series.status,
    
    // التقييمات
    vote_average: series.vote_average,
    
    // الفيديوهات
    trailer_key: series.trailer_key,
    
    // البيانات المدمجة (JSON)
    genres_json: JSON.stringify(genres),
    cast_json: JSON.stringify(cast),
    crew_json: JSON.stringify(crew),
    countries_json: JSON.stringify(countries),
    keywords_json: JSON.stringify(keywords),
    networks_json: JSON.stringify(networks),
    
    // المواسم والحلقات من الجداول الجديدة
    seasons_json: JSON.stringify(seasons),
    episodes_json: JSON.stringify(episodes),
    
    // SEO Data
    seo_title_ar: series.seo_title_ar,
    seo_description_ar: series.seo_description_ar,
    seo_keywords_json: series.seo_keywords_json,
    canonical_url: series.canonical_url,
    
    // التواريخ
    created_at: series.created_at,
    updated_at: series.updated_at
  };
}

/**
 * دمج بيانات الموسم (من الجدول الجديد)
 */
function prepareSeasonForTurso(seasonId) {
  const season = db.prepare('SELECT * FROM seasons WHERE id = ?').get(seasonId);
  if (!season) return null;

  return {
    id: season.id,
    series_id: season.series_id,
    tmdb_id: season.tmdb_id,
    season_number: season.season_number,
    title_en: season.title_en,
    title_ar: season.title_ar,
    overview_en: season.overview_en,
    overview_ar: season.overview_ar,
    poster_path: season.poster_path,
    air_date: season.air_date,
    air_year: season.air_year,
    episode_count: season.episode_count,
    is_active: season.is_active
  };
}

/**
 * دمج بيانات الحلقة (من الجدول الجديد)
 */
function prepareEpisodeForTurso(episodeId) {
  const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(episodeId);
  if (!episode) return null;

  return {
    id: episode.id,
    series_id: episode.series_id,
    season_id: episode.season_id,
    tmdb_id: episode.tmdb_id,
    episode_number: episode.episode_number,
    season_number: episode.season_number,
    title_en: episode.title_en,
    title_ar: episode.title_ar,
    overview_en: episode.overview_en,
    overview_ar: episode.overview_ar,
    still_path: episode.still_path,
    air_date: episode.air_date,
    runtime: episode.runtime,
    vote_average: episode.vote_average,
    is_active: episode.is_active
  };
}

// Export functions
module.exports = {
  prepareMovieForTurso,
  prepareTVSeriesForTurso,
  prepareSeasonForTurso,
  prepareEpisodeForTurso
};

// Test if run directly
if (require.main === module) {
  console.log('🧪 اختبار دمج البيانات...\n');
  
  // اختبار فيلم
  const movie = db.prepare('SELECT id FROM movies WHERE is_complete = 1 LIMIT 1').get();
  if (movie) {
    console.log('📽️ اختبار فيلم ID:', movie.id);
    const prepared = prepareMovieForTurso(movie.id);
    console.log('   ✅ الأنواع:', JSON.parse(prepared.genres_json).length);
    console.log('   ✅ الممثلين:', JSON.parse(prepared.cast_json).length);
    console.log('   ✅ الطاقم:', JSON.parse(prepared.crew_json).length);
    console.log('   ✅ الدول:', JSON.parse(prepared.countries_json).length);
  }
  
  // اختبار مسلسل
  const series = db.prepare('SELECT id FROM tv_series WHERE is_complete = 1 LIMIT 1').get();
  if (series) {
    console.log('\n📺 اختبار مسلسل ID:', series.id);
    const prepared = prepareTVSeriesForTurso(series.id);
    console.log('   ✅ الأنواع:', JSON.parse(prepared.genres_json).length);
    console.log('   ✅ الممثلين:', JSON.parse(prepared.cast_json).length);
    console.log('   ✅ الطاقم:', JSON.parse(prepared.crew_json).length);
    console.log('   ✅ الشبكات:', JSON.parse(prepared.networks_json).length);
    console.log('   ✅ المواسم:', JSON.parse(prepared.seasons_json).length);
    console.log('   ✅ الحلقات:', JSON.parse(prepared.episodes_json).length);
  }
  
  console.log('\n✅ الاختبار اكتمل!');
}
