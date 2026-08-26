/**
 * Profile Page - Complete professional user profile with real data
 */

'use client'

import { useAuth } from '@/hooks/useAuth'
import { User, Mail, Calendar, Shield, Film, Tv, Clock, Heart, Award, TrendingUp, Star, Settings, LogOut, Play, CheckCircle } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { MovieCard } from '@/components/features/media/MovieCard'

interface Stats {
  moviesWatched: number
  seriesWatched: number
  totalWatchTime: number
  favorites: number
  reviews: number
  achievements: number
}

type TabType = 'overview' | 'activity' | 'favorites' | 'completed' | 'stats'

interface Activity {
  type: 'watch' | 'favorite' | 'review'
  content_type: string
  tmdb_id: number
  title: string | null
  poster_path?: string | null
  date: string
  slug?: string | null
  data: {
    watch_duration?: number
    completed?: boolean
    season_number?: number
    episode_number?: number
    rating?: number
    review_text?: string
    [key: string]: unknown
  }
}

// Helper to check if slug is numeric-only
const isNumericSlug = (slug: string): boolean => {
  // Check if all characters are digits
  for (let i = 0; i < slug.length; i++) {
    const char = slug.charAt(i);
    if (char < '0' || char > '9') return false;
  }
  return true;
}

// Helper to build content URL from slug - validate slug is not numeric
const buildContentUrl = (contentType: string, slug?: string | null, tmdbId?: number): string | null => {
  if (!slug || slug.trim() === '') return null
  // Reject numeric-only slugs
  if (isNumericSlug(slug.trim())) return null
  return contentType === 'tv' ? `/series/${slug}` : `/movies/${slug}`
}

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [stats, setStats] = useState<Stats>({
    moviesWatched: 0,
    seriesWatched: 0,
    totalWatchTime: 0,
    favorites: 0,
    reviews: 0,
    achievements: 0,
  })
  const [activities, setActivities] = useState<Activity[]>([])
  const [favoritesList, setFavoritesList] = useState<any[]>([])
  const [completedList, setCompletedList] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [loadingFavorites, setLoadingFavorites] = useState(false)
  const [loadingCompleted, setLoadingCompleted] = useState(false)

  // Remove from grid as soon as the heart leaves this tab's state
  const handleFavoriteStateChange = useCallback((newState: 'neutral' | 'favorite' | 'completed', item: any) => {
    if (newState !== 'favorite') {
      setFavoritesList(prev => prev.filter(i => i.tmdb_id !== item.tmdb_id || i.content_type !== item.content_type))
    }
  }, [])

  const handleCompletedStateChange = useCallback((newState: 'neutral' | 'favorite' | 'completed', item: any) => {
    if (newState !== 'completed') {
      setCompletedList(prev => prev.filter(i => i.tmdb_id !== item.tmdb_id || i.content_type !== item.content_type))
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchActivity()
  }, [])

  useEffect(() => {
    if (activeTab === 'activity' && activities.length === 0) {
      fetchActivity()
    }
    if (activeTab === 'favorites' && favoritesList.length === 0) {
      fetchFavorites()
    }
    if (activeTab === 'completed' && completedList.length === 0) {
      fetchCompleted()
    }
  }, [activeTab])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/profile/stats', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.ok && data.stats) {
          // Map API response to UI structure
          setStats({
            moviesWatched: 0, // API doesn't separate by type yet
            seriesWatched: 0,
            totalWatchTime: Math.floor((data.stats.total_watch_duration_minutes || 0) / 60), // Convert minutes to hours
            favorites: data.stats.favorites || 0,
            reviews: data.stats.user_reviews || 0,
            achievements: data.stats.user_achievements || 0,
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchActivity = async () => {
    setLoadingActivity(true)
    try {
      const res = await fetch('/api/profile/activity?limit=20', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const acts = data.activities || []
        
        // Fetch slugs for activities without valid slugs
        const needSlugs = acts.filter((a: Activity) => !a.slug || a.slug.trim() === '' || /^\d+$/.test(a.slug.trim()))
        if (needSlugs.length > 0) {
          const slugRes = await fetch('/api/user/slugs', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: needSlugs.map((a: Activity) => ({ content_type: a.content_type, tmdb_id: a.tmdb_id }))
            })
          })
          if (slugRes.ok) {
            const slugData = await slugRes.json()
            const slugMap = slugData.slugs || {}
            acts.forEach((a: Activity) => {
              const key = `${a.content_type}-${a.tmdb_id}`
              if (slugMap[key]) {
                a.slug = slugMap[key]
              }
            })
          }
        }
        
        setActivities(acts)
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error)
    } finally {
      setLoadingActivity(false)
    }
  }

  const fetchFavorites = async () => {
    setLoadingFavorites(true)
    try {
      const res = await fetch('/api/user/favorites', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setFavoritesList(data.items || [])
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error)
    } finally {
      setLoadingFavorites(false)
    }
  }

  const fetchCompleted = async () => {
    setLoadingCompleted(true)
    try {
      const res = await fetch('/api/user/completed', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setCompletedList(data.items || [])
      }
    } catch (error) {
      console.error('Failed to fetch completed:', error)
    } finally {
      setLoadingCompleted(false)
    }
  }

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

  const formatActivityDate = (dateStr: string) => {
    // Parse UTC date and convert to Cairo time
    const utcDate = new Date(dateStr + 'Z') // Ensure UTC
    const cairoDate = new Date(utcDate.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }))
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }))
    
    const diffMs = now.getTime() - cairoDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'منذ لحظات'
    if (diffMins === 1) return 'منذ دقيقة'
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`
    if (diffHours < 24) return `منذ ${diffHours} ساعة`
    if (diffDays < 7) return `منذ ${diffDays} يوم`
    return cairoDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', timeZone: 'Africa/Cairo' })
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
                    alt={profile.username ?? ''}
                    className="w-32 h-32 rounded-2xl object-cover border-4 border-zinc-900 shadow-2xl"
                  />
                ) : (
                  <div className={`w-32 h-32 rounded-2xl bg-gradient-to-br ${roleInfo.color} flex items-center justify-center text-white text-4xl font-black shadow-2xl border-4 border-zinc-900`}>
                    {(profile.username ?? '?').charAt(0).toUpperCase()}
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
                    <Link 
                      href="/profile/settings"
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors text-sm font-medium"
                    >
                      <Settings size={14} />
                      <span className="hidden sm:inline">الإعدادات</span>
                    </Link>
                    <button 
                      onClick={signOut}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl transition-colors text-sm font-medium border border-red-600/20"
                    >
                      <LogOut size={14} />
                      <span className="hidden sm:inline">خروج</span>
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
              {stats.moviesWatched > 0 && <TrendingUp size={14} className="text-cyan-400 opacity-50" />}
            </div>
            <div className="text-3xl font-black text-zinc-100 mb-1">{loadingStats ? '...' : stats.moviesWatched}</div>
            <div className="text-xs text-zinc-500 font-medium">أفلام</div>
          </div>
          
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 hover:border-purple-600/50 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-purple-600/10 text-purple-400 group-hover:bg-purple-600/20 transition-colors">
                <Tv size={20} />
              </div>
              {stats.seriesWatched > 0 && <TrendingUp size={14} className="text-purple-400 opacity-50" />}
            </div>
            <div className="text-3xl font-black text-zinc-100 mb-1">{loadingStats ? '...' : stats.seriesWatched}</div>
            <div className="text-xs text-zinc-500 font-medium">مسلسلات</div>
          </div>
          
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 hover:border-orange-600/50 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-orange-600/10 text-orange-400 group-hover:bg-orange-600/20 transition-colors">
                <Clock size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-zinc-100 mb-1">{loadingStats ? '...' : stats.totalWatchTime}</div>
            <div className="text-xs text-zinc-500 font-medium">ساعة</div>
          </div>
          
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 hover:border-red-600/50 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-red-600/10 text-red-400 group-hover:bg-red-600/20 transition-colors">
                <Heart size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-zinc-100 mb-1">{loadingStats ? '...' : stats.favorites}</div>
            <div className="text-xs text-zinc-500 font-medium">مفضلة</div>
          </div>
          
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 hover:border-yellow-600/50 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-yellow-600/10 text-yellow-400 group-hover:bg-yellow-600/20 transition-colors">
                <Star size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-zinc-100 mb-1">{loadingStats ? '...' : stats.reviews}</div>
            <div className="text-xs text-zinc-500 font-medium">تقييم</div>
          </div>
          
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 hover:border-emerald-600/50 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-emerald-600/10 text-emerald-400 group-hover:bg-emerald-600/20 transition-colors">
                <Award size={20} />
              </div>
            </div>
            <div className="text-3xl font-black text-zinc-100 mb-1">{loadingStats ? '...' : stats.achievements}</div>
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
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'favorites'
                ? 'bg-gradient-to-r from-red-600 to-cyan-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
            }`}
          >
            المفضلة
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'completed'
                ? 'bg-gradient-to-r from-red-600 to-cyan-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
            }`}
          >
            تمت مشاهدته
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
              {(profile.role === 'admin' || profile.role === 'supervisor') && (
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
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                  <Clock size={20} className="text-purple-400" />
                  النشاط الأخير
                </h2>
                {activities.length > 0 && (
                  <button 
                    onClick={fetchActivity}
                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    تحديث
                  </button>
                )}
              </div>

              {loadingActivity ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/30 border border-zinc-800 animate-pulse">
                      <div className="w-16 h-24 rounded-lg bg-zinc-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-zinc-700 rounded w-3/4" />
                        <div className="h-3 bg-zinc-700 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12">
                  <Play size={48} className="text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-zinc-300 mb-2">لم تبدأ بعد</h3>
                  <p className="text-zinc-500 mb-6">ابدأ بمشاهدة الأفلام والمسلسلات لرؤية نشاطك هنا</p>
                  <Link 
                    href="/movies"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-cyan-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                  >
                    <Film size={18} />
                    تصفح الأفلام
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity, idx) => {
                    const contentUrl = buildContentUrl(activity.content_type, activity.slug, activity.tmdb_id)
                    
                    return contentUrl ? (
                    <Link key={idx} href={contentUrl} className="flex items-start gap-4 p-4 rounded-xl bg-zinc-800/30 border border-zinc-800 hover:border-zinc-700 transition-colors group">
                      {/* Activity Icon */}
                      <div className={`p-2 rounded-lg ${
                        activity.type === 'watch' ? 'bg-cyan-600/20 text-cyan-400' :
                        activity.type === 'favorite' ? 'bg-red-600/20 text-red-400' :
                        'bg-yellow-600/20 text-yellow-400'
                      }`}>
                        {activity.type === 'watch' ? <Play size={16} /> :
                         activity.type === 'favorite' ? <Heart size={16} /> :
                         <Star size={16} />}
                      </div>

                      {/* Poster */}
                      {activity.poster_path && (
                        <img 
                          src={`/tmdb/w92${activity.poster_path}`}
                          alt={activity.title || ''}
                          className="w-12 h-18 rounded-lg object-cover border border-zinc-700 group-hover:border-zinc-600 transition-colors"
                        />
                      )}

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-100 mb-1 line-clamp-1">{activity.title || 'بدون عنوان'}</p>
                        
                        <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500">
                          {activity.type === 'watch' && (
                            <>
                              <span className="px-2 py-0.5 rounded bg-cyan-600/10 text-cyan-400">شاهدت</span>
                              {activity.data.season_number && activity.data.episode_number && (
                                <span>الموسم {activity.data.season_number} • الحلقة {activity.data.episode_number}</span>
                              )}
                              {activity.data.watch_duration && Number(activity.data.watch_duration) > 0 && (
                                <span>{Math.round(Number(activity.data.watch_duration) / 60)} دقيقة</span>
                              )}
                            </>
                          )}
                          {activity.type === 'favorite' && (
                            <span className="px-2 py-0.5 rounded bg-red-600/10 text-red-400">أضفت للمفضلة</span>
                          )}
                          {activity.type === 'review' && (
                            <>
                              <span className="px-2 py-0.5 rounded bg-yellow-600/10 text-yellow-400">قيّمت</span>
                              {activity.data.rating && (
                                <span className="flex items-center gap-1">
                                  <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                  {Number(activity.data.rating).toFixed(1)}
                                </span>
                              )}
                            </>
                          )}
                          <span>•</span>
                          <span>{formatActivityDate(activity.date)}</span>
                        </div>

                        {activity.data.review_text && (
                          <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{String(activity.data.review_text)}</p>
                        )}
                      </div>

                      {/* Content Type Badge */}
                      <div className={`px-2 py-1 rounded text-xs font-bold ${
                        activity.content_type === 'movie' 
                          ? 'bg-cyan-600/10 text-cyan-400' 
                          : 'bg-purple-600/10 text-purple-400'
                      }`}>
                        {activity.content_type === 'movie' ? (
                          <><Film size={10} className="inline mr-1" />فيلم</>
                        ) : (
                          <><Tv size={10} className="inline mr-1" />مسلسل</>
                        )}
                      </div>
                    </Link>
                  ) : (
                    <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-zinc-800/30 border border-zinc-800 opacity-50 cursor-not-allowed">
                      {/* Activity Icon */}
                      <div className={`p-2 rounded-lg ${
                        activity.type === 'watch' ? 'bg-cyan-600/20 text-cyan-400' :
                        activity.type === 'favorite' ? 'bg-red-600/20 text-red-400' :
                        'bg-yellow-600/20 text-yellow-400'
                      }`}>
                        {activity.type === 'watch' ? <Play size={16} /> :
                         activity.type === 'favorite' ? <Heart size={16} /> :
                         <Star size={16} />}
                      </div>

                      {/* Poster */}
                      {activity.poster_path && (
                        <img 
                          src={`/tmdb/w92${activity.poster_path}`}
                          alt={activity.title || ''}
                          className="w-12 h-18 rounded-lg object-cover border border-zinc-700"
                        />
                      )}

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-100 mb-1 line-clamp-1">{activity.title || 'بدون عنوان'}</p>
                        
                        <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500">
                          {activity.type === 'watch' && (
                            <>
                              <span className="px-2 py-0.5 rounded bg-cyan-600/10 text-cyan-400">شاهدت</span>
                              {activity.data.season_number && activity.data.episode_number && (
                                <span>الموسم {activity.data.season_number} • الحلقة {activity.data.episode_number}</span>
                              )}
                              {activity.data.watch_duration && Number(activity.data.watch_duration) > 0 && (
                                <span>{Math.round(Number(activity.data.watch_duration) / 60)} دقيقة</span>
                              )}
                            </>
                          )}
                          {activity.type === 'favorite' && (
                            <span className="px-2 py-0.5 rounded bg-red-600/10 text-red-400">أضفت للمفضلة</span>
                          )}
                          {activity.type === 'review' && (
                            <>
                              <span className="px-2 py-0.5 rounded bg-yellow-600/10 text-yellow-400">قيّمت</span>
                              {activity.data.rating && (
                                <span className="flex items-center gap-1">
                                  <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                  {Number(activity.data.rating).toFixed(1)}
                                </span>
                              )}
                            </>
                          )}
                          <span>•</span>
                          <span>{formatActivityDate(activity.date)}</span>
                        </div>

                        {activity.data.review_text && (
                          <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{String(activity.data.review_text)}</p>
                        )}
                      </div>

                      {/* Content Type Badge */}
                      <div className={`px-2 py-1 rounded text-xs font-bold ${
                        activity.content_type === 'movie' 
                          ? 'bg-cyan-600/10 text-cyan-400' 
                          : 'bg-purple-600/10 text-purple-400'
                      }`}>
                        {activity.content_type === 'movie' ? (
                          <><Film size={10} className="inline mr-1" />فيلم</>
                        ) : (
                          <><Tv size={10} className="inline mr-1" />مسلسل</>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <h2 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-400" />
                إحصائيات مفصلة
              </h2>

              {loadingStats ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-6 rounded-xl bg-zinc-800/30 border border-zinc-800 animate-pulse">
                      <div className="h-6 bg-zinc-700 rounded w-1/2 mb-4" />
                      <div className="h-10 bg-zinc-700 rounded w-1/3" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Movies Stats */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-600/10 to-blue-600/10 border border-cyan-600/20">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-cyan-600/20 text-cyan-400">
                        <Film size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-zinc-100">الأفلام</h3>
                        <p className="text-xs text-zinc-400">إحصائيات المشاهدة</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">شاهدت</span>
                        <span className="text-2xl font-black text-cyan-400">{stats.moviesWatched}</span>
                      </div>
                      {stats.moviesWatched > 0 && (
                        <div className="pt-3 border-t border-cyan-600/20">
                          <p className="text-xs text-zinc-500">
                            أنت من محبي السينما! استمر في المشاهدة
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Series Stats */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-600/20">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-purple-600/20 text-purple-400">
                        <Tv size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-zinc-100">المسلسلات</h3>
                        <p className="text-xs text-zinc-400">إحصائيات المشاهدة</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">شاهدت</span>
                        <span className="text-2xl font-black text-purple-400">{stats.seriesWatched}</span>
                      </div>
                      {stats.seriesWatched > 0 && (
                        <div className="pt-3 border-t border-purple-600/20">
                          <p className="text-xs text-zinc-500">
                            تحب متابعة القصص الطويلة!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Watch Time Stats */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-orange-600/10 to-red-600/10 border border-orange-600/20">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-orange-600/20 text-orange-400">
                        <Clock size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-zinc-100">وقت المشاهدة</h3>
                        <p className="text-xs text-zinc-400">إجمالي الساعات</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">ساعات</span>
                        <span className="text-2xl font-black text-orange-400">{stats.totalWatchTime}</span>
                      </div>
                      {stats.totalWatchTime > 0 && (
                        <div className="pt-3 border-t border-orange-600/20">
                          <p className="text-xs text-zinc-500">
                            {stats.totalWatchTime > 100 ? 'أنت مشاهد نهم!' : 
                             stats.totalWatchTime > 50 ? 'مشاهدة رائعة!' : 
                             'بداية جيدة!'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Engagement Stats */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-600/20">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-emerald-600/20 text-emerald-400">
                        <Heart size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-zinc-100">التفاعل</h3>
                        <p className="text-xs text-zinc-400">المفضلة والتقييمات</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">مفضلة</span>
                        <span className="text-xl font-black text-emerald-400">{stats.favorites}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">تقييمات</span>
                        <span className="text-xl font-black text-yellow-400">{stats.reviews}</span>
                      </div>
                      {(stats.favorites + stats.reviews) > 0 && (
                        <div className="pt-3 border-t border-emerald-600/20">
                          <p className="text-xs text-zinc-500">
                            شكراً على مساهمتك في المجتمع!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Favorites Tab */}
          {activeTab === 'favorites' && (
            <div>
              <h2 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
                <Heart size={20} className="text-red-500" />
                المفضلة
              </h2>

              {loadingFavorites ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-[2/3] bg-zinc-800 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : favoritesList.length === 0 ? (
                <div className="text-center py-12">
                  <Heart size={48} className="mx-auto text-zinc-700 mb-4" />
                  <p className="text-zinc-400">لا توجد عناصر في المفضلة</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {favoritesList.map((item: any, index: number) => {
                    const tmdbId = Number(item.tmdb_id)
                    if (!tmdbId || tmdbId <= 0) return null

                    const isTv = item.content_type === 'tv' || item.media_type === 'tv'
                    // Text slugs only — numeric/empty slug renders no link (MovieCard hides it)
                    const textSlug = item.slug && item.slug.trim() !== '' && !isNumericSlug(item.slug.trim())
                      ? item.slug.trim()
                      : undefined
                    
                    return (
                      <MovieCard
                        key={`${item.content_type}-${item.tmdb_id}`}
                        movie={{
                          id: tmdbId,
                          tmdb_id: tmdbId,
                          slug: textSlug,
                          title_ar: item.title_ar,
                          title_en: item.title_en,
                          title: item.title,
                          name_ar: item.title_ar,
                          name_en: item.title_en,
                          name: item.title,
                          poster_path: item.poster_path,
                          vote_average: item.vote_average,
                          release_year: item.release_year,
                          first_air_year: item.release_year,
                          overview_ar: item.overview_ar,
                          genres_json: item.genres_json,
                          primary_genre: item.primary_genre,
                          media_type: isTv ? 'tv' : 'movie',
                        }}
                        index={index}
                        initialCardState="favorite"
                        onStateChange={(newState) => handleFavoriteStateChange(newState, item)}
                        forceTv={isTv}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Completed Tab */}
          {activeTab === 'completed' && (
            <div>
              <h2 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
                <CheckCircle size={20} className="text-green-500" />
                تمت مشاهدته
              </h2>

              {loadingCompleted ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-[2/3] bg-zinc-800 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : completedList.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle size={48} className="mx-auto text-zinc-700 mb-4" />
                  <p className="text-zinc-400">لم تقم بمشاهدة أي عمل بعد</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {completedList.map((item: any, index: number) => {
                    const tmdbId = Number(item.tmdb_id)
                    if (!tmdbId || tmdbId <= 0) return null

                    const isTv = item.content_type === 'tv' || item.media_type === 'tv'
                    // Text slugs only — numeric/empty slug renders no link (MovieCard hides it)
                    const textSlug = item.slug && item.slug.trim() !== '' && !isNumericSlug(item.slug.trim())
                      ? item.slug.trim()
                      : undefined
                    
                    return (
                      <MovieCard
                        key={`${item.content_type}-${item.tmdb_id}`}
                        movie={{
                          id: tmdbId,
                          tmdb_id: tmdbId,
                          slug: textSlug,
                          title_ar: item.title_ar,
                          title_en: item.title_en,
                          title: item.title,
                          name_ar: item.title_ar,
                          name_en: item.title_en,
                          name: item.title,
                          poster_path: item.poster_path,
                          vote_average: item.vote_average,
                          release_year: item.release_year,
                          first_air_year: item.release_year,
                          overview_ar: item.overview_ar,
                          genres_json: item.genres_json,
                          primary_genre: item.primary_genre,
                          media_type: isTv ? 'tv' : 'movie',
                        }}
                        index={index}
                        initialCardState="completed"
                        onStateChange={(newState) => handleCompletedStateChange(newState, item)}
                        forceTv={isTv}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
