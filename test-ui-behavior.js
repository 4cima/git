// Test what happens when page receives genre=action-adventure vs genre=action-&-adventure

// Simulate SeriesPageClient URL reading logic
const urlParams1 = new URLSearchParams('?genre=action-adventure');
const urlParams2 = new URLSearchParams('?genre=action-&-adventure');

console.log('\n=== Test 1: URL with "action-adventure" (no &) ===');
console.log('URLSearchParams.get("genre"):', urlParams1.get('genre'));

console.log('\n=== Test 2: URL with "action-&-adventure" (raw &) ===');
console.log('URLSearchParams.get("genre"):', urlParams2.get('genre'));
console.log('Note: Raw & in URL breaks parsing - gets split into two params');

console.log('\n=== Test 3: URL with "action-%26-adventure" (encoded) ===');
const urlParams3 = new URLSearchParams('?genre=action-%26-adventure');
console.log('URLSearchParams.get("genre"):', urlParams3.get('genre'));
console.log('Browser automatically decodes %26 to &');

// Now test the GENRES.find() lookup
const GENRES = [
  { name: 'أكشن ومغامرة', slug: 'action-&-adventure', emoji: '💥' },
  { name: 'خيال علمي وفانتازيا', slug: 'sci-fi-&-fantasy', emoji: '🚀' },
  { name: 'حرب وسياسة', slug: 'war-&-politics', emoji: '⚔️' }
];

console.log('\n=== Genre lookup test ===');
const slug1 = 'action-adventure';  // What user might type in URL
const slug2 = 'action-&-adventure'; // What's in database

const found1 = GENRES.find(g => g.slug === slug1);
const found2 = GENRES.find(g => g.slug === slug2);

console.log(`Lookup "${slug1}":`, found1 ? `✓ Found: ${found1.name}` : '✗ Not found');
console.log(`Lookup "${slug2}":`, found2 ? `✓ Found: ${found2.name}` : '✗ Not found');
