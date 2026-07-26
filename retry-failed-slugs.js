require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// الـ IDs اللي فشلت (من output السابق)
const FAILED_IDS = [
  302138, 438815, 438808, 438799, 438798, 438794, 438790, 438789, 438762, 438747,
  438740, 438738, 438736, 438734, 438731, 438703, 438695, 438689, 438679, 438674,
  438673, 732704, 733193, 733156, 733123, 733116, 732742, 733094, 733073, 733052,
  733032, 733004, 733006, 733010, 732707, 732713, 732993, 732869, 732933, 733205,
  732818
];

console.log('🔄 إعادة محاولة إصلاح الـ slugs الفاشلة\n');
console.log('═'.repeat(70));
console.log(`📊 العدد: ${FAILED_IDS.length} فيلم\n`);

function toSlug(text) {
  if (!text) return 'unknown';
  return text.toString().toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function retrySlugFix(id, attempt = 1) {
  try {
    // جلب البيانات
    const result = await turso.execute({
      sql: 'SELECT id, tmdb_id, title_en FROM movies WHERE id = ?',
      args: [id]
    });
    
    if (result.rows.length === 0) {
      return { success: false, reason: 'not_found', attempt };
    }
    
    const movie = result.rows[0];
    const expectedSlug = `${toSlug(movie.title_en)}-${movie.tmdb_id}`;
    
    // تحديث
    await turso.execute({
      sql: 'UPDATE movies SET slug = ? WHERE id = ?',
      args: [expectedSlug, id]
    });
    
    return { success: true, id, tmdb_id: movie.tmdb_id, slug: expectedSlug, attempt };
  } catch (e) {
    if (attempt < 3) {
      // إعادة المحاولة بعد تأخير
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      return retrySlugFix(id, attempt + 1);
    }
    return { success: false, id, reason: e.message, attempt };
  }
}

async function main() {
  let success = 0;
  let failed = 0;
  const failures = [];
  
  console.log('🚀 بدء المحاولات (بحد أقصى 3 محاولات لكل فيلم)...\n');
  
  // معالجة بدفعات صغيرة لتجنب الضغط
  const BATCH_SIZE = 5;
  for (let i = 0; i < FAILED_IDS.length; i += BATCH_SIZE) {
    const batch = FAILED_IDS.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.all(batch.map(id => retrySlugFix(id)));
    
    results.forEach(result => {
      if (result.success) {
        success++;
        console.log(`✅ id=${result.id}, tmdb_id=${result.tmdb_id}, slug=${result.slug} (محاولة ${result.attempt})`);
      } else {
        failed++;
        failures.push(result);
        console.log(`❌ id=${result.id}: ${result.reason} (بعد ${result.attempt} محاولات)`);
      }
    });
    
    // تأخير بين الدفعات
    if (i + BATCH_SIZE < FAILED_IDS.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 النتائج:');
  console.log(`   ✅ نجح: ${success}/${FAILED_IDS.length}`);
  console.log(`   ❌ فشل: ${failed}/${FAILED_IDS.length}`);
  
  if (failures.length > 0) {
    console.log('\n❌ الفشل المتكرر:');
    failures.forEach(f => {
      console.log(`   id=${f.id}: ${f.reason}`);
    });
    
    console.log('\n💡 التحليل:');
    const reasons = {};
    failures.forEach(f => {
      reasons[f.reason] = (reasons[f.reason] || 0) + 1;
    });
    Object.keys(reasons).forEach(reason => {
      console.log(`   - ${reason}: ${reasons[reason]} حالة`);
    });
  }
  
  console.log('═'.repeat(70));
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('❌ خطأ:', e.message);
  process.exit(1);
});
