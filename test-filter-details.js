/**
 * اختبار getFilterDetails() على حالات معروفة
 * بدون أي DB write أو TMDB API calls
 */

const { getFilterDetails } = require('./scripts/services/content-filter.js')

console.log('═══════════════════════════════════════════════════')
console.log('🧪 اختبار getFilterDetails() على حالات معروفة')
console.log('═══════════════════════════════════════════════════\n')

// ═══════════════════════════════════════════════════════════
// Test Cases
// ═══════════════════════════════════════════════════════════

const testCases = [
  {
    name: 'Taxi Driver',
    expected: { blocked: true, needsReview: false, reason: 'keyword_hard:pornography' },
    movie: {
      id: 103,
      title: 'Taxi Driver',
      overview: 'A mentally unstable veteran works as a nighttime taxi driver...',
      adult: false,
      vote_average: 8.2,
      keywords: {
        keywords: [
          { id: 1, name: 'new york city' },
          { id: 2, name: 'pornography' },  // ← keyword_hard
          { id: 3, name: 'vietnam veteran' }
        ]
      },
      release_dates: {
        results: [
          {
            iso_3166_1: 'US',
            release_dates: [{ certification: 'R' }]
          }
        ]
      },
      credits: { cast: [{ name: 'Robert De Niro' }] },
      genres: [{ name: 'Drama' }]
    }
  },
  {
    name: 'The Big Lebowski',
    expected: { blocked: true, needsReview: false, reason: 'text_hard:\\badult film\\b' },
    movie: {
      id: 115,
      title: 'The Big Lebowski',
      overview: 'This adult film follows Jeff "The Dude" Lebowski...',  // ← text_hard
      adult: false,
      vote_average: 7.8,
      keywords: { keywords: [] },
      release_dates: {
        results: [
          {
            iso_3166_1: 'US',
            release_dates: [{ certification: 'R' }]
          }
        ]
      },
      credits: { cast: [{ name: 'Jeff Bridges' }] },
      genres: [{ name: 'Comedy' }]
    }
  },
  {
    name: 'Unforgiven',
    expected: { blocked: true, needsReview: true, reason: 'text_mild_overview:\\bprostitute\\b' },
    movie: {
      id: 33,
      title: 'Unforgiven',
      overview: 'When a prostitute is disfigured by a pair of cowboys...',  // ← text_mild_overview
      adult: false,
      vote_average: 7.9,
      keywords: { keywords: [] },
      release_dates: {
        results: [
          {
            iso_3166_1: 'US',
            release_dates: [{ certification: 'R' }]
          }
        ]
      },
      credits: { cast: [{ name: 'Clint Eastwood' }] },
      genres: [{ name: 'Western' }]
    }
  },
  {
    name: 'Princess Mononoke',
    expected: { blocked: true, needsReview: true, reason: 'descriptor_hard:violence,sexual content(BR)' },
    movie: {
      id: 128,
      title: 'Princess Mononoke',
      overview: 'Ashitaka, a prince of the disappearing Emishi people...',
      adult: false,
      vote_average: 8.3,
      keywords: { keywords: [] },
      release_dates: {
        results: [
          {
            iso_3166_1: 'BR',
            release_dates: [{
              certification: '14',
              descriptors: ['violence', 'sexual content']  // ← descriptor_hard
            }]
          }
        ]
      },
      credits: { cast: [{ name: 'Yōji Matsuda' }] },
      genres: [{ name: 'Animation' }]
    }
  },
  {
    name: 'Brokeback Mountain',
    expected: { blocked: true, needsReview: true, reason: 'text_mild_overview:\\bsexual\\b' },
    movie: {
      id: 142,
      title: 'Brokeback Mountain',
      overview: 'Two modern-day cowboys meet on a shepherding job... their sexual relationship...',  // ← text_mild_overview
      adult: false,
      vote_average: 7.8,
      keywords: { keywords: [] },
      release_dates: {
        results: [
          {
            iso_3166_1: 'US',
            release_dates: [{ certification: 'R' }]
          }
        ]
      },
      credits: { cast: [{ name: 'Heath Ledger' }] },
      genres: [{ name: 'Drama' }]
    }
  },
  {
    name: 'Breaking the Waves',
    expected: { blocked: true, needsReview: true, reason: 'text_mild_overview:\\bsex\\b' },
    movie: {
      id: 145,
      title: 'Breaking the Waves',
      overview: 'In a small and conservative Scottish village, a woman\'s sex life...',  // ← text_mild_overview
      adult: false,
      vote_average: 7.5,
      keywords: { keywords: [] },
      release_dates: {
        results: [
          {
            iso_3166_1: 'US',
            release_dates: [{ certification: 'R' }]
          }
        ]
      },
      credits: { cast: [{ name: 'Emily Watson' }] },
      genres: [{ name: 'Drama' }]
    }
  },
  {
    name: 'Clean Movie (The Shawshank Redemption)',
    expected: { blocked: false, needsReview: false, reason: null },
    movie: {
      id: 278,
      title: 'The Shawshank Redemption',
      overview: 'Framed in the 1940s for the double murder of his wife...',
      adult: false,
      vote_average: 8.7,
      poster_path: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
      keywords: { keywords: [{ name: 'prison' }, { name: 'friendship' }] },
      release_dates: {
        results: [
          {
            iso_3166_1: 'US',
            release_dates: [{ certification: 'R' }]
          }
        ]
      },
      credits: { cast: [{ name: 'Tim Robbins' }] },
      genres: [{ name: 'Drama' }]
    }
  },
  {
    name: 'Quality Blocked (No Poster)',
    expected: { blocked: true, needsReview: false, reason: 'no_poster' },
    movie: {
      id: 999999,
      title: 'Test Movie Without Poster',
      overview: 'A test movie with good rating but no poster.',
      adult: false,
      vote_average: 7.5,
      poster_path: null,  // ← no_poster
      keywords: { keywords: [] },
      release_dates: {
        results: [
          {
            iso_3166_1: 'US',
            release_dates: [{ certification: 'PG-13' }]
          }
        ]
      },
      credits: { cast: [{ name: 'Test Actor' }] },
      genres: [{ name: 'Drama' }]
    }
  }
]

