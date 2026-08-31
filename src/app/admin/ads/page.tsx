'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  Eye,
  EyeOff,
  Power,
  Plus,
  Pencil,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { toast } from '@/lib/toast-manager'

type TabKey = 'networks' | 'zones' | 'mediation' | 'house'

type Provider = {
  id: number
  name: string
  slug: string
  status: 'active' | 'paused'
  notes?: string | null
}

type Zone = {
  id: number
  provider_id: number
  provider_name?: string
  provider_slug?: string
  name: string
  type: string
  integration: string
  script_url?: string | null
  html_snippet?: string | null
  click_url?: string | null
  vast_url?: string | null
  zone_key?: string | null
  width?: number | null
  height?: number | null
  active?: number | null
}

type SlotDef = { slot_key: string; name: string; types?: string }

type Assignment = {
  id: number
  slot_key: string
  zone_id: number
  priority: number
  weight: number
  device: string
  start_at?: string | null
  end_at?: string | null
  frequency_cap: number
  frequency_hours: number
  active: number
  zone_name?: string
  zone_type?: string
  provider_name?: string
  provider_slug?: string
  provider_status?: string
}

type HouseAd = {
  id: number
  title: string
  type: string
  content?: string
  position?: string | null
  active?: number | null
  impressions?: number | null
  clicks?: number | null
}

const ZONE_TYPES = ['popunder', 'banner', 'native', 'push', 'preroll_vast', 'midroll_vast', 'interstitial']
const INTEGRATIONS = ['script', 'html', 'click_url', 'vast_url']
const SLOT_KEYS = ['home-after-hero', 'details-below-player', 'watch-preroll', 'watch-midroll', 'global-popunder']
const DEVICES = ['all', 'mobile', 'desktop']

