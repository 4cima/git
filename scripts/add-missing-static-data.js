#!/usr/bin/env node
/**
 * ============================================
 * 📥 إضافة البيانات الثابتة الناقصة
 * ============================================
 * Purpose: Add missing static data to local database
 * ============================================
 */

const db = require('./services/local-db');
const { translateText } = require('./services/translation-service-cjs');
const fs = require('fs');
const path = require('path');

// ============================================
// LOAD JSON FILES
// ============================================
const movieGenres = JSON.parse(fs.readFileSync(path.join(__dirname, 'tmdb-movie-genres.json'), 'utf8'));
const tvGenres = JSON.parse(fs.readFileSync(path.join(__dirname, 'tmdb-tv-genres.json'), 'utf8'));
const jobs = JSON.parse(fs.readFileSync(path.join(__dirname, 'tmdb-jobs.json'), 'utf8'));
const movieCerts = JSON.parse(fs.readFileSync(path.join(__dirname, 'tmdb-movie-certifications.json'), 'utf8'));
const tvCerts = JSON.parse(fs.readFileSync(path.join(__dirname, 'tmdb-tv-certifications.json'), 'utf8'));

// ============================================
// CREATE TABLES
// ============================================
function createTables() {
  console.log('📊 إنشاء الجداول الجديدة...\n');
  
  // Jobs/Departments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL UNIQUE,
      name_ar TEXT,
      job_count INTEGER DEFAULT 0
    );
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER NOT NULL,
      name_en TEXT NOT NULL,
      name_ar TEXT,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      UNIQUE(department_id, name_en)
    );
  `);
  
  // Certifications table
  try {
    db.exec('DROP TABLE IF EXISTS certifications');
  } catch (e) {}
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS certifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_code TEXT NOT NULL,
      content_type TEXT NOT NULL,
      certification TEXT NOT NULL,
      meaning_en TEXT,
      meaning_ar TEXT,
      cert_order INTEGER DEFAULT 0,
      UNIQUE(country_code, content_type, certification)
    );
  `);
  
  console.log('   ✅ تم إنشاء الجداول');
}

// ============================================
// ADD MISSING GENRES
// ============================================
async function addMissingGenres() {
  console.log('\n🎭 إضافة الأنواع الناقصة...');
  
  const allGenres = [...movieGenres.genres, ...tvGenres.genres];
  const uniqueGenres = Array.from(new Map(allGenres.map(g => [g.id, g])).values());
  
  let added = 0;
  for (const genre of uniqueGenres) {
    const existing = db.prepare('SELECT id FROM genres WHERE tmdb_id = ?').get(genre.id);
    
    if (!existing) {
      const nameAr = await translateText(genre.name, 'ar');
      const slug = genre.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      db.prepare(`
        INSERT INTO genres (tmdb_id, name_en, name_ar, slug)
        VALUES (?, ?, ?, ?)
      `).run(genre.id, genre.name, nameAr, slug);
      
      added++;
      console.log(`   ✅ ${genre.name} → ${nameAr}`);
      
      await new Promise(r => setTimeout(r, 300));
    }
  }
  
  console.log(`   📊 تم إضافة ${added} نوع جديد`);
}

