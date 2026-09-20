'use client'

/**
 * صفحة العمليات — تشغيل أوامر الصيانة من allowlist بلايف ستريم (SSE) + سجل التاريخ.
 * بوابة كلمة سر محلية (sessionStorage) فوق حماية الـAPI (requireAdmin + x-operations-password).
 */

import { useState, useEffect, useRef } from 'react'
import { Terminal, Play, Loader, Lock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

interface LogEntry {
  id: number
  timestamp: string
  username: string | null
  command: string
  exit_code: number | null
  duration_seconds: number | null
}

interface Operation {
  id: string
  name: string
  command: string
  risk: 'low' | 'medium' | 'high'
  description: string
}

/* مطابقة لـALLOWED_COMMANDS في route.ts — أي تغيير هناك ينعكس هنا */
const OPERATIONS: Record<string, Operation[]> = {
  'سلسلة المحتوى': [
    { id: 'download-ids', name: 'تحميل IDs', command: 'npm run download-ids', risk: 'low', description: 'تنزيل IDs التصدير اليومي من TMDB' },
    { id: 'fetch', name: 'جلب وإثراء', command: 'npm run fetch', risk: 'low', description: 'جلب البيانات الكاملة من TMDB + الإثراء' },
    { id: 'enrich', name: 'استكمال الناقص', command: 'npm run enrich', risk: 'low', description: 'استكمال البيانات الناقصة/الجزئية' },
    { id: 'sync', name: 'مزامنة D1', command: 'npm run sync', risk: 'medium', description: 'مزامنة المحتوى المكتمل من local.db إلى D1' },
    { id: 'full-workflow', name: 'السلسلة الكاملة', command: 'npm run full-workflow', risk: 'medium', description: 'تنفيذ كل الخطوات بالترتيب (تحميل → جلب → مزامنة)' },
    { id: 'setup', name: 'تهيئة local.db', command: 'npm run setup', risk: 'medium', description: 'تهيئة مخطط قاعدة البيانات المحلية' },
  ],
  'الفحوصات': [
    { id: 'check-local', name: 'فحص البيانات المحلية', command: 'node scripts/check-local-data.js', risk: 'low', description: 'التحقق من سلامة local.db' },
    { id: 'health', name: 'فحص الصحة', command: 'node scripts/health-check.js', risk: 'low', description: 'تشخيص صحة النظام' },
    { id: 'check-schema', name: 'فحص المخطط', command: 'node scripts/check-schema.js', risk: 'low', description: 'التحقق من مخطط قاعدة البيانات' },
    { id: 'monitoring', name: 'لوحة المراقبة', command: 'node scripts/monitoring-dashboard.js', risk: 'low', description: 'عرض إحصائيات المراقبة' },
    { id: 'dump-schema', name: 'تصدير المخطط', command: 'node scripts/dump-schema.js', risk: 'low', description: 'تصدير المخطط الحالي لملف SQL' },
  ],
  'الترجمة': [
    { id: 'translate-titles', name: 'ترجمة العناوين الناقصة', command: 'node scripts/translate-missing-titles.js', risk: 'medium', description: 'إضافة عناوين عربية للناقص' },
    { id: 'translate-overviews', name: 'ترجمة الوصف الناقص', command: 'node scripts/translate-missing-overviews.js', risk: 'medium', description: 'إضافة أوصاف عربية للناقص' },
    { id: 'complete-translations', name: 'استكمال كل الترجمات', command: 'node scripts/complete-translations.js', risk: 'medium', description: 'استكمال ترجمة شامل دفعة واحدة' },
  ],
}

const RISK_STYLES: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-400',
  medium: 'bg-orange-500/10 text-orange-400',
  high: 'bg-red-500/10 text-red-400',
}
const RISK_LABELS: Record<string, string> = { low: 'آمن', medium: 'حذر', high: 'خطير' }

