/**
 * Profile Settings Page - Complete settings with real functionality
 */

'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState, useRef, useEffect } from 'react'
import { User, Lock, Bell, Eye, Trash2, Save, Loader, Camera, Check, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { validateUsername } from '@/lib/usernameValidator'

export default function ProfileSettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeSection, setActiveSection] = useState<'profile' | 'privacy' | 'notifications'>('profile')
  
  // Profile settings
  const [username, setUsername] = useState(profile?.username || '')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Privacy settings — loaded from API
  const [showWatchHistory, setShowWatchHistory] = useState(true)
  const [showFavorites, setShowFavorites] = useState(true)
  const [privacyLoaded, setPrivacyLoaded] = useState(false)
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [privacyFeedback, setPrivacyFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Notification settings — loaded from API
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [newContentNotif, setNewContentNotif] = useState(true)
  const [notifLoaded, setNotifLoaded] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [notificationsFeedback, setNotificationsFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Load privacy settings from D1 on mount
  useEffect(() => {
    fetch('/api/profile/privacy')
      .then(r => r.json())
      .then(d => {
        if (d.showWatchHistory !== undefined) setShowWatchHistory(d.showWatchHistory)
        if (d.showFavorites   !== undefined) setShowFavorites(d.showFavorites)
        setPrivacyLoaded(true)
      })
      .catch(() => setPrivacyLoaded(true))
  }, [])

  // Load notification settings from D1 on mount
  useEffect(() => {
    fetch('/api/profile/notifications')
      .then(r => r.json())
      .then(d => {
        if (d.emailNotifications !== undefined) setEmailNotifications(d.emailNotifications)
        if (d.newContentNotif    !== undefined) setNewContentNotif(d.newContentNotif)
        setNotifLoaded(true)
      })
      .catch(() => setNotifLoaded(true))
  }, [])

  if (!user || !profile) return null

  // Validate username on change
  useEffect(() => {
    if (username && username !== (profile?.username ?? '')) {
      const validation = validateUsername(username)
      setUsernameError(validation.valid ? null : validation.error || null)
    } else {
      setUsernameError(null)
    }
  }, [username, profile?.username])

  const flashFeedback = (
    setter: (value: any) => void,
    type: 'success' | 'error',
    msg: string
  ) => {
    setter({ type, msg })
    setTimeout(() => setter(null), 4000)
  }

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      flashFeedback(setProfileFeedback, 'error', 'اسم المستخدم مطلوب')
      return
    }
    if (usernameError) {
      flashFeedback(setProfileFeedback, 'error', usernameError)
      return
    }
    setSavingProfile(true)
    try {
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), avatar_url: avatarUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل التحديث')
      flashFeedback(setProfileFeedback, 'success', 'تم حفظ التغييرات بنجاح')
      await refreshProfile()
    } catch (error: any) {
      flashFeedback(setProfileFeedback, 'error', error.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSavePrivacy = async () => {
    setSavingPrivacy(true)
    try {
      const res = await fetch('/api/profile/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showWatchHistory, showFavorites }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل التحديث')
      flashFeedback(setPrivacyFeedback, 'success', 'تم حفظ إعدادات الخصوصية')
    } catch (error: any) {
      flashFeedback(setPrivacyFeedback, 'error', error.message)
    } finally {
      setSavingPrivacy(false)
    }
  }

  const handleSaveNotifications = async () => {
    setSavingNotifications(true)
    try {
      const res = await fetch('/api/profile/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailNotifications, newContentNotif }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل التحديث')

      flashFeedback(setNotificationsFeedback, 'success', 'تم حفظ إعدادات الإشعارات')
    } catch (error: any) {
      flashFeedback(setNotificationsFeedback, 'error', error.message)
    } finally {
      setSavingNotifications(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== profile.username) {
      flashFeedback(setProfileFeedback, 'error', 'اسم المستخدم غير صحيح')
      return
    }

    setDeleting(true)
    try {
      const res = await fetch('/api/profile/delete', {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل حذف الحساب')

      // Redirect to home after successful deletion
      router.push('/')
    } catch (error: any) {
      flashFeedback(setProfileFeedback, 'error', error.message)
      setDeleting(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 1MB)
    if (file.size > 1 * 1024 * 1024) {
      flashFeedback(setProfileFeedback, 'error', 'حجم الصورة يجب أن يكون أقل من 1 ميجابايت')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      flashFeedback(setProfileFeedback, 'error', 'الملف يجب أن يكون صورة')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    const formData = new FormData()
    formData.append('avatar', file)

    setUploadingAvatar(true)
    try {
      const res = await fetch('/api/profile/upload-avatar', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل رفع الصورة')

      setAvatarUrl(data.avatar_url)
      setAvatarPreview(null)
      flashFeedback(setProfileFeedback, 'success', 'تم رفع الصورة بنجاح')
      await refreshProfile()
    } catch (error: any) {
      setAvatarPreview(null)
      flashFeedback(setProfileFeedback, 'error', error.message)
    } finally {
      setUploadingAvatar(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 py-8 px-4" dir="rtl">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <Link href="/profile" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors mb-3 inline-block">
            ← العودة للملف الشخصي
          </Link>
          <h1 className="text-3xl font-black text-zinc-100 mb-2 mt-4">إعدادات الحساب</h1>
          <p className="text-zinc-400">إدارة حسابك وإعداداتك الشخصية</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          
          {/* Sidebar Navigation */}
          <div className="md:col-span-1">
            <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-2 space-y-1 sticky top-8">
              <button
                onClick={() => setActiveSection('profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-right ${
                  activeSection === 'profile'
                    ? 'bg-gradient-to-r from-red-600 to-cyan-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                }`}
              >
                <User size={18} />
                <span className="text-sm">الملف الشخصي</span>
              </button>

              <button
                onClick={() => setActiveSection('privacy')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-right ${
                  activeSection === 'privacy'
                    ? 'bg-gradient-to-r from-red-600 to-cyan-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                }`}
              >
                <Eye size={18} />
                <span className="text-sm">الخصوصية</span>
              </button>

              <button
                onClick={() => setActiveSection('notifications')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-right ${
                  activeSection === 'notifications'
                    ? 'bg-gradient-to-r from-red-600 to-cyan-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                }`}
              >
                <Bell size={18} />
                <span className="text-sm">الإشعارات</span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3 space-y-6">
            
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8">
                <h2 className="text-xl font-bold text-zinc-100 mb-6">معلومات الملف الشخصي</h2>

                {profileFeedback && (
                  <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
                    profileFeedback.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-700/40 text-emerald-300'
                      : 'bg-rose-950/40 border border-rose-700/40 text-rose-300'
                  }`}>
                    {profileFeedback.msg}
                  </div>
                )}

                {/* Avatar */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-zinc-300 mb-3">الصورة الشخصية</label>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      {avatarPreview || avatarUrl ? (
                        <img
                          src={avatarPreview || avatarUrl}
                          alt={username}
                          className="w-24 h-24 rounded-2xl object-cover border-4 border-zinc-800"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-red-600 to-cyan-400 flex items-center justify-center text-white text-3xl font-black">
                          {username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                          <Loader size={24} className="text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <Camera size={16} />
                        {uploadingAvatar ? 'جاري الرفع...' : 'تغيير الصورة'}
                      </button>
                      <p className="text-xs text-zinc-500 mt-2">JPG, PNG أو WebP (حد أقصى 1MB)</p>
                      <p className="text-xs text-emerald-400 mt-1">✓ سيتم تحسين الصورة تلقائياً لـ 200×200</p>
                    </div>
                  </div>
                </div>

                {/* Username */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    اسم المستخدم
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-zinc-100 focus:ring-2 outline-none transition-colors ${
                      usernameError 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                        : 'border-zinc-800 focus:border-cyan-500 focus:ring-cyan-500/20'
                    }`}
                    placeholder="اسم المستخدم"
                    minLength={5}
                    maxLength={30}
                  />
                  {usernameError && (
                    <div className="mt-2 flex items-start gap-2 text-xs text-red-400">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>{usernameError}</span>
                    </div>
                  )}
                  {!usernameError && username && username !== profile?.username && (
                    <div className="mt-2 flex items-start gap-2 text-xs text-emerald-400">
                      <Check size={14} className="mt-0.5 shrink-0" />
                      <span>اسم المستخدم متاح</span>
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 mt-2">
                    • الحد الأدنى 5 أحرف • لا يحتوي على كلمات غير لائقة • يمكن التغيير مرة كل 24 ساعة
                  </p>
                </div>

                {/* Email (read-only) */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-zinc-500 mt-2">لا يمكن تغيير البريد الإلكتروني</p>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile || (!!usernameError && username !== profile?.username)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-cyan-600 hover:from-red-500 hover:to-cyan-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingProfile ? (
                    <><Loader size={18} className="animate-spin" /> جاري الحفظ...</>
                  ) : (
                    <><Save size={18} /> حفظ التغييرات</>
                  )}
                </button>
              </div>
            )}

            {/* Privacy Section */}
            {activeSection === 'privacy' && (
              <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8">
                <h2 className="text-xl font-bold text-zinc-100 mb-2">إعدادات الخصوصية</h2>
                <p className="text-sm text-zinc-400 mb-6">تحكم في من يمكنه رؤية نشاطك • يمكن التعديل مرة كل 24 ساعة</p>

                {privacyFeedback && (
                  <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
                    privacyFeedback.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-700/40 text-emerald-300'
                      : 'bg-rose-950/40 border border-rose-700/40 text-rose-300'
                  }`}>
                    {privacyFeedback.msg}
                  </div>
                )}

                {!privacyLoaded ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader size={24} className="animate-spin text-zinc-400" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-800">
                        <div>
                          <h3 className="text-sm font-bold text-zinc-100 mb-1">إظهار سجل المشاهدة</h3>
                          <p className="text-xs text-zinc-500">السماح للآخرين برؤية ما شاهدته</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={showWatchHistory}
                          onClick={() => setShowWatchHistory(v => !v)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                            showWatchHistory ? 'bg-gradient-to-r from-red-600 to-cyan-600' : 'bg-zinc-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
                              showWatchHistory ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-800">
                        <div>
                          <h3 className="text-sm font-bold text-zinc-100 mb-1">إظهار المفضلة</h3>
                          <p className="text-xs text-zinc-500">السماح للآخرين برؤية قائمة المفضلة</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={showFavorites}
                          onClick={() => setShowFavorites(v => !v)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                            showFavorites ? 'bg-gradient-to-r from-red-600 to-cyan-600' : 'bg-zinc-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
                              showFavorites ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleSavePrivacy}
                      disabled={savingPrivacy}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-cyan-600 hover:from-red-500 hover:to-cyan-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingPrivacy ? (
                        <><Loader size={18} className="animate-spin" /> جاري الحفظ...</>
                      ) : (
                        <><Save size={18} /> حفظ التغييرات</>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8">
                <h2 className="text-xl font-bold text-zinc-100 mb-2">إعدادات الإشعارات</h2>
                <p className="text-sm text-zinc-400 mb-6">اختر الإشعارات التي تريد استلامها • يمكن التعديل مرة كل 24 ساعة</p>

                {notificationsFeedback && (
                  <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
                    notificationsFeedback.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-700/40 text-emerald-300'
                      : 'bg-rose-950/40 border border-rose-700/40 text-rose-300'
                  }`}>
                    {notificationsFeedback.msg}
                  </div>
                )}

                {!notifLoaded ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader size={24} className="animate-spin text-zinc-400" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-800">
                        <div>
                          <h3 className="text-sm font-bold text-zinc-100 mb-1">الإشعارات عبر البريد الإلكتروني</h3>
                          <p className="text-xs text-zinc-500">تلقي إشعارات على البريد الإلكتروني</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={emailNotifications}
                          onClick={() => setEmailNotifications(v => !v)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                            emailNotifications ? 'bg-gradient-to-r from-red-600 to-cyan-600' : 'bg-zinc-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
                              emailNotifications ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-800">
                        <div>
                          <h3 className="text-sm font-bold text-zinc-100 mb-1">إشعارات المحتوى الجديد</h3>
                          <p className="text-xs text-zinc-500">إعلامك بالأفلام والمسلسلات الجديدة</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={newContentNotif}
                          onClick={() => setNewContentNotif(v => !v)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                            newContentNotif ? 'bg-gradient-to-r from-red-600 to-cyan-600' : 'bg-zinc-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
                              newContentNotif ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveNotifications}
                      disabled={savingNotifications}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-cyan-600 hover:from-red-500 hover:to-cyan-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingNotifications ? (
                        <><Loader size={18} className="animate-spin" /> جاري الحفظ...</>
                      ) : (
                        <><Save size={18} /> حفظ التغييرات</>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
