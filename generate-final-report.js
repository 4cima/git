import { readFileSync, writeFileSync } from 'fs'

// Load all phase results
const phase1 = JSON.parse(readFileSync('phase1-results.json', 'utf-8'))
const phase2 = JSON.parse(readFileSync('phase2-results.json', 'utf-8'))

const allResults = [...phase1, ...phase2]

console.log('📊 COMPREHENSIVE FILTER AUDIT - FINAL REPORT')
console.log('='.repeat(120))
console.log('\n')

// Group by severity
const fast = allResults.filter(r => r.severity === 'FAST')
const slow = allResults.filter(r => r.severity === 'SLOW')
const critical = allResults.filter(r => r.severity === 'CRITICAL')

console.log('📈 SUMMARY BY SEVERITY:')
console.log(`   ✅ FAST (<2s): ${fast.length} tests`)
console.log(`   ⚠️  SLOW (2-10s): ${slow.length} tests`)
console.log(`   🚨 CRITICAL (>10s): ${critical.length} tests\n`)

// Full table
console.log('='.repeat(120))
console.log('COMPLETE RESULTS TABLE')
console.log('='.repeat(120))
console.log(padRight('Type', 10) + padRight('Test', 45) + padRight('Sort', 25) + padRight('Timings (ms)', 35) + 'Severity')
console.log('='.repeat(120))

for (const r of allResults) {
  const timings = `${r.timings[0]}, ${r.timings[1]}, ${r.timings[2]} (avg: ${r.avg.toFixed(0)})`
  console.log(
    padRight(r.type, 10) +
    padRight(r.test.substring(0, 43), 45) +
    padRight(r.sort.substring(0, 23), 25) +
    padRight(timings.substring(0, 33), 35) +
    r.severity
  )
}

console.log('='.repeat(120))
console.log('\n')

// Problems identified
console.log('🔍 PROBLEMS IDENTIFIED:\n')

console.log('1. CRITICAL ISSUES (>10s):')
for (const r of critical) {
  console.log(`   • ${r.type.toUpperCase()} - ${r.test}`)
  console.log(`     Sort: ${r.sort}`)
  console.log(`     Timing: ${r.avg.toFixed(0)}ms avg`)
  console.log(`     Issue: ${r.explain.includes('USE TEMP B-TREE') ? 'Missing sort index (TEMP B-TREE)' : 'Full table scan'}`)
  console.log()
}

console.log('2. SLOW ISSUES (2-10s):')
for (const r of slow) {
  console.log(`   • ${r.type.toUpperCase()} - ${r.test}`)
  console.log(`     Sort: ${r.sort}`)
  console.log(`     Timing: ${r.avg.toFixed(0)}ms avg`)
  console.log(`     Issue: ${r.explain.includes('USE TEMP B-TREE') ? 'Missing sort index (TEMP B-TREE)' : r.explain.includes('SCAN') ? 'Table/Index scan' : 'Unknown'}`)
  console.log()
}

console.log('\n')
console.log('='.repeat(120))
console.log('PROPOSED INDEX SOLUTIONS')
console.log('='.repeat(120))
console.log('\n')

// Analyze patterns
const yearRangeProblems = allResults.filter(r => 
  r.filters.includes('year=') &&
  (r.filters.includes('-') || r.filters === 'year=before-1990') &&
  r.explain.includes('USE TEMP B-TREE')
)

const exactYearProblems = allResults.filter(r =>
  r.filters.match(/year=\d{4}$/) &&
  r.explain.includes('USE TEMP B-TREE')
)

const voteAverageProblems = allResults.filter(r =>
  r.sort.includes('vote_average') &&
  r.explain.includes('USE TEMP B-TREE')
)

const voteCountProblems = allResults.filter(r =>
  r.sort.includes('vote_count') &&
  r.explain.includes('USE TEMP B-TREE')
)

console.log('INDEX RECOMMENDATIONS:\n')

let indexNumber = 1

if (yearRangeProblems.length > 0) {
  console.log(`${indexNumber}. Composite Index for Year Range + Popularity Sort`)
  console.log(`   CREATE INDEX idx_movies_year_popularity ON movies(release_year, popularity DESC);`)
  console.log(`   CREATE INDEX idx_series_year_popularity ON tv_series(first_air_year, popularity DESC);`)
  console.log(`   Fixes: ${yearRangeProblems.length} tests`)
  console.log(`   Examples: Year decade filters (1990s, 2000s) with popularity sort`)
  console.log(`   Impact: Will eliminate TEMP B-TREE for year-filtered queries`)
  console.log()
  indexNumber++
}