export default function OperationsPage() {
  const [passwordUnlocked, setPasswordUnlocked] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const [running, setRunning] = useState<string | null>(null)
  const [output, setOutput] = useState<string[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [confirmAction, setConfirmAction] = useState<Operation | null>(null)

  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sessionStorage.getItem('operations_password')) setPasswordUnlocked(true)
    fetchLogs()
  }, [])

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [output])

  const fetchLogs = async () => {
    try {
      setLogsLoading(true)
      const res = await fetch('/api/admin/operations?limit=50', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok && data.ok) setLogs(data.logs || [])
    } catch {
      // السجل فاشل ما يمنعش التشغيل
    } finally {
      setLogsLoading(false)
    }
  }

  const unlock = (e: React.FormEvent) => {
    e.preventDefault()
    // التحقق الفعلي يحصل عند التشغيل (الهيدر بيوصل مع كل نداء) — هنا نخزن محليًا فقط
    if (!passwordInput.trim()) {
      setPasswordError('اكتب كلمة السر')
      return
    }
    sessionStorage.setItem('operations_password', passwordInput)
    setPasswordUnlocked(true)
  }

  const runOperation = async (op: Operation) => {
    setRunning(op.id)
    setOutput([])
    const password = sessionStorage.getItem('operations_password') || ''
    try {
      const res = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-operations-password': password },
        body: JSON.stringify({ action: op.command, confirm: true }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setOutput((prev) => [...prev, `❌ ${(data as { error?: string }).error || `فشل (${res.status})`}`])
        if (res.status === 403) {
          setPasswordUnlocked(false)
          sessionStorage.removeItem('operations_password')
        }
        setRunning(null)
        fetchLogs()
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setOutput((prev) => [...prev, '❌ لا يمكن قراءة التدفق'])
        setRunning(null)
        return
      }
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split('\n\n')
        buffer = blocks.pop() || ''
        for (const block of blocks) {
          const dataLine = block.split('\n').find((l) => l.startsWith('data: '))
          if (!dataLine) continue
          try {
            const payload = JSON.parse(dataLine.slice(6))
            if (block.includes('event: stdout')) setOutput((prev) => [...prev, payload.line])
            else if (block.includes('event: stderr')) setOutput((prev) => [...prev, `⚠ ${payload.line}`])
            else if (block.includes('event: exit')) setOutput((prev) => [...prev, `✔ انتهى — exit ${payload.code} (${payload.duration}s)`])
            else if (block.includes('event: error')) setOutput((prev) => [...prev, `❌ ${payload.message}`])
          } catch {
            // سطر تالف — تجاهل
          }
        }
      }
    } catch {
      setOutput((prev) => [...prev, '❌ خطأ في الاتصال'])
    } finally {
      setRunning(null)
      fetchLogs()
    }
  }

  /* بوابة كلمة السر */
  if (!passwordUnlocked) {
    return (
      <div className="mx-auto max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-black text-zinc-100">بوابة العمليات</h2>
        </div>
        <p className="mb-4 text-xs text-zinc-500">أدخل كلمة سر العمليات (OPERATIONS_PANEL_PASSWORD) للوصول لأوامر الصيانة.</p>
        <form onSubmit={unlock} className="space-y-3">
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="كلمة السر…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
            dir="ltr"
          />
          {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
          <button type="submit" className="w-full rounded-lg bg-cyan-600 py-2 text-sm font-bold text-white hover:bg-cyan-500">
            فتح
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-black text-zinc-100">
          <Terminal className="h-6 w-6 text-cyan-400" /> العمليات
        </h2>
        <button
          onClick={() => { sessionStorage.removeItem('operations_password'); setPasswordUnlocked(false) }}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
        >
          قفل البوابة
        </button>
      </div>

      <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-500">
        الأوامر تشتغل على الخادم المستضيف للوحة — على نشر Workers السحابي أوامر spawn غير متاحة (صُممت للتشغيل المحلي)، والسجل محفوظ للمراجعة.
      </p>

      {/* الأوامر */}
      {Object.entries(OPERATIONS).map(([group, ops]) => (
        <div key={group}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-600">{group}</h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {ops.map((op) => (
              <button
                key={op.id}
                onClick={() => (op.risk === 'high' ? setConfirmAction(op) : runOperation(op))}
                disabled={running !== null}
                className="group rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-right transition-colors hover:border-cyan-500/40 disabled:opacity-50"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-zinc-100">
                    {running === op.id ? <Loader className="h-4 w-4 animate-spin text-cyan-400" /> : <Play className="h-3.5 w-3.5 text-zinc-500 group-hover:text-cyan-400" />}
                    {op.name}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${RISK_STYLES[op.risk]}`}>{RISK_LABELS[op.risk]}</span>
                </div>
                <p className="text-[11px] text-zinc-500">{op.description}</p>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* الترمنال */}
      {output.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-black p-4">
          <div ref={outputRef} className="max-h-80 overflow-y-auto" dir="ltr">
            {output.map((line, i) => (
              <pre key={i} className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-emerald-400">{line}</pre>
            ))}
            {running !== null && <Loader className="mt-2 h-4 w-4 animate-spin text-cyan-400" />}
          </div>
        </div>
      )}

      {/* السجل */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="mb-3 font-bold text-zinc-100">سجل العمليات</h3>
        {logsLoading ? (
          <p className="py-4 text-center text-sm text-zinc-500">جاري التحميل…</p>
        ) : logs.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">لا سجل بعد</p>
        ) : (
          <div className="space-y-1.5">
            {logs.map((log) => (
              <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800/60 bg-zinc-800/30 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  {log.exit_code === null ? <Loader className="h-3.5 w-3.5 text-zinc-500" />
                    : log.exit_code === 0 ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                  <span dir="ltr" className="truncate font-mono text-xs text-zinc-300">{log.command}</span>
                </div>
                <span className="shrink-0 text-[10px] text-zinc-500">
                  {log.username} · {log.duration_seconds != null ? `${log.duration_seconds}s` : '—'} · {log.timestamp?.slice(0, 16)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* تأكيد الخطير — لا توجد أوامر high حاليًا لكن البوابة جاهزة */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setConfirmAction(null)}>
          <div className="w-full max-w-sm rounded-xl border border-red-500/40 bg-zinc-900 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 flex items-center gap-2 font-bold text-red-400">
              <AlertTriangle className="h-5 w-5" /> عملية عالية الخطورة
            </h3>
            <p className="mb-5 text-sm text-zinc-300">«{confirmAction.name}» — {confirmAction.description}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">إلغاء</button>
              <button
                onClick={() => { const op = confirmAction; setConfirmAction(null); runOperation(op) }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500"
              >
                تنفيذ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
