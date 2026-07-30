'use client'

import Link from 'next/link'
import { ShieldCheck, Lock, Server, ExternalLink, AlertTriangle, Gauge } from 'lucide-react'

export const Footer = () => {
  return (
    <footer className="relative z-10 bg-slate-950 backdrop-blur-xl border-t border-slate-800">
      {/* Subtle Top Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-zinc-800/50">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(6,182,212,0.1) 50%)', backgroundSize: '20px 100%' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent w-full opacity-50 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-[1px] bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
      </div>

      {/* Main Content */}
      <div className="container-wrapper container-padding py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Brand Section - 3 cols */}
          <div className="md:col-span-3 space-y-1">
            <p className="text-zinc-500 text-xs leading-relaxed">
              منصة المشاهدة الأولى في الوطن العربي.
            </p>
            <p className="text-zinc-500 text-xs leading-relaxed">
              أفلام ومسلسلات بجودة عالية.
            </p>
          </div>

          {/* Navigation - 2 cols */}
          <div className="md:col-span-2 space-y-3">
            <nav className="flex flex-col gap-1.5 text-zinc-400 text-xs">
              <Link href="/movies" className="hover:text-cyan-400 transition-colors">الأفلام</Link>
              <Link href="/series" className="hover:text-cyan-400 transition-colors">المسلسلات</Link>
            </nav>
          </div>

          {/* Legal - 2 cols */}
          <div className="md:col-span-2 space-y-2">
            <Link href="/dmca" className="block text-red-400 hover:text-red-300 transition-colors text-xs font-bold">
              DMCA
            </Link>
            
            <Link href="/copyright" className="block text-zinc-400 hover:text-cyan-400 transition-colors text-xs">
              حقوق النشر
            </Link>
          </div>

          {/* Terms & Privacy - 1 col */}
          <div className="md:col-span-1 space-y-2">
            <Link href="/terms" className="block text-zinc-400 hover:text-cyan-400 transition-colors text-xs">
              الشروط
            </Link>
            <Link href="/privacy" className="block text-zinc-400 hover:text-cyan-400 transition-colors text-xs">
              الخصوصية
            </Link>
          </div>

          {/* Contact & Social - 2 cols */}
          <div className="md:col-span-2 space-y-2">
            <Link 
              href="/contact" 
              className="block text-zinc-400 hover:text-cyan-400 transition-colors text-xs"
            >
              اتصل بنا
            </Link>
            
            <a 
              href="https://www.facebook.com/4cima2" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-950/20 border border-blue-900/30 hover:border-blue-800/50 transition-all group text-xs w-fit"
            >
              <ExternalLink size={12} className="text-blue-400" />
              <span className="font-medium text-blue-400 text-[10px]">فيسبوك</span>
            </a>
          </div>

          {/* Status & Trust - 2 cols */}
          <div className="md:col-span-2 space-y-2">
            {/* Server Status - Compact Inline */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/20 border border-emerald-900/30">
              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <Server size={10} />
                الخوادم
              </span>
              <div className="flex items-center gap-1.5">
                <div className="h-1 w-16 bg-slate-900/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 w-[98%]" />
                </div>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-bold text-emerald-400">متصل</span>
              </div>
            </div>

            {/* Trust Badges - Compact Horizontal */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900/30 border border-slate-800/50 hover:border-emerald-500/30 transition-colors group">
                <Lock size={10} className="text-emerald-400" />
                <span className="text-[9px] font-bold text-slate-400 group-hover:text-emerald-400 transition">SSL</span>
              </div>
              
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900/30 border border-slate-800/50 hover:border-blue-500/30 transition-colors group">
                <ShieldCheck size={10} className="text-blue-400" />
                <span className="text-[9px] font-bold text-slate-400 group-hover:text-blue-400 transition">آمن</span>
              </div>
              
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900/30 border border-slate-800/50 hover:border-amber-500/30 transition-colors group">
                <Gauge size={10} className="text-amber-400" />
                <span className="text-[9px] font-bold text-slate-400 group-hover:text-amber-400 transition">سريع</span>
              </div>
            </div>
          </div>

          {/* Copyright - Full Width */}
          <div className="md:col-span-12 text-center border-t border-white/5 pt-3">
            <p className="text-[10px] text-zinc-600">
              © {new Date().getFullYear()} <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500 font-bold">فور سيما</span> - جميع الحقوق محفوظة
              <span className="mx-2">•</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-400 border border-slate-700 font-bold">v2.4.0</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
 
