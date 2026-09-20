'use client'

import { useState, useEffect } from 'react'
import { Save, Loader, ShieldAlert, Wrench, Info } from 'lucide-react'

interface Settings {
  site_name: string
  site_description: string
  maintenance_mode: boolean
  registration_open: boolean
}

const DURATIONS = [
  { v: 0, l: 'بدون عداد (قفل يدوي)' },
  { v: 15, l: '15 دقيقة' },
  { v: 30, l: '30 دقيقة' },
  { v: 60, l: 'ساعة' },
  { v: 120, l: 'ساعتان' },
  { v: 240, l: '4 ساعات' },
  { v: 480, l: '8 ساعات' },
  { v: 720, l: '12 ساعة' },
  { v: 1440, l: '24 ساعة' },
]

const inputCls = 'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    site_name: '4CIMA',
    site_description: '',
    maintenance_mode: false,
    registration_open: true,
  })
  const [savedMode, setSavedMode] = useState(false) // حالة الصيانة الحقيقية على الخادم
  const [untilMs, setUntilMs] = useState<number | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [duration, setDuration] = useState(60)
  const [modal, setModal] = useState<'enable' | 'disable' | null>(null)
  const [activating, setActivating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [purging, setPurging] = useState(false)
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null)

  const note = (ok: boolean, msg: string) => {
    setFlash({ ok, msg })
    setTimeout(() => setFlash(null), 5000)
  }

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const refresh = async () => {
    const res = await fetch('/api/admin/settings', { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok || !data.ok) throw new Error(data.error || 'فشل جلب الإعدادات')
    setSettings(data.settings)
    setSavedMode(Boolean(data.settings.maintenance_mode))
    setUntilMs(data.maintenance_until || null)
  }

  useEffect(() => {
    ;(async () => {
      try {
        await refresh()
      } catch (e) {
        note(false, e instanceof Error ? e.message : 'خطأ في جلب الإعدادات')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  /* تفعيل/إيقاف فوري — الزر جوه نافذة التأكيد بينفذ على طول (مش محتاج حفظ سفلي) */
  const applyMaintenance = async (mode: boolean) => {
    setActivating(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          maintenance_mode: mode,
          maintenance_duration_minutes: mode ? duration : 0,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'فشل الحفظ')
      note(true, data.message || 'تم')
      setModal(null)
      await refresh()
    } catch (e) {
      note(false, e instanceof Error ? e.message : 'خطأ في الحفظ')
    } finally {
      setActivating(false)
    }
  }

  /* حفظ الهوية فقط (الاسم/الوصف/التسجيل) — لا يلمس الصيانة ولا العداد */
  const saveIdentity = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_name: settings.site_name,
          site_description: settings.site_description,
          registration_open: settings.registration_open,
          maintenance_mode: savedMode,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'فشل الحفظ')
      note(true, 'تم حفظ الإعدادات')
    } catch (e) {
      note(false, e instanceof Error ? e.message : 'خطأ في الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const purge = async () => {
    setPurging(true)
    try {
      const res = await fetch('/api/admin/purge-cache', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'فشل مسح الكاش')
      note(true, 'تم مسح كاش الحافة — أول طلب بعده MISS عادي')
    } catch (e) {
      note(false, e instanceof Error ? e.message : 'خطأ في مسح الكاش')
    } finally {
      setPurging(false)
    }
  }

  const remaining = untilMs && untilMs > nowTick ? new Date(untilMs - nowTick).toISOString().slice(11, 19) : null
  const durationLabel = DURATIONS.find((d) => d.v === duration)?.l ?? String(duration)

  if (loading) {
    return <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-zinc-400" /></div>
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl font-black text-zinc-100">الإعدادات</h2>
        <p className="text-xs text-zinc-500">تفعيل الصيانة بيمسح كاش الحافة تلقائيًا — ساري فورًا على كل الصفحات</p>
      </div>

      {flash && (
        <p className={`rounded-lg px-3 py-2 text-sm font-bold ${flash.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {flash.msg}
        </p>
      )}

      {/* وضع الصيانة */}
      <div className={`rounded-xl border p-5 ${savedMode ? 'border-orange-500/40 bg-orange-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-zinc-100">
              <ShieldAlert className={`h-5 w-5 ${savedMode ? 'text-orange-400' : 'text-zinc-500'}`} />
              وضع الصيانة
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              يقفل الموقع بالكامل عن الزوار ويظهر لهم صفحة «نرجع قريب جدًا» مع العداد — الإدارة تقدر تتصفح طبيعي.
            </p>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={settings.maintenance_mode}
              onChange={(e) => setModal(e.target.checked ? 'enable' : 'disable')}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-zinc-700 after:absolute after:top-0.5 after:right-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-orange-500 peer-checked:after:-translate-x-5" />
          </label>
        </div>

        {/* الحالة الحقيقية من الخادم */}
        {savedMode && (
          <div className="mt-3 space-y-2.5">
            {remaining ? (
              <p className="rounded-lg bg-orange-500/10 px-3 py-2 text-sm font-bold text-orange-400" dir="ltr">
                ⏳ الصيانة شغالة الآن — تنتهي تلقائيًا بعد {remaining}
              </p>
            ) : untilMs && untilMs <= nowTick ? (
              <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-400">
                ✅ انتهت مدة العداد — الموقع مفتوح تلقائيًا (لو لسه بتصلّح: فعّل الصيانة تاني بمدة جديدة)
              </p>
            ) : (
              <p className="rounded-lg bg-orange-500/10 px-3 py-2 text-sm font-bold text-orange-400">
                ⚠️ الصيانة شغالة بلا عداد — تقفل يدويًا بزرار التوجgle
              </p>
            )}
            <div className="flex items-center gap-2">
              <label className="shrink-0 text-xs font-bold text-zinc-400">مدة العداد</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
              >
                {DURATIONS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
              </select>
              <button
                onClick={() => applyMaintenance(true)}
                disabled={activating}
                className="shrink-0 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-bold text-cyan-400 hover:bg-zinc-700 disabled:opacity-50"
              >
                تطبيق المدة
              </button>
            </div>
          </div>
        )}
      </div>

      {/* التسجيل المفتوح */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-zinc-100">التسجيل المفتوح</h3>
            <p className="mt-1 text-xs text-zinc-500">
              عند الإغلاق: الحسابات الجديدة (Google) مرفوضة — المستخدمون الحاليون يدخلون طبيعي.
            </p>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={settings.registration_open}
              onChange={(e) => setSettings({ ...settings, registration_open: e.target.checked })}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-zinc-700 after:absolute after:top-0.5 after:right-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-cyan-500 peer-checked:after:-translate-x-5" />
          </label>
        </div>
      </div>

      {/* الهوية */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="mb-1 font-bold text-zinc-100">هوية الموقع</h3>
        <p className="mb-4 flex items-center gap-1.5 text-xs text-zinc-600">
          <Info className="h-3.5 w-3.5" />
          محفوظة في الإعدادات (الربط بـSEO العام خطوة منفصلة)
        </p>
        <label className="mb-1 block text-xs font-bold text-zinc-400">اسم الموقع</label>
        <input value={settings.site_name} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })} className={`mb-3 ${inputCls}`} />
        <label className="mb-1 block text-xs font-bold text-zinc-400">الوصف</label>
        <textarea value={settings.site_description} onChange={(e) => setSettings({ ...settings, site_description: e.target.value })} rows={2} className={inputCls} />
      </div>

      <button
        onClick={saveIdentity}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50"
      >
        {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ الهوية والتسجيل
      </button>

      {/* نافذة تأكيد التفعيل */}
      {modal === 'enable' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" onClick={() => !activating && setModal(null)}>
          <div className="my-8 w-full max-w-md rounded-xl border border-orange-500/40 bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 flex items-center gap-2 text-lg font-black text-orange-400">
              <ShieldAlert className="h-6 w-6" /> تفعيل وضع الصيانة
            </h3>
            <ul className="mb-4 space-y-2 text-sm text-zinc-300">
              <li>• الموقع هيتقفل <b className="text-white">فورًا</b> عن كل الزوار</li>
              <li>• كل صفحة هتتحول لصفحة «نرجع قريب جدًا» مع العداد</li>
              <li>• المدة المختارة: <b className="text-cyan-400">{durationLabel}</b></li>
              {duration > 0 && <li className="text-xs text-zinc-500">• لما العداد يخلص الموقع هيفتح لوحده</li>}
              {duration === 0 && <li className="text-xs text-zinc-500">• بدون عداد: القفل يدويًا من نفس التوجgle</li>}
            </ul>
            <div className="mb-4 flex items-center gap-2">
              <label className="shrink-0 text-xs font-bold text-zinc-400">المدة</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
              >
                {DURATIONS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} disabled={activating} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">إلغاء</button>
              <button
                onClick={() => applyMaintenance(true)}
                disabled={activating}
                className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-black text-white hover:bg-orange-500 disabled:opacity-50"
              >
                {activating ? <Loader className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                تفعيل الصيانة الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد الإيقاف */}
      {modal === 'disable' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !activating && setModal(null)}>
          <div className="w-full max-w-sm rounded-xl border border-emerald-500/40 bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-lg font-black text-emerald-400">فتح الموقع</h3>
            <p className="mb-5 text-sm text-zinc-300">هيرجع الموقع لكل الزوار فورًا ويتمسح عداد الصيانة.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} disabled={activating} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">إلغاء</button>
              <button
                onClick={() => applyMaintenance(false)}
                disabled={activating}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {activating ? <Loader className="h-4 w-4 animate-spin" /> : null}
                فتح الموقع الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مسح الكاش */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="flex items-center gap-2 font-bold text-zinc-100">
          <Wrench className="h-5 w-5 text-cyan-400" />
          كاش الحافة (Cloudflare)
        </h3>
        <p className="mb-4 mt-1 text-xs text-zinc-500">
          مسح شامل لكل الصفحات المكتاشة على الحافة — تغيير وضع الصيانة بيعمله تلقائيًا.
        </p>
        <button
          onClick={purge}
          disabled={purging}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-bold text-cyan-400 hover:bg-zinc-700 disabled:opacity-50"
        >
          {purging ? 'جاري المسح…' : 'مسح كاش الحافة الآن'}
        </button>
      </div>
    </div>
  )
}
