'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useMemo, memo } from 'react'
import { Home, Film, Tv, Gamepad2, Zap, User, Search, Menu, X, BookOpen, Mic, Loader2 } from 'lucide-react'

export const QuantumNavbar = memo(() => {
  const router = useRouter()
  
  const navLinks = useMemo(() => [
    { to: '/', label: 'الرئيسية', icon: Home, color: '#00ffcc' },
    { to: '/movies', label: 'أفلام', icon: Film, color: '#00ccff' },
    { to: '/series', label: 'مسلسلات', icon: Tv, color: '#aa00ff' },
    { to: '/anime', label: 'أنمي', icon: Zap, color: '#f59e0b' },
    { to: '/quran', label: 'القرآن الكريم', icon: BookOpen, color: '#ffd700' }
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
      <nav className="fixed top-0 left-0 right-0 z-[1000] bg-transparent">
        <div className="container-wrapper container-padding flex items-center justify-between h-16">

          {/* Right: Menu + Logo */}
          <div className="flex items-center gap-3">
            {/* Menu Button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-white hover:text-cyan-400 transition-colors cursor-pointer hover:bg-black/60 rounded-lg bg-black/40 backdrop-blur-sm"
              aria-label="القائمة"
            >
              <Menu size={28} />
            </button>

            {/* Logo */}
            <Link href="/" className="group flex items-center cursor-pointer bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1 hover:bg-black/60 transition-colors">
              <div className="relative flex items-center justify-center">
                <div className="relative z-10 font-black text-3xl sm:text-4xl tracking-tighter lowercase group-hover:scale-105 transition-transform duration-300 flex items-center gap-0.5" dir="ltr">
                  <span 
                    className="text-red-600 text-4xl sm:text-5xl animate-wiggle drop-shadow-[0_0_12px_rgba(220,38,38,0.9)]"
                    style={{ 
                      display: 'inline-block', 
                      transformOrigin: 'center',
                      WebkitTextStroke: '1px black',
                      textStroke: '1px black'
                    }}
                  >
                    4
                  </span>
                  <span 
                    className="animate-neon-flicker-cyan drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                    style={{ 
                      fontFamily: '"Brush Script MT", cursive',
                      fontStyle: 'italic',
                      letterSpacing: '0.05em',
                      WebkitTextStroke: '1px black',
                      textStroke: '1px black'
                    }}
                  >
                    <span className="text-sky-400" style={{ textShadow: '0 0 10px rgba(56,189,248,0.5), 0 0 20px rgba(56,189,248,0.3)' }}>c</span>
                    <span className="text-emerald-500 inline-block" style={{ textShadow: '0 0 10px rgba(16,185,129,0.5), 0 0 20px rgba(16,185,129,0.3)', animation: 'spinY 4s linear infinite', fontStyle: 'normal', fontSize: '120%', fontWeight: 'bold' }}>i</span>
                    <span className="text-fuchsia-500" style={{ textShadow: '0 0 10px rgba(217,70,239,0.6), 0 0 20px rgba(217,70,239,0.4)' }}>m</span>
                    <span className="text-amber-400" style={{ textShadow: '0 0 10px rgba(251,191,36,0.6), 0 0 20px rgba(251,191,36,0.4), 0 0 30px rgba(251,191,36,0.2)' }}>a</span>
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-cyan-500/20 to-purple-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full animate-pulse" />
              </div>
            </Link>
          </div>

          {/* Left: Search + Profile */}
          <div className="flex items-center gap-3">
            {/* Desktop Search */}
            <div className="hidden md:flex items-center relative">
              <div className="relative group bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={isListening ? 'تحدث الآن...' : 'بحث...'}
                  className="bg-transparent border-none rounded-full py-2 pl-10 pr-10 text-sm text-zinc-300 w-36 lg:w-48 transition-all focus:outline-none placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  aria-label="بحث"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-hover:text-cyan-400 transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={startListening}
                  aria-label="بحث صوتي"
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-cyan-400 transition-colors cursor-pointer ${isListening ? 'text-red-500 animate-pulse' : ''}`}
                >
                  {isListening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Mobile Search Icon */}
            <button
              type="button"
              className="md:hidden p-2 text-white hover:text-cyan-400 transition-colors bg-black/40 backdrop-blur-sm rounded-lg hover:bg-black/60 cursor-pointer"
              onClick={() => {
                const searchQuery = prompt('ابحث عن...')
                if (searchQuery?.trim()) {
                  router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
                }
              }}
              aria-label="بحث"
            >
              <Search size={20} />
            </button>

            {/* Profile */}
            <Link href="/profile" prefetch={false} className="bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors p-1 cursor-pointer">
              <div className="w-9 h-9 rounded-full p-[1.5px] bg-gradient-to-tr from-purple-500 to-cyan-500">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                  <User size={18} className="text-white" />
                </div>
              </div>
            </Link>
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
              className="fixed top-0 right-0 h-full w-72 z-[1200] bg-black/95 backdrop-blur-xl border-l border-white/10 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-xl font-bold text-white">القائمة</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-white hover:text-red-500 transition-colors"
                  aria-label="إغلاق"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Links */}
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
})

QuantumNavbar.displayName = 'QuantumNavbar'
