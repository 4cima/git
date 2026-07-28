'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useMemo, memo, useEffect } from 'react'
import { Home, Film, Tv, Gamepad2, Zap, Search, Menu, X, Mic, Loader2, ArrowLeft } from 'lucide-react'

export const QuantumNavbar = memo(() => {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [logoScrolled, setLogoScrolled] = useState(false)

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
    { to: '/series', label: 'مسلسلات', icon: Tv, color: '#aa00ff' },
    { to: '/anime', label: 'أنمي', icon: Zap, color: '#f59e0b' }
  ], [])

  const countryLinks = useMemo(() => [
    { code: 'ar', label: 'عربي', icon: Film, filter: 'ar' },
    { code: 'tr', label: 'تركي', icon: Film, filter: 'tr' },
    { code: 'ko', label: 'كوري', icon: Tv, filter: 'ko' },
    { code: 'hi', label: 'هندي', icon: Film, filter: 'hi,ta,ml' },
    { code: 'zh', label: 'صيني', icon: Film, filter: 'zh,cn' },
    { code: 'en', label: 'إنجليزي', icon: Film, filter: 'en' },
    { code: 'eu', label: 'أوروبي', icon: Film, filter: 'fr,es,de,it,ru' }
  ], [])

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isListening, setIsListening] = useState(false)

  const handleSearch = () => {
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
      setQuery('')
    }
  }

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.lang = 'ar-SA'
      recognition.continuous = false
      recognition.interimResults = false

      recognition.onstart = () => setIsListening(true)
      recognition.onend = () => setIsListening(false)
      recognition.onerror = () => setIsListening(false)

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript
        setQuery(text)
      }

      recognition.start()
    } else {
      alert('البحث الصوتي غير مدعوم')
    }
  }

  return (
    <>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 bg-transparent border-b border-transparent">
        <div className="max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 flex items-center justify-between h-16">

          {/* Right: Menu + Logo */}
          <div className="flex items-center gap-3">
            {/* Menu Button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-white hover:text-cyan-400 transition-colors cursor-pointer"
              aria-label="القائمة"
            >
              <Menu size={28} />
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

          {/* Left: Empty */}
          <div className="flex items-center gap-3">
          </div>
        </div>
            </nav>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm"
            />

            {/* Sidebar Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-80 z-[1200] bg-black/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                <h2 className="text-xl font-bold text-white">القائمة</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-white hover:text-red-500 transition-colors"
                  aria-label="إغلاق"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Main Links */}
                <div className="p-4 space-y-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      href={link.to}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white transition-all group"
                    >
                      <link.icon size={20} style={{ color: link.color }} className="group-hover:scale-110 transition-transform" />
                      <span className="font-bold">{link.label}</span>
                    </Link>
                  ))}
                </div>

                {/* Country/Language Section */}
                <div className="px-4 pt-2 pb-2 border-t border-white/10">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">حسب البلد ({countryLinks.length})</h3>
                </div>

                {/* Country Links - 2 Columns Grid */}
                <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                  {countryLinks.map((country) => (
                    <Link
                      key={country.code}
                      href={`/movies?language=${country.filter}`}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-all group text-sm"
                    >
                      <country.icon size={16} className="text-cyan-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                      <span className="font-medium truncate">{country.label}</span>
                    </Link>
                  ))}
                </div>
                
                {/* "كل الأقسام" Button */}
                <div className="px-4 pb-4">
                  <Link
                    href="/genres"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center justify-center gap-3 p-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-all group border border-cyan-500/20"
                  >
                    <Film size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="font-bold">كل الأقسام</span>
                    <ArrowLeft size={16} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
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


