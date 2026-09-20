'use client'

import { useState, useEffect } from 'react'
import { Save, Loader, ShieldAlert, Wrench, Info } from 'lucide-react'

interface Settings {
  site_name: string
  site_description: string
  maintenance_mode: boolean
  registration_open: boolean
}

const inputCls = 'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    site_name: '4CIMA',
    site_description: '',
    maintenance_mode: false,
    registration_open: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [purging, setPurging] = useState(false)
  const [confirmMaintenance, setConfirmMaintenance] = useState(false)
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null)

  const note = (ok: boolean, msg: string) => {
    setFlash({ ok, msg })
    setTimeout(() => setFlash(null), 4000)
  }

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/admin/settings', { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok || !data.ok) throw new Error(data.error || 'فشل جلب الإعدادات')
        setSettings(data.settings)
      } catch (e) {
        note(false, e instanceof Error ? e.message : 'خطأ في جلب الإعدادات')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'فشل الحفظ')
      note(true, data.message || 'تم الحفظ')
    } catch (e) {
      note(false, e instanceof Error ? e.message : 'خطأ في الحفظ')
    } finally {
      setSaving(false)
      setConfirmMaintenance(false)
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

  if (loading) {
    return <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-zinc-400" /></div>
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl font-black text-zinc-100">الإعدادات</h2>
        <p className="text-xs text-zinc-500">تغيير وضع الصيانة بيمسح كاش الحافة تلقائيًا — ساري فورًا على كل الصفحات</p>
      </div>

      {flash && (
        <p className={`rounded-lg px-3 py-2 text-sm font-bold ${flash.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {flash.msg}
        </p>
      )}

      {/* وضع الصيانة */}
      <div className={`rounded-xl border p-5 ${settings.maintenance_mode ? 'border-orange-500/40 bg-orange-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-zinc-100">
              <ShieldAlert className={`h-5 w-5 ${settings.maintenance_mode ? 'text-orange-400' : 'text-zinc-500'}`} />
              وضع الصيانة
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              يقفل الموقع بالكامل عن الزوار ويظهر صفحة «تحت الصيانة» — الإدارة تقدر تتصفح طبيعي، وصفحة الدخول والـauth شغالين.
            </p>
            {settings.maintenance_mode && (
              <p className="mt-2 rounded bg-orange-500/10 px-2 py-1 text-xs font-bold text-orange-400">
                ⚠️ الصيانة مفعلة الآن — الموقع مقفول عن الزوار
              </p>
            )}
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={settings.maintenance_mode}
              onChange={(e) => {
                if (e.target.checked) setConfirmMaintenance(true)
                else setSettings({ ...settings, maintenance_mode: false })
              }}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-zinc-700 after:absolute after:top-0.5 after:right-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-orange-500 peer-checked:after:-translate-x-5" />
          </label>
        </div>
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
        onClick={save}
        disabled={saving || confirmMaintenance}
        className="flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50"
      >
        {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ الإعدادات
      </button>

      {confirmMaintenance && (
        <div className="rounded-xl border border-orange-500/40 bg-orange-500/5 p-5">
          <h3 className="mb-1 font-bold text-orange-400">تأكيد تفعيل وضع الصيانة</h3>
          <p className="mb-4 text-sm text-zinc-300">الموقع هيقف عن كل الزوار فورًا (خلال دقيقة). متأكد؟</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setSettings({ ...settings, maintenance_mode: true }); setConfirmMaintenance(false) }}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-500"
            >
              نعم، فعّل الصيانة
            </button>
            <button onClick={() => setConfirmMaintenance(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
              إلغاء
            </button>
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
          مسح شامل لكل الصفحات المكتاشة على الحافة — استخدمه بعد تغييرات المحتوى اليدوية. أول طلب بعد المسح أبطأ (طبيعي).
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