export default function AdsPage() {
  const [tab, setTab] = useState<TabKey>('networks')
  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">الإعلانات — الوساطة</h1>
          <p className="mt-1 text-sm text-zinc-400">
            شبكات خارجية مع إعلان داخلي احتياطي. البوبندر والشبكات تعمل على صفحة المشاهدة فقط.
          </p>
        </div>
        <a
          href="/ads-test"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 border border-zinc-700"
        >
          🧪 صفحة تجربة الإعلانات
        </a>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        {(
          [
            ['networks', 'الشبكات'],
            ['zones', 'المناطق (Zones)'],
            ['mediation', 'السكك (Mediation)'],
            ['house', 'الإعلانات الداخلية'],
          ] as [TabKey, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === key ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'networks' && <NetworksTab />}
      {tab === 'zones' && <ZonesTab />}
      {tab === 'mediation' && <MediationTab />}
      {tab === 'house' && <HouseTab />}
    </div>
  )
}

function NetworksTab() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [migrated, setMigrated] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ads/providers', { cache: 'no-store' })
      const data = await res.json()
      setProviders(Array.isArray(data.data) ? data.data : [])
      setMigrated(data.migrated !== false)
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحميل الشبكات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const toggleStatus = async (p: Provider) => {
    setBusyId(p.id)
    const next = p.status === 'active' ? 'paused' : 'active'
    try {
      const res = await fetch('/api/admin/ads/providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, status: next }),
      })
      const data = await res.json()
      if (!res.ok) return void toast.error(data?.error || 'فشل التحديث')
      toast.success(next === 'active' ? `تم تشغيل ${p.name}` : `تم إيقاف ${p.name} — يسري فورًا`)
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'فشل التحديث')
    } finally {
      setBusyId(null)
    }
  }

  const killAll = async () => {
    if (!confirm('إيقاف كل الشبكات الخارجية فورًا؟')) return
    try {
      const res = await fetch('/api/admin/ads/kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) return void toast.error(data?.error || 'فشل الإيقاف')
      toast.success('تم إيقاف كل الشبكات — لا إعلانات شبكات الآن')
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'فشل الإيقاف')
    }
  }

  if (!migrated) {
    return (
      <div className="rounded-lg border border-amber-600/40 bg-amber-950/30 p-6 text-amber-200">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldAlert size={18} /> قاعدة الوساطة لم تُهاجَر بعد
        </div>
        <p className="mt-2 text-sm text-amber-200/80">
          الجداول (providers/zones/assignments) غير موجودة بعد. بعد تشغيل الـ migration
          (بإذنك) تظهر الشبكات هنا. الإعلانات الداخلية تبقى تعمل.
        </p>
      </div>
    )
  }

  return (
<div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          الإيقاف يسري فورًا في الموقع (بدون كاش). البوبندر والتشغيل للشبكات على المشاهدة فقط.
        </p>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700">
            <RefreshCw size={14} /> تحديث
          </button>
          <button onClick={killAll} className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700">
            <Power size={14} /> إيقاف كل الشبكات
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-zinc-500">جاري التحميل…</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full bg-zinc-900">
            <thead className="bg-zinc-800">
              <tr>
                <th className="px-4 py-3 text-right">الشبكة</th>
                <th className="px-4 py-3 text-right">Slug</th>
                <th className="px-4 py-3 text-right">الحالة</th>
                <th className="px-4 py-3 text-right">ملاحظة</th>
                <th className="px-4 py-3 text-right">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400" dir="ltr">{p.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status === 'active' ? 'bg-emerald-600/20 text-emerald-300' : 'bg-zinc-700 text-zinc-400'
                    }`}>
                      {p.status === 'active' ? 'نشطة' : 'متوقفة'}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-zinc-400">{p.notes || '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      disabled={busyId === p.id}
                      onClick={() => toggleStatus(p)}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${
                        p.status === 'active'
                          ? 'bg-red-600/20 text-red-300 hover:bg-red-600/30'
                          : 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'
                      }`}
                    >
                      <Power size={12} /> {p.status === 'active' ? 'إيقاف فوري' : 'تشغيل'}
                    </button>
                  </td>
                </tr>
              ))}
              {providers.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-zinc-500">لا توجد شبكات بعد — تُضاف تلقائيًا بعد الـ migration.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
function ZonesTab() {
  const [zones, setZones] = useState<Zone[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [migrated, setMigrated] = useState(true)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    provider_id: 0,
    name: '',
    type: 'banner',
    integration: 'script',
    script_url: '',
    html_snippet: '',
    click_url: '',
    vast_url: '',
    zone_key: '',
    width: '',
    height: '',
    active: 0,
  })

  const load = async () => {
    setLoading(true)
    try {
      const [zRes, pRes] = await Promise.all([
        fetch('/api/admin/ads/zones', { cache: 'no-store' }),
        fetch('/api/admin/ads/providers', { cache: 'no-store' }),
      ])
      const zData = await zRes.json()
      const pData = await pRes.json()
      setZones(Array.isArray(zData.data) ? zData.data : [])
      setProviders(Array.isArray(pData.data) ? pData.data : [])
      setMigrated(zData.migrated !== false)
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحميل المناطق')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])
const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.provider_id) return void toast.error('اختر الشبكة أولًا')
    if (!form.name.trim()) return void toast.error('أدخل اسمًا للمنطقة')
    try {
      const res = await fetch('/api/admin/ads/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: form.provider_id,
          name: form.name,
          type: form.type,
          integration: form.integration,
          script_url: form.script_url || null,
          html_snippet: form.html_snippet || null,
          click_url: form.click_url || null,
          vast_url: form.vast_url || null,
          zone_key: form.zone_key || null,
          width: form.width ? Number(form.width) : null,
          height: form.height ? Number(form.height) : null,
          active: form.active,
        }),
      })
      const data = await res.json()
      if (!res.ok) return void toast.error(data?.error || 'فشل الإضافة')
      toast.success(data.message || 'تم إنشاء المنطقة')
      setForm({ provider_id: 0, name: '', type: 'banner', integration: 'script', script_url: '', html_snippet: '', click_url: '', vast_url: '', zone_key: '', width: '', height: '', active: 0 })
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'فشل الإضافة')
    }
  }

  const toggleActive = async (z: Zone) => {
    try {
      const res = await fetch('/api/admin/ads/zones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: z.id, active: z.active ? 0 : 1 }),
      })
      const data = await res.json()
      if (!res.ok) return void toast.error(data?.error || 'فشل التحديث')
      toast.success(z.active ? 'تم إيقاف المنطقة' : 'تم تفعيل المنطقة')
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'فشل التحديث')
    }
  }

  const remove = async (z: Zone) => {
    if (!confirm('حذف هذه المنطقة نهائيًا؟')) return
    try {
      const res = await fetch(`/api/admin/ads/zones?id=${z.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) return void toast.error(data?.error || 'فشل الحذف')
      toast.success('تم حذف المنطقة')
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'فشل الحذف')
    }
  }
return (
    <div className="space-y-6">
      <div className="rounded-lg border border-blue-600/30 bg-blue-950/20 p-4 text-sm text-blue-200">
        <p>⚠️ البوبندر والشبكات الخارجية: سكربت/رابط حقيقي من لوحة الشبكة — ممنوع example.com. المنطقة تُنشأ <b>غير نشطة</b> (active=0) حتى تراجعها وتفعّلها.</p>
      </div>

      {!migrated && (
        <div className="rounded-lg border border-amber-600/40 bg-amber-950/30 p-4 text-sm text-amber-200">
          قاعدة الوساطة لم تُهاجَر بعد — بعد الـ migration تصبح الجداول متاحة.
        </div>
      )}

      <form onSubmit={submit} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-semibold"><Plus size={16} /> منطقة جديدة</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            الشبكة
            <select
              value={form.provider_id}
              onChange={(e) => setForm({ ...form, provider_id: Number(e.target.value) })}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2"
            >
              <option value={0}>— اختر شبكة —</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name} {p.status === 'active' ? '(نشطة)' : '(متوقفة)'}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            الاسم
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مثل: Banner Home 728x90"
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            النوع
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2">
              {ZONE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="text-sm">
            طريقة الدمج
            <select value={form.integration} onChange={(e) => setForm({ ...form, integration: e.target.value })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2">
              {INTEGRATIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {form.integration === 'script' && (
            <label className="text-sm md:col-span-2">
              script_url (https، من لوحة الشبكة)
              <input value={form.script_url} onChange={(e) => setForm({ ...form, script_url: e.target.value })} dir="ltr" placeholder="https://…" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2" />
            </label>
          )}
          {form.integration === 'html' && (
            <label className="text-sm md:col-span-2">
              html_snippet
              <textarea value={form.html_snippet} onChange={(e) => setForm({ ...form, html_snippet: e.target.value })} rows={3} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2" />
            </label>
          )}
          {form.integration === 'click_url' && (
            <label className="text-sm md:col-span-2">
              click_url (https)
              <input value={form.click_url} onChange={(e) => setForm({ ...form, click_url: e.target.value })} dir="ltr" placeholder="https://…" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2" />
            </label>
          )}
          {form.integration === 'vast_url' && (
            <label className="text-sm md:col-span-2">
              vast_url (https، رابط VAST من الشبكة)
              <input value={form.vast_url} onChange={(e) => setForm({ ...form, vast_url: e.target.value })} dir="ltr" placeholder="https://…/vast" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2" />
            </label>
          )}
          <label className="text-sm">
            Zone ID / Key (من لوحة الشبكة)
            <input value={form.zone_key} onChange={(e) => setForm({ ...form, zone_key: e.target.value })} dir="ltr" placeholder="123456" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              العرض
              <input value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} inputMode="numeric" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2" />
            </label>
            <label className="text-sm">
              الارتفاع
              <input value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} inputMode="numeric" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2" />
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active === 1} onChange={(e) => setForm({ ...form, active: e.target.checked ? 1 : 0 })} className="h-4 w-4" />
            نشطة فورًا
          </label>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            إضافة المنطقة
          </button>
        </div>
      </form>
<div className="overflow-hidden rounded-lg border border-zinc-800">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">جاري التحميل…</div>
        ) : (
          <table className="w-full bg-zinc-900">
            <thead className="bg-zinc-800">
              <tr>
                <th className="px-4 py-3 text-right">ID</th>
                <th className="px-4 py-3 text-right">الاسم</th>
                <th className="px-4 py-3 text-right">الشبكة</th>
                <th className="px-4 py-3 text-right">النوع</th>
                <th className="px-4 py-3 text-right">الدمج</th>
                <th className="px-4 py-3 text-right">Zone Key</th>
                <th className="px-4 py-3 text-right">الحالة</th>
                <th className="px-4 py-3 text-right">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3 text-sm text-zinc-400">{z.id}</td>
                  <td className="px-4 py-3">{z.name}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{z.provider_name || z.provider_slug || '-'}</td>
                  <td className="px-4 py-3 text-sm" dir="ltr">{z.type}</td>
                  <td className="px-4 py-3 text-sm" dir="ltr">{z.integration}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400" dir="ltr">{z.zone_key || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      z.active ? 'bg-emerald-600/20 text-emerald-300' : 'bg-zinc-700 text-zinc-400'
                    }`}>
                      {z.active ? 'نشطة' : 'متوقفة'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => toggleActive(z)} className="text-blue-400 hover:text-blue-300" title="تفعيل/إيقاف">
                        {z.active ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button onClick={() => remove(z)} className="text-red-400 hover:text-red-300" title="حذف">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {zones.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-zinc-500">لا توجد مناطق بعد.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
function MediationTab() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [slots, setSlots] = useState<SlotDef[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [migrated, setMigrated] = useState(true)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    slot_key: 'home-after-hero',
    zone_id: 0,
    priority: '1',
    weight: '1',
    device: 'all',
    start_at: '',
    end_at: '',
    frequency_cap: '1',
    frequency_hours: '24',
    active: 1,
    noCap: false,
  })
  const [editingId, setEditingId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [aRes, zRes] = await Promise.all([
        fetch('/api/admin/ads/assignments', { cache: 'no-store' }),
        fetch('/api/admin/ads/zones', { cache: 'no-store' }),
      ])
      const aData = await aRes.json()
      const zData = await zRes.json()
      setAssignments(Array.isArray(aData.data) ? aData.data : [])
      setSlots(Array.isArray(aData.slots) ? aData.slots : [])
      setZones(Array.isArray(zData.data) ? zData.data : [])
      setMigrated(aData.migrated !== false)
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحميل السكك')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])
const emptyForm = { slot_key: 'home-after-hero', zone_id: 0, priority: '1', weight: '1', device: 'all', start_at: '', end_at: '', frequency_cap: '1', frequency_hours: '24', active: 1, noCap: false }
const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.zone_id) return void toast.error('اختر منطقة أولًا')
    const payload = {
          slot_key: form.slot_key,
          zone_id: Number(form.zone_id),
          priority: Number(form.priority),
          weight: Number(form.weight),
          device: form.device,
          start_at: form.start_at || null,
          end_at: form.end_at || null,
          // noCap => 0/0 = بلا كاب (يظهر دائمًا)
          frequency_cap: form.noCap ? 0 : Number(form.frequency_cap),
          frequency_hours: form.noCap ? 0 : Number(form.frequency_hours),
          active: form.active,
    }
    try {
      const res = await fetch('/api/admin/ads/assignments', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      })
      const data = await res.json()
      if (!res.ok) return void toast.error(data?.error || (editingId ? 'فشل حفظ التعديل' : 'فشل الإضافة'))
      toast.success(editingId ? 'تم حفظ تعديل السكة' : 'تمت إضافة السكة إلى الـ waterfall')
      setEditingId(null)
      setForm({ ...emptyForm })
      await load()
    } catch (err: any) {
      toast.error(err?.message || (editingId ? 'فشل حفظ التعديل' : 'فشل الإضافة'))
    }
  }

  const startEdit = (a: Assignment) => {
    setEditingId(a.id)
    setForm({
      slot_key: a.slot_key,
      zone_id: a.zone_id,
      priority: String(a.priority),
      weight: String(a.weight),
      device: a.device,
      start_at: a.start_at ? a.start_at.slice(0, 16) : '',
      end_at: a.end_at ? a.end_at.slice(0, 16) : '',
      frequency_cap: String(a.frequency_cap ?? 1),
      frequency_hours: String(a.frequency_hours ?? 24),
      active: a.active ? 1 : 0,
      noCap: !a.frequency_cap || !a.frequency_hours,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = async (a: Assignment) => {
    try {
      const res = await fetch(`/api/admin/ads/assignments?id=${a.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) return void toast.error(data?.error || 'فشل الحذف')
      toast.success('تمت إزالة السكة')
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'فشل الحذف')
    }
  }

  const updatePriority = async (a: Assignment, priority: number) => {
    try {
      const res = await fetch('/api/admin/ads/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id, priority }),
      })
      const data = await res.json()
      if (!res.ok) return void toast.error(data?.error || 'فشل تحديث الأولوية')
      toast.success('تم تحديث الأولوية')
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحديث الأولوية')
    }
  }

  const toggle = async (a: Assignment) => {
    try {
      const res = await fetch('/api/admin/ads/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id, active: a.active ? 0 : 1 }),
      })
      const data = await res.json()
      if (!res.ok) return void toast.error(data?.error || 'فشل التحديث')
      toast.success(a.active ? 'تم إيقاف السكة' : 'تم تفعيل السكة')
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'فشل التحديث')
    }
  }
return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
        ترتيب الـ <b>Waterfall</b>: الأولوية 1 أولًا، وضمن نفس الأولوية اختيار عشوائي مرجّح (weight).
        لو لم تتوفر شبكة (متوقفة/خارج الجدول/جهاز) ينتقل للإعلان الداخلي (House) ثم لا شيء — المشغّل لا ينكسر.
      </div>

      {!migrated && (
        <div className="rounded-lg border border-amber-600/40 bg-amber-950/30 p-4 text-sm text-amber-200">
          قاعدة الوساطة لم تُهاجَر بعد — بعد الـ migration تصبح الجداول متاحة.
        </div>
      )}

      <form onSubmit={submit} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          {editingId ? <><Pencil size={16} /> تعديل السكة #{editingId}</> : <><Plus size={16} /> سكة جديدة</>}
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-sm">
            السكة (Slot)
            <select value={form.slot_key} onChange={(e) => setForm({ ...form, slot_key: e.target.value })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2">
              {SLOT_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label className="text-sm">
            المنطقة (Zone)
            <select value={form.zone_id} onChange={(e) => setForm({ ...form, zone_id: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2">
              <option value={0}>— اختر منطقة —</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>#{z.id} {z.name} ({z.type})</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            الجهاز
            <select value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2">
              {DEVICES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="text-sm">
            الأولوية (1 = الأعلى)
            <input value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} inputMode="numeric" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2" />
          </label>
          <label className="text-sm">
            الوزن
            <input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} inputMode="numeric" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2" />
          </label>
          <label className="text-sm">
            التكرار (مرات/ساعات)
            <div className="flex gap-2">
              <input value={form.noCap ? '' : form.frequency_cap} onChange={(e) => setForm({ ...form, frequency_cap: e.target.value })} disabled={form.noCap} placeholder="∞" inputMode="numeric" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 disabled:opacity-40" title="عدد المرات" />
              <input value={form.noCap ? '' : form.frequency_hours} onChange={(e) => setForm({ ...form, frequency_hours: e.target.value })} disabled={form.noCap} placeholder="∞" inputMode="numeric" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 disabled:opacity-40" title="خلال ساعات" />
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-zinc-300">
              <input type="checkbox" checked={form.noCap} onChange={(e) => setForm({ ...form, noCap: e.target.checked })} className="h-4 w-4" />
              دائم (بدون حد للتكرار — يظهر دائمًا)
            </label>
          </label>
          <label className="text-sm">
            البداية (اختياري)
            <input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2" />
          </label>
          <label className="text-sm">
            النهاية (اختياري)
            <input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2" />
          </label>
          <div className="flex items-end gap-3 pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active === 1} onChange={(e) => setForm({ ...form, active: e.target.checked ? 1 : 0 })} className="h-4 w-4" /> نشطة
            </label>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
              {editingId ? 'حفظ التعديل' : 'إضافة'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm({ ...emptyForm }) }} className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
                إلغاء
              </button>
            )}
          </div>
        </div>
      </form>
<div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">جاري التحميل…</div>
        ) : (
          SLOT_KEYS.map((slotKey) => {
            const list = assignments
              .filter((a) => a.slot_key === slotKey)
              .sort((a, b) => a.priority - b.priority || a.id - b.id)
            return (
              <div key={slotKey} className="rounded-lg border border-zinc-800 bg-zinc-900">
                <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                  <div>
                    <span className="font-semibold" dir="ltr">{slotKey}</span>
                    <span className="mr-2 text-xs text-zinc-500">
                      {slots.find((s) => s.slot_key === slotKey)?.name || ''}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">{list.length} سكة</span>
                </div>
                {list.length === 0 ? (
                  <div className="p-4 text-center text-sm text-zinc-600">لا سكك لهذا الـ slot — يقع تلقائيًا إلى House ثم null.</div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-zinc-800/60">
                      <tr>
                        <th className="px-3 py-2 text-right text-xs">الأولوية</th>
                        <th className="px-3 py-2 text-right text-xs">المصدر</th>
                        <th className="px-3 py-2 text-right text-xs">الوزن</th>
                        <th className="px-3 py-2 text-right text-xs">الجهاز</th>
                        <th className="px-3 py-2 text-right text-xs">الفترة</th>
                        <th className="px-3 py-2 text-right text-xs">التكرار</th>
                        <th className="px-3 py-2 text-right text-xs">الحالة</th>
                        <th className="px-3 py-2 text-right text-xs">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((a) => (
                        <tr key={a.id} className="border-t border-zinc-800/60">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <button onClick={() => updatePriority(a, Math.max(1, a.priority - 1))} className="rounded bg-zinc-800 px-1.5 text-zinc-300 hover:bg-zinc-700" title="رفع">▲</button>
                              <span className="w-5 text-center text-sm">{a.priority}</span>
                              <button onClick={() => updatePriority(a, a.priority + 1)} className="rounded bg-zinc-800 px-1.5 text-zinc-300 hover:bg-zinc-700" title="خفض">▼</button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span className="font-medium">{a.provider_name || a.zone_name || `zone#${a.zone_id}`}</span>
                            <span className="mr-1 text-xs text-zinc-500" dir="ltr">({a.zone_type})</span>
                            <span className={`mr-1 text-xs ${a.provider_status === 'active' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                              {a.provider_status === 'active' ? 'نشطة' : 'موقوفة'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-zinc-300">{a.weight}</td>
                          <td className="px-3 py-2 text-sm text-zinc-400">{a.device}</td>
                          <td className="px-3 py-2 text-xs text-zinc-400">
                            {a.start_at ? `${a.start_at.slice(0, 10)} → ${a.end_at ? a.end_at.slice(0, 10) : '...'}` : 'دائم'}
                          </td>
                          <td className="px-3 py-2 text-xs text-zinc-400">
                            {!a.frequency_cap || !a.frequency_hours ? <span className="text-emerald-400">دائم (∞)</span> : `${a.frequency_cap}× / ${a.frequency_hours}h`}
                          </td>
                          <td className="px-3 py-2">
                            <button onClick={() => toggle(a)} className={`text-xs font-medium ${a.active ? 'text-emerald-400' : 'text-zinc-500'}`}>
                              {a.active ? 'نشطة' : 'موقوفة'}
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <button onClick={() => startEdit(a)} className="text-zinc-400 hover:text-blue-400" title="تعديل"><Pencil size={15} /></button>
                              <button onClick={() => remove(a)} className="text-red-400 hover:text-red-300" title="حذف"><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
function HouseTab() {
  const [ads, setAds] = useState<HouseAd[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<HouseAd | null>(null)
  const [form, setForm] = useState({
    title: '',
    type: 'banner',
    content: '',
    position: '',
    click_url: '',
    active: 1,
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ads/house', { cache: 'no-store' })
      const data = await res.json()
      setAds(Array.isArray(data.data) ? data.data : [])
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحميل الإعلانات الداخلية')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) return void toast.error('العنوان والمحتوى مطلوبان')
    try {
      const res = await fetch('/api/admin/ads/house', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing?.id,
          title: form.title,
          type: form.type,
          content: form.content,
          position: form.position || null,
          click_url: form.click_url || null,
          active: form.active,
        }),
      })
      const data = await res.json()
      if (!res.ok) return void toast.error(data?.error || 'فشل الحفظ')
      toast.success(editing ? 'تم تحديث الإعلان' : 'تمت الإضافة')
      setEditing(null)
      setForm({ title: '', type: 'banner', content: '', position: '', click_url: '', active: 1 })
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'فشل الحفظ')
    }
  }

  const startEdit = (ad: HouseAd) => {
    setEditing(ad)
    setForm({
      title: ad.title,
      type: ad.type,
      content: ad.content || '',
      position: ad.position || '',
      click_url: '',
      active: ad.active ? 1 : 0,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = async (ad: HouseAd) => {
    if (!confirm('حذف هذا الإعلان؟')) return
    try {
      const res = await fetch(`/api/admin/ads/house?id=${ad.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) return void toast.error(data?.error || 'فشل الحذف')
      toast.success('تم الحذف')
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'فشل الحذف')
    }
  }

  const toggle = async (ad: HouseAd) => {
    try {
      const res = await fetch('/api/admin/ads/house', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ad.id, active: ad.active ? 0 : 1 }),
      })
      const data = await res.json()
      if (!res.ok) return void toast.error(data?.error || 'فشل التحديث')
      toast.success(ad.active ? 'تم الإيقاف' : 'تم التفعيل')
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'فشل التحديث')
    }
  }

  const demoOff = async () => {
    if (!confirm('تعطيل كل الإعلانات التجريبية وexample.com؟')) return
    try {
      const res = await fetch('/api/admin/ads/demo-off', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) return void toast.error(data?.error || 'فشل التعطيل')
      toast.success(`تم تعطيل ${data.disabled ?? 0} إعلان تجريبي`)
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'فشل التعطيل')
    }
  }
