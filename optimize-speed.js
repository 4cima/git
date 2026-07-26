require('dotenv').config({ path: '.env.local' });
const db = require('./scripts/services/local-db');

console.log('📊 تحليل السرعة واقتراحات التحسين\n');
console.log('═'.repeat(70));

// حساب السرعة الحالية
const stats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN is_complete = 1 THEN 1 END) as complete,
    COUNT(CASE WHEN updated_at >= datetime('now', '-10 minutes') THEN 1 END) as recent
  FROM movies
`).get();

console.log('🎬 الأفلام:');
console.log(`   إجمالي: ${stats.total.toLocaleString()}`);
console.log(`   مكتمل: ${stats.complete.toLocaleString()}`);
console.log(`   آخر 10 دقائق: ${stats.recent}`);
console.log(`   السرعة الحالية: ~${stats.recent} فيلم/10 دقائق = ${Math.round(stats.recent / 10)} فيلم/دقيقة`);

const remaining = stats.total - stats.complete;
const currentRate = stats.recent / 10;
const hoursAtCurrentRate = currentRate > 0 ? (remaining / currentRate / 60).toFixed(1) : '∞';

console.log(`   المتبقي: ${remaining.toLocaleString()}`);
console.log(`   الوقت المتوقع: ${hoursAtCurrentRate} ساعة (~${(hoursAtCurrentRate / 24).toFixed(1)} يوم)`);

console.log('\n' + '═'.repeat(70));
console.log('💡 خيارات التسريع:\n');

console.log('1️⃣  زيادة CONCURRENCY للأفلام');
console.log('   الحالي: 38');
console.log('   المقترح: 45-50 (إذا لم تكن هناك rate limits)');
console.log('   التوفير: ~20% أسرع');
console.log('   الأمر: تعديل CONCURRENCY في INGEST-MOVIES-LOGIC.js');

console.log('\n2️⃣  استخدام مفاتيح TMDB متعددة');
console.log('   الحالي: مفتاح واحد');
console.log('   المقترح: 2-3 مفاتيح مختلفة');
console.log('   التوفير: 2-3x أسرع');
console.log('   الطريقة: تشغيل نسخ متعددة من السكريبت بمفاتيح مختلفة');

console.log('\n3️⃣  تقسيم العمل على أجهزة متعددة');
console.log('   الحالي: جهاز واحد');
console.log('   المقترح: 2-3 أجهزة');
console.log('   التوفير: 2-3x أسرع');
console.log('   الطريقة: تقسيم نطاقات الـ id');

console.log('\n4️⃣  إعطاء أولوية للمحتوى الحديث');
console.log('   تركيز على:');
console.log('   - أفلام 2020+ (أحدث)');
console.log('   - تقييم أعلى من 7');
console.log('   - الأكثر شعبية');
console.log('   الفائدة: مزامنة محتوى نوعي أولاً');

console.log('\n5️⃣  تخطي الأفلام القديمة جداً');
console.log('   - قبل 1970 (محدودة الاهتمام)');
console.log('   - تقييم أقل من 4');
console.log('   - بدون بوستر');
console.log('   التوفير: ~10-15% من الوقت');

console.log('\n' + '═'.repeat(70));
console.log('❓ أي خيار تفضل؟');
