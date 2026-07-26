const Database = require('better-sqlite3')
const db = new Database('./data/4cima-local.db')

console.log('\n🔧 إضافة الجداول الناقصة...\n')

// جدول people
db.exec(`
CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name_ar TEXT,
  name_en TEXT NOT NULL,
  biography_ar TEXT,
  biography_en TEXT,
  profile_path TEXT,
  gender INTEGER,
  known_for_department TEXT DEFAULT 'Acting',
  birthday TEXT,
  place_of_birth TEXT,
  popularity REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  synced_to_turso INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
)
`)
console.log('  ✓ people')

// جدول cast_crew
db.exec(`
CREATE TABLE IF NOT EXISTS cast_crew (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  person_id INTEGER NOT NULL,
  role_type TEXT NOT NULL,
  character_name TEXT,
  cast_order INTEGER DEFAULT 0,
  job TEXT,
  department TEXT,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
  UNIQUE(content_id, content_type, person_id, role_type)
)
`)
console.log('  ✓ cast_crew')

// عمود seo_title_en
try {
  db.exec('ALTER TABLE movies ADD COLUMN seo_title_en TEXT')
  console.log('  ✓ seo_title_en')
} catch (e) {
  console.log('  ✓ seo_title_en (موجود)')
}

// indexes
db.exec(`
CREATE INDEX IF NOT EXISTS idx_people_tmdb ON people(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_cast_crew_content ON cast_crew(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_cast_crew_person ON cast_crew(person_id);
`)
console.log('  ✓ indexes')

db.close()
console.log('\n✅ تم بنجاح!\n')
