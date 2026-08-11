'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Film, 
  Tv, 
  Settings, 
  Users, 
  Database, 
  Activity,
  Menu,
  X,
  LogOut,
  ShieldAlert,
  Terminal
} from 'lucide-react'

const navItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Review', href: '/admin/review', icon: ShieldAlert },
  { name: 'Movies', href: '/admin/movies', icon: Film },
  { name: 'Series', href: '/admin/series', icon: Tv },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Operations', href: '/admin/operations', icon: Terminal },
  { name: 'System Health', href: '/admin/system', icon: Activity },
  { name: 'Database', href: '/admin/database', icon: Database },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex" dir="ltr">
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen w-64 
          bg-zinc-900 border-r border-zinc-800 flex flex-col
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'}
        `}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800">
          <Link href="/admin/dashboard" className={`font-black text-2xl tracking-tighter flex items-center gap-1 ${!sidebarOpen && !isMobile ? 'hidden' : 'block'}`}>
            <span className="text-red-600">4</span>
            <span className="text-cyan-400">CIMA</span>
            <span className="text-xs text-zinc-500 ml-2 font-normal uppercase tracking-widest">Admin</span>
          </Link>
          
          {/* Mobile Close Button */}
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="text-zinc-400 hover:text-white">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-cyan-500/10 text-cyan-400 font-medium' 
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
                  }
                  ${!sidebarOpen && !isMobile ? 'justify-center px-0' : ''}
                `}
                title={!sidebarOpen && !isMobile ? item.name : undefined}
              >
                <item.icon size={20} className={isActive ? 'text-cyan-400' : ''} />
                <span className={`${!sidebarOpen && !isMobile ? 'hidden' : 'block'}`}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-zinc-800">
          <Link
            href="/"
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 
              hover:bg-red-500/10 hover:text-red-400 transition-colors
              ${!sidebarOpen && !isMobile ? 'justify-center px-0' : ''}
            `}
            title={!sidebarOpen && !isMobile ? 'Exit Admin' : undefined}
          >
            <LogOut size={20} />
            <span className={`${!sidebarOpen && !isMobile ? 'hidden' : 'block'}`}>
              Exit Admin
            </span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-zinc-900/50 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-zinc-100 capitalize">
              {pathname.split('/').pop() || 'Dashboard'}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 p-[2px]">
              <div className="w-full h-full rounded-full bg-zinc-900 border border-zinc-800" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}