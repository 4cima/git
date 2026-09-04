'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useMemo, memo, useEffect } from 'react'
import { Home, Film, Tv, Menu, X, LogIn, User, LogOut, ChevronDown, Settings } from 'lucide-react'
import { UserMenu } from './UserMenu'
import { useAuth } from '@/hooks/useAuth'
import { SearchBox } from './SearchBox'
import { getAvatarUrl } from '@/utils/avatarUtils'

export const QuantumNavbar = memo(() => {
  const router = useRouter()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [logoScrolled, setLogoScrolled] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, profile, signOut } = useAuth()
  // Full current path (+query) so the login link returns to the same page.
  // Resolved client-side only (useSearchParams would force a CSR bailout and
  // break static prerendering of pages using the navbar).
  const [loginHref, setLoginHref] = useState('/login')
  useEffect(() => {
    const next = (window.location.pathname + window.location.search) || '/'
    setLoginHref(`/login?next=${encodeURIComponent(next)}`)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      setScrolled(scrollPosition > 50)
      setLogoScrolled(scrollPosition > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  // الأزرار الثلاثة للشريط المنقسم ثلاثي الأبعاد: أفلام (يمين) | الرئيسية (وسط) | مسلسلات (يسار)
  // بألوان هادئة: وردي هادئ للأفلام، عنبري ذهبي للرئيسية، سماوي للمسلسلات
  const navSegments = useMemo(() => [
    { to: '/movies', label: 'أفلام', icon: Film, tint: '#fb7185', divider: false, exact: false },
    { to: '/', label: 'الرئيسية', icon: Home, tint: '#fcd34d', divider: true, exact: true },
    { to: '/series', label: 'مسلسلات', icon: Tv, tint: '#38bdf8', divider: false, exact: false }
  ], [])

  const countryLinks = useMemo(() => [
    { code: 'ar', label: 'عربي', filter: 'ar' },
    { code: 'en', label: 'أجنبي', filter: 'en' },
    { code: 'tr', label: 'تركي', filter: 'tr' },
    { code: 'hi', label: 'هندي', filter: 'hi' },
    { code: 'ko', label: 'كوري', filter: 'ko' },
    { code: 'zh', label: 'صيني', filter: 'zh,cn' },
    { code: 'ja', label: 'ياباني', filter: 'ja' },
    { code: 'fr', label: 'فرنسي', filter: 'fr' },
    { code: 'es', label: 'إسباني', filter: 'es' },
    { code: 'de', label: 'ألماني', filter: 'de' }
  ], [])

  const genreLinks = useMemo(() => [
    { slug: 'action', label: 'أكشن' },
    { slug: 'comedy', label: 'كوميديا' },
    { slug: 'drama', label: 'دراما' },
    { slug: 'romance', label: 'رومانسي' },
    { slug: 'thriller', label: 'إثارة' },
    { slug: 'horror', label: 'رعب' },
    { slug: 'crime', label: 'جريمة' },
    { slug: 'adventure', label: 'مغامرات' },
    { slug: 'fantasy', label: 'فانتازيا' },
    { slug: 'animation', label: 'أنمي' }
  ], [])

  return (
    <>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 bg-transparent border-b border-transparent">
        <div className="max-w-[1920px] mx-auto px-6 sm:px-8 md:px-12 lg:px-16 flex items-center justify-between h-16">

          {/* Right: Menu + Logo */}
          <div className="flex items-center gap-4 mr-1">
            {/* Menu Button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="relative h-9 px-2 bg-gradient-to-br from-slate-800/95 to-slate-700/95 hover:from-slate-700/95 hover:to-slate-600/95 backdrop-blur-sm border border-slate-500/50 hover:border-slate-400 rounded-md shadow-lg transition-all duration-300 text-cyan-400 hover:text-cyan-300 overflow-hidden"
              aria-label="القائمة"
            >
              <Menu size={26} className="relative z-10" />
            </button>

            {/* Logo with Rope — flex-shrink-0 + w-max make it impossible to compress or wrap at any viewport width */}
            <Link href="/" className="group flex items-center cursor-pointer transition-transform relative shrink-0 grow-0" style={{ marginTop: '30px' }}>
              <div className={`relative shrink-0 ${logoScrolled ? 'logo-pulled-up' : 'logo-drop-animation'}`}>
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
                  <div className="relative z-10 font-black text-4xl sm:text-5xl tracking-tighter lowercase transition-transform duration-300 flex flex-nowrap items-center gap-0.5 whitespace-nowrap shrink-0 w-max" dir="ltr">
                    <span
                      className="text-red-600 text-5xl sm:text-6xl animate-wiggle drop-shadow-[0_0_12px_rgba(220,38,38,0.9)] shrink-0"
                      style={{
                        display: 'inline-block',
                        transformOrigin: 'center',
                        WebkitTextStroke: '1px black'
                      }}
                    >
                      4
                    </span>
                    <span
                      className="animate-neon-flicker-cyan drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] relative shrink-0 whitespace-nowrap"
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

          {/* Search and actions — min-w-0 lets it absorb all squeezing so the logo side never shrinks */}
          <div className="flex items-center gap-2 sm:gap-3 ml-1 min-w-0 justify-end">
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
              className="fixed top-16 right-0 max-h-[calc(100%-4rem)] w-80 max-w-[92vw] z-[1200] rounded-l-[1.75rem] overflow-hidden bg-gradient-to-b from-[#141824]/97 via-[#0f121c]/97 to-[#0a0c14]/97 backdrop-blur-xl border-l border-t border-b border-white/10 shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.9)] flex flex-col"
            >
              {/* شريط توهج علوي هادئ بنفس ألوان الزر الثلاثي */}
              <div
                aria-hidden="true"
                className="h-[3px] w-full shrink-0 bg-gradient-to-l from-rose-400/50 via-amber-300/50 to-sky-400/50"
              />
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                  {/* User Profile or Login Button */}
                  {user ? (
                    <div className="relative">
                      {/* زر التشغيل — ثلاثي الأبعاد بنفس وصفة الأزرار الجديدة */}
                      <button
                        type="button"
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className={`group relative inline-flex items-center rounded-xl bg-gradient-to-b from-cyan-300/40 to-sky-500/15 p-[1.5px] shadow-[0_6px_16px_-6px_rgba(0,0,0,0.8)] transition-all duration-300 hover:shadow-[0_0_18px_rgba(56,189,248,0.3)] active:translate-y-[1px] ${
                          userMenuOpen ? 'ring-1 ring-cyan-300/60' : ''
                        }`}
                      >
                        <span className="flex items-center gap-2 rounded-[10px] bg-gradient-to-b from-slate-800 to-slate-950 py-1 pl-1.5 pr-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.5)]">
                          <img
                            src={getAvatarUrl(profile?.avatar_url, user.id, user.email)}
                            alt={(profile?.username || user.email?.split('@')[0] || 'User').split(' ')[0]}
                            className="h-6 w-6 rounded-full object-cover ring-1 ring-cyan-300/40"
                          />
                          <span className="max-w-[80px] truncate text-[12px] font-extrabold tracking-wide text-slate-200 transition-colors duration-300 group-hover:text-white">
                            {(profile?.username || user.email?.split('@')[0] || 'User').split(' ')[0]}
                          </span>
                          <ChevronDown size={13} className={`text-cyan-300 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} />
                        </span>
                      </button>

                      {/* المنسدلة — بإطار متدرج هادئ (وردي ← عنبري ← سماوي) وشريط توهج علوي */}
                      <AnimatePresence>
                        {userMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                            className="absolute right-0 top-full z-[1300] mt-2 w-56 max-w-[calc(100vw-1.5rem)]"
                          >
                            <div className="relative rounded-2xl bg-gradient-to-b from-rose-400/35 via-amber-300/35 to-sky-400/35 p-[1.5px] shadow-[0_20px_45px_-12px_rgba(0,0,0,0.95)]">
                              {/* توهج خلفي هادئ */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-b from-rose-500/10 via-amber-400/10 to-sky-500/10 opacity-70 blur-lg"
                              />
                              <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-b from-[#141824]/98 to-[#0a0c14]/98 backdrop-blur-xl">
                                {/* شريط التوهج العلوي — نفس هوية القائمة */}
                                <div
                                  aria-hidden="true"
                                  className="h-[3px] w-full shrink-0 bg-gradient-to-l from-rose-400/50 via-amber-300/50 to-sky-400/50"
                                />

                                {/* بطاقة المستخدم */}
                                <div className="flex items-center gap-2.5 border-b border-white/10 px-3 py-2.5">
                                  <img
                                    src={getAvatarUrl(profile?.avatar_url, user.id, user.email)}
                                    alt={(profile?.username || user.email?.split('@')[0] || 'User').split(' ')[0]}
                                    className="h-9 w-9 shrink-0 rounded-full object-cover shadow-[0_4px_10px_-3px_rgba(0,0,0,0.8)] ring-2 ring-white/10"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[12.5px] font-extrabold text-slate-100">
                                      {profile?.username || user.email?.split('@')[0]}
                                    </p>
                                    <p className="truncate text-[10.5px] text-slate-500">{user.email}</p>
                                    {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
                                      <span className="mt-1 inline-block rounded-md bg-cyan-400/10 px-1.5 py-0.5 text-[9.5px] font-bold text-cyan-300 ring-1 ring-cyan-400/30">
                                        مشرف
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* الأزرار ثلاثية الأبعاد */}
                                <div className="flex flex-col gap-1.5 p-2">
                                  {/* الملف الشخصي — عنبري ذهبي */}
                                  <Link
                                    href="/profile"
                                    onClick={() => {
                                      setUserMenuOpen(false)
                                      setSidebarOpen(false)
                                    }}
                                    className="group relative block rounded-xl bg-gradient-to-b from-amber-300/45 to-amber-500/15 p-[1.5px] shadow-[0_6px_16px_-6px_rgba(0,0,0,0.8)] transition-all duration-300 hover:shadow-[0_0_18px_rgba(252,211,77,0.25)] active:translate-y-[1px]"
                                  >
                                    <span className="flex items-center gap-2.5 rounded-[10px] bg-gradient-to-b from-slate-800 to-slate-950 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.5)]">
                                      <User size={15} className="shrink-0 text-amber-300 transition-transform duration-300 group-hover:scale-110" />
                                      <span className="text-[12px] font-extrabold tracking-wide text-slate-200 transition-colors duration-300 group-hover:text-white">
                                        الملف الشخصي
                                      </span>
                                    </span>
                                  </Link>

                                  {/* لوحة التحكم — سماوي */}
                                  {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
                                    <Link
                                      href="/admin"
                                      onClick={() => {
                                        setUserMenuOpen(false)
                                        setSidebarOpen(false)
                                      }}
                                      className="group relative block rounded-xl bg-gradient-to-b from-sky-400/45 to-sky-500/15 p-[1.5px] shadow-[0_6px_16px_-6px_rgba(0,0,0,0.8)] transition-all duration-300 hover:shadow-[0_0_18px_rgba(56,189,248,0.25)] active:translate-y-[1px]"
                                    >
                                      <span className="flex items-center gap-2.5 rounded-[10px] bg-gradient-to-b from-slate-800 to-slate-950 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.5)]">
                                        <Settings size={15} className="shrink-0 text-sky-300 transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110" />
                                        <span className="text-[12px] font-extrabold tracking-wide text-slate-200 transition-colors duration-300 group-hover:text-white">
                                          لوحة التحكم
                                        </span>
                                      </span>
                                    </Link>
                                  )}

                                  {/* تسجيل الخروج — وردي أحمر هادئ */}
                                  <button
                                    type="button"
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
                                    className="group relative block w-full rounded-xl bg-gradient-to-b from-rose-400/45 to-rose-500/15 p-[1.5px] shadow-[0_6px_16px_-6px_rgba(0,0,0,0.8)] transition-all duration-300 hover:shadow-[0_0_18px_rgba(251,113,133,0.25)] active:translate-y-[1px]"
                                  >
                                    <span className="flex items-center gap-2.5 rounded-[10px] bg-gradient-to-b from-slate-800 to-slate-950 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.5)]">
                                      <LogOut size={15} className="shrink-0 text-rose-300 transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:scale-110" />
                                      <span className="text-[12px] font-extrabold tracking-wide text-slate-200 transition-colors duration-300 group-hover:text-white">
                                        تسجيل الخروج
                                      </span>
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link
                      href={loginHref}
                      onClick={() => setSidebarOpen(false)}
                      className={`group relative inline-flex rounded-xl bg-gradient-to-b from-amber-300/45 to-amber-500/15 p-[1.5px] shadow-[0_6px_16px_-6px_rgba(0,0,0,0.8)] transition-all duration-300 hover:shadow-[0_0_18px_rgba(252,211,77,0.25)] active:translate-y-[1px] ${
                        pathname?.startsWith('/login') ? 'ring-1 ring-amber-300/60' : ''
                      }`}
                    >
                      <span className="flex items-center gap-1.5 rounded-[10px] bg-gradient-to-b from-slate-800 to-slate-950 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.5)]">
                        <LogIn size={15} className="text-amber-300 transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:scale-110" />
                        <span className="text-[12px] font-extrabold tracking-wide text-slate-200 transition-colors duration-300 group-hover:text-white">
                          الدخول
                        </span>
                      </span>
                    </Link>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="إغلاق"
                  className="group relative rounded-xl bg-gradient-to-b from-rose-800/50 to-rose-950/50 p-[1.5px] shadow-[0_6px_16px_-6px_rgba(0,0,0,0.8)] transition-all duration-300 hover:shadow-[0_0_18px_rgba(190,18,60,0.4)] active:translate-y-[1px] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-b from-[#8b1a2b] to-[#38060f] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-2px_5px_rgba(0,0,0,0.55)] transition-transform duration-300 group-hover:scale-105">
                    <X size={16} className="text-rose-200 transition-all duration-300 group-hover:rotate-90 group-hover:text-white" />
                  </span>
                </button>
              </div>

              {/* Scrollable Content — القائمة الرئيسية: 3 أعمدة ثلاثية الأبعاد بألوان هادئة */}
              <div className="flex-1 overflow-y-auto">
                {/* ===== الشريط العلوي: زر ثلاثي منقسم (أفلام | الرئيسية | مسلسلات) ===== */}
                <div className="px-2.5 pt-3">
                  <div className="relative rounded-2xl bg-gradient-to-l from-rose-400/40 via-amber-300/40 to-sky-400/40 p-[1.5px] shadow-[0_14px_30px_-10px_rgba(0,0,0,0.9)]">
                    {/* توهج خلفي هادئ للإطار */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-l from-rose-500/15 via-amber-400/10 to-sky-500/15 opacity-70 blur-lg"
                    />
                    <div className="relative grid grid-cols-3 overflow-hidden rounded-[15px] bg-gradient-to-b from-slate-800 to-slate-950">
                      {navSegments.map((seg) => {
                        const isActive = seg.exact ? pathname === seg.to : pathname?.startsWith(seg.to)
                        return (
                          <Link
                            key={seg.to}
                            href={seg.to}
                            onClick={() => setSidebarOpen(false)}
                            aria-current={isActive ? 'page' : undefined}
                            className={`group relative flex select-none flex-col items-center justify-center gap-2 py-4 transition-all duration-300 ${
                              seg.divider ? 'border-x border-black/50' : ''
                            } ${
                              isActive
                                ? 'shadow-[inset_0_2px_12px_rgba(0,0,0,0.65),inset_0_-1px_0_rgba(0,0,0,0.5)]'
                                : 'hover:bg-white/[0.045] active:translate-y-[1px]'
                            }`}
                            style={isActive ? { backgroundColor: `${seg.tint}16` } : undefined}
                          >
                            {/* خط ضوئي سفلي هادئ يحدد الزر النشط */}
                            <span
                              aria-hidden="true"
                              className={`absolute inset-x-3 bottom-0 h-[2px] rounded-full transition-opacity duration-300 ${
                                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                              }`}
                              style={{ background: `linear-gradient(90deg, transparent, ${seg.tint}, transparent)` }}
                            />
                            {/* لمعة الحافة العلوية — إحساس ثلاثي الأبعاد */}
                            <span aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-0 h-px bg-white/10" />
                            <seg.icon
                              size={19}
                              style={{ color: seg.tint }}
                              className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110"
                            />
                            <span className="text-[12px] font-extrabold tracking-wide text-slate-100 transition-colors duration-300 group-hover:text-white">
                              {seg.label}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* ===== الأعمدة: تصنيفات الأفلام | اللغات | تصنيفات المسلسلات ===== */}
                <div className="px-2.5 pb-4 pt-2">
                  <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    {/* عمود أفلام — سطور التصنيفات تتمدد لتساوي ارتفاع عمود اللغات */}
                    <div className="flex flex-col border-l border-black/40">
                      <div className="flex flex-1 flex-col pt-2.5 pb-2">
                        {genreLinks.map((genre) => {
                          const isActive = pathname?.includes(`/movies/genres/${genre.slug}`)
                          return (
                            <Link
                              key={genre.slug}
                              href={`/movies/genres/${genre.slug}`}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex flex-1 items-center gap-2 px-2.5 py-1.5 text-[12px] font-bold transition-colors duration-200 ${
                                isActive ? 'bg-rose-500/10 text-rose-200' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                              }`}
                            >
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400/70" />
                              <span className="truncate">{genre.label}</span>
                            </Link>
                          )
                        })}
                      </div>
                    </div>

                    {/* العمود الأوسط — اللغات: زر زجاجي ثلاثي الأبعاد واحد لكل لغة
                        (الكتابة ظاهرة كاملة | ثلث اليمين الشفاف → أفلام | ثلث اليسار الشفاف → مسلسلات) */}
                    <div className="flex flex-col border-l border-black/40">
                      <div className="flex flex-col gap-1.5 px-1.5 pt-2.5 pb-2">
                        {countryLinks.map((country) => (
                          <div
                            key={country.code}
                            className="relative rounded-[10px] bg-gradient-to-l from-rose-400/30 via-white/10 to-sky-400/30 p-[1.5px] shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
                          >
                            <div className="group/lang relative overflow-hidden rounded-[8.5px] bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_2px_rgba(0,0,0,0.45)] backdrop-blur-sm">
                              {/* لمعة الحافة العلوية — إحساس الزجاج */}
                              <span aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-0 h-px bg-white/15" />
                              {/* الكتابة كاملة في المنتصف — غير قابلة للضغط */}
                              <div className="flex select-none items-center justify-center gap-1.5 py-[6px]" title={country.label}>
                                <span className="text-[11.5px] font-bold text-slate-100">{country.label}</span>
                              </div>
                              {/* ثلث اليمين الشفاف (تدرج أحمر خفيف) → أفلام */}
                              <Link
                                href={`/movies?language=${country.filter}`}
                                onClick={() => setSidebarOpen(false)}
                                title={`${country.label} — أفلام`}
                                aria-label={`أفلام ${country.label}`}
                                className="absolute inset-y-0 right-0 w-1/3 rounded-r-[8.5px] bg-rose-500/10 transition-colors duration-200 hover:bg-rose-500/25 active:bg-rose-500/35"
                              />
                              {/* ثلث اليسار الشفاف (تدرج أزرق خفيف) → مسلسلات */}
                              <Link
                                href={`/series?language=${country.filter}`}
                                onClick={() => setSidebarOpen(false)}
                                title={`${country.label} — مسلسلات`}
                                aria-label={`مسلسلات ${country.label}`}
                                className="absolute inset-y-0 left-0 w-1/3 rounded-l-[8.5px] bg-sky-500/10 transition-colors duration-200 hover:bg-sky-500/25 active:bg-sky-500/35"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* عمود مسلسلات — سطور التصنيفات تتمدد لتساوي ارتفاع عمود اللغات */}
                    <div className="flex flex-col">
                      <div className="flex flex-1 flex-col pt-2.5 pb-2">
                        {genreLinks.map((genre) => {
                          const isActive = pathname?.includes(`/series/genres/${genre.slug}`)
                          return (
                            <Link
                              key={genre.slug}
                              href={`/series/genres/${genre.slug}`}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex flex-row-reverse flex-1 items-center gap-2 px-2.5 py-1.5 text-[12px] font-bold transition-colors duration-200 ${
                                isActive ? 'bg-sky-500/10 text-sky-200' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                              }`}
                            >
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400/70" />
                              <span className="truncate">{genre.label}</span>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
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


