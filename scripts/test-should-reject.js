// scripts/tmp-test-should-reject.js — اختبار وحدة لبوابة shouldRejectWork (جولة السياسة)
// غير مستدعى من package.json — يمكن حذفه لاحقاً.
const { shouldRejectWork, isExplicitContent } = require('./services/content-filter')

let pass = 0, fail = 0
const failures = []
function check(name, got, expectReject, expectReason) {
  const ok = got.reject === expectReject && (!expectReason || got.reason === expectReason)
  if (ok) { pass++; console.log(`  ✅ ${name} → reject=${got.reject} reason=${got.reason}`) }
  else { fail++; failures.push(`${name} → got reject=${got.reject} reason=${got.reason} (متوقع reject=${expectReject} reason=${expectReason})`); console.log(`  ❌ ${name} → reject=${got.reject} reason=${got.reason} (متوقع reject=${expectReject} reason=${expectReason})`) }
}
const rd = (cert, descriptors) => ({ results: [{ iso_3166_1: 'US', release_dates: [{ certification: cert, descriptors: descriptors || [] }] }] })

const baseMovie = { id: 1, title: 'Test', release_date: '2001-05-05', release_year: 2001, vote_count: 100, runtime: 100, overview: 'A drama.' }
const baseTv = { id: 2, name: 'TestTV', first_air_date: '2010-01-01', first_air_year: 2010, vote_count: 100, overview: 'A drama.' }

console.log('— اختبارات جولة السياسة —')
check('فيلم 1999 نظيف', shouldRejectWork({ ...baseMovie, id: 11, release_year: 1999, release_date: '1999-01-01' }, { mediaType: 'movie', mode: 'ingest' }), true, 'year_pre_2000')
check('فيلم 2000 نظيف', shouldRejectWork({ ...baseMovie, id: 12 }, { mediaType: 'movie' }), false, null)
check('adult:true', shouldRejectWork({ ...baseMovie, id: 13, adult: true }, { mediaType: 'movie' }), true, 'tmdb_adult')
check('NC-17', shouldRejectWork({ ...baseMovie, id: 14, release_dates: rd('NC-17') }, { mediaType: 'movie' }), true, 'cert_18:NC-17(US)')
check('شهادة R فقط — لا رفض', shouldRejectWork({ ...baseMovie, id: 15, release_dates: rd('R') }, { mediaType: 'movie' }), false, null)
check('كلمة nudity فقط — لا رفض', shouldRejectWork({ ...baseMovie, id: 16, keywords: { keywords: [{ name: 'nudity' }] } }, { mediaType: 'movie' }), false, null)
check('كلمة pink film', shouldRejectWork({ ...baseMovie, id: 17, keywords: { keywords: [{ name: 'pink film' }] } }, { mediaType: 'movie' }), true, 'keyword_hard:pink film')
check('كلمة teen فقط — لا رفض', shouldRejectWork({ ...baseMovie, id: 18, keywords: { keywords: [{ name: 'teen' }] } }, { mediaType: 'movie' }), false, null)
check('تايتنك 597 (1997) بلا adult', shouldRejectWork({ id: 597, title: 'Titanic', release_year: 1997, release_date: '1997-12-19', vote_count: 20000, runtime: 194, overview: 'A love story aboard a ship.' }, { mediaType: 'movie' }), true, 'year_pre_2000')
check('ذيب وول ستريت 106646 (2013)', shouldRejectWork({ id: 106646, title: 'The Wolf of Wall Street', release_year: 2013, release_date: '2013-12-25', vote_count: 20000, runtime: 180, overview: 'A stockbroker rises and falls.' }, { mediaType: 'movie' }), false, null)
check('صراع العروش 1399 (2011)', shouldRejectWork({ id: 1399, name: 'Game of Thrones', first_air_year: 2011, first_air_date: '2011-04-17', vote_count: 20000, overview: 'Noble families fight for a throne.' }, { mediaType: 'tv' }), false, null)
check('جون ويك 245891 (2014)', shouldRejectWork({ id: 245891, title: 'John Wick', release_year: 2014, release_date: '2014-10-24', vote_count: 20000, runtime: 101, overview: 'A hitman seeks vengeance.' }, { mediaType: 'movie' }), false, null)
check('226674 المراهق (سنة 1979)', shouldRejectWork({ id: 226674, title: 'The Adolescent', release_year: 1979, release_date: '1979-01-24' }, { mediaType: 'movie' }), true, 'year_pre_2000')
check('226674 بسنة حديثة → manual_block', shouldRejectWork({ id: 226674, title: 'X', release_year: 2020, release_date: '2020-01-01' }, { mediaType: 'movie' }), true, 'manual_block')


