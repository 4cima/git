#!/usr/bin/env node

/**
 * 📊 تقرير شامل ومفصل لقاعدة البيانات
 */

const Database = require('better-sqlite3');
const db = new Database('./data/4cima-local.db', { readonly: true });
const fs = require('fs');

let report = '';

function log(text) {
  console.log(text);
  report += text + '\n';
}

log('═'.repeat(100));
log('📊 تقرير شامل ومفصل لقاعدة البيانات');
log('═'.repeat(100));
log(`\nالتاريخ: ${new Date().toLocaleString('ar-SA')}\n`);

// ═══════════════════════════════════════════════════════════════════════════════
// 1. نظرة عامة على الجداول
// ═══════════════════════════════════════════════════════════════════════════════

log('\n📋 1. الجداول الموجودة في قاعدة البيانات:\n');
log('─'.repeat(100));

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => {
  const count = db.prepare(`SELECT COUNT(*) as c FROM ${t.name}`).get();
  log(`   ${t.name}: ${count.c.toLocaleString()} سجل`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. الأفلام - تحليل شامل
// ═══════════════════════════════════════════════════════════════════════════════

log('\n\n🎬 2. الأفلام - تحليل شامل:\n');
log('─'.repeat(100));

const m_total = db.prepare('SELECT COUNT(*) as c FROM movies').get();
log(`\n📦 إجمالي IDs: ${m_total.c.toLocaleString()}`);

// 2.1 حالة السحب
log('\n📥 2.1 حالة السحب:');
const m_fetched = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL').get();
const m_not_fetched = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NULL').get();
log(`   ✅ مسحوب: ${m_fetched.c.toLocaleString()} (${((m_fetched.c / m_total.c) * 100).toFixed(2)}%)`);
log(`   ❌ لم يُسحب: ${m_not_fetched.c.toLocaleString()} (${((m_not_fetched.c / m_total.c) * 100).toFixed(2)}%)`);

// 2.2 حالة الفلترة
log('\n🚫 2.2 حالة الفلترة:');
const m_filtered = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_filtered = 1').get();
const m_not_filtered = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_filtered = 0').get();
log(`   🚫 مفلتر: ${m_filtered.c.toLocaleString()} (${((m_filtered.c / m_total.c) * 100).toFixed(2)}%)`);
log(`   ✅ غير مفلتر: ${m_not_filtered.c.toLocaleString()} (${((m_not_filtered.c / m_total.c) * 100).toFixed(2)}%)`);

// 2.3 من المسحوب: مقبول ومفلتر
log('\n📊 2.3 من المسحوب - التقسيم:');
const m_accepted = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0').get();
const m_fetched_filtered = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 1').get();
log(`   ✅ مقبول: ${m_accepted.c.toLocaleString()} (${((m_accepted.c / m_fetched.c) * 100).toFixed(2)}% من المسحوب)`);
log(`   🚫 مفلتر: ${m_fetched_filtered.c.toLocaleString()} (${((m_fetched_filtered.c / m_fetched.c) * 100).toFixed(2)}% من المسحوب)`);

// 2.4 حالة الاكتمال
log('\n✅ 2.4 حالة الاكتمال (من المقبول):');
const m_complete = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 1').get();
const m_incomplete = db.prepare('SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0').get();
log(`   ✅ مكتمل: ${m_complete.c.toLocaleString()} (${((m_complete.c / m_accepted.c) * 100).toFixed(2)}%)`);
log(`   ⚠️  غير مكتمل: ${m_incomplete.c.toLocaleString()} (${((m_incomplete.c / m_accepted.c) * 100).toFixed(2)}%)`);

// 2.5 تفاصيل الفلاتر
log('\n🚫 2.5 تفاصيل الفلاتر (من المسحوب):');
const m_filters = db.prepare(`
  SELECT filter_reason, COUNT(*) as count 
  FROM movies 
  WHERE overview_en IS NOT NULL AND is_filtered = 1 
  GROUP BY filter_reason 
  ORDER BY count DESC
`).all();
m_filters.forEach(f => {
  const pct = ((f.count / m_fetched_filtered.c) * 100).toFixed(2);
  log(`   ${f.filter_reason || 'NULL'}: ${f.count.toLocaleString()} (${pct}%)`);
});

// 2.6 تحليل البيانات المفقودة (من المقبول غير المكتمل)
log('\n⚠️  2.6 البيانات المفقودة (من المقبول غير المكتمل):');
const m_missing = {
  title_en: db.prepare("SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (title_en IS NULL OR title_en = '')").get(),
  title_ar: db.prepare("SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (title_ar IS NULL OR title_ar = '')").get(),
  overview_en: db.prepare("SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (overview_en IS NULL OR overview_en = '')").get(),
  overview_ar: db.prepare("SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (overview_ar IS NULL OR overview_ar = '')").get(),
  poster: db.prepare("SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (poster_path IS NULL OR poster_path = '')").get(),
  backdrop: db.prepare("SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (backdrop_path IS NULL OR backdrop_path = '')").get(),
  release_date: db.prepare("SELECT COUNT(*) as c FROM movies WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (release_date IS NULL OR release_date = '')").get()
};
log(`   بدون title_en: ${m_missing.title_en.c.toLocaleString()}`);
log(`   بدون title_ar: ${m_missing.title_ar.c.toLocaleString()}`);
log(`   بدون overview_en: ${m_missing.overview_en.c.toLocaleString()}`);
log(`   بدون overview_ar: ${m_missing.overview_ar.c.toLocaleString()}`);
log(`   بدون poster_path: ${m_missing.poster.c.toLocaleString()}`);
log(`   بدون backdrop_path: ${m_missing.backdrop.c.toLocaleString()}`);
log(`   بدون release_date: ${m_missing.release_date.c.toLocaleString()}`);

// 2.7 تحليل الأعمال متعددة المشاكل
log('\n🔍 2.7 الأعمال متعددة المشاكل:');
const m_multi = db.prepare(`
  SELECT 
    CASE WHEN title_ar IS NULL OR title_ar = '' THEN 1 ELSE 0 END +
    CASE WHEN overview_ar IS NULL OR overview_ar = '' THEN 1 ELSE 0 END +
    CASE WHEN poster_path IS NULL OR poster_path = '' THEN 1 ELSE 0 END +
    CASE WHEN backdrop_path IS NULL OR backdrop_path = '' THEN 1 ELSE 0 END +
    CASE WHEN release_date IS NULL OR release_date = '' THEN 1 ELSE 0 END as problems,
    COUNT(*) as count
  FROM movies 
  WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0
  GROUP BY problems
  ORDER BY problems DESC
`).all();
m_multi.forEach(m => {
  log(`   ${m.problems} مشكلة: ${m.count.toLocaleString()} عمل`);
});

// 2.8 إحصائيات التقييمات
log('\n⭐ 2.8 إحصائيات التقييمات (من المسحوب):');
const m_ratings = db.prepare(`
  SELECT 
    COUNT(*) as total,
    AVG(vote_average) as avg_rating,
    MIN(vote_average) as min_rating,
    MAX(vote_average) as max_rating,
    SUM(vote_count) as total_votes
  FROM movies 
  WHERE overview_en IS NOT NULL
`).get();
log(`   متوسط التقييم: ${m_ratings.avg_rating ? m_ratings.avg_rating.toFixed(2) : 'N/A'}`);
log(`   أقل تقييم: ${m_ratings.min_rating || 'N/A'}`);
log(`   أعلى تقييم: ${m_ratings.max_rating || 'N/A'}`);
log(`   إجمالي الأصوات: ${m_ratings.total_votes ? m_ratings.total_votes.toLocaleString() : 'N/A'}`);

// 2.9 توزيع حسب السنة
log('\n📅 2.9 توزيع حسب سنة الإصدار (أعلى 10 سنوات):');
const m_years = db.prepare(`
  SELECT 
    SUBSTR(release_date, 1, 4) as year,
    COUNT(*) as count
  FROM movies 
  WHERE overview_en IS NOT NULL AND release_date IS NOT NULL AND release_date != ''
  GROUP BY year
  ORDER BY count DESC
  LIMIT 10
`).all();
m_years.forEach(y => {
  log(`   ${y.year}: ${y.count.toLocaleString()} فيلم`);
});

// 2.10 الأفلام الأعلى تقييماً
log('\n🏆 2.10 الأفلام الأعلى تقييماً (أعلى 10):');
const m_top = db.prepare(`
  SELECT title_en, title_ar, vote_average, vote_count, release_date
  FROM movies 
  WHERE overview_en IS NOT NULL AND vote_count > 1000
  ORDER BY vote_average DESC, vote_count DESC
  LIMIT 10
`).all();
m_top.forEach((m, i) => {
  log(`   ${i + 1}. ${m.title_ar || m.title_en} (${m.vote_average}) - ${m.vote_count.toLocaleString()} صوت`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. المسلسلات - تحليل شامل
// ═══════════════════════════════════════════════════════════════════════════════

log('\n\n📺 3. المسلسلات - تحليل شامل:\n');
log('─'.repeat(100));

const s_total = db.prepare('SELECT COUNT(*) as c FROM tv_series').get();
log(`\n📦 إجمالي IDs: ${s_total.c.toLocaleString()}`);

// 3.1 حالة السحب
log('\n📥 3.1 حالة السحب:');
const s_fetched = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL').get();
const s_not_fetched = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NULL').get();
log(`   ✅ مسحوب: ${s_fetched.c.toLocaleString()} (${((s_fetched.c / s_total.c) * 100).toFixed(2)}%)`);
log(`   ❌ لم يُسحب: ${s_not_fetched.c.toLocaleString()} (${((s_not_fetched.c / s_total.c) * 100).toFixed(2)}%)`);

// 3.2 حالة الفلترة
log('\n🚫 3.2 حالة الفلترة:');
const s_filtered = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 1').get();
const s_not_filtered = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE is_filtered = 0').get();
log(`   🚫 مفلتر: ${s_filtered.c.toLocaleString()} (${((s_filtered.c / s_total.c) * 100).toFixed(2)}%)`);
log(`   ✅ غير مفلتر: ${s_not_filtered.c.toLocaleString()} (${((s_not_filtered.c / s_total.c) * 100).toFixed(2)}%)`);

// 3.3 من المسحوب: مقبول ومفلتر
log('\n📊 3.3 من المسحوب - التقسيم:');
const s_accepted = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0').get();
const s_fetched_filtered = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 1').get();
log(`   ✅ مقبول: ${s_accepted.c.toLocaleString()} (${((s_accepted.c / s_fetched.c) * 100).toFixed(2)}% من المسحوب)`);
log(`   🚫 مفلتر: ${s_fetched_filtered.c.toLocaleString()} (${((s_fetched_filtered.c / s_fetched.c) * 100).toFixed(2)}% من المسحوب)`);

// 3.4 حالة الاكتمال
log('\n✅ 3.4 حالة الاكتمال (من المقبول):');
const s_complete = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 1').get();
const s_incomplete = db.prepare('SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0').get();
log(`   ✅ مكتمل: ${s_complete.c.toLocaleString()} (${((s_complete.c / s_accepted.c) * 100).toFixed(2)}%)`);
log(`   ⚠️  غير مكتمل: ${s_incomplete.c.toLocaleString()} (${((s_incomplete.c / s_accepted.c) * 100).toFixed(2)}%)`);

// 3.5 تفاصيل الفلاتر
log('\n🚫 3.5 تفاصيل الفلاتر (من المسحوب):');
const s_filters = db.prepare(`
  SELECT filter_reason, COUNT(*) as count 
  FROM tv_series 
  WHERE overview_en IS NOT NULL AND is_filtered = 1 
  GROUP BY filter_reason 
  ORDER BY count DESC
`).all();
s_filters.forEach(f => {
  const pct = ((f.count / s_fetched_filtered.c) * 100).toFixed(2);
  log(`   ${f.filter_reason || 'NULL'}: ${f.count.toLocaleString()} (${pct}%)`);
});

// 3.6 تحليل البيانات المفقودة
log('\n⚠️  3.6 البيانات المفقودة (من المقبول غير المكتمل):');
const s_missing = {
  title_en: db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (title_en IS NULL OR title_en = '')").get(),
  title_ar: db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (title_ar IS NULL OR title_ar = '')").get(),
  overview_ar: db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (overview_ar IS NULL OR overview_ar = '')").get(),
  poster: db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (poster_path IS NULL OR poster_path = '')").get(),
  backdrop: db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (backdrop_path IS NULL OR backdrop_path = '')").get(),
  first_air_date: db.prepare("SELECT COUNT(*) as c FROM tv_series WHERE overview_en IS NOT NULL AND is_filtered = 0 AND is_complete = 0 AND (first_air_date IS NULL OR first_air_date = '')").get()
};
log(`   بدون title_en: ${s_missing.title_en.c.toLocaleString()}`);
log(`   بدون title_ar: ${s_missing.title_ar.c.toLocaleString()}`);
log(`   بدون overview_ar: ${s_missing.overview_ar.c.toLocaleString()}`);
log(`   بدون poster_path: ${s_missing.poster.c.toLocaleString()}`);
log(`   بدون backdrop_path: ${s_missing.backdrop.c.toLocaleString()}`);
log(`   بدون first_air_date: ${s_missing.first_air_date.c.toLocaleString()}`);

// 3.7 إحصائيات المواسم والحلقات
log('\n📺 3.7 إحصائيات المواسم والحلقات:');
const s_seasons_stats = db.prepare(`
  SELECT 
    COUNT(*) as total_series,
    SUM(number_of_seasons) as total_seasons,
    SUM(number_of_episodes) as total_episodes,
    AVG(number_of_seasons) as avg_seasons,
    AVG(number_of_episodes) as avg_episodes
  FROM tv_series 
  WHERE overview_en IS NOT NULL
`).get();
log(`   إجمالي المواسم: ${s_seasons_stats.total_seasons ? s_seasons_stats.total_seasons.toLocaleString() : 'N/A'}`);
log(`   إجمالي الحلقات: ${s_seasons_stats.total_episodes ? s_seasons_stats.total_episodes.toLocaleString() : 'N/A'}`);
log(`   متوسط المواسم: ${s_seasons_stats.avg_seasons ? s_seasons_stats.avg_seasons.toFixed(1) : 'N/A'}`);
log(`   متوسط الحلقات: ${s_seasons_stats.avg_episodes ? s_seasons_stats.avg_episodes.toFixed(1) : 'N/A'}`);

// 3.8 المسلسلات الأعلى تقييماً
log('\n🏆 3.8 المسلسلات الأعلى تقييماً (أعلى 10):');
const s_top = db.prepare(`
  SELECT title_en, title_ar, vote_average, vote_count, number_of_seasons
  FROM tv_series 
  WHERE overview_en IS NOT NULL AND vote_count > 500
  ORDER BY vote_average DESC, vote_count DESC
  LIMIT 10
`).all();
s_top.forEach((s, i) => {
  log(`   ${i + 1}. ${s.title_ar || s.title_en} (${s.vote_average}) - ${s.number_of_seasons} موسم`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. الممثلين والطاقم
// ═══════════════════════════════════════════════════════════════════════════════

log('\n\n👥 4. الممثلين والطاقم:\n');
log('─'.repeat(100));

const people_total = db.prepare('SELECT COUNT(*) as c FROM people').get();
log(`\n📦 إجمالي الأشخاص: ${people_total.c.toLocaleString()}`);

const cc_total = db.prepare('SELECT COUNT(*) as c FROM cast_crew').get();
log(`📦 إجمالي السجلات في cast_crew: ${cc_total.c.toLocaleString()}`);

// 4.1 توزيع حسب نوع المحتوى
log('\n📊 4.1 توزيع حسب نوع المحتوى:');
const cc_by_type = db.prepare(`
  SELECT content_type, COUNT(*) as count, COUNT(DISTINCT content_id) as unique_works
  FROM cast_crew
  GROUP BY content_type
`).all();
cc_by_type.forEach(t => {
  log(`   ${t.content_type}: ${t.count.toLocaleString()} سجل (${t.unique_works.toLocaleString()} عمل فريد)`);
});

// 4.2 توزيع حسب الدور
log('\n📊 4.2 توزيع حسب الدور:');
const cc_by_role = db.prepare(`
  SELECT role_type, COUNT(*) as count
  FROM cast_crew
  GROUP BY role_type
`).all();
cc_by_role.forEach(r => {
  log(`   ${r.role_type}: ${r.count.toLocaleString()} سجل`);
});

// 4.3 الممثلين الأكثر ظهوراً
log('\n🌟 4.3 الممثلين الأكثر ظهوراً (أعلى 10):');
const top_actors = db.prepare(`
  SELECT p.name_en, p.name_ar, COUNT(*) as appearances
  FROM cast_crew cc
  JOIN people p ON cc.person_id = p.id
  WHERE cc.role_type = 'cast'
  GROUP BY cc.person_id
  ORDER BY appearances DESC
  LIMIT 10
`).all();
top_actors.forEach((a, i) => {
  log(`   ${i + 1}. ${a.name_ar || a.name_en}: ${a.appearances.toLocaleString()} ظهور`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. الأنواع (Genres)
// ═══════════════════════════════════════════════════════════════════════════════

log('\n\n🎭 5. الأنواع (Genres):\n');
log('─'.repeat(100));

const genres_total = db.prepare('SELECT COUNT(*) as c FROM genres').get();
log(`\n📦 إجمالي الأنواع: ${genres_total.c.toLocaleString()}`);

// 5.1 الأنواع الأكثر شيوعاً في الأفلام
log('\n📊 5.1 الأنواع الأكثر شيوعاً في الأفلام:');
const movie_genres = db.prepare(`
  SELECT g.name_en, g.name_ar, COUNT(*) as count
  FROM movie_genres mg
  JOIN genres g ON mg.genre_id = g.id
  GROUP BY mg.genre_id
  ORDER BY count DESC
  LIMIT 10
`).all();
movie_genres.forEach((g, i) => {
  log(`   ${i + 1}. ${g.name_ar || g.name_en}: ${g.count.toLocaleString()} فيلم`);
});

// 5.2 الأنواع الأكثر شيوعاً في المسلسلات
log('\n📊 5.2 الأنواع الأكثر شيوعاً في المسلسلات:');
const series_genres = db.prepare(`
  SELECT g.name_en, g.name_ar, COUNT(*) as count
  FROM series_genres sg
  JOIN genres g ON sg.genre_id = g.id
  GROUP BY sg.genre_id
  ORDER BY count DESC
  LIMIT 10
`).all();
series_genres.forEach((g, i) => {
  log(`   ${i + 1}. ${g.name_ar || g.name_en}: ${g.count.toLocaleString()} مسلسل`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. الملخص النهائي
// ═══════════════════════════════════════════════════════════════════════════════

log('\n\n📊 6. الملخص النهائي:\n');
log('═'.repeat(100));

const total_works = m_total.c + s_total.c;
const total_fetched = m_fetched.c + s_fetched.c;
const total_accepted = m_accepted.c + s_accepted.c;
const total_complete = m_complete.c + s_complete.c;
const total_filtered = m_filtered.c + s_filtered.c;

log(`\n📦 إجمالي الأعمال: ${total_works.toLocaleString()}`);
log(`   🎬 أفلام: ${m_total.c.toLocaleString()} (${((m_total.c / total_works) * 100).toFixed(1)}%)`);
log(`   📺 مسلسلات: ${s_total.c.toLocaleString()} (${((s_total.c / total_works) * 100).toFixed(1)}%)`);

log(`\n✅ مسحوب: ${total_fetched.toLocaleString()} (${((total_fetched / total_works) * 100).toFixed(1)}%)`);
log(`   ✅ مقبول: ${total_accepted.toLocaleString()} (${((total_accepted / total_fetched) * 100).toFixed(1)}% من المسحوب)`);
log(`   🚫 مفلتر: ${(m_fetched_filtered.c + s_fetched_filtered.c).toLocaleString()} (${(((m_fetched_filtered.c + s_fetched_filtered.c) / total_fetched) * 100).toFixed(1)}% من المسحوب)`);

log(`\n🎯 مكتمل: ${total_complete.toLocaleString()} (${((total_complete / total_accepted) * 100).toFixed(1)}% من المقبول)`);

log(`\n👥 الممثلين: ${people_total.c.toLocaleString()} شخص`);
log(`📝 سجلات Cast/Crew: ${cc_total.c.toLocaleString()} سجل`);
log(`🎭 الأنواع: ${genres_total.c.toLocaleString()} نوع`);

log('\n' + '═'.repeat(100));
log('\n✅ اكتمل التقرير بنجاح\n');

// حفظ التقرير في ملف
fs.writeFileSync('DATABASE-COMPREHENSIVE-REPORT.md', report, 'utf8');
log('📄 تم حفظ التقرير في: DATABASE-COMPREHENSIVE-REPORT.md\n');

db.close();
