'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Film,
  Tv,
  ShieldAlert,
  Users,
  MessagesSquare,
  Terminal,
  Megaphone,
  Settings,
  MonitorPlay,
  Menu,
  X,
  LogOut,
} from 'lucide-react'

type NavItem = { name: string; href: string; icon: typeof LayoutDashboard }
type NavGroup = { title: string; items: NavItem[] }

const NAV: NavGroup[] = [
  {
    title: 'عام',
    items: [{ name: 'لوحة التحكم', href: '/admin/dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'المحتوى',
    items: [
      { name: 'طابور المراجعة', href: '/admin/review', icon: ShieldAlert },
      { name: 'الأفلام', href: '/admin/movies', icon: Film },
      { name: 'المسلسلات', href: '/admin/series', icon: Tv },
    ],
  },
  {
    title: 'المجتمع',
    items: [
      { name: 'الاقتراحات والمراجعات', href: '/admin/community', icon: MessagesSquare },
      { name: 'المستخدمون', href: '/admin/users', icon: Users },
    ],
  },
  {
    title: 'التشغيل',
    items: [
      { name: 'العمليات', href: '/admin/operations', icon: Terminal },
      { name: 'الإعلانات', href: '/admin/ads', icon: Megaphone },
    ],
  },
  {
    title: 'النظام',
    items: [
      { name: 'معمل المشغّلات', href: '/admin/player-test', icon: MonitorPlay },
      { name: 'الإعدادات', href: '/admin/settings', icon: Settings },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <div dir="rtl" className="flex min-h-screen bg-zinc-950 font-[Cairo,sans-serif] text-zinc-100">
      {/* طبقة تعتيم للموبايل */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* الشريط الجانبي */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex h-full w-64 flex-col border-l border-zinc-800 bg-zinc-900 transition-transform duration-300 lg:sticky lg:translate-x-0 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-4">
          <Link href="/admin/dashboard" className="text-2xl font-black tracking-tighter">
            <span className="text-red-600">4</span>
            <span className="text-cyan-400">CIMA</span>
            <span className="mr-2 align-middle text-[10px] font-normal uppercase tracking-widest text-zinc-500">
              admin
            </span>
          </Link>
          <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white lg:hidden" aria-label="إغلاق القائمة">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">{group.title}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive(item.href)
                        ? 'bg-cyan-500/10 font-bold text-cyan-400'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
                    }`}
                  >
                    <item.icon size={18} className={isActive(item.href) ? 'text-cyan-400' : ''} />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-zinc-800 p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={18} />
            <span>الخروج للموقع</span>
          </Link>
        </div>
      </aside>

      {/* المحتوى */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-900/70 px-4 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="text-zinc-400 hover:text-white lg:hidden" aria-label="فتح القائمة">
              <Menu size={22} />
            </button>
            <h1 className="text-base font-bold text-zinc-100">
              {NAV.flatMap((g) => g.items).find((i) => isActive(i.href))?.name ?? 'الإدارة'}
            </h1>
          </div>
          <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-bold tracking-wide text-zinc-500">
            4CIMA ADMIN
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