// ============================================
// ADD DEPARTMENTS & JOBS
// ============================================
async function addDepartmentsAndJobs() {
  console.log('\n💼 إضافة الأقسام والوظائف...');
  
  let deptCount = 0;
  let jobCount = 0;
  
  for (const dept of jobs) {
    // Translate department name
    const deptNameAr = await translateText(dept.department, 'ar');
    
    // Insert department
    const result = db.prepare(`
      INSERT OR IGNORE INTO departments (name_en, name_ar, job_count)
      VALUES (?, ?, ?)
    `).run(dept.department, deptNameAr, dept.jobs.length);
    
    if (result.changes > 0) {
      deptCount++;
      console.log(`   ✅ ${dept.department} → ${deptNameAr} (${dept.jobs.length} وظيفة)`);
    }
    
    // Get department ID
    const deptId = db.prepare('SELECT id FROM departments WHERE name_en = ?').get(dept.department).id;
    
    // Insert jobs (without translation for now - too many)
    for (const job of dept.jobs) {
      const jobResult = db.prepare(`
        INSERT OR IGNORE INTO jobs (department_id, name_en)
        VALUES (?, ?)
      `).run(deptId, job);
      
      if (jobResult.changes > 0) {
        jobCount++;
      }
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log(`   📊 تم إضافة ${deptCount} قسم و ${jobCount} وظيفة`);
}

// ============================================
// ADD CERTIFICATIONS
// ============================================
async function addCertifications() {
  console.log('\n🔞 إضافة التصنيفات العمرية...');
  
  let movieCount = 0;
  let tvCount = 0;
  
  // Movie certifications
  for (const [country, certs] of Object.entries(movieCerts.certifications)) {
    for (const cert of certs) {
      db.prepare(`
        INSERT OR IGNORE INTO certifications 
        (country_code, content_type, certification, meaning_en, cert_order)
        VALUES (?, ?, ?, ?, ?)
      `).run(country, 'movie', cert.certification, cert.meaning, cert.order);
      
      movieCount++;
    }
  }
  
  // TV certifications
  for (const [country, certs] of Object.entries(tvCerts.certifications)) {
    for (const cert of certs) {
      db.prepare(`
        INSERT OR IGNORE INTO certifications 
        (country_code, content_type, certification, meaning_en, cert_order)
        VALUES (?, ?, ?, ?, ?)
      `).run(country, 'tv', cert.certification, cert.meaning, cert.order);
      
      tvCount++;
    }
  }
  
  console.log(`   📊 تم إضافة ${movieCount} تصنيف أفلام و ${tvCount} تصنيف مسلسلات`);
}

// ============================================
// TRANSLATE CERTIFICATIONS
// ============================================
async function translateCertifications() {
  console.log('\n🌍 ترجمة التصنيفات العمرية...');
  
  const certs = db.prepare(`
    SELECT id, meaning_en 
    FROM certifications 
    WHERE meaning_ar IS NULL AND meaning_en IS NOT NULL
    LIMIT 100
  `).all();
  
  let translated = 0;
  for (const cert of certs) {
    if (cert.meaning_en && cert.meaning_en.length > 10) {
      const meaningAr = await translateText(cert.meaning_en, 'ar');
      if (meaningAr) {
        db.prepare('UPDATE certifications SET meaning_ar = ? WHERE id = ?')
          .run(meaningAr, cert.id);
        translated++;
        
        if (translated % 10 === 0) {
          console.log(`   ✅ تم ترجمة ${translated}/${certs.length} تصنيف`);
        }
      }
      
      await new Promise(r => setTimeout(r, 300));
    }
  }
  
  console.log(`   📊 تم ترجمة ${translated} تصنيف`);
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('📥 إضافة البيانات الثابتة الناقصة\n');
  console.log('═'.repeat(80));

  try {
    // 1. Create tables
    createTables();
    
    // 2. Add missing genres
    await addMissingGenres();
    
    // 3. Add departments & jobs
    await addDepartmentsAndJobs();
    
    // 4. Add certifications
    await addCertifications();
    
    // 5. Translate certifications (sample)
    await translateCertifications();
    
    // 6. Summary
    console.log('\n' + '═'.repeat(80));
    console.log('📊 الملخص النهائي');
    console.log('═'.repeat(80));
    
    const genresCount = db.prepare('SELECT COUNT(*) as count FROM genres').get();
    const deptsCount = db.prepare('SELECT COUNT(*) as count FROM departments').get();
    const jobsCount = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
    const certsCount = db.prepare('SELECT COUNT(*) as count FROM certifications').get();
    
    console.log(`\n✅ الأنواع: ${genresCount.count} نوع`);
    console.log(`✅ الأقسام: ${deptsCount.count} قسم`);
    console.log(`✅ الوظائف: ${jobsCount.count} وظيفة`);
    console.log(`✅ التصنيفات: ${certsCount.count} تصنيف`);
    
    console.log('\n' + '═'.repeat(80));
    console.log('✅ اكتملت إضافة البيانات الثابتة بنجاح!');
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