console.log('— أبواب إضافية —')
check('جملة Strong Sexual Content', shouldRejectWork({ ...baseMovie, id: 31, release_dates: rd('PG-13', ['Strong Sexual Content']) }, { mediaType: 'movie' }), true, 'strong_sexual_content')
check('نفس الجملة عبر isExplicitContent → مراجعة لا حجب', (() => { const r = isExplicitContent({ ...baseMovie, id: 32, release_dates: rd('PG-13', ['Graphic Nudity']) }); return { reject: r.blocked, reason: r.reason } })(), false, null)
check('كلمة sex scene وحدها — لا رفض', shouldRejectWork({ ...baseMovie, id: 33, keywords: { keywords: [{ name: 'sex scene' }] } }, { mediaType: 'movie' }), false, null)
check('سكس في الوصف — لا رفض (جولة الإصلاح: حُذف نمط النقحرة سكس)', shouldRejectWork({ ...baseMovie, id: 34, overview: 'فيلم سكس كامل' }, { mediaType: 'movie' }), false, null)
check('nudity في الوصف وحده — لا رفض', shouldRejectWork({ ...baseMovie, id: 35, overview: 'Contains brief nudity in a dramatic context.' }, { mediaType: 'movie' }), false, null)
check('تاريخ فارغ', shouldRejectWork({ ...baseMovie, id: 36, release_date: '', release_year: null }, { mediaType: 'movie' }), true, 'empty_date')
check('studio vivamax', shouldRejectWork({ ...baseMovie, id: 37, production_companies: [{ name: 'Vivamax' }] }, { mediaType: 'movie' }), true, 'studio_hard:vivamax')
check('erotic على العنوان', shouldRejectWork({ ...baseMovie, id: 38, title: 'The Erotic Adventures' }, { mediaType: 'movie' }), true, 'erotic_genre')
check('erotic على الوصف وحده — لا رفض', shouldRejectWork({ ...baseMovie, id: 39, overview: 'An erotic thriller with dramatic tension.' }, { mediaType: 'movie' }), false, null)
check('purge يتجاهل no_runtime_low_votes', shouldRejectWork({ ...baseMovie, id: 40, runtime: null, vote_count: 5 }, { mediaType: 'movie', mode: 'purge' }), false, null)
check('ingest يطبق no_runtime_low_votes', shouldRejectWork({ ...baseMovie, id: 41, runtime: null, vote_count: 5 }, { mediaType: 'movie', mode: 'ingest' }), true, 'no_runtime_low_votes')
check('TV بلا runtime لا يُحجب', shouldRejectWork({ ...baseTv, id: 42 }, { mediaType: 'tv' }), false, null)
check('شهادة مخزنة X (age_rating)', shouldRejectWork({ ...baseMovie, id: 43, age_rating: 'X' }, { mediaType: 'movie' }), true, 'cert_18:X')
check('ALLOWLIST 398 يتخطى باب النص', shouldRejectWork({ ...baseMovie, id: 398, title: 'Movie xxx Title' }, { mediaType: 'movie' }), false, null)
check('teen مع سياق درامي — لا رفض (لا bulk)', shouldRejectWork({ ...baseMovie, id: 44, overview: 'A teen drama about growing up with romantic tension.' }, { mediaType: 'movie' }), false, null)


check('كلمة stripping وحدها — لا رفض (جولة الفجوات)', shouldRejectWork({ ...baseMovie, id: 45, keywords: { keywords: [{ name: 'stripping' }] } }, { mediaType: 'movie' }), false, null)

check('39688 فيلم (like-a-brother) → manual_block', shouldRejectWork({ ...baseMovie, id: 39688, title: 'Like a Brother', release_year: 2005, release_date: '2005-04-17' }, { mediaType: 'movie' }), true, 'manual_block')

