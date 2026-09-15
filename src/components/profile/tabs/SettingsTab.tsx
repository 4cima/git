'use client'

/**
 * src/components/profile/tabs/SettingsTab.tsx
 * الإعدادات — تبويب داخل صفحة البروفايل (لا صفحة /profile/settings منفصلة).
 * أربع بوابات expandable:
 *   معلومات شخصية → PUT /api/profile/update
 *   خصوصية        → GET/PUT /api/profile/privacy
 *   إشعارات       → GET/PUT /api/profile/notifications
 *   حذف حساب      → DELETE /api/profile/delete (endpoint حقيقي موجود فعلاً + تأكيد كتابي)
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, ChevronDown, Loader2, ShieldAlert, ShieldCheck, UserRound, XCircle } from 'lucide-react'
import {
  deleteAccount,
  fetchNotificationSettings,
  fetchPrivacy,
  updateNotificationSettings,
  updatePrivacy,
  updateProfileInfo,
} from '../api'
import { useAuth } from '@/hooks/useAuth'
import { useApi } from '../hooks'
import type { NotificationSettings, PrivacySettings } from '../types'

type GateKey = 'info' | 'privacy' | 'notifications' | 'danger'

function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
  disabled?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-zinc-900/60 px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-zinc-200">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>}
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-6 w-11 rounded-full bg-zinc-700 transition-colors peer-checked:bg-amber-500 peer-disabled:opacity-50" />
        <span className="absolute right-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:-translate-x-5" />
      </span>
    </label>
  )
}

function Feedback({ message, error }: { message: string | null; error?: boolean }) {
  if (!message) return null
  return (
    <p className={`mt-2 text-xs font-semibold ${error ? 'text-red-400' : 'text-emerald-400'}`}>{message}</p>
  )
}

/* ── بوابة معلومات شخصية ─────────────────────────────────────────────────── */

function InfoGateBody() {
  const { profile, user, refreshProfile } = useAuth()
  const currentName = profile?.username || user?.user_metadata?.full_name || ''
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null

  const [name, setName] = useState(currentName)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  const save = async () => {
    if (busy) return
    setBusy(true)
    setMsg(null)
    try {
      await updateProfileInfo(name, avatarUrl)
      await refreshProfile(true)
      setMsg('تم حفظ المعلومات بنجاح.')
      setIsError(false)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'تعذّر الحفظ.')
      setIsError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-zinc-400">اسم المستخدم</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          dir="ltr"
          className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500/60"
          placeholder="اسم المستخدم"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-zinc-400">البريد الإلكتروني (غير قابل للتعديل)</span>
        <input
          value={user?.email ?? ''}
          disabled
          dir="ltr"
          className="w-full cursor-not-allowed rounded-xl border border-white/5 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-500"
        />
      </label>
      <button
        type="button"
        onClick={save}
        disabled={busy || !name.trim() || name.trim() === currentName}
        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-extrabold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        حفظ
      </button>
      <Feedback message={msg} error={isError} />
    </div>
  )
}

/* ── بوابة الخصوصية ──────────────────────────────────────────────────────── */

function PrivacyGateBody() {
  const { data, loading, error } = useApi<PrivacySettings>(fetchPrivacy)
  const [state, setState] = useState<PrivacySettings | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    if (data) setState(data)
  }, [data])

  const save = async () => {
    if (!state || busy) return
    setBusy(true)
    setMsg(null)
    try {
      await updatePrivacy(state)
      setMsg('تم حفظ إعدادات الخصوصية. (مرة واحدة كل 24 ساعة)')
      setIsError(false)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'تعذّر الحفظ.')
      setIsError(true)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="h-24 animate-pulse rounded-xl bg-zinc-800/60" />
  if (error) return <p className="text-sm text-red-400">{error}</p>
  if (!state) return null

  return (
    <div className="space-y-3">
      <Toggle
        label="إظهار سجل المشاهدة"
        hint="السماح بعرض سجل مشاهداتك على ملفك العام."
        checked={state.showWatchHistory}
        disabled={busy}
        onChange={(v) => setState({ ...state, showWatchHistory: v })}
      />
      <Toggle
        label="إظهار المفضلة"
        hint="السماح بعرض قائمة مفضلتك على ملفك العام."
        checked={state.showFavorites}
        disabled={busy}
        onChange={(v) => setState({ ...state, showFavorites: v })}
      />
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-extrabold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        حفظ
      </button>
      <Feedback message={msg} error={isError} />
    </div>
  )
}

