'use client'

/**
 * بانل الإعلانات — 4 تابات: الشبكات / المناطق / السكك (waterfall) / الإعلانات الداخلية.
 * قاطع الطوارئ (kill switch) لحظي على كل الشبكات أو شبكة واحدة.
 * مصدر الـslots/الأنواع الوحيد: src/lib/adSlots.ts.
 */

import { useEffect, useState } from 'react'
import { Power, PowerOff, Plus, Pencil, Trash2, Loader, TriangleAlert } from 'lucide-react'
import { AD_SLOTS, AD_TYPES, AD_INTEGRATIONS, AD_DEVICES, HOUSE_TYPES, slotName } from '@/lib/adSlots'

type TabKey = 'networks' | 'zones' | 'mediation' | 'house'

type Provider = { id: number; name: string; slug: string; status: string; notes?: string | null }
type Zone = {
  id: number; provider_id: number; provider_name?: string; provider_slug?: string; provider_status?: string
  name: string; type: string; integration: string
  script_url?: string | null; html_snippet?: string | null; click_url?: string | null; vast_url?: string | null
  zone_key?: string | null; width?: number | null; height?: number | null; active?: number | null
}
type Assignment = {
  id: number; slot_key: string; zone_id: number; priority: number; weight: number; device: string
  active: number; zone_name?: string; zone_type?: string; provider_name?: string; provider_status?: string
}
type HouseAd = {
  id: number; title: string; type: string; content: string; position?: string | null; active?: number | null
  impressions?: number | null; clicks?: number | null; click_url?: string | null
}

