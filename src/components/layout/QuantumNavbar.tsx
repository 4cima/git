'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useMemo, memo, useEffect } from 'react'
import { Home, Film, Tv, Zap, Rocket, Sparkles, Drama, Smile, Eye, Heart, Skull, Menu, X, LogIn, User, LogOut, ChevronDown, Settings } from 'lucide-react'
import { UserMenu } from './UserMenu'
import { useAuth } from '@/hooks/useAuth'
import { SearchBox } from './SearchBox'

export const QuantumNavbar = memo(() => {
  const router = useRouter()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [logoScrolled, setLogoScrolled] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, profile, signOut } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      setScrolled(scrollPosition > 50)
      setLogoScrolled(scrollPosition > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  const navLinks = useMemo(() => [
    { to: '/', label: 'الرئيسية', icon: Home, color: '#00ffcc' },
    { to: '/movies', label: 'أفلام', icon: Film, color: '#00ccff' },
    { to: '/series', label: 'مسلسلات', icon: Tv, color: '#aa00ff' }
  ], [])

  const countryLinks = useMemo(() => [
    { code: 'ar', label: 'عربي', icon: '🇸🇦', filter: 'ar' },
    { code: 'en', label: 'إنجليزي', icon: '🇺🇸', filter: 'en' },
    { code: 'tr', label: 'تركي', icon: '🇹🇷', filter: 'tr' },
    { code: 'hi', label: 'هندي', icon: '🇮🇳', filter: 'hi' },
    { code: 'ko', label: 'كوري', icon: '🇰🇷', filter: 'ko' },
    { code: 'zh', label: 'صيني', icon: '🇨🇳', filter: 'zh,cn' },
    { code: 'ja', label: 'ياباني', icon: '🇯🇵', filter: 'ja' },
    { code: 'fr', label: 'فرنسي', icon: '🇫🇷', filter: 'fr' },
    { code: 'es', label: 'إسباني', icon: '🇪🇸', filter: 'es' },
    { code: 'de', label: 'ألماني', icon: '🇩🇪', filter: 'de' }
  ], [])

  const genreLinks = useMemo(() => [
    { slug: 'action', label: 'أكشن', icon: Zap, color: 'red-500' },
    { slug: 'comedy', label: 'كوميديا', icon: Smile, color: 'yellow-400' },
    { slug: 'drama', label: 'دراما', icon: Drama, color: 'slate-400' },
    { slug: 'romance', label: 'رومانسي', icon: Heart, color: 'pink-400' },
    { slug: 'thriller', label: 'إثارة', icon: Eye, color: 'orange-500' },
    { slug: 'horror', label: 'رعب', icon: Skull, color: 'red-700' },
    { slug: 'crime', label: 'جريمة', icon: Film, color: 'gray-400' },
    { slug: 'adventure', label: 'مغامرات', icon: Rocket, color: 'green-400' },
    { slug: 'fantasy', label: 'فانتازيا', icon: Sparkles, color: 'purple-400' },
    { slug: 'animation', label: 'أنمي', icon: Tv, color: 'cyan-400' }
  ], [])

  return (
    <>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 bg-transparent border-b border-transparent">
        <div className="max-w-[1920px] mx-auto px-6 sm:px-8 md:px-12 lg:px-16 flex items-center justify-between h-16">

          {/* Right: Menu + Logo */}
          <div className="flex items-center gap-3 mr-1">
            {/* Menu Button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="relative h-9 px-2 bg-gradient-to-br from-slate-800/95 to-slate-700/95 hover:from-slate-700/95 hover:to-slate-600/95 backdrop-blur-sm border border-slate-500/50 hover:border-slate-400 rounded-md shadow-lg transition-all duration-300 text-cyan-400 hover:text-cyan-300 overflow-hidden"
              aria-label="القائمة"
            >
              <Menu size={26} className="relative z-10" />
            </button>

            {/* Logo with Rope */}
            <Link href="/" className="group flex items-center cursor-pointer transition-transform relative" style={{ marginTop: '5px' }}>
              <div className={`relative ${logoScrolled ? 'logo-pulled-up' : 'logo-drop-animation'}`}>
                {/* Realistic Rope with stretch animation */}
                <div className={`absolute left-1/2 -translate-x-1/2 -top-16 w-1 ${logoScrolled ? 'rope-pulled-up' : 'rope-stretch-animation'}`} 
                  style={{
                    background: 'repeating-linear-gradient(0deg, #8B7355 0px, #8B7355 2px, #6B5845 2px, #6B5845 4px, #8B7355 4px, #8B7355 6px, #A0826D 6px, #A0826D 8px)',
                    boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.5), inset 1px 0 1px rgba(255,255,255,0.2)',
                    borderRadius: '2px',
                    marginLeft: '-3px',
                    marginTop: '-10px'
                  }}
                ></div>
                
                <div className="relative flex items-center justify-center">
                  <div className="relative z-10 font-black text-3xl sm:text-4xl tracking-tighter lowercase transition-transform duration-300 flex items-center gap-0.5" dir="ltr">
                    <span 
                      className="text-red-600 text-4xl sm:text-5xl animate-wiggle drop-shadow-[0_0_12px_rgba(220,38,38,0.9)]"
                      style={{ 
                        display: 'inline-block', 
                        transformOrigin: 'center',
                        WebkitTextStroke: '1px black'
                      }}
                    >
                      4
                    </span>
                    <span 
                      className="animate-neon-flicker-cyan drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] relative"
                      style={{ 
                        fontFamily: '"Brush Script MT", cursive',
                        fontStyle: 'italic',
                        letterSpacing: '0.05em',
                        WebkitTextStroke: '1px black'
                      }}
                    >
                      {/* Cinema Camera above 'c' */}
                      <span className="relative inline-block">
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 text-xs leading-none" style={{ animation: 'cinema-filming 4s ease-in-out infinite' }}>
                          🎥
                        </span>
                        <span className="text-sky-400" style={{ textShadow: '0 0 10px rgba(56,189,248,0.5), 0 0 20px rgba(56,189,248,0.3)' }}>c</span>
                      </span>
                      <span className="text-emerald-500 inline-block" style={{ textShadow: '0 0 10px rgba(16,185,129,0.5), 0 0 20px rgba(16,185,129,0.3)', animation: 'spinY 4s linear infinite', fontStyle: 'normal', fontSize: '120%', fontWeight: 'bold' }}>i</span>
                      <span className="text-fuchsia-500" style={{ textShadow: '0 0 10px rgba(217,70,239,0.6), 0 0 20px rgba(217,70,239,0.4)' }}>m</span>
                      <span className="text-amber-400" style={{ textShadow: '0 0 10px rgba(251,191,36,0.6), 0 0 20px rgba(251,191,36,0.4), 0 0 30px rgba(251,191,36,0.2)' }}>a</span>
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-cyan-500/20 to-purple-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full animate-pulse" />
                </div>
              </div>
            </Link>
          </div>

          {/* Search and actions */}
          <div className="flex items-center gap-3 ml-1">
            {/* Search Box */}
            <SearchBox />
          </div>
        </div>
            </nav>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop - NO backdrop blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-[1100] bg-black/60"
            />

            {/* Sidebar Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-60 z-[1200] bg-black/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                  {/* User Profile or Login Button */}
                  {user ? (
                    <div className="relative">
                      <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                      >
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.username || 'User'}
                            className="w-6 h-6 rounded-full object-cover border border-zinc-700"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-600 to-cyan-400 flex items-center justify-center text-white text-xs font-bold">
                            {(profile?.username || user.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm font-semibold text-white truncate max-w-[80px]">
                          {profile?.username || user.email?.split('@')[0] || 'User'}
                        </span>
                        <ChevronDown size={14} className={`text-zinc-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {userMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-full left-0 mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-50"
                          >
                            {/* User Info */}
                            <div className="px-3 py-2 border-b border-zinc-800">
                              <p className="text-sm font-semibold text-zinc-100 truncate">
                                {profile?.username || user.email?.split('@')[0]}
                              </p>
                              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                              {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
                                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold bg-cyan-400/10 text-cyan-400 rounded">
                                  مشرف
                                </span>
                              )}
                            </div>

                            {/* Menu Items */}
                            <div className="py-1">
                              <Link
                                href="/profile"
                                onClick={() => {
                                  setUserMenuOpen(false)
                                  setSidebarOpen(false)
                                }}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                              >
                                <User size={16} />
                                <span>الملف الشخصي</span>
                              </Link>

                              {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
                                <Link
                                  href="/admin"
                                  onClick={() => {
                                    setUserMenuOpen(false)
                                    setSidebarOpen(false)
                                  }}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-cyan-400 hover:bg-cyan-400/10 transition-colors"
                                >
                                  <Settings size={16} />
                                  <span>لوحة التحكم</span>
                                </Link>
                              )}

                              <button
                                onClick={async () => {
                                  try {
                                    await signOut()
                                    setUserMenuOpen(false)
                                    setSidebarOpen(false)
                                    router.push('/')
                                    router.refresh()
                                  } catch (error) {
                                    console.error('Sign out error:', error)
                                  }
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                              >
                                <LogOut size={16} />
                                <span>تسجيل الخروج</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors group ${
                        pathname?.startsWith('/login') ? 'bg-emerald-500/20 text-emerald-400' : 'text-white hover:text-emerald-400'
                      }`}
                    >
                      <LogIn size={16} className="group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-bold">الدخول</span>
                    </Link>
                  )}
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 text-white hover:text-red-500 transition-colors"
                  aria-label="إغلاق"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content - REDESIGNED: Compact & Organized */}
              <div className="flex-1 overflow-y-auto">
                {/* Main Navigation - Compact Single Row */}
                <div className="px-3 pt-2 pb-3 border-b border-white/5">
                  <div className="grid grid-cols-3 gap-1.5">
                    {navLinks.map((link) => {
                      const isActive = pathname === link.to || pathname?.startsWith(link.to + '/')
                      return (
                        <Link
                          key={link.to}
                          href={link.to}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                            isActive 
                              ? 'bg-white/20 text-white' 
                              : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                          }`}
                        >
                          <link.icon size={18} style={{ color: link.color }} className="flex-shrink-0" />
                          <span className="text-[10px] font-bold">{link.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* COMPACT: Languages in single dropdown-like section */}
                <div className="px-3 py-2 border-b border-white/5">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                    <span>🌍</span>
                    <span>اللغات</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {countryLinks.slice(0, 10).map((country) => (
                      <Link
                        key={country.code}
                        href={pathname?.includes('/series') ? `/series?language=${country.filter}` : `/movies?language=${country.filter}`}
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center justify-center p-2 rounded-lg hover:bg-white/10 transition-all text-center"
                        title={country.label}
                      >
                        <span className="text-xs font-semibold text-zinc-300 hover:text-white">{country.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* COMPACT: All Genres in one unified section with media type toggle */}
                <div className="px-3 py-2">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                    <span>🎬</span>
                    <span>التصنيفات</span>
                  </div>
                  
                  {/* Genres Grid - Works for both movies and series */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {genreLinks.map((genre) => {
                      const isMoviesActive = pathname?.includes(`/movies/genres/${genre.slug}`)
                      const isSeriesActive = pathname?.includes(`/series/genres/${genre.slug}`)
                      const isActive = isMoviesActive || isSeriesActive
                      
                      let iconColorClass = ''
                      switch(genre.color) {
                        case 'red-500': iconColorClass = 'text-red-500'; break;
                        case 'red-700': iconColorClass = 'text-red-700'; break;
                        case 'yellow-400': iconColorClass = 'text-yellow-400'; break;
                        case 'slate-400': iconColorClass = 'text-slate-400'; break;
                        case 'pink-400': iconColorClass = 'text-pink-400'; break;
                        case 'orange-500': iconColorClass = 'text-orange-500'; break;
                        case 'gray-400': iconColorClass = 'text-gray-400'; break;
                        case 'green-400': iconColorClass = 'text-green-400'; break;
                        case 'purple-400': iconColorClass = 'text-purple-400'; break;
                        case 'cyan-400': iconColorClass = 'text-cyan-400'; break;
                        default: iconColorClass = 'text-purple-400';
                      }
                      
                      // Smart routing: if on series page, link to series genre, else movies
                      const targetHref = pathname?.includes('/series') 
                        ? `/series/genres/${genre.slug}`
                        : `/movies/genres/${genre.slug}`
                      
                      return (
                        <Link
                          key={genre.slug}
                          href={targetHref}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-2 p-2 rounded-lg transition-all group text-xs ${
                            isActive
                              ? 'bg-white/20 text-white border border-purple-400/50'
                              : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                          }`}
                        >
                          <genre.icon size={14} className={`${iconColorClass} group-hover:scale-110 transition-transform flex-shrink-0`} />
                          <span className="font-medium truncate">{genre.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                  
                  {/* Quick toggle hint */}
                  <div className="mt-2 text-[9px] text-zinc-600 text-center">
                    💡 التصنيفات تتغير حسب الصفحة (أفلام/مسلسلات)
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
})

QuantumNavbar.displayName = 'QuantumNavbar'


