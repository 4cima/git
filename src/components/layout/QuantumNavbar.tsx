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
              className="p-2 text-white hover:text-cyan-400 transition-colors"
              aria-label="القائمة"
            >
              <Menu size={24} />
            </button>

            {/* Logo */}
            <Link href="/" className="group flex items-center">
              <div className="relative flex items-center justify-center">
                <div className="relative z-10 font-black text-2xl sm:text-3xl tracking-tighter lowercase group-hover:scale-105 transition-transform duration-300 flex items-center gap-0.5" dir="ltr">
                  <span className="text-red-600 text-3xl sm:text-4xl drop-shadow-[0_0_8px_rgba(220,38,38,0.6)]">4</span>
                  <span className="text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.4)]">c</span>
                  <span className="text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]">i</span>
                  <span className="text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">m</span>
                  <span className="text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">a</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Left: Search + Profile */}
          <div className="flex items-center gap-3">
            {/* Desktop Search */}
            <div className="hidden md:flex items-center relative">
              <div className="relative group">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={isListening ? 'تحدث الآن...' : 'بحث...'}
                  className="bg-zinc-900/80 border border-white/10 rounded-full py-2 pl-10 pr-10 text-sm text-zinc-300 w-36 lg:w-48 hover:bg-zinc-800/80 hover:border-cyan-500/30 transition-all focus:outline-none focus:border-cyan-500/50 placeholder:text-zinc-600 backdrop-blur-sm"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  aria-label="بحث"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-hover:text-cyan-400 transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={startListening}
                  aria-label="بحث صوتي"
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-cyan-400 transition-colors ${isListening ? 'text-red-500 animate-pulse' : ''}`}
                >
                  {isListening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Mobile Search Icon */}
            <button
              type="button"
              className="md:hidden p-2 text-white hover:text-cyan-400 transition-colors"
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
            <Link href="/profile">
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
