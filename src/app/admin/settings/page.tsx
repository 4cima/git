'use client'

import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, Database, Globe, Shield, Loader, AlertCircle } from 'lucide-react'

interface Settings {
  site_name: string
  site_description: string | null
  maintenance_mode: boolean
  registration_open: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    site_name: '4CIMA',
    site_description: '',
    maintenance_mode: false,
    registration_open: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const flash = (type: 'ok' | 'err', msg: string) => {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'فشل جلب الإعدادات')
      setSettings(data.settings)
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'خطأ في جلب الإعدادات')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'فشل الحفظ')
      flash('ok', 'تم حفظ الإعدادات بنجاح')
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'خطأ في الحفظ')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size={32} className="animate-spin text-cyan-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <SettingsIcon className="text-zinc-400" /> إعدادات النظام
          </h1>
          <p className="text-sm text-zinc-400 mt-1">إدارة إعدادات الموقع العامة</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>

      {feedback && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${feedback.type === 'ok' ? 'bg-emerald-950/40 border border-emerald-700/40 text-emerald-300' : 'bg-rose-950/40 border border-rose-700/40 text-rose-300'}`}>
          {feedback.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* General Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              إعدادات عامة
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">اسم الموقع</label>
                <input
                  type="text"
                  value={settings.site_name}
                  onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-zinc-100 focus:border-cyan-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">وصف الموقع (SEO)</label>
                <textarea
                  rows={3}
                  value={settings.site_description || ''}
                  onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-zinc-100 focus:border-cyan-500 outline-none transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              معلومات قاعدة البيانات
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">TMDB API Key</label>
                <div className="relative">
                  <input
                    type="password"
                    value="************************"
                    disabled
                    className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-lg py-2 px-3 text-sm text-zinc-500 cursor-not-allowed"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600">
                    يُدار من .env
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Turso Database URL</label>
                <div className="relative">
                  <input
                    type="text"
                    value="libsql://******.turso.io"
                    disabled
                    className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-lg py-2 px-3 text-sm text-zinc-500 cursor-not-allowed"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600">
                    يُدار من .env
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                <AlertCircle size={16} className="text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-300">
                  مفاتيح API والاتصالات الحساسة تُدار فقط عبر متغيرات البيئة (.env.local) لأسباب أمنية
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              حالة النظام
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-zinc-300 font-medium">وضع الصيانة</span>
                  <p className="text-xs text-zinc-500 mt-0.5">يوقف الوصول للموقع مؤقتاً</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.maintenance_mode}
                    onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-zinc-300 font-medium">التسجيل المفتوح</span>
                  <p className="text-xs text-zinc-500 mt-0.5">السماح بإنشاء حسابات جديدة</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.registration_open}
                    onChange={(e) => setSettings({ ...settings, registration_open: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}