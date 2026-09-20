import Link from 'next/link'
import { executeFirst, executeAll } from '@/lib/db'
import { Film, Tv, Layers, Users, ShieldAlert, MessageSquare, Star, Activity, Terminal, Wrench } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'لوحة التحكم | 4CIMA' }
export const revalidate = 0

/* عدادات الكتالوج تتغير مرة/يوم (سلسلة المزامنة) — كاش 6 ساعات على مستوى الـisolate
   يقلّص مسح COUNT الكامل (~183K صف) من كل زيارة إلى ≤4 في اليوم. الاستعلام الواحد
   لكل جدول بيجمع العدد الكلي + needs_review في مسح واحد بدل مسحين. */
type Stats = {
  movies: number
  moviesNeeds: number
  series: number
  seriesNeeds: number
  seasons: number
  users: number
  suggestions: number
  suggestionsNew: number
  reviews: number
  at: number
}
let statsCache: Stats | null = null
const STATS_TTL_MS = 6 * 60 * 60 * 1000

async function getStats(): Promise<Stats> {
  if (statsCache && Date.now() - statsCache.at < STATS_TTL_MS) return statsCache
  const [m, s, u, sg, rv] = await Promise.all([
    executeFirst<{ total: number; needs: number }>(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN filter_status = 'needs_review' THEN 1 ELSE 0 END) AS needs
       FROM movies`,
    ),
    executeFirst<{ total: number; needs: number; seasons: number }>(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN filter_status = 'needs_review' THEN 1 ELSE 0 END) AS needs,
              SUM(CASE WHEN number_of_seasons > 0 THEN number_of_seasons ELSE 0 END) AS seasons
       FROM tv_series`,
    ),
    executeFirst<{ c: number }>('SELECT COUNT(*) AS c FROM users'),
    executeFirst<{ total: number; fresh: number }>(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status IS NULL OR status = 'new' THEN 1 ELSE 0 END) AS fresh
       FROM site_suggestions`,
    ),
    executeFirst<{ c: number }>('SELECT COUNT(*) AS c FROM user_reviews'),
  ])
  statsCache = {
    movies: Number(m?.total ?? 0),
    moviesNeeds: Number(m?.needs ?? 0),
    series: Number(s?.total ?? 0),
    seriesNeeds: Number(s?.needs ?? 0),
    seasons: Number(s?.seasons ?? 0),
    users: Number(u?.c ?? 0),
    suggestions: Number(sg?.total ?? 0),
    suggestionsNew: Number(sg?.fresh ?? 0),
    reviews: Number(rv?.c ?? 0),
    at: Date.now(),
  }
  return statsCache
}

type OpRow = {
  id: number
  username: string | null
  command: string | null
  exit_code: number | null
  duration_seconds: number | null
  timestamp: string | null
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  sub?: string
  icon: typeof Film
  tone: 'cyan' | 'purple' | 'green' | 'orange' | 'red' | 'blue'
}) {
  const tones: Record<string, string> = {
    cyan: 'text-cyan-400 bg-cyan-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    green: 'text-emerald-400 bg-emerald-400/10',
    orange: 'text-orange-400 bg-orange-400/10',
    red: 'text-red-400 bg-red-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
  }
  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className={`rounded-lg p-3 ${tones[tone]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-zinc-400">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-zinc-100">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  // فحص حي لاتصال D1 — استعلام تافه (صف واحد) يقاس زمنه فعليًا في كل تحميل
  const t0 = Date.now()
  let d1Ok = true
  try {
    await executeFirst('SELECT 1 AS ok')
  } catch {
    d1Ok = false
  }
  const d1Latency = Date.now() - t0

  const stats = await getStats().catch(() => null)
  const recentOps = await executeAll<OpRow>(
    'SELECT id, username, command, exit_code, duration_seconds, timestamp FROM operations_log ORDER BY id DESC LIMIT 6',
  ).catch(() => [] as OpRow[])

  const needsTotal = (stats?.moviesNeeds ?? 0) + (stats?.seriesNeeds ?? 0)
  const buildSha = process.env.NEXT_PUBLIC_BUILD_SHA || '—'

  return (
    <div className="space-y-6">
      {/* حالة النظام — قياس حقيقي لا نص ثابت */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${d1Ok ? 'animate-pulse bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-sm text-zinc-300">قاعدة البيانات D1</span>
          </div>
          <span className={`rounded px-2 py-1 text-xs font-bold ${d1Ok ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
            {d1Ok ? `متصلة — ${d1Latency}ms` : 'غير متصلة'}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <span className="text-sm text-zinc-300">إصدار البناء</span>
          <code dir="ltr" className="rounded bg-zinc-800 px-2 py-1 text-xs font-bold text-cyan-400">{buildSha.slice(0, 10)}</code>
        </div>
        <Link
          href="/admin/review"
          className={`flex items-center justify-between rounded-xl border p-5 transition-colors ${
            needsTotal > 0 ? 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10' : 'border-zinc-800 bg-zinc-900'
          }`}
        >
          <span className="text-sm text-zinc-300">بانتظار المراجعة</span>
          <span className={`text-lg font-black ${needsTotal > 0 ? 'text-orange-400' : 'text-zinc-500'}`}>{needsTotal}</span>
        </Link>
      </div>

      {/* العدادات */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="الأفلام" value={(stats?.movies ?? 0).toLocaleString('en-US')} icon={Film} tone="blue" />
        <StatCard label="المسلسلات" value={(stats?.series ?? 0).toLocaleString('en-US')} icon={Tv} tone="purple" />
        <StatCard label="المواسم (إجمالي)" value={(stats?.seasons ?? 0).toLocaleString('en-US')} icon={Layers} tone="green" />
        <StatCard label="المستخدمون المسجلون" value={(stats?.users ?? 0).toLocaleString('en-US')} icon={Users} tone="cyan" />
        <StatCard
          label="اقتراحات الزوار"
          value={(stats?.suggestions ?? 0).toLocaleString('en-US')}
          sub={stats ? `${stats.suggestionsNew} جديدة` : undefined}
          icon={MessageSquare}
          tone="orange"
        />
        <StatCard label="مراجعات المستخدمين" value={(stats?.reviews ?? 0).toLocaleString('en-US')} icon={Star} tone="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* آخر العمليات — من operations_log */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-zinc-100">
            <Terminal className="h-5 w-5 text-cyan-400" />
            آخر العمليات
          </h2>
          {recentOps.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">لا سجل بعد — شغّل عملية من صفحة العمليات</p>
          ) : (
            <div className="space-y-2">
              {recentOps.map((op) => (
                <div key={op.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/60 bg-zinc-800/30 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        op.exit_code === null ? 'bg-zinc-500' : op.exit_code === 0 ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    />
                    <span dir="ltr" className="truncate text-xs text-zinc-300">{op.command}</span>
                  </div>
                  <span className="shrink-0 text-[10px] text-zinc-500">
                    {op.username} · {op.duration_seconds != null ? `${op.duration_seconds}s` : '—'} · {op.timestamp?.slice(0, 16)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link href="/admin/operations" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300">
            <Wrench className="h-3.5 w-3.5" /> فتح صفحة العمليات
          </Link>
        </div>

        {/* روابط سريعة حقيقية */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-zinc-100">
            <Activity className="h-5 w-5 text-emerald-400" />
            اختصارات
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/admin/review', label: 'مراجعة المحتوى', icon: ShieldAlert },
              { href: '/admin/movies', label: 'إدارة الأفلام', icon: Film },
              { href: '/admin/series', label: 'إدارة المسلسلات', icon: Tv },
              { href: '/admin/ads', label: 'الإعلانات + Kill Switch', icon: Activity },
            ].map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="group rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 transition-colors hover:border-cyan-500/40 hover:bg-zinc-800"
              >
                <q.icon className="mb-2 h-5 w-5 text-zinc-400 group-hover:text-cyan-400" />
                <span className="block text-sm font-bold text-zinc-200">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