check('39688 مسلسل (South Beach Tow 2011) — لا رفض (جولة الفجوات)', shouldRejectWork({ id: 39688, name: 'South Beach Tow', first_air_year: 2011, first_air_date: '2011-07-20', vote_count: 21, overview: 'A reality series about a towing company.' }, { mediaType: 'tv' }), false, null)



console.log('— اختبارات جولة الشهادات (cert_18) —')
const rdm = pairs => ({ results: pairs.map(([cc, cert]) => ({ iso_3166_1: cc, release_dates: [{ certification: cert, descriptors: [] }] })) })
check('نمط 106646: US=R + CZ=18+ — لا رفض', shouldRejectWork({ ...baseMovie, id: 50, release_dates: rdm([['US', 'R'], ['CZ', '18+']]) }, { mediaType: 'movie' }), false, null)
check('US=NC-17 → cert_18', shouldRejectWork({ ...baseMovie, id: 51, release_dates: rdm([['US', 'NC-17']]) }, { mediaType: 'movie' }), true, 'cert_18:NC-17(US)')
check('US=R فقط — لا رفض', shouldRejectWork({ ...baseMovie, id: 52, release_dates: rdm([['US', 'R']]) }, { mediaType: 'movie' }), false, null)
check('EG=18+ → cert_18', shouldRejectWork({ ...baseMovie, id: 53, release_dates: rdm([['EG', '18+']]) }, { mediaType: 'movie' }), true, 'cert_18:18+(EG)')
check('KR=청소년관람불가 → cert_18', shouldRejectWork({ ...baseMovie, id: 54, release_dates: rdm([['KR', '청소년관람불가']]) }, { mediaType: 'movie' }), true, 'cert_18:청소년관람불가(KR)')
check('CZ=18+ وحدها (دولة غير مفضلة) — لا رفض (النقطة 3)', shouldRejectWork({ ...baseMovie, id: 55, release_dates: rdm([['CZ', '18+']]) }, { mediaType: 'movie' }), false, null)
check('CZ=R18 → cert_18 (مسح صريح)', shouldRejectWork({ ...baseMovie, id: 56, release_dates: rdm([['CZ', 'R18']]) }, { mediaType: 'movie' }), true, 'cert_18:R18(CZ)')
check('US=TV-MA — لا رفض', shouldRejectWork({ ...baseMovie, id: 57, release_dates: rdm([['US', 'TV-MA']]) }, { mediaType: 'movie' }), false, null)
check('1399 صراع العروش (2011) — لا رفض (جولة الشهادات)', shouldRejectWork({ id: 1399, name: 'Game of Thrones', first_air_year: 2011, first_air_date: '2011-04-17', vote_count: 20000, overview: 'Noble families fight for a throne.' }, { mediaType: 'tv' }), false, null)
check('245891 جون ويك (2014) — لا رفض (جولة الشهادات)', shouldRejectWork({ id: 245891, title: 'John Wick', release_year: 2014, release_date: '2014-10-24', vote_count: 20000, runtime: 101, overview: 'A hitman seeks vengeance.' }, { mediaType: 'movie' }), false, null)

