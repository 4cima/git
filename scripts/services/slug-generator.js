/**
 * Slug Generator - Atomic & Safe
 * Must be called inside db.transaction()
 */

function toSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function generateUniqueSlug(db, titleEn, releaseYear, genre, table) {
  const base = toSlug(titleEn || 'untitled')
  
  const candidates = [
    base,
    releaseYear ? `${base}-${releaseYear}` : null,
    releaseYear && genre ? `${base}-${releaseYear}-${toSlug(genre)}` : null,
  ].filter(Boolean)
  
  // إضافة fallbacks بأرقام
  for (let i = 2; i <= 10; i++) {
    candidates.push(releaseYear 
      ? `${base}-${releaseYear}-${i}`
      : `${base}-${i}`
    )
  }
  
  const checkStmt = db.prepare(`SELECT tmdb_id FROM ${table} WHERE slug = ?`)
  
  for (const candidate of candidates) {
    if (!checkStmt.get(candidate)) {
      return candidate
    }
  }
  
  // آخر حل لو كل الـ candidates محجوزة
  return `${base}-${Date.now()}`
}

module.exports = { generateUniqueSlug }
