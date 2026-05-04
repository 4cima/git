'use client'

import Link from 'next/link'
import { Zap, Activity, ShieldCheck, Lock, BadgeCheck, Server, ExternalLink } from 'lucide-react'

export const Footer = () => {
  return (
    <footer className="relative z-10 bg-[#08080c]/80 backdrop-blur-xl pt-12 pb-8 mt-12 overflow-hidden border-t border-white/5">
      {/* Artery Line Top */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-zinc-800/50">
        {/* Circuit Pattern */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(6,182,212,0.1) 50%)', backgroundSize: '20px 100%' }} />
        
        {/* Pulse Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent w-full opacity-50 animate-pulse" />
        
        {/* Center Node */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-[1px] bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
      </div>

      <div className="container-wrapper container-padding grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 text-sm relative z-20 mb-12">
        
        {/* Column 1: Brand */}
        <div className="space-y-4 md:col-span-2 lg:col-span-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Zap size={18} className="text-cyan-400" />
            </div>
            <h3 className="font-black text-2xl tracking-tighter bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              فور سيما
            </h3>
          </div>
          <p className="text-zinc-500 text-xs leading-relaxed max-w-xs">
            فور سيما - منصة المشاهدة الأولى في الوطن العربي. أفلام ومسلسلات بجودة عالية مع ترجمة احترافية.
          </p>
          
          <div className="pt-2">
             <a 
               href="https://www.facebook.com/online.cinma." 
               target="_blank" 
               rel="noopener noreferrer"
               className="inline-flex items-center gap-2 text-zinc-400 hover:text-blue-500 transition-colors"
               aria-label="Facebook"
             >
               <ExternalLink size={20} />
               <span className="text-xs font-medium">تابعنا على فيسبوك</span>
             </a>
          </div>
        </div>

        {/* Column 2: Navigation */}
        <div className="space-y-4 lg:col-span-1">
          <h4 className="font-bold text-white flex items-center gap-2">
            <Activity size={14} className="text-purple-500" />
            التصفح
          </h4>
          <nav className="flex flex-col gap-2 text-zinc-400">
            <Link href="/" className="hover:text-cyan-400 transition-colors w-fit">الرئيسية</Link>
            <Link href="/movies" className="hover:text-cyan-400 transition-colors w-fit">أحدث الأفلام</Link>
            <Link href="/series" className="hover:text-cyan-400 transition-colors w-fit">المسلسلات</Link>
            <Link href="/anime" className="hover:text-cyan-400 transition-colors w-fit">الأنمي</Link>
          </nav>
        </div>

        {/* Column 3: Legal & Help */}
        <div className="space-y-4 lg:col-span-1">
          <h4 className="font-bold text-white flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500" />
            المساعدة
          </h4>
          <nav className="flex flex-col gap-2 text-zinc-400">
            <Link href="/dmca" className="hover:text-cyan-400 transition-colors w-fit">DMCA</Link>
            <Link href="/terms" className="hover:text-cyan-400 transition-colors w-fit">الشروط والأحكام</Link>
            <Link href="/privacy" className="hover:text-cyan-400 transition-colors w-fit">سياسة الخصوصية</Link>
            <Link href="/contact" className="hover:text-cyan-400 transition-colors w-fit">اتصل بنا</Link>
          </nav>
        </div>

        {/* Column 4: Status */}
        <div className="space-y-4 lg:col-span-2">
          <div className="p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm group hover:bg-white/10 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-zinc-400 flex items-center gap-2">
                <Server size={12} />
                حالة النظام
              </span>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-bold text-emerald-500">ONLINE</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>Latency</span>
                <span className="text-cyan-500 font-mono">24ms</span>
              </div>
              <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 w-[98%] shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Unified Trust & Security Strip */}
      <div className="w-full border-t border-white/5 relative z-30">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        
        <div className="max-w-[2400px] mx-auto px-4 md:px-12 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            
            {/* Badge 1: SSL Encryption */}
            <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group text-center">
              <div className="p-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                <Lock size={18} className="text-emerald-400" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-black">أمان</span>
                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-emerald-400 transition-colors">تشفير SSL 256-bit</span>
              </div>
            </div>

            {/* Badge 2: Protection */}
            <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group text-center">
              <div className="p-2 rounded-full bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                <ShieldCheck size={18} className="text-blue-400" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-black">حماية</span>
                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-blue-400 transition-colors">منصة آمنة 100%</span>
              </div>
            </div>

            {/* Badge 3: Official Verification */}
            <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group text-center">
              <div className="p-2 rounded-full bg-purple-500/10 border border-purple-500/20 group-hover:scale-110 transition-transform duration-500">
                <BadgeCheck size={18} className="text-purple-400" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-black">موثوق</span>
                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-purple-400 transition-colors">شريك رسمي معتمد</span>
              </div>
            </div>

            {/* Badge 4: Performance */}
            <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group text-center">
              <div className="p-2 rounded-full bg-amber-500/10 border border-amber-500/20 group-hover:scale-110 transition-transform duration-500">
                <Zap size={18} className="text-amber-400" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-black">سرعة</span>
                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-amber-400 transition-colors">خوادم فائقة السرعة</span>
              </div>
            </div>

          </div>
          
          {/* Footer Copyright Line */}
          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-[11px] text-zinc-500 font-medium">
             <p className="order-2 md:order-1">&copy; {new Date().getFullYear()} فور سيما. جميع الحقوق محفوظة.</p>
             <div className="flex items-center gap-4 order-1 md:order-2 opacity-60">
               <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">Server: DXB-01</span>
               <span className="w-1 h-1 rounded-full bg-zinc-800" />
               <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">v2.4.0 Stable</span>
             </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
