require('dotenv').config({path:'.env.local'});
const Database = require('better-sqlite3');
const {createClient} = require('@libsql/client');

const localDb = new Database('data/4cima-local.db', { readonly: true });
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// نفس دالة toSlug من INGEST-SERIES-LOGIC.js (حرفياً)
function toSlug(text) {
  if (!text) return 'unknown';
  return text.toString().toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u').replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c').replace(/[&]/g, 'and')
    .replace(/['"''""]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
}

// السياسة الموحدة: base → base-year → base-year-genre → base-year-genre-N
function generateUniqueSlug(nameEn, year, genre, usedSlugs) {
  const base = toSlug(nameEn);
  
  if (!base || base === 'unknown') {
    return null;
  }
  
  // المحاولات بالترتيب
  const attempts = [
    base,
    year ? `${base}-${year}` : null,
    year && genre ? `${base}-${year}-${toSlug(genre)}` : null
  ].filter(Boolean);
  
  for (const slug of attempts) {
    if (!usedSlugs.has(slug)) {
      return slug;
    }
  }
  
  // إضافة رقم تسلسلي (نادر)
  const lastAttempt = attempts[attempts.length - 1] || base;
  for (let i = 2; i <= 999; i++) {
    const slug = `${lastAttempt}-${i}`;
    if (!usedSlugs.has(slug)) {
      return slug;
    }
  }
  
  return null;
}

async function rebuildSeriesSlugs(testMode = false, limit = 100) {
  console.log(testMode ? `🧪 اختبار على ${limit} مسلسل\n` : '🔧 معالجة كل المسلسلات\n');
  console.log('═'.repeat(70));
  
  // قراءة من القاعدة المحلية (المسلسلات الحقيقية فقط، بدون placeholder)
  console.log('\n📥 قراءة من القاعدة المحلية...');
  const query = `
    SELECT id, tmdb_id, name_en, first_air_year, primary_genre, slug as old_slug
    FROM tv_series
    WHERE name_en NOT LIKE 'Item %'
    ORDER BY id ASC
    ${testMode ? `LIMIT ${limit}` : ''}
  `;
  
  const series = localDb.prepare(query).all();
  console.log(`✅ تم تحميل ${series.length.toLocaleString()} مسلسل\n`);
  
  // معالجة في الذاكرة
  console.log('🔄 حساب slugs جديدة...\n');
  const usedSlugs = new Set();
  const updates = [];
  const unresolved = [];
  const examples = [];
  
  for (const s of series) {
    const newSlug = generateUniqueSlug(
      s.name_en, 
      s.first_air_year, 
      s.primary_genre, 
      usedSlugs
    );
    
    if (!newSlug) {
      unresolved.push({ 
        id: s.id, 
        tmdb_id: s.tmdb_id, 
        name_en: s.name_en,
        year: s.first_air_year,
        genre: s.primary_genre
      });
      continue;
    }
    
    usedSlugs.add(newSlug);
    
    if (s.old_slug !== newSlug) {
      updates.push({ id: s.id, newSlug, oldSlug: s.old_slug });
      
      if (testMode && examples.length < 15) {
        examples.push({ 
          id: s.id, 
          tmdb_id: s.tmdb_id,
          name_en: s.name_en, 
          old: s.old_slug, 
          new: newSlug 
        });
      }
    }
  }
  
  console.log('📊 النتائج:');
  console.log(`   ✅ محسوب: ${series.length.toLocaleString()}`);
  console.log(`   🔄 يحتاج تحديث: ${updates.length.toLocaleString()}`);
  console.log(`   ⚠️  غير محلول: ${unresolved.length.toLocaleString()}\n`);
  
  // فحص ASCII (صفر IDs double-dash) - بس على الـ slugs الجديدة المختلفة
  const asciiRegex = /^[a-z0-9-]+$/;
  const newSlugs = updates.map(u => u.newSlug);
  const nonAscii = newSlugs.filter(s => !asciiRegex.test(s)).length;
  // الفحص الوحيد: مفيش double-dash متبوع برقم (--123) - ده كان صيغة IDs القديمة
  const slugsWithIds = newSlugs.filter(s => /--\d/.test(s));
  const hasIds = slugsWithIds.length > 0;
  
  console.log(`🔍 فحص الجودة:`);
  console.log(`   ASCII: ${nonAscii === 0 ? '✅' : '❌'} (غير ASCII: ${nonAscii})`);
  console.log(`   IDs (--{num}): ${hasIds ? `❌ موجود ${slugsWithIds.length}` : '✅ صفر IDs'}\n`);
  
  if (hasIds && !testMode) {
    console.log('أمثلة على slugs فيها IDs:');
    slugsWithIds.slice(0, 10).forEach(s => console.log(`   - ${s}`));
    console.log();
  }
  
  if (testMode) {
    console.log('📋 أمثلة (قبل/بعد):');
    examples.forEach((ex, i) => {
      console.log(`\n   ${i+1}. id=${ex.id} (tmdb: ${ex.tmdb_id})`);
      console.log(`      name: "${ex.name_en}"`);
      console.log(`      قبل: ${ex.old}`);
      console.log(`      بعد: ${ex.new}`);
    });
    
    if (unresolved.length > 0) {
      console.log('\n⚠️  غير محلول:');
      unresolved.slice(0, 5).forEach(u => {
        console.log(`   - id=${u.id}, name_en="${u.name_en}"`);
      });
    }
    
    console.log('\n' + '═'.repeat(70));
    const passed = nonAscii === 0 && !hasIds;
    console.log(`\n${passed ? '✅' : '❌'} النتيجة: ${passed ? 'نجح' : 'فشل'}`);
    
    return { success: passed, updates, unresolved };
  }
  
  // حفظ unresolved
  if (unresolved.length > 0) {
    const fs = require('fs');
    const lines = unresolved.map(u => 
      `${u.id},${u.tmdb_id},"${u.name_en}",${u.year},${u.genre}`
    );
    fs.writeFileSync('unresolved-slugs.log', lines.join('\n'));
    console.log(`📝 تم حفظ في unresolved-slugs.log`);
  }
  
  return { updates, unresolved, passed: nonAscii === 0 && !hasIds };
}

async function applyUpdates(updates) {
  console.log('\n🚀 تطبيق التحديثات على Turso...\n');
  
  const BATCH_SIZE = 500;
  let applied = 0;
  let failed = 0;
  
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(u => 
        turso.execute({
          sql: 'UPDATE tv_series SET slug = ? WHERE id = ?',
          args: [u.newSlug, u.id]
        })
      )
    );
    
    applied += results.filter(r => r.status === 'fulfilled').length;
    failed += results.filter(r => r.status === 'rejected').length;
    
    const progress = Math.min(i + BATCH_SIZE, updates.length);
    console.log(`   ${progress.toLocaleString()}/${updates.length.toLocaleString()} (${(progress/updates.length*100).toFixed(1)}%)`);
  }
  
  console.log(`\n✅ نجح: ${applied.toLocaleString()}`);
  console.log(`❌ فشل: ${failed.toLocaleString()}`);
}

// التنفيذ
const mode = process.argv[2] || 'test';

if (mode === 'full') {
  rebuildSeriesSlugs(false).then(async ({ updates, passed }) => {
    if (!passed) {
      console.log('\n❌ فشل الفحص - توقف');
      process.exit(1);
    }
    
    await applyUpdates(updates);
    console.log('\n✅ اكتمل!');
    process.exit(0);
  });
} else {
  const limit = parseInt(process.argv[3]) || 100;
  rebuildSeriesSlugs(true, limit).then(() => process.exit(0));
}