// ═══════════════════════════════════════════════════════════
// Run Tests
// ═══════════════════════════════════════════════════════════

let passed = 0
let failed = 0

testCases.forEach((test, index) => {
  console.log(`─────────────────────────────────────────────────`)
  console.log(`${index + 1}️⃣  ${test.name}`)
  console.log(`─────────────────────────────────────────────────`)
  
  const result = getFilterDetails(test.movie)
  
  console.log(`📋 المتوقع:`)
  console.log(`   blocked: ${test.expected.blocked}`)
  console.log(`   needsReview: ${test.expected.needsReview}`)
  console.log(`   reason: ${test.expected.reason}`)
  
  console.log(`\n📋 النتيجة الفعلية:`)
  console.log(`   blocked: ${result.blocked}`)
  console.log(`   needsReview: ${result.needsReview}`)
  console.log(`   reason: ${result.reason}`)
  console.log(`   type: ${result.type}`)
  
  const isBlocked = result.blocked === test.expected.blocked
  const isNeedsReview = result.needsReview === test.expected.needsReview
  const isReason = result.reason === test.expected.reason
  
  if (isBlocked && isNeedsReview && isReason) {
    console.log(`\n✅ نجح الاختبار`)
    passed++
  } else {
    console.log(`\n❌ فشل الاختبار`)
    if (!isBlocked) console.log(`   ⚠️  blocked: متوقع ${test.expected.blocked}، لكن النتيجة ${result.blocked}`)
    if (!isNeedsReview) console.log(`   ⚠️  needsReview: متوقع ${test.expected.needsReview}، لكن النتيجة ${result.needsReview}`)
    if (!isReason) console.log(`   ⚠️  reason: متوقع "${test.expected.reason}"، لكن النتيجة "${result.reason}"`)
    failed++
  }
  
  console.log()
})

console.log(`═══════════════════════════════════════════════════`)
console.log(`📊 ملخص النتائج:`)
console.log(`═══════════════════════════════════════════════════`)
console.log(`✅ نجح: ${passed}/${testCases.length}`)
console.log(`❌ فشل: ${failed}/${testCases.length}`)

if (failed === 0) {
  console.log(`\n🎉 كل الاختبارات نجحت — الكود جاهز للتشغيل الفعلي`)
} else {
  console.log(`\n⚠️  فيه اختبارات فشلت — يجب المراجعة قبل التشغيل الفعلي`)
}

console.log(`═══════════════════════════════════════════════════\n`)
