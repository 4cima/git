require('dotenv').config({path:'.env.local'});
const {createClient} = require('@libsql/client');
const fs = require('fs');
const readline = require('readline');

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

// نفس صيغة الأفلام بالظبط: name-en--tmdb_id
function generateUniqueSlugInMemory(nameEn, tmdbId, usedSlugs) {
  const base = toSlug(nameEn);
  
  if (!base || base === 'unknown' || !tmdbId) {
    return null; // سيتم تسجيله
  }
  
  // الصيغة الوحيدة: name-en--tmdb_id (نفس الأفلام)
  const slug = `${base}--${tmdbId}`;
  
  // لو مكرر (مستحيل تقريباً لأن tmdb_id فريد)، أضف timestamp
  if (usedSlugs.has(slug)) {
    return `${slug}-${Date.now()}`;
  }
  
  return slug;
}

async function loadAndProcessSlugs(testMode = false, limit = 100) {
  console.log(testMode ? `🧪 اختبار على ${limit} مسلسل\n` : '🔧 معالجة كل المسلسلات\n');
  console.log('═'.repeat(70));
  
  // قراءة CSV
  console.log('\n📥 قراءة Backup...');
  const fileStream = fs.createReadStream('BACKUP-tv_series-turso.csv');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const series = [];
  let header = null;

  for await (const line of rl) {
    if (!header) {
      header = line.split(',');
      continue;
    }

    const cols = line.split(',');
    const row = {
      id: cols[header.indexOf('id')],
      tmdb_id: cols[header.indexOf('tmdb_id')],
      name_en: cols[header.indexOf('name_en')],
      first_air_year: cols[header.indexOf('first_air_year')],
      old_slug: cols[header.indexOf('slug')]
    };

    series.push(row);
    
    if (testMode && series.length >= limit) break;
  }

  console.log(`✅ تم تحميل ${series.length.toLocaleString()} مسلسل\n`);
  
  // ترتيب ثابت
  series.sort((a, b) => parseInt(a.id) - parseInt(b.id));
  
  // معالجة في الذاكرة
  console.log('🔄 حساب slugs جديدة...\n');
  const usedSlugs = new Set();
  const updates = [];
  const unresolved = [];
  const examples = [];

  for (const s of series) {
    const newSlug = generateUniqueSlugInMemory(s.name_en, s.tmdb_id, usedSlugs);
    
    if (!newSlug) {
      unresolved.push({ id: s.id, tmdb_id: s.tmdb_id, name_en: s.name_en });
      continue;
    }
    
    usedSlugs.add(newSlug);
    updates.push({ id: s.id, newSlug, oldSlug: s.old_slug });
    
    if (testMode && examples.length < 10 && s.old_slug !== newSlug) {
      examples.push({ id: s.id, tmdb_id: s.tmdb_id, name_en: s.name_en, old: s.old_slug, new: newSlug });
    }
  }

  console.log('📊 النتائج:');
  console.log(`   ✅ تم الحساب: ${updates.length.toLocaleString()}`);
  console.log(`   ⚠️  غير محلول: ${unresolved.length.toLocaleString()}\n`);

  // فحص ASCII
  const asciiRegex = /^[a-z0-9-]+$/;
  const nonAscii = updates.filter(u => !asciiRegex.test(u.newSlug)).length;
  console.log(`🔍 فحص ASCII: ${nonAscii} slug فاشل (يجب 0)`);

  if (testMode) {
    console.log('\n📋 أمثلة (قبل/بعد):');
    examples.forEach((ex, i) => {
      console.log(`\n   ${i+1}. id=${ex.id}, tmdb_id=${ex.tmdb_id} - "${ex.name_en}"`);
      console.log(`      قبل: ${ex.old}`);
      console.log(`      بعد: ${ex.new}`);
    });
    
    console.log('\n' + '═'.repeat(70));
    console.log(`\n✅ النتيجة: ${nonAscii === 0 ? 'نجح' : 'فشل'} (slugs غير ASCII: ${nonAscii})`);
    return { success: nonAscii === 0, updates, unresolved };
  }

  // حفظ unresolved
  if (unresolved.length > 0) {
    fs.writeFileSync('unresolved-slugs.log', unresolved.map(u => `${u.id},${u.tmdb_id},${u.name_en}`).join('\n'));
    console.log(`\n📝 تم حفظ ${unresolved.length} slug غير محلول في unresolved-slugs.log`);
  }

  return { updates, unresolved, nonAscii };
}

async function applyUpdates(updates) {
  console.log('\n🚀 تطبيق التحديثات على Turso...\n');
  
  const BATCH_SIZE = 500;
  let applied = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (u) => {
      try {
        await turso.execute({
          sql: 'UPDATE tv_series SET slug = ? WHERE id = ?',
          args: [u.newSlug, u.id]
        });
        applied++;
      } catch (e) {
        // تجاهل
      }
    }));

    if ((i + BATCH_SIZE) % 5000 === 0 || i + BATCH_SIZE >= updates.length) {
      const progress = Math.min(i + BATCH_SIZE, updates.length);
      console.log(`   ${progress.toLocaleString()}/${updates.length.toLocaleString()} (${(progress/updates.length*100).toFixed(1)}%)`);
    }
  }

  console.log(`\n✅ تم التطبيق: ${applied.toLocaleString()}`);
}

// التنفيذ
const mode = process.argv[2] || 'test';

if (mode === 'full') {
  loadAndProcessSlugs(false).then(async ({ updates, unresolved, nonAscii }) => {
    if (nonAscii > 0) {
      console.log('\n❌ فشل: هناك slugs بحروف غير ASCII');
      process.exit(1);
    }
    
    await applyUpdates(updates);
    console.log('\n✅ اكتمل!');
    process.exit(0);
  }).catch(e => {
    console.error('❌ خطأ:', e.message);
    process.exit(1);
  });
} else {
  const limit = parseInt(process.argv[3]) || 100;
  loadAndProcessSlugs(true, limit).then(() => process.exit(0)).catch(e => {
    console.error('❌ خطأ:', e.message);
    process.exit(1);
  });
}