if (exactYearProblems.length > 0) {
  console.log(`${indexNumber}. Note: Exact year filters also affected by #1`)
  console.log(`   Same composite index (year, popularity) covers both range and exact year`)
  console.log(`   Fixes: ${exactYearProblems.length} additional tests`)
  console.log()
  indexNumber++
}

if (voteAverageProblems.length > 0) {
  console.log(`${indexNumber}. Index for vote_average Sort (No Filters)`)
  console.log(`   CREATE INDEX idx_movies_vote_average_desc ON movies(vote_average DESC, popularity DESC);`)
  console.log(`   CREATE INDEX idx_series_vote_average_desc ON tv_series(vote_average DESC, popularity DESC);`)
  console.log(`   Fixes: ${voteAverageProblems.length} tests`)
  console.log(`   Impact: "الأعلى تقييماً" sort will be fast`)
  console.log(`   Note: Includes popularity as tiebreaker`)
  console.log()
  indexNumber++
}

if (voteCountProblems.length > 0) {
  console.log(`${indexNumber}. Index for vote_count Sort (No Filters)`)
  console.log(`   CREATE INDEX idx_movies_vote_count_desc ON movies(vote_count DESC, popularity DESC);`)
  console.log(`   CREATE INDEX idx_series_vote_count_desc ON tv_series(vote_count DESC, popularity DESC);`)
  console.log(`   Fixes: ${voteCountProblems.length} tests`)
  console.log(`   Impact: "الأكثر تقييماً" sort will be fast`)
  console.log()
  indexNumber++
}

console.log('\n')
console.log('='.repeat(120))
console.log('ESTIMATED IMPACT')
console.log('='.repeat(120))
console.log('\n')

const totalProblems = slow.length + critical.length
const totalPotentialFix = yearRangeProblems.length + exactYearProblems.length + voteAverageProblems.length + voteCountProblems.length

console.log(`Total problematic queries: ${totalProblems}`)
console.log(`Queries that will be fixed by proposed indexes: ${totalPotentialFix}`)
console.log(`Coverage: ${((totalPotentialFix / totalProblems) * 100).toFixed(1)}%`)
console.log()
console.log('Expected improvements:')
console.log('  • Year range filters (1990s, 2000s): 10s → <2s (80-90% faster)')
console.log('  • Exact year filters (2024, 2023, etc.): 3-4s → <1s (70-80% faster)')
console.log('  • vote_average sort: 39s → <2s (95% faster)')
console.log('  • vote_count sort: 29s → <2s (93% faster)')

console.log('\n')
console.log('💾 Full report saved to: COMPREHENSIVE-AUDIT-REPORT.md')

// Generate markdown report
let markdown = `# Comprehensive Filter Audit Report\n\n`
markdown += `Generated: ${new Date().toISOString()}\n\n`
markdown += `## Summary\n\n`
markdown += `- Total tests: ${allResults.length}\n`
markdown += `- FAST (<2s): ${fast.length}\n`
markdown += `- SLOW (2-10s): ${slow.length}\n`
markdown += `- CRITICAL (>10s): ${critical.length}\n\n`

markdown += `## Complete Results\n\n`
markdown += `| Type | Test | Sort | Timing 1 | Timing 2 | Timing 3 | Avg | Severity |\n`
markdown += `|------|------|------|----------|----------|----------|-----|----------|\n`
for (const r of allResults) {
  markdown += `| ${r.type} | ${r.test} | ${r.sort} | ${r.timings[0]}ms | ${r.timings[1]}ms | ${r.timings[2]}ms | ${r.avg.toFixed(0)}ms | ${r.severity} |\n`
}

markdown += `\n## Problems by Severity\n\n`
markdown += `### CRITICAL (>10s)\n\n`
for (const r of critical) {
  markdown += `**${r.type.toUpperCase()} - ${r.test}**\n`
  markdown += `- Sort: ${r.sort}\n`
  markdown += `- Avg timing: ${r.avg.toFixed(0)}ms\n`
  markdown += `- EXPLAIN: \`\`\`\n${r.explain}\n\`\`\`\n\n`
}

markdown += `### SLOW (2-10s)\n\n`
for (const r of slow) {
  markdown += `**${r.type.toUpperCase()} - ${r.test}**\n`
  markdown += `- Sort: ${r.sort}\n`
  markdown += `- Avg timing: ${r.avg.toFixed(0)}ms\n`
  markdown += `- EXPLAIN: \`\`\`\n${r.explain}\n\`\`\`\n\n`
}

writeFileSync('COMPREHENSIVE-AUDIT-REPORT.md', markdown)

function padRight(str, width) {
  return (str + ' '.repeat(width)).substring(0, width)
}

console.log('\n✅ Report generation complete!')