async function call(url: string, method: string, body?: unknown): Promise<{ ok: boolean; msg?: string; data?: unknown }> {
  try {
    const res = await fetch(url, {
      method,
      ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, msg: (data as { error?: string }).error || `فشل (${res.status})` }
    return { ok: true, msg: (data as { message?: string }).message, data }
  } catch {
    return { ok: false, msg: 'خطأ في الاتصال' }
  }
}

function Flash({ flash }: { flash: { ok: boolean; msg: string } | null }) {
  if (!flash) return null
  return (
    <p className={`rounded-lg px-3 py-2 text-sm font-bold ${flash.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
      {flash.msg}
    </p>
  )
}

function Migrated({ migrated }: { migrated: boolean }) {
  if (migrated) return null
  return (
    <p className="mb-4 flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 px-3 py-2 text-sm text-orange-400">
      <TriangleAlert className="h-4 w-4" />
      جداول الوساطة غير منشأة في قاعدة البيانات — نفّذ migration أولاً.
    </p>
  )
}

const badge = (on: boolean, onText = 'تعمل', offText = 'متوقفة') => (
  <span className={`whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-bold ${on ? 'bg-emerald-400/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-400'}`}>
    {on ? onText : offText}
  </span>
)

const inputCls = 'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500'

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-black text-zinc-100">{title}</h3>
        {children}
      </div>
    </div>
  )
}

/* ═══════════ الشبكات ═══════════ */

function NetworksTab() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [migrated, setMigrated] = useState(true)
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmKill, setConfirmKill] = useState<Provider | 'ALL' | null>(null)
  const [adding, setAdding] = useState(false)
  const [pName, setPName] = useState('')
  const [pSlug, setPSlug] = useState('')
  const [pNotes, setPNotes] = useState('')

  const note = (ok: boolean, msg: string) => { setFlash({ ok, msg }); setTimeout(() => setFlash(null), 4000) }

  const load = async () => {
    setLoading(true)
    const r = await call('/api/admin/ads/providers', 'GET')
    if (r.ok) {
      const d = r.data as { data?: Provider[]; migrated?: boolean }
      setProviders(d?.data ?? [])
      setMigrated(d?.migrated !== false)
    } else note(false, r.msg || '')
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const toggle = async (p: Provider) => {
    setBusy(`t${p.id}`)
    const r = await call('/api/admin/ads/providers', 'PUT', { id: p.id, status: p.status === 'active' ? 'paused' : 'active' })
    note(r.ok, r.msg || (r.ok ? 'تم' : ''))
    setBusy(null)
    if (r.ok) load()
  }

  const doKill = async () => {
    if (!confirmKill) return
    setBusy('kill')
    const body = confirmKill === 'ALL' ? {} : { provider_id: (confirmKill as Provider).id }
    const r = await call('/api/admin/ads/kill', 'POST', body)
    note(r.ok, r.msg || '')
    setBusy(null)
    setConfirmKill(null)
    if (r.ok) load()
  }

  const addProvider = async () => {
    setBusy('add')
    const r = await call('/api/admin/ads/providers', 'POST', { name: pName, slug: pSlug, notes: pNotes || undefined })
    note(r.ok, r.msg || '')
    setBusy(null)
    if (r.ok) { setAdding(false); setPName(''); setPSlug(''); setPNotes(''); load() }
  }

  return (
    <div className="space-y-4">
      <Migrated migrated={migrated} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Flash flash={flash} />
        <div className="flex gap-2">
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-bold text-white hover:bg-cyan-500">
            <Plus className="h-4 w-4" /> شبكة مخصصة
          </button>
          <button
            onClick={() => setConfirmKill('ALL')}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-500"
          >
            <PowerOff className="h-4 w-4" /> قاطع الطوارئ — إيقاف الكل
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-zinc-400" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {providers.map((p) => (
            <div key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-100">{p.name}</span>
                  <span dir="ltr" className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{p.slug}</span>
                </div>
                {badge(p.status === 'active')}
              </div>
              {p.notes && <p className="mb-2 text-xs text-zinc-500">{p.notes}</p>}
              <div className="mt-2 flex gap-2">
                <button onClick={() => toggle(p)} disabled={busy === `t${p.id}`}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                    p.status === 'active' ? 'bg-zinc-800 text-orange-400 hover:bg-zinc-700' : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  } disabled:opacity-50`}>
                  {p.status === 'active' ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                  {p.status === 'active' ? 'إيقاف' : 'تشغيل'}
                </button>
                <button onClick={() => setConfirmKill(p)}
                  className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500">
                  إيقاف فوري
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmKill && (
        <Modal title="تأكيد الإيقاف الفوري" onClose={() => setConfirmKill(null)}>
          <p className="mb-5 text-sm text-zinc-300">
            هتوقف {confirmKill === 'ALL' ? 'كل الشبكات الإعلانية' : `شبكة «${(confirmKill as Provider).name}»`} فورًا على الموقع كله — الشبكة تختفي من serve في نفس اللحظة.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmKill(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">إلغاء</button>
            <button onClick={doKill} disabled={busy === 'kill'}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50">
              {busy === 'kill' ? <Loader className="h-4 w-4 animate-spin" /> : <PowerOff className="h-4 w-4" />} تأكيد الإيقاف
            </button>
          </div>
        </Modal>
      )}

      {adding && (
        <Modal title="شبكة إعلانية مخصصة" onClose={() => setAdding(false)}>
          <label className="mb-1 block text-xs font-bold text-zinc-400">الاسم</label>
          <input value={pName} onChange={(e) => setPName(e.target.value)} className={`mb-3 ${inputCls}`} />
          <label className="mb-1 block text-xs font-bold text-zinc-400">Slug (إنجليزي — غير محجوز)</label>
          <input value={pSlug} onChange={(e) => setPSlug(e.target.value)} dir="ltr" className={`mb-3 ${inputCls}`} />
          <label className="mb-1 block text-xs font-bold text-zinc-400">ملاحظات (اختياري)</label>
          <input value={pNotes} onChange={(e) => setPNotes(e.target.value)} className={`mb-5 ${inputCls}`} />
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">إلغاء</button>
            <button onClick={addProvider} disabled={busy === 'add' || !pName || !pSlug}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50">
              {busy === 'add' ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} إنشاء
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ═══════════ المناطق ═══════════ */

const emptyZone = {
  provider_id: 0, name: '', type: 'banner', integration: 'script',
  script_url: '', html_snippet: '', click_url: '', vast_url: '', zone_key: '', width: '', height: '', active: false,
}

function ZonesTab() {
  const [zones, setZones] = useState<Zone[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [migrated, setMigrated] = useState(true)
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Zone | null>(null)
  const [form, setForm] = useState<typeof emptyZone & { id?: number } | null>(null)

  const note = (ok: boolean, msg: string) => { setFlash({ ok, msg }); setTimeout(() => setFlash(null), 4000) }

  const load = async () => {
    setLoading(true)
    const [zr, pr] = await Promise.all([call('/api/admin/ads/zones', 'GET'), call('/api/admin/ads/providers', 'GET')])
    if (zr.ok) {
      const d = zr.data as { data?: Zone[]; migrated?: boolean }
      setZones(d?.data ?? [])
      setMigrated(d?.migrated !== false)
    } else note(false, zr.msg || '')
    if (pr.ok) setProviders(((pr.data as { data?: Provider[] }).data ?? []))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form) return
    setBusy('save')
    const isEdit = !!form.id
    const payload: Record<string, unknown> = {
      provider_id: form.provider_id, name: form.name, type: form.type, integration: form.integration,
      script_url: form.script_url || null, html_snippet: form.html_snippet || null,
      click_url: form.click_url || null, vast_url: form.vast_url || null, zone_key: form.zone_key || null,
      width: form.width ? Number(form.width) : null, height: form.height ? Number(form.height) : null, active: form.active,
    }
    if (isEdit) payload.id = form.id
    const r = await call('/api/admin/ads/zones', isEdit ? 'PUT' : 'POST', payload)
    note(r.ok, r.msg || '')
    setBusy(null)
    if (r.ok) { setForm(null); load() }
  }

  const toggleActive = async (z: Zone) => {
    setBusy(`a${z.id}`)
    const r = await call('/api/admin/ads/zones', 'PUT', { id: z.id, active: !z.active })
    note(r.ok, r.msg || '')
    setBusy(null)
    if (r.ok) load()
  }

  const doDelete = async () => {
    if (!deleting) return
    setBusy(`d${deleting.id}`)
    const r = await call(`/api/admin/ads/zones?id=${deleting.id}`, 'DELETE')
    note(r.ok, r.msg || '')
    setBusy(null)
    setDeleting(null)
    if (r.ok) load()
  }

  return (
    <div className="space-y-4">
      <Migrated migrated={migrated} />
      <div className="flex justify-end">
        <button onClick={() => setForm({ ...emptyZone, provider_id: providers[0]?.id ?? 0 })}
          disabled={providers.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50">
          <Plus className="h-4 w-4" /> منطقة جديدة
        </button>
      </div>
      <Flash flash={flash} />

      {loading ? (
        <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-zinc-400" /></div>
      ) : zones.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-500">لا مناطق بعد</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-right text-xs text-zinc-500">
                <th className="px-3 py-3 font-bold">المنطقة</th>
                <th className="px-3 py-3 font-bold">النوع</th>
                <th className="px-3 py-3 font-bold">التكامل</th>
                <th className="px-3 py-3 font-bold">الشبكة</th>
                <th className="px-3 py-3 font-bold">الحالة</th>
                <th className="px-3 py-3 font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-3 py-2.5">
                    <p className="font-bold text-zinc-100">{z.name}</p>
                    {z.zone_key && <p dir="ltr" className="text-[10px] text-zinc-500">{z.zone_key}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300" dir="ltr">{z.type}</td>
                  <td className="px-3 py-2.5 text-zinc-400" dir="ltr">{z.integration}</td>
                  <td className="px-3 py-2.5 text-zinc-300">{z.provider_name}</td>
                  <td className="px-3 py-2.5">{badge(!!z.active, 'مفعلة', 'غير مفعلة')}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1.5">
                      <button onClick={() => toggleActive(z)} disabled={busy === `a${z.id}`}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-bold ${z.active ? 'bg-zinc-800 text-orange-400 hover:bg-zinc-700' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}>
                        {z.active ? 'تعطيل' : 'تفعيل'}
                      </button>
                      <button onClick={() => setForm({
                        id: z.id, provider_id: z.provider_id, name: z.name, type: z.type, integration: z.integration,
                        script_url: z.script_url || '', html_snippet: z.html_snippet || '', click_url: z.click_url || '', vast_url: z.vast_url || '',
                        zone_key: z.zone_key || '', width: z.width ? String(z.width) : '', height: z.height ? String(z.height) : '', active: !!z.active,
                      })}
                        className="rounded-md bg-zinc-800 p-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-cyan-400" title="تعديل">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleting(z)} className="rounded-md bg-zinc-800 p-1.5 text-zinc-300 hover:bg-red-600 hover:text-white" title="حذف">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal title={form.id ? 'تعديل منطقة' : 'منطقة جديدة'} onClose={() => setForm(null)}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-bold text-zinc-400">الشبكة</label>
              <select value={form.provider_id} onChange={(e) => setForm({ ...form, provider_id: Number(e.target.value) })} className={inputCls}>
                {providers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.status === 'active' ? 'تعمل' : 'متوقفة'})</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-bold text-zinc-400">اسم المنطقة</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-400">النوع</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                {AD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-400">التكامل</label>
              <select value={form.integration} onChange={(e) => setForm({ ...form, integration: e.target.value })} className={inputCls}>
                {AD_INTEGRATIONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            {form.integration === 'script' && (
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-bold text-zinc-400">script_url</label>
                <input value={form.script_url} onChange={(e) => setForm({ ...form, script_url: e.target.value })} dir="ltr" className={inputCls} />
              </div>
            )}
            {form.integration === 'html' && (
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-bold text-zinc-400">html_snippet</label>
                <textarea value={form.html_snippet} onChange={(e) => setForm({ ...form, html_snippet: e.target.value })} dir="ltr" rows={3} className={`${inputCls} font-mono text-xs`} />
              </div>
            )}
            {form.integration === 'click_url' && (
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-bold text-zinc-400">click_url</label>
                <input value={form.click_url} onChange={(e) => setForm({ ...form, click_url: e.target.value })} dir="ltr" className={inputCls} />
              </div>
            )}
            {form.integration === 'vast_url' && (
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-bold text-zinc-400">vast_url</label>
                <input value={form.vast_url} onChange={(e) => setForm({ ...form, vast_url: e.target.value })} dir="ltr" className={inputCls} />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-400">zone_key (اختياري)</label>
              <input value={form.zone_key} onChange={(e) => setForm({ ...form, zone_key: e.target.value })} dir="ltr" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-400">عرض</label>
                <input value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-400">ارتفاع</label>
                <input value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} className={inputCls} />
              </div>
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-cyan-600" />
              مفعلة فورًا (تُخدم للزوار)
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setForm(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">إلغاء</button>
            <button onClick={save} disabled={busy === 'save' || !form.name || !form.provider_id}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50">
              {busy === 'save' ? <Loader className="h-4 w-4 animate-spin" /> : null} حفظ
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title="حذف المنطقة" onClose={() => setDeleting(null)}>
          <p className="mb-5 text-sm text-zinc-300">هتحذف «{deleting.name}» — الربط بـserve يزول فورًا.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleting(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">إلغاء</button>
            <button onClick={doDelete} disabled={busy === `d${deleting.id}`}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50">
              {busy === `d${deleting.id}` ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} حذف
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ═══════════ السكك (waterfall) ═══════════ */

const emptyAssignment = { slot_key: 'home-after-hero', zone_id: 0, priority: 1, weight: 1, device: 'all', active: true }

function MediationTab() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [migrated, setMigrated] = useState(true)
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Assignment | null>(null)
  const [form, setForm] = useState<typeof emptyAssignment & { id?: number } | null>(null)

  const note = (ok: boolean, msg: string) => { setFlash({ ok, msg }); setTimeout(() => setFlash(null), 4000) }

  const load = async () => {
    setLoading(true)
    const [ar, zr] = await Promise.all([call('/api/admin/ads/assignments', 'GET'), call('/api/admin/ads/zones', 'GET')])
    if (ar.ok) {
      const d = ar.data as { data?: Assignment[]; migrated?: boolean }
      setAssignments(d?.data ?? [])
      setMigrated(d?.migrated !== false)
    } else note(false, ar.msg || '')
    if (zr.ok) setZones(((zr.data as { data?: Zone[] }).data ?? []))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form) return
    setBusy('save')
    const isEdit = !!form.id
    const payload: Record<string, unknown> = {
      slot_key: form.slot_key, zone_id: form.zone_id, priority: form.priority, weight: form.weight,
      device: form.device, active: form.active,
    }
    if (isEdit) payload.id = form.id
    const r = await call('/api/admin/ads/assignments', isEdit ? 'PUT' : 'POST', payload)
    note(r.ok, r.msg || '')
    setBusy(null)
    if (r.ok) { setForm(null); load() }
  }

  const toggle = async (a: Assignment) => {
    setBusy(`a${a.id}`)
    const r = await call('/api/admin/ads/assignments', 'PUT', { id: a.id, active: !a.active })
    note(r.ok, r.msg || '')
    setBusy(null)
    if (r.ok) load()
  }

  const doDelete = async () => {
    if (!deleting) return
    setBusy(`d${deleting.id}`)
    const r = await call(`/api/admin/ads/assignments?id=${deleting.id}`, 'DELETE')
    note(r.ok, r.msg || '')
    setBusy(null)
    setDeleting(null)
    if (r.ok) load()
  }

  // تجميع حسب المساحة لعرض waterfall واضح
  const grouped = AD_SLOTS.map((s) => ({
    slot: s,
    items: assignments.filter((a) => a.slot_key === s.key).sort((x, y) => x.priority - y.priority),
  }))

  return (
    <div className="space-y-4">
      <Migrated migrated={migrated} />
      <div className="flex justify-end">
        <button onClick={() => setForm({ ...emptyAssignment, zone_id: zones[0]?.id ?? 0 })}
          disabled={zones.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50">
          <Plus className="h-4 w-4" /> ربط جديد
        </button>
      </div>
      <Flash flash={flash} />

      {loading ? (
        <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-zinc-400" /></div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ slot, items }) => (
            <div key={slot.key} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-cyan-400">{slot.name}</h3>
                <span dir="ltr" className="text-[10px] text-zinc-600">{slot.key}</span>
              </div>
              {items.length === 0 ? (
                <p className="text-xs text-zinc-600">فاضية — مفيش إعلان على المساحة دي</p>
              ) : (
                <div className="space-y-2">
                  {items.map((a) => (
                    <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-800/30 px-3 py-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] font-black text-zinc-300">P{a.priority}</span>
                        <span className="truncate text-sm text-zinc-200">{a.zone_name}</span>
                        <span dir="ltr" className="text-[10px] text-zinc-500">w{a.weight} · {a.device}</span>
                        {a.provider_status !== 'active' && <span className="rounded bg-orange-400/10 px-1.5 py-0.5 text-[10px] text-orange-400">الشبكة متوقفة</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {badge(!!a.active)}
                        <button onClick={() => toggle(a)} disabled={busy === `a${a.id}`}
                          className={`rounded-md px-2.5 py-1 text-xs font-bold ${a.active ? 'bg-zinc-800 text-orange-400 hover:bg-zinc-700' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}>
                          {a.active ? 'تعطيل' : 'تفعيل'}
                        </button>
                        <button onClick={() => setForm({ id: a.id, slot_key: a.slot_key, zone_id: a.zone_id, priority: a.priority, weight: a.weight, device: a.device, active: !!a.active })}
                          className="rounded-md bg-zinc-800 p-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-cyan-400">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleting(a)} className="rounded-md bg-zinc-800 p-1.5 text-zinc-300 hover:bg-red-600 hover:text-white">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal title={form.id ? 'تعديل ربط' : 'ربط جديد (waterfall)'} onClose={() => setForm(null)}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-bold text-zinc-400">المساحة</label>
              <select value={form.slot_key} onChange={(e) => setForm({ ...form, slot_key: e.target.value })} className={inputCls}>
                {AD_SLOTS.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-bold text-zinc-400">المنطقة</label>
              <select value={form.zone_id} onChange={(e) => setForm({ ...form, zone_id: Number(e.target.value) })} className={inputCls}>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name} ({z.provider_name})</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-400">الأولوية (1 = أعلى)</label>
              <input type="number" min={1} value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 1 })} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-400">الوزن</label>
              <input type="number" min={1} value={form.weight} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) || 1 })} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-400">الجهاز</label>
              <select value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value })} className={inputCls}>
                {AD_DEVICES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm text-zinc-300">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-cyan-600" />
              تعمل
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setForm(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">إلغاء</button>
            <button onClick={save} disabled={busy === 'save' || !form.zone_id}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50">
              {busy === 'save' ? <Loader className="h-4 w-4 animate-spin" /> : null} حفظ
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title="إزالة الربط" onClose={() => setDeleting(null)}>
          <p className="mb-5 text-sm text-zinc-300">هتزيل «{deleting.zone_name}» من مساحة «{slotName(deleting.slot_key)}».</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleting(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">إلغاء</button>
            <button onClick={doDelete} disabled={busy === `d${deleting.id}`}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50">
              {busy === `d${deleting.id}` ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} إزالة
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ═══════════ الإعلانات الداخلية ═══════════ */

const emptyHouse = { title: '', type: 'banner', content: '', position: '', click_url: '', active: true }

function HouseTab() {
  const [ads, setAds] = useState<HouseAd[]>([])
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<HouseAd | null>(null)
  const [form, setForm] = useState<typeof emptyHouse & { id?: number } | null>(null)

  const note = (ok: boolean, msg: string) => { setFlash({ ok, msg }); setTimeout(() => setFlash(null), 4000) }

  const load = async () => {
    setLoading(true)
    const r = await call('/api/admin/ads/house', 'GET')
    if (r.ok) setAds(((r.data as { data?: HouseAd[] }).data ?? []))
    else note(false, r.msg || '')
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form) return
    setBusy('save')
    const isEdit = !!form.id
    const payload: Record<string, unknown> = {
      title: form.title, type: form.type, content: form.content, position: form.position || null,
      click_url: form.click_url || null, active: form.active,
    }
    if (isEdit) payload.id = form.id
    const r = await call('/api/admin/ads/house', isEdit ? 'PUT' : 'POST', payload)
    note(r.ok, r.msg || '')
    setBusy(null)
    if (r.ok) { setForm(null); load() }
  }

  const toggle = async (ad: HouseAd) => {
    setBusy(`a${ad.id}`)
    const r = await call('/api/admin/ads/house', 'PUT', { id: ad.id, active: !ad.active })
    note(r.ok, r.msg || '')
    setBusy(null)
    if (r.ok) load()
  }

  const doDelete = async () => {
    if (!deleting) return
    setBusy(`d${deleting.id}`)
    const r = await call(`/api/admin/ads/house?id=${deleting.id}`, 'DELETE')
    note(r.ok, r.msg || '')
    setBusy(null)
    setDeleting(null)
    if (r.ok) load()
  }

  const demoOff = async () => {
    setBusy('demo')
    const r = await call('/api/admin/ads/demo-off', 'POST')
    note(r.ok, r.msg || '')
    setBusy(null)
    if (r.ok) load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <button onClick={demoOff} disabled={busy === 'demo'}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-bold text-orange-400 hover:bg-zinc-700 disabled:opacity-50">
          {busy === 'demo' ? <Loader className="h-4 w-4 animate-spin" /> : <TriangleAlert className="h-4 w-4" />} تعطيل التجريبية
        </button>
        <button onClick={() => setForm({ ...emptyHouse })}
          className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-bold text-white hover:bg-cyan-500">
          <Plus className="h-4 w-4" /> إعلان داخلي
        </button>
      </div>
      <Flash flash={flash} />

      {loading ? (
        <div className="flex justify-center py-16"><Loader className="h-6 w-6 animate-spin text-zinc-400" /></div>
      ) : ads.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-500">لا إعلانات داخلية</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-right text-xs text-zinc-500">
                <th className="px-3 py-3 font-bold">العنوان</th>
                <th className="px-3 py-3 font-bold">النوع</th>
                <th className="px-3 py-3 font-bold">الموضع</th>
                <th className="px-3 py-3 font-bold">ظهور / نقرات</th>
                <th className="px-3 py-3 font-bold">الحالة</th>
                <th className="px-3 py-3 font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => (
                <tr key={ad.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-3 py-2.5 font-bold text-zinc-100">{ad.title}</td>
                  <td className="px-3 py-2.5 text-zinc-300" dir="ltr">{ad.type}</td>
                  <td className="px-3 py-2.5 text-zinc-400" dir="ltr">{ad.position || '—'}</td>
                  <td className="px-3 py-2.5 text-zinc-400">{(ad.impressions ?? 0).toLocaleString('en-US')} / {(ad.clicks ?? 0).toLocaleString('en-US')}</td>
                  <td className="px-3 py-2.5">{badge(!!ad.active)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1.5">
                      <button onClick={() => toggle(ad)} disabled={busy === `a${ad.id}`}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-bold ${ad.active ? 'bg-zinc-800 text-orange-400 hover:bg-zinc-700' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}>
                        {ad.active ? 'تعطيل' : 'تفعيل'}
                      </button>
                      <button onClick={() => setForm({
                        id: ad.id, title: ad.title, type: ad.type, content: ad.content,
                        position: ad.position || '', click_url: ad.click_url || '', active: !!ad.active,
                      })}
                        className="rounded-md bg-zinc-800 p-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-cyan-400">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleting(ad)} className="rounded-md bg-zinc-800 p-1.5 text-zinc-300 hover:bg-red-600 hover:text-white">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal title={form.id ? 'تعديل إعلان داخلي' : 'إعلان داخلي جديد'} onClose={() => setForm(null)}>
          <label className="mb-1 block text-xs font-bold text-zinc-400">العنوان</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`mb-3 ${inputCls}`} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-400">النوع</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                {HOUSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-400">الموضع (اختياري)</label>
              <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} dir="ltr" className={inputCls} />
            </div>
          </div>
          <label className="mb-1 mt-3 block text-xs font-bold text-zinc-400">المحتوى (HTML)</label>
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} dir="ltr" rows={4} className={`${inputCls} font-mono text-xs`} />
          <label className="mb-1 mt-3 block text-xs font-bold text-zinc-400">click_url (اختياري)</label>
          <input value={form.click_url} onChange={(e) => setForm({ ...form, click_url: e.target.value })} dir="ltr" className={`mb-3 ${inputCls}`} />
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-cyan-600" />
            يعمل
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setForm(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">إلغاء</button>
            <button onClick={save} disabled={busy === 'save' || !form.title || !form.content}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50">
              {busy === 'save' ? <Loader className="h-4 w-4 animate-spin" /> : null} حفظ
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title="حذف الإعلان" onClose={() => setDeleting(null)}>
          <p className="mb-5 text-sm text-zinc-300">هتحذف «{deleting.title}» نهائيًا؟</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleting(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">إلغاء</button>
            <button onClick={doDelete} disabled={busy === `d${deleting.id}`}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50">
              {busy === `d${deleting.id}` ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} حذف
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ═══════════ الصفحة ═══════════ */

export default function AdsPage() {
  const [tab, setTab] = useState<TabKey>('networks')
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-zinc-100">الإعلانات — الوساطة</h2>
        <p className="text-xs text-zinc-500">شبكات خارجية مع إعلان داخلي احتياطي — القاطع لحظي وبيظهر على الموقع فورًا</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        {([
          ['networks', 'الشبكات'],
          ['zones', 'المناطق'],
          ['mediation', 'السكك'],
          ['house', 'الداخلية'],
        ] as [TabKey, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              tab === key ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
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
