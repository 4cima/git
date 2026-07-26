// ============================================
// 🛡️  AUDIT EXISTING CONTENT SAFETY
// ============================================
// ليه محتاج السكريبت ده؟
// ─────────────────────────────────────────────
// إصلاح content-filter.js لوحده مش كافي، لأن INGEST-MOVIES-LOGIC.js
// و INGEST-SERIES-LOGIC.js بيتخطوا أي صف is_complete = 1 (مش بيعيدوا
// فحصه تاني عشان يوفروا استدعاءات TMDB/الترجمة). يعني أي محتوى
// اتسحب قبل تحديث الفلتر، لسه معلّم is_filtered = 0 في القاعدة حتى
// لو كان المفروض يتفلتر بالمنطق الجديد.
//
// السكريبت ده بيعيد فحص كل المحتوى المكتمل (is_complete = 1) بالفلتر
// الجديد، ويعلّم أي حاجة تخالفه (is_filtered = 1) — لكن **مش بيحذف
// حاجة تلقائيًا من Turso**. بيولّد ملف .sql تراجعه وتنفذه بنفسك.
//
// وضعين:
//   node AUDIT-EXISTING-CONTENT-SAFETY.js          → FAST: من القاعدة المحلية بس
//   node AUDIT-EXISTING-CONTENT-SAFETY.js --deep   → DEEP: بيعيد السحب من TMDB
//                                                     (يفحص adult flag + certification
//                                                      اللي مش متخزنين محليًا)
// ============================================
require('dotenv').config({ path: './.env.local' })
const db = require('./services/local-db')
const { isExplicitContent } = require('./services/content-filter')
const fs = require('fs')

const DEEP = process.argv.includes('--deep')
const TMDB_KEY = process.env.TMDB_API_KEY || process.env.TMDB_API_KEY_2 || 'afef094e7c0de13c1cac98227a61da4d'

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchTMDBFull(type, tmdbId) {
  try {
    const append = type === 'movie'
      ? 'keywords,release_dates'
      : 'keywords,content_ratings'
    const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=${append}`
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** بناء كائن شبيه بـ TMDB من بيانات القاعدة المحلية (وضع FAST) */
function buildPseudoContentFromLocalRow(row, castNames) {
  let keywordNames = []
  try { keywordNames = row.keywords ? JSON.parse(row.keywords) : [] } catch {}

  return {
    id: row.tmdb_id,
    title: row.title_en,
    name: row.title_en,
    overview: row.overview_en || row.overview_ar || '',
    vote_average: row.vote_average,
    poster_path: row.poster_path,
    genres: row.primary_genre ? [{ name: row.primary_genre }] : [],
    keywords: { keywords: keywordNames.map(n => ({ name: n })) },
    credits: { cast: castNames.map(n => ({ name: n })) }
    // ملاحظة: adult flag والتصنيف العمري الرسمي مش متخزنين محليًا،
    // فهيتفحصوا بس في وضع --deep
  }
}

async function auditTable(table, contentType, tmdbType) {
  console.log(`\n🔍 فحص جدول ${table} (${contentType})...`)

  // استخدام name_en/name_ar للمسلسلات و title_en/title_ar للأفلام
  const titleCol = table === 'tv_series' ? 'name_en' : 'title_en'
  
  const rows = db.prepare(`
    SELECT id, tmdb_id, ${titleCol} as title_en, overview_en, overview_ar, vote_average,
           poster_path, primary_genre, keywords, is_filtered, synced_to_turso
    FROM ${table}
    WHERE is_complete = 1
  `).all()

  console.log(`   إجمالي السجلات المكتملة: ${rows.length.toLocaleString()}`)
  if (DEEP) console.log(`   ⏳ وضع DEEP: هياخد وقت أطول (استدعاء TMDB لكل عنصر)`)

  let flagged = 0
  const alreadyLiveOnTurso = []
  let processed = 0

  for (const row of rows) {
    let pseudo

    if (DEEP) {
      const fresh = await fetchTMDBFull(tmdbType, row.tmdb_id)
      await sleep(60) // احترام rate limit تقريبي
      if (!fresh) { processed++; continue }
      // خلي بيانات القاعدة المحلية (overview/rating) مع بيانات TMDB الطازجة (keywords/certifications)
      pseudo = {
        ...fresh,
        title: row.title_en,
        name: row.title_en,
        overview: row.overview_en || row.overview_ar || '',
        vote_average: row.vote_average,
        poster_path: row.poster_path,
        genres: row.primary_genre ? [{ name: row.primary_genre }] : []
      }
    } else {
      const castRows = db.prepare(`
        SELECT p.name_en FROM cast_crew cc
        JOIN people p ON p.id = cc.person_id
        WHERE cc.content_id = ? AND cc.content_type = ? AND cc.role_type = 'cast'
      `).all(row.id, contentType)
      pseudo = buildPseudoContentFromLocalRow(row, castRows.map(c => c.name_en))
    }

    const result = isExplicitContent(pseudo)
    processed++

    if (result.blocked) {
      flagged++
      db.prepare(`
        UPDATE ${table}
        SET is_filtered = 1, filter_reason = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(`AUDIT:${result.reason}`, row.id)

      if (row.synced_to_turso === 1) {
        alreadyLiveOnTurso.push(row.id)
      }

      console.log(`   🚫 [${row.id}] ${row.title_en} — ${result.reason}${row.synced_to_turso === 1 ? '  ⚠️ منشور على الموقع!' : ''}`)
    }

    if (processed % 500 === 0) {
      console.log(`   ... ${processed}/${rows.length} (معلّم حتى الآن: ${flagged})`)
    }
  }

  console.log(`\n   ✅ انتهى الفحص: ${flagged.toLocaleString()} عنصر تم وضع علامة عليه من أصل ${rows.length.toLocaleString()}`)

  if (alreadyLiveOnTurso.length > 0) {
    const sqlFile = `REMOVE-FROM-TURSO-${table}.sql`
    const sql = alreadyLiveOnTurso.map(id => `DELETE FROM ${table} WHERE id = ${id};`).join('\n')
    fs.writeFileSync(sqlFile, sql, 'utf8')
    console.log(`\n   ⚠️  تحذير: ${alreadyLiveOnTurso.length} عنصر من دول متزامن بالفعل مع Turso (يعني منشور على الموقع الآن)!`)
    console.log(`   📄 اتكتب ${sqlFile} — راجعه شخصيًا ونفّذه يدويًا على Turso عشان تشيلهم من الموقع.`)
  }

  return { flagged, alreadyLiveOnTurso: alreadyLiveOnTurso.length }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║   🛡️  تدقيق أمان المحتوى الموجود مسبقًا          ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log(`\nوضع الفحص: ${DEEP ? 'DEEP (إعادة سحب من TMDB - أدق وأبطأ)' : 'FAST (بيانات محلية فقط - أسرع)'}`)

  if (!DEEP) {
    console.log('\n⚠️  ملاحظة: وضع FAST مش بيقدر يفحص "adult flag" ولا "التصنيف العمري"')
    console.log('   لأنهم مش متخزنين محليًا حاليًا (كان فيهم bug قبل كده).')
    console.log('   للفحص الكامل شغّل: node AUDIT-EXISTING-CONTENT-SAFETY.js --deep\n')
  }

  const movieResults = await auditTable('movies', 'movie', 'movie')
  const seriesResults = await auditTable('tv_series', 'tv', 'tv')

  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║                    الملخص النهائي                  ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log(`🎬 أفلام معلّمة الآن كمفلترة: ${movieResults.flagged} (منها ${movieResults.alreadyLiveOnTurso} منشورة فعلاً على Turso)`)
  console.log(`📺 مسلسلات معلّمة الآن كمفلترة: ${seriesResults.flagged} (منها ${seriesResults.alreadyLiveOnTurso} منشورة فعلاً على Turso)`)
  console.log(`\n💡 العناصر دي دلوقتي is_filtered = 1، يعني sync-to-turso-optimized.js`)
  console.log(`   مش هيعيد رفعها تاني. لو كانت منشورة بالفعل، لازم تنفذ ملفات الـ .sql يدويًا.`)
}

main().catch(console.error)