console.log('— اختبارات جولة إصلاح الإيجابيات الكاذبة (2026-09-09) —')
check('title_ar «هوية بورن» — لا رفض (نقحرة Bourne)', shouldRejectWork({ ...baseMovie, id: 60, title: 'هوية بورن' }, { mediaType: 'movie' }), false, null)
check('overview_ar فيها «سانبورن» و«أوزبورن» — لا رفض', shouldRejectWork({ ...baseMovie, id: 61, overview: 'هاري سانبورن مدير صناعة الموسيقى في لوس أنجلوس.' }, { mediaType: 'movie' }), false, null)
check('The Bourne Identity (title_en) — لا رفض', shouldRejectWork({ ...baseMovie, id: 2501, title: 'The Bourne Identity' }, { mediaType: 'movie' }), false, null)
check('overview_ar «الأنجلوسكسونية» — لا رفض', shouldRejectWork({ ...baseMovie, id: 62, overview: 'يكتشف أصول اللعنة الأنجلوسكسونية في إنجلترا.' }, { mediaType: 'movie' }), false, null)
check('title_ar «إباحي» → text_hard', shouldRejectWork({ ...baseMovie, id: 63, title: 'أفلام إباحية' }, { mediaType: 'movie' }), true, 'text_hard:إباحي')
check('age_rating=18+ مخزنة بلا release_dates — لا رفض (39 مسلسلاً)', shouldRejectWork({ ...baseTv, id: 17655, age_rating: '18+' }, { mediaType: 'tv' }), false, null)
check('age_rating=NC-17 مخزنة → cert_18', shouldRejectWork({ ...baseMovie, id: 64, age_rating: 'NC-17' }, { mediaType: 'movie' }), true, 'cert_18:NC-17')
check('age_rating=X مخزنة → cert_18 (قائم)', shouldRejectWork({ ...baseMovie, id: 43, age_rating: 'X' }, { mediaType: 'movie' }), true, 'cert_18:X')
check('US=R + CZ=18+ — لا رفض (اختبار قائم)', shouldRejectWork({ ...baseMovie, id: 50, release_dates: rdm([['US', 'R'], ['CZ', '18+']]) }, { mediaType: 'movie' }), false, null)
check('CZ=18+ وحدها — لا رفض (اختبار قائم)', shouldRejectWork({ ...baseMovie, id: 55, release_dates: rdm([['CZ', '18+']]) }, { mediaType: 'movie' }), false, null)
check('EG=18+ → cert_18 (اختبار قائم)', shouldRejectWork({ ...baseMovie, id: 53, release_dates: rdm([['EG', '18+']]) }, { mediaType: 'movie' }), true, 'cert_18:18+(EG)')
check('106646 ذيب وول ستريت — لا رفض', shouldRejectWork({ id: 106646, title: 'The Wolf of Wall Street', release_year: 2013, release_date: '2013-12-25', vote_count: 20000, runtime: 180, overview: 'A stockbroker rises and falls.' }, { mediaType: 'movie' }), false, null)
check('1399 صراع العروش — لا رفض', shouldRejectWork({ id: 1399, name: 'Game of Thrones', first_air_year: 2011, first_air_date: '2011-04-17', vote_count: 20000, overview: 'Noble families fight for a throne.' }, { mediaType: 'tv' }), false, null)
check('245891 جون ويك — لا رفض', shouldRejectWork({ id: 245891, title: 'John Wick', release_year: 2014, release_date: '2014-10-24', vote_count: 20000, runtime: 101, overview: 'A hitman seeks vengeance.' }, { mediaType: 'movie' }), false, null)
check('2502 سيادة بورن — لا رفض', shouldRejectWork({ id: 2502, title: 'The Bourne Supremacy', release_year: 2004, release_date: '2004-07-23', vote_count: 8000, runtime: 108, overview: 'جيسون بورن يخرج من مخبئه.' }, { mediaType: 'movie' }), false, null)
check('75656 Now You See Me — لا رفض', shouldRejectWork({ id: 75656, title: 'Now You See Me', release_year: 2013, release_date: '2013-05-31', vote_count: 15000, runtime: 115, overview: 'ميريت أوزبورن عاطل يصبح ساحراً.' }, { mediaType: 'movie' }), false, null)
check('38700 Bad Boys for Life — لا رفض', shouldRejectWork({ id: 38700, title: 'Bad Boys for Life', release_year: 2020, release_date: '2020-01-17', vote_count: 9000, runtime: 124, overview: 'ماركوس بورنيت يعود للعمل.' }, { mediaType: 'movie' }), false, null)
check('94997 House of the Dragon — لا رفض', shouldRejectWork({ id: 94997, name: 'House of the Dragon', first_air_year: 2022, first_air_date: '2022-08-21', vote_count: 5000, overview: 'Targaryen civil war.' }, { mediaType: 'tv' }), false, null)
check('4614 NCIS — لا رفض', shouldRejectWork({ id: 4614, name: 'NCIS', first_air_year: 2003, first_air_date: '2003-09-23', vote_count: 3000, overview: 'Naval criminal investigators.' }, { mediaType: 'tv' }), false, null)

