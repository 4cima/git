/**
 * Profile Page - Enhanced professional user profile
 */

'use client'

import { useAuth } from '@/hooks/useAuth'
import { User, Mail, Calendar, Shield, Film, Tv, Clock, Heart, Award, TrendingUp, Star, Edit2, Settings, LogOut } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, profile, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'stats'>('overview')

  if (!user || !profile) {
    return null
  }

  const joinDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'غير متوفر'

  const roleConfig = {
    admin: { label: 'مشرف', color: 'from-red-500 to-orange-500', icon: Shield },
    supervisor: { label: 'مراقب', color: 'from-cyan-500 to-blue-500', icon: Shield },
    user: { label: 'مستخدم', color: 'from-zinc-600 to-zinc-700', icon: User },
  }
  
  const roleInfo = roleConfig[profile.role as keyof typeof roleConfig] || roleConfig.user

  // Mock stats - will be replaced with real data
  const stats = {
    moviesWatched: 0,
    seriesWatched: 0,
    totalWatchTime: 0,
    favorites: 0,
    reviews: 0,
    achievements: 0,
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 py-8 px-4" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Profile Header Card */}
        <div className="relative rounded-3xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-xl overflow-hidden">
          {/* Cover Background */}
          <div className="h-48 bg-gradient-to-br from-red-600/20 via-purple-600/20 to-cyan-600/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
          </div>
          
          {/* Profile Info */}
          <div className="relative px-8 pb-8 -mt-16">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              {/* Avatar */}
              <div className="relative">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-32 h-32 rounded-2xl object-cover border-4 border-zinc-900 shadow-2xl"
                  />
                ) : (
                  <div className={`w-32 h-32 rounded-2xl bg-gradient-to-br ${roleInfo.color} flex items-center justify-center text-white text-4xl font-black shadow-2xl border-4 border-zinc-900`}>
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                )}
                
                {/* Role Badge */}
                <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-lg bg-gradient-to-r ${roleInfo.color} text-white text-xs font-bold shadow-lg flex items-center gap-1.5`}>
                  <roleInfo.icon size={12} />
                  {roleInfo.label}
                </div>
              </div>
              
              {/* User Info */}
              <div className="flex-1 pb-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-black text-zinc-100 mb-1 tracking-tight">{profile.username}</h1>
                    <p className="text-zinc-400 flex items-center gap-2 text-sm">
                      <Mail size={14} />
                      {user.email}
                    </p>
                    <p className="text-zinc-500 flex items-center gap-2 text-xs mt-1">
                      <Calendar size={12} />
                      انضم في {joinDate}
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors text-sm font-medium">
                      <Edit2 size={14} />
                      تعديل
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors text-sm font-medium">
                      <Settings size={14} />
                      الإعدادات
                    </button>
                    <button 
                      onClick={logout}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl transition-colors text-sm font-medium border border-red-600/20"
                    >
                      <LogOut size={14} />
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 hover:border-cyan-600/50 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-cyan-600/10 text-cyan-400 group-hover:bg-cyan-600/20 transition-colors">
                <Film size={20} />
              </div>
              <TrendingUp size={14} className="text-cyan-400 opacity-50" />
            </div>
            <div className="text-3xl font-black text-zinc-100 mb-1">{stats.moviesWatched}</div>
            <div className="text-xs text-zinc-500 font-medium">أفلام</div>
          </div>
          
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 hover:border-purple-600/50 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-purple-600/10 text-purple-400 group-hover:bg-purple-600/20 transition-colors">
                <Tv size={20} />
              </div>
              <TrendingUp size={14} className="text-purple-400 opacity-50" />
            </div>
            <div className="text-3xl font-black text-zinc-100 mb-1">{stats.seriesWatched}</div>
            <div className="text-xs text-zinc-500 font-medium">مسلسلات</div>
          </div>
          
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 hover:border-orange-600/50 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-orange-600/10 text-orange-400 group-hover:bg-orange-600/20 transition-colors">
                <Clock size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-zinc-100 mb-1">{stats.totalWatchTime}</div>
            <div className="text-xs text-zinc-500 font-medium">ساعة مشاهدة</div>
          </div>
          
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 hover:border-red-600/50 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-red-600/10 text-red-400 group-hover:bg-red-600/20 transition-colors">
                <Heart size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-zinc-100 mb-1">{stats.favorites}</div>
            <div className="text-xs text-zinc-500 font-medium">مفضلة</div>
          </div>
          
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 hover:border-yellow-600/50 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-yellow-600/10 text-yellow-400 group-hover:bg-yellow-600/20 transition-colors">
                <Star size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-zinc-100 mb-1">{stats.reviews}</div>
            <div className="text-xs text-zinc-500 font-medium">تقييم</div>
          </div>
          
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 hover:border-emerald-600/50 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-emerald-600/10 text-emerald-400 group-hover:bg-emerald-600/20 transition-colors">
                <Award size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-zinc-100 mb-1">{stats.achievements}</div>
            <div className="text-xs text-zinc-500 font-medium">إنجاز</div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-red-600 to-cyan-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
            }`}
          >
            نظرة عامة
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'activity'
                ? 'bg-gradient-to-r from-red-600 to-cyan-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
            }`}
          >
            النشاط
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'stats'
                ? 'bg-gradient-to-r from-red-600 to-cyan-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
            }`}
          >
            الإحصائيات
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-2">
                  <User size={20} className="text-cyan-400" />
                  معلومات الحساب
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-800">
                    <div className="p-3 rounded-xl bg-zinc-700 text-zinc-300">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">اسم المستخدم</p>
                      <p className="text-sm font-bold text-zinc-100">{profile.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-800">
                    <div className="p-3 rounded-xl bg-zinc-700 text-zinc-300">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">البريد الإلكتروني</p>
                      <p className="text-sm font-bold text-zinc-100">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-800">
                    <div className="p-3 rounded-xl bg-zinc-700 text-zinc-300">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">تاريخ الانضمام</p>
                      <p className="text-sm font-bold text-zinc-100">{joinDate}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-800">
                    <div className="p-3 rounded-xl bg-zinc-700 text-zinc-300">
                      <Shield size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">نوع الحساب</p>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r ${roleInfo.color} text-white text-xs font-bold`}>
                        <roleInfo.icon size={12} />
                        {roleInfo.label}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              {profile.role === 'admin' || profile.role === 'supervisor' ? (
                <div>
                  <h2 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-2">
                    <Shield size={20} className="text-orange-400" />
                    روابط سريعة
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Link 
                      href="/admin/dashboard"
                      className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-orange-600/10 to-red-600/10 border border-orange-600/20 hover:border-orange-600/40 transition-all group"
                    >
                      <div className="p-3 rounded-xl bg-orange-600/20 text-orange-400 group-hover:bg-orange-600/30 transition-colors">
                        <Shield size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-100 group-hover:text-orange-400 transition-colors">لوحة التحكم</p>
                        <p className="text-xs text-zinc-500">إدارة الموقع والمحتوى</p>
                      </div>
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="text-center py-12">
              <Clock size={48} className="text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-zinc-300 mb-2">قريباً</h3>
              <p className="text-zinc-500">سيتم عرض نشاطك وسجل المشاهدة هنا</p>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="text-center py-12">
              <TrendingUp size={48} className="text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-zinc-300 mb-2">قريباً</h3>
              <p className="text-zinc-500">سيتم عرض إحصائيات مفصلة هنا</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
