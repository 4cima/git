'use client'

import { Settings as SettingsIcon, Save, Database, Globe, Shield } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <SettingsIcon className="text-zinc-400" /> إعدادات النظام
          </h1>
          <p className="text-sm text-zinc-400 mt-1">إدارة إعدادات الموقع وقواعد البيانات</p>
        </div>
        <button className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
          <Save size={16} /> حفظ التغييرات
        </button>
      </div>

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
                  defaultValue="4CIMA"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-zinc-100 focus:border-cyan-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">وصف الموقع (SEO)</label>
                <textarea 
                  rows={3}
                  defaultValue="موقع 4CIMA لمشاهدة أحدث الأفلام والمسلسلات المترجمة والمدبلجة بجودة عالية."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-zinc-100 focus:border-cyan-500 outline-none transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              إعدادات TMDB & Turso
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">TMDB API Key</label>
                <input 
                  type="password" 
                  defaultValue="************************"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-zinc-100 focus:border-purple-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Turso Database URL</label>
                <input 
                  type="text" 
                  defaultValue="libsql://4cima-db.turso.io"
                  disabled
                  className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-lg py-2 px-3 text-sm text-zinc-500 cursor-not-allowed"
                />
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">وضع الصيانة</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">التسجيل المفتوح</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
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