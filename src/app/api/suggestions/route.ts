import { NextRequest, NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'
import { guard } from '@/lib/rateLimit'

/* ============================================================
   POST /api/suggestions — يستقبل اقتراحات/شكاوى الزوار من /contact
   (E-15: كان src/app/contact/page.tsx يستدعي هذا المسار وهو غير موجود ⇒ 404 دائم
    ⇒ الفورم لا يعمل إطلاقاً. الآن يُحفظ الطلب فعلاً في D1.)
   ============================================================ */

export const dynamic = 'force-dynamic'

const MAX_SUBJECT = 200
const MAX_MESSAGE = 4000

/* الجدول مُوثَّق في migrations/create-site-suggestions.sql، ويُنشأ تلقائياً عند أول طلب
   (CREATE TABLE IF NOT EXISTS) حتى يعمل الفورم على قاعدة D1 الحالية بلا خطوة migration
   يدوية. تُنفَّذ مرة واحدة لكل عملية (cache على مستوى الوحدة). */
const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS site_suggestions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT DEFAULT (datetime('now')),
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  user_agent TEXT,
  status     TEXT DEFAULT 'new'
)`

let tableReady: Promise<void> | null = null

async function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = executeAll(CREATE_TABLE_SQL, [])
      .then(() => undefined)
      .catch(err => {
        tableReady = null // اسمح بإعادة المحاولة في طلب لاحق
        throw err
      })
  }
  return tableReady
}

export async function POST(request: NextRequest) {
  // كتابة عامة بلا جلسة — أضيق حد في الموقع (5/دقيقة لكل IP)
  const limited = guard(request, 'suggestions', 5)
  if (limited) return limited
  try {
    let payload: { subject?: unknown; message?: unknown }
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json({ error: 'صيغة الطلب غير صالحة' }, { status: 400 })
    }

    const subject = String(payload.subject ?? '').trim()
    const message = String(payload.message ?? '').trim()

    if (!subject || !message) {
      return NextResponse.json({ error: 'العنوان والرسالة مطلوبان' }, { status: 400 })
    }
    if (subject.length > MAX_SUBJECT || message.length > MAX_MESSAGE) {
      return NextResponse.json(
        { error: `الحد الأقصى: ${MAX_SUBJECT} حرفاً للعنوان و${MAX_MESSAGE} للرسالة` },
        { status: 413 }
      )
    }

    await ensureTable()
    await executeAll(
      'INSERT INTO site_suggestions (subject, message, user_agent) VALUES (?, ?, ?)',
      [subject, message, (request.headers.get('user-agent') || '').slice(0, 300)]
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error saving suggestion:', error)
    return NextResponse.json({ error: 'تعذّر حفظ الرسالة، حاول لاحقاً' }, { status: 500 })
  }
}