/**
 * Error Logger Service
 * نظام شامل لتسجيل الأخطاء بالتفصيل
 */

const fs = require('fs')
const path = require('path')

class ErrorLogger {
  constructor(scriptName) {
    this.scriptName = scriptName
    this.errorLog = {
      translation: new Map(),
      tmdb: new Map(),
      database: new Map(),
      network: new Map(),
      validation: new Map(),
      critical: []
    }
    this.stats = {
      total: 0,
      translation: 0,
      tmdb: 0,
      database: 0,
      network: 0,
      validation: 0
    }
  }

  /**
   * تسجيل خطأ
   * @param {string} type - نوع الخطأ (translation, tmdb, database, network, validation)
   * @param {number|string} id - معرف العنصر
   * @param {Error} error - الخطأ
   * @param {object} context - معلومات إضافية
   */
  logError(type, id, error, context = {}) {
    const errorMap = this.errorLog[type]
    if (!errorMap) {
      console.error(`⚠️ Unknown error type: ${type}`)
      this.errorLog.critical.push({
        id,
        error: error.message,
        stack: error.stack,
        type: 'unknown',
        context,
        timestamp: new Date().toISOString()
      })
      return
    }

    const existing = errorMap.get(id)
    if (existing) {
      existing.attempts++
      existing.lastAttempt = new Date().toISOString()
      existing.lastError = error.message
      existing.lastStack = error.stack
    } else {
      errorMap.set(id, {
        id,
        ...context,
        error: error.message,
        stack: error.stack,
        attempts: 1,
        firstAttempt: new Date().toISOString(),
        lastAttempt: new Date().toISOString()
      })
    }

    this.stats.total++
    this.stats[type]++
  }

  /**
   * حفظ ملف الأخطاء
   */
  save() {
    const errorFile = path.join(__dirname, '..', `error-log-${this.scriptName}.json`)
    
    const report = {
      scriptName: this.scriptName,
      summary: {
        total: this.stats.total,
        translation: this.stats.translation,
        tmdb: this.stats.tmdb,
        database: this.stats.database,
        network: this.stats.network,
        validation: this.stats.validation,
        critical: this.errorLog.critical.length
      },
      errors: {
        translation: Array.from(this.errorLog.translation.entries()).map(([id, data]) => ({ id, ...data })),
        tmdb: Array.from(this.errorLog.tmdb.entries()).map(([id, data]) => ({ id, ...data })),
        database: Array.from(this.errorLog.database.entries()).map(([id, data]) => ({ id, ...data })),
        network: Array.from(this.errorLog.network.entries()).map(([id, data]) => ({ id, ...data })),
        validation: Array.from(this.errorLog.validation.entries()).map(([id, data]) => ({ id, ...data })),
        critical: this.errorLog.critical
      },
      timestamp: new Date().toISOString()
    }

    try {
      fs.writeFileSync(errorFile, JSON.stringify(report, null, 2))
      console.log(`\n📝 Error log saved: ${errorFile}`)
      console.log(`   Total errors: ${this.stats.total}`)
      console.log(`   - Translation: ${this.stats.translation}`)
      console.log(`   - TMDB: ${this.stats.tmdb}`)
      console.log(`   - Database: ${this.stats.database}`)
      console.log(`   - Network: ${this.stats.network}`)
      console.log(`   - Validation: ${this.stats.validation}`)
      console.log(`   - Critical: ${this.errorLog.critical.length}`)
    } catch (e) {
      console.error(`❌ Failed to save error log: ${e.message}`)
    }
  }

  /**
   * طباعة ملخص الأخطاء
   */
  printSummary() {
    console.log('\n╔══════════════════════════════════╗')
    console.log('║       📊 Error Summary           ║')
    console.log('╠══════════════════════════════════╣')
    console.log(`║ Total: ${this.stats.total}`)
    console.log(`║ Translation: ${this.stats.translation}`)
    console.log(`║ TMDB: ${this.stats.tmdb}`)
    console.log(`║ Database: ${this.stats.database}`)
    console.log(`║ Network: ${this.stats.network}`)
    console.log(`║ Validation: ${this.stats.validation}`)
    console.log(`║ Critical: ${this.errorLog.critical.length}`)
    console.log('╚══════════════════════════════════╝')
  }
}

module.exports = ErrorLogger