console.log('— اختبارات تضييق erotic على TV (2026-09-09) —')
check('TV keywords=[erotic] فقط — لا رفض', shouldRejectWork({ ...baseTv, id: 71, keywords: { results: [{ name: 'erotic' }] } }, { mediaType: 'tv' }), false, null)
check('movie keywords=[erotic] → erotic_genre', shouldRejectWork({ ...baseMovie, id: 72, keywords: { keywords: [{ name: 'erotic' }] } }, { mediaType: 'movie' }), true, 'erotic_genre')
check('TV keywords=[hentai] → keyword_hard', shouldRejectWork({ ...baseTv, id: 73, keywords: { results: [{ name: 'hentai' }] } }, { mediaType: 'tv' }), true, 'keyword_hard:hentai')
check('TV keywords=[erotica] → erotic_genre (يبقى للنوعين)', shouldRejectWork({ ...baseTv, id: 74, keywords: { results: [{ name: 'erotica' }] } }, { mediaType: 'tv' }), true, 'erotic_genre')
check('TV keywords=[erotic movie] → erotic_genre (يبقى للنوعين)', shouldRejectWork({ ...baseTv, id: 75, keywords: { results: [{ name: 'erotic movie' }] } }, { mediaType: 'tv' }), true, 'erotic_genre')
check('94664 موشوكو تينسي كما من المرحلة 2 (erotic) — لا رفض', shouldRejectWork({ id: 94664, name: 'Mushoku Tensei: Jobless Reincarnation', first_air_year: 2021, first_air_date: '2021-01-11', vote_count: 5000, overview: 'A jobless man is reborn in a fantasy world.', keywords: { results: [{ name: 'erotic' }] } }, { mediaType: 'tv' }), false, null)
check('123249 My Dress-Up Darling كما من المرحلة 2 (erotic) — لا رفض', shouldRejectWork({ id: 123249, name: 'My Dress-Up Darling', first_air_year: 2022, first_air_date: '2022-01-09', vote_count: 4000, overview: 'A girl loves cosplaying.', keywords: { results: [{ name: 'erotic' }] } }, { mediaType: 'tv' }), false, null)
check('TV keywords=[erotic + hentai] → رفض (تسمية erotic_genre كالأصل: الكلمة العائلية حاضرة)', shouldRejectWork({ ...baseTv, id: 76, keywords: { results: [{ name: 'erotic' }, { name: 'hentai' }] } }, { mediaType: 'tv' }), true, 'erotic_genre')

console.log('— اختبارات استرجاع 2026-09-09 (allowlist المرحلة 6) —')
check('910571 Fair Play في allowlist — لا يُرفض (كان erotic_genre)', shouldRejectWork({ id: 910571, title: 'Fair Play', release_year: 2023, release_date: '2023-09-29', vote_count: 644, runtime: 113, overview: 'A drama.', keywords: { keywords: [{ name: 'erotic' }] } }, { mediaType: 'movie' }), false, null)
check('32766 TV في allowlist — لا يُرفض (كان text_hard:إباحي)', shouldRejectWork({ id: 32766, name: 'مصور إباحي', first_air_year: 2010, first_air_date: '2010-01-01', vote_count: 100, overview: 'دراما.' }, { mediaType: 'tv' }), false, null)
check('مصور إباحي بلا allowlist → يُرفض (حرس أن الرفض ما زال يعمل لغير القائمة)', shouldRejectWork({ ...baseTv, id: 777001, name: 'مصور إباحي' }, { mediaType: 'tv' }), true, 'text_hard:إباحي')

console.log('— اختبارات جولة keywords المخزّنة (2026-09-09) —')
check('فيلم بكلمات مخزّنة hentai → keyword_hard', shouldRejectWork({ ...baseMovie, id: 81, keywords: { keywords: [{ id: 1, name: 'hentai' }] } }, { mediaType: 'movie' }), true, 'keyword_hard:hentai')
check('فيلم بكلمات مخزّنة sex scene فقط — لا رفض', shouldRejectWork({ ...baseMovie, id: 82, keywords: { keywords: [{ id: 2, name: 'sex scene' }] } }, { mediaType: 'movie' }), false, null)

console.log(`\nالنتيجة: ${pass} نجاح / ${fail} فشل`)
if (fail > 0) require('fs').writeFileSync(__dirname + '/tmp-test-failures.txt', failures.join('\n'), 'utf8')
process.exit(fail > 0 ? 1 : 0)