/* ── بوابة الإشعارات ─────────────────────────────────────────────────────── */

function NotificationsGateBody() {
  const { data, loading, error } = useApi<NotificationSettings>(fetchNotificationSettings)
  const [state, setState] = useState<NotificationSettings | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    if (data) setState(data)
  }, [data])

  const save = async () => {
    if (!state || busy) return
    setBusy(true)
    setMsg(null)
    try {
      await updateNotificationSettings(state)
      setMsg('تم حفظ إعدادات الإشعارات. (مرة واحدة كل 24 ساعة)')
      setIsError(false)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'تعذّر الحفظ.')
      setIsError(true)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="h-24 animate-pulse rounded-xl bg-zinc-800/60" />
  if (error) return <p className="text-sm text-red-400">{error}</p>
  if (!state) return null

  return (
    <div className="space-y-3">
      <Toggle
        label="إشعارات البريد الإلكتروني"
        checked={state.emailNotifications}
        disabled={busy}
        onChange={(v) => setState({ ...state, emailNotifications: v })}
      />
      <Toggle
        label="إشعارات المحتوى الجديد"
        hint="إخباري عند إضافة أفلام أو مسلسلات جديدة."
        checked={state.newContentNotif}
        disabled={busy}
        onChange={(v) => setState({ ...state, newContentNotif: v })}
      />
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-extrabold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        حفظ
      </button>
      <Feedback message={msg} error={isError} />
    </div>
  )
}

/* ── بوابة حذف الحساب ────────────────────────────────────────────────────── */

function DangerGateBody() {
  const { signOut } = useAuth()
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const canDelete = confirmText.trim() === 'حذف'

  const handleDelete = async () => {
    if (!canDelete || busy) return
    setBusy(true)
    setMsg(null)
    try {
      await deleteAccount()
      await signOut()
      router.replace('/')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'تعذّر حذف الحساب.')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-red-300">
        سيتم حذف حسابك نهائياً مع كل بياناتك: المفضلة، سجل المشاهدة، التقييمات، والإعدادات. لا يمكن التراجع.
      </p>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-zinc-400">
          اكتب كلمة <span className="text-red-400">«حذف»</span> للتأكيد
        </span>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full rounded-xl border border-red-500/30 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-red-500"
          placeholder="حذف"
        />
      </label>
      <button
        type="button"
        onClick={handleDelete}
        disabled={!canDelete || busy}
        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
        حذف الحساب نهائياً
      </button>
      <Feedback message={msg} error />
    </div>
  )
}

/* ── التبويب ─────────────────────────────────────────────────────────────── */

const GATES: {
  key: GateKey
  title: string
  desc: string
  icon: typeof UserRound
  danger?: boolean
}[] = [
  { key: 'info', title: 'معلومات شخصية', desc: 'اسم المستخدم والبريد', icon: UserRound },
  { key: 'privacy', title: 'خصوصية', desc: 'تحكم فيما يراه الآخرون', icon: ShieldCheck },
  { key: 'notifications', title: 'إشعارات', desc: 'البريد والمحتوى الجديد', icon: Bell },
  { key: 'danger', title: 'حذف الحساب', desc: 'إجراء نهائي لا يمكن التراجع عنه', icon: ShieldAlert, danger: true },
]

export function SettingsTab() {
  const [open, setOpen] = useState<GateKey | null>(null)

  return (
    <section>
      <h2 className="mb-4 text-lg font-extrabold text-white">الإعدادات</h2>
      <div className="space-y-3">
        {GATES.map((gate) => {
          const Icon = gate.icon
          const isOpen = open === gate.key
          return (
            <div
              key={gate.key}
              className={`overflow-hidden rounded-2xl border bg-zinc-900/50 ${
                gate.danger ? 'border-red-500/25' : 'border-white/5'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : gate.key)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-right transition-colors hover:bg-white/5"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    gate.danger ? 'bg-red-500/10' : 'bg-amber-500/10'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${gate.danger ? 'text-red-400' : 'text-amber-500'}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-extrabold ${gate.danger ? 'text-red-400' : 'text-white'}`}>
                    {gate.title}
                  </span>
                  <span className="block text-xs text-zinc-500">{gate.desc}</span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className="border-t border-white/5 p-4">
                      {gate.key === 'info' && <InfoGateBody />}
                      {gate.key === 'privacy' && <PrivacyGateBody />}
                      {gate.key === 'notifications' && <NotificationsGateBody />}
                      {gate.key === 'danger' && <DangerGateBody />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </section>
  )
}
