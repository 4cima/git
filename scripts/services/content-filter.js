/**
 * 🛡️ ULTRA STRICT CONTENT FILTER
 * المحتوى المفلتر يتم وضع علامة عليه ولا يتم رفعه لـ Turso
 * 
 * ✅ التحسينات المطبقة:
 * 1. استثناء المحتوى المشهور والجيد (50+ تصويت + 6.0+ تقييم) من كل الفلاتر
 * 2. استثناء أفلام 2026 من فلترة الأصوات القليلة
 * 3. استثناء السياق الدرامي من فلترة الكلمات الخفيفة
 * 4. خفض حد التقييم من 5.0 إلى 4.0
 * 5. المحتوى الإباحي يُفلتر دائماً بغض النظر عن التصويتات
 */

const HARD_EXPLICIT = [
  /\bporn\b/i, /\bporno\b/i, /\bpornography\b/i, /\bxxx\b/i, /\bhentai\b/i, /\berotic\b/i,
  /\bsoftcore\b/i, /\bhardcore\b/i, /\badult film\b/i, /\bsex tape\b/i,
  /سكس/, /بورن/, /إباحي/, /اباحي/, /عاري/, /عارية/, /علاقة جنسية/
];

const MILD_EXPLICIT = [
  /\bsex\b/i, /\bsexy\b/i, /\bsexual\b/i, /\bnudity\b/i, /\bnude\b/i, /\bnaked\b/i,
  /\bstrip\b/i, /\bstripper\b/i, /\bprostitute\b/i, /\bbrothel\b/i
];

const SOFT_KEYWORDS = [
  'seduces', 'seduction', 'lust', 'temptation', 'intimate', 'sensual',
  'affair', 'mistress', 'cheating', 'forbidden love'
];

const ALLOWLIST_IDS = ['398', '1576', '369885', '1408', '37135', '37136'];

function shouldFilterContent(content) {
  // ⚠️ فحص المحتوى الإباحي أولاً - يُفلتر دائماً بغض النظر عن التصويتات
  if (content.adult === true) return true;
  
  const title = (content.title || content.name || '').toLowerCase();
  const overview = (content.overview || '').toLowerCase();
  const tmdbId = String(content.id || '');
  const voteCount = Number(content.vote_count || 0);
  const rating = Number(content.vote_average || 0);
  const releaseDate = content.release_date || content.first_air_date || '';
  const releaseYear = releaseDate ? parseInt(releaseDate.split('-')[0]) : 0;
  const primaryGenre = content.primary_genre || '';
  const isDocumentary = primaryGenre.includes('Documentary') || primaryGenre.includes('وثائقي');
  
  // ⚠️ فحص الكلمات الإباحية الصريحة - يُفلتر دائماً
  for (const regex of HARD_EXPLICIT) {
    if (regex.test(title) || regex.test(overview)) {
      if (regex.source.includes('xxx') && ALLOWLIST_IDS.includes(tmdbId)) continue;
      return true;
    }
  }
  
  // ✅ استثناء الأعمال المشهورة والجيدة: 50+ تصويت + تقييم 6.0+
  // هذه الأعمال لا تُفلتر حتى لو لم يكن لها بوستر أو overview
  // (باستثناء المحتوى الإباحي الذي تم فحصه أعلاه)
  const isPopularAndGood = voteCount >= 50 && rating >= 6.0;
  if (isPopularAndGood) return false;
  
  // ✅ استثناء أفلام 2026 من فلترة الأصوات القليلة
  const is2026Movie = releaseYear === 2026;
  
  // ⚠️ باقي فحوصات المحتوى الإباحي (MILD_EXPLICIT)
  // ✅ تحسين فلتر MILD_EXPLICIT - استثناء السياق الدرامي
  const hasDramaticContext = 
    overview.includes('drama') || 
    overview.includes('story') || 
    overview.includes('life') ||
    overview.includes('based on') ||
    overview.includes('true story');
  
  for (const regex of MILD_EXPLICIT) {
    // إذا كان السياق درامي والتقييم جيد (≥6.5)، لا تفلتر
    if (hasDramaticContext && rating >= 6.5) continue;
    
    if (regex.test(overview)) return true;
    if (regex.test(title) && !ALLOWLIST_IDS.includes(tmdbId)) return true;
  }
  
  const hasSoft = SOFT_KEYWORDS.some(k => title.includes(k) || overview.includes(k));
  if (hasSoft && rating < 6.0 && rating > 0) return true;
  
  // ✅ تم إلغاء فلترة low_votes تماماً
  
  // ✅ فلترة التقييم المنخفض: أقل من 4.0 فقط
  // المسلسلات بدون تقييم (0 أو NULL) تعدي
  if (rating > 0 && rating < 4.0) return true;
  
  // ✅ تم إلغاء فلترة no_poster للأعمال الجيدة (تم التحقق في البداية)
  if (!content.poster_path) return true;
  
  // ✅ تم إلغاء فلترة no_overview للأعمال الجيدة (تم التحقق في البداية)
  // السماح بالأعمال بدون overview إذا كان التقييم عالي
  // التقييم ≥ 6.0 وعدد الأصوات ≥ 10
  if (!overview || overview.trim().length < 10) {
    const hasGoodRating = rating >= 6.0 && voteCount >= 10;
    if (hasGoodRating) {
      return false; // لا تفلتر - العمل جيد رغم عدم وجود overview
    }
    return true; // فلتر - بدون overview وتقييم منخفض
  }
  
  return false;
}

function getFilterReason(content) {
  if (content.adult === true) return 'adult_flag';
  const title = (content.title || content.name || '').toLowerCase();
  const overview = (content.overview || '').toLowerCase();
  
  for (const regex of HARD_EXPLICIT) {
    const m = title.match(regex) || overview.match(regex);
    if (m) return `hard_explicit:${m[0]}`;
  }
  for (const regex of MILD_EXPLICIT) {
    if (regex.test(overview)) return `mild_in_overview`;
    if (regex.test(title)) return `mild_in_title`;
  }
  
  const rating = Number(content.vote_average || 0);
  const voteCount = Number(content.vote_count || 0);
  
  // ✅ تم إلغاء فلترة low_votes
  if (rating > 0 && rating < 4.0) return 'low_rating';
  if (!content.poster_path) return 'no_poster';
  
  // ✅ فلترة no_overview مع استثناء الأعمال ذات التقييم العالي
  if (!overview || overview.trim().length < 10) {
    const hasGoodRating = rating >= 6.0 && voteCount >= 10;
    if (!hasGoodRating) {
      return 'no_overview';
    }
  }
  
  return 'unknown';
}

module.exports = { shouldFilterContent, getFilterReason };