return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
          الإعلانات الداخلية (House) = جدول <code dir="ltr">ads</code> الحالي — احتياطي يظهر فقط لو لم تتوفر شبكة.
        </p>
        <button
          onClick={demoOff}
          className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-900/20 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-900/40"
        >
          <ShieldAlert size={15} /> تعطيل كل التجريبي
        </button>
      </div>

      <form onSubmit={submit} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <Plus size={16} /> {editing ? `تعديل إعلان #${editing.id}` : 'إعلان داخلي جديد'}
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            العنوان
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2" />
          </label>
          <label className="text-sm">
            النوع
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2">
              {['banner', 'popunder', 'preroll', 'midroll'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="text-sm md:col-span-2">
            المحتوى (HTML/سكربت)
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2" />
          </label>
          <label className="text-sm">
            الموقع (position)
            <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="home-after-hero" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2" />
          </label>
          <label className="text-sm">
            click_url (اختياري)
            <input value={form.click_url} onChange={(e) => setForm({ ...form, click_url: e.target.value })} dir="ltr" placeholder="https://…" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2" />
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={form.active === 1} onChange={(e) => setForm({ ...form, active: e.target.checked ? 1 : 0 })} className="h-4 w-4" />
            نشط
            <button type="submit" className="mr-auto rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
              {editing ? 'تحديث' : 'إضافة'}
            </button>
            {editing && (
              <button type="button" onClick={() => { setEditing(null); setForm({ title: '', type: 'banner', content: '', position: '', click_url: '', active: 1 }) }} className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600">
                إلغاء
              </button>
            )}
          </label>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-zinc-800">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">جاري التحميل…</div>
        ) : (
          <table className="w-full bg-zinc-900">
            <thead className="bg-zinc-800">
              <tr>
                <th className="px-4 py-3 text-right">ID</th>
                <th className="px-4 py-3 text-right">العنوان</th>
                <th className="px-4 py-3 text-right">النوع</th>
                <th className="px-4 py-3 text-right">الموقع</th>
                <th className="px-4 py-3 text-right">المشاهدات/النقرات</th>
                <th className="px-4 py-3 text-right">الحالة</th>
                <th className="px-4 py-3 text-right">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => (
                <tr key={ad.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3 text-sm text-zinc-400">{ad.id}</td>
                  <td className="px-4 py-3">{ad.title}</td>
                  <td className="px-4 py-3 text-sm" dir="ltr">{ad.type}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{ad.position || '-'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-500">
                    <span className="text-amber-400/80">العدّادات متوقفة</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggle(ad)} className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      ad.active ? 'bg-emerald-600/20 text-emerald-300' : 'bg-zinc-700 text-zinc-400'
                    }`}>
                      {ad.active ? 'نشط' : 'موقوف'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(ad)} className="text-blue-400 hover:text-blue-300" title="تعديل"><Activity size={16} /></button>
                      <button onClick={() => remove(ad)} className="text-red-400 hover:text-red-300" title="حذف"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {ads.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-zinc-500">لا توجد إعلانات داخلية.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}