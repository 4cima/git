'use client'

import Link from 'next/link'
import { ExternalLink, AlertTriangle } from 'lucide-react'

export const Footer = () => {
  return (
    <footer className="relative z-10 bg-slate-950 backdrop-blur-xl border-t border-slate-800 w-full">
      {/* Subtle Top Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-zinc-800/50">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(6,182,212,0.1) 50%)', backgroundSize: '20px 100%' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent w-full opacity-50 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-[1px] bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
      </div>

      {/* Main Content - Container with Same Padding as Page Content */}
      <div className="relative z-10">
        <div className="max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Brand Section - 3 cols */}
          <div className="md:col-span-3 space-y-1">
            <p className="text-zinc-500 text-xs leading-relaxed">
              منصة مشاهدة أفلام ومسلسلات مترجمة أونلاين.
            </p>
            <p className="text-zinc-500 text-xs leading-relaxed">
              وصف عربي، تريلرات، وتقييمات لكل عمل.
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

          {/* (بند 6) كتلة «الخوادم/متصل/SSL/آمن/سريع» شيلت — كانت مؤشرات حالة مزيفة
              مش مربوطة بأي قياس فعلي، وبتعرض ادعاءات الموقع مش بيقدر يسندها */}

          {/* Genres SEO - Full Width (تصنيفات الأفلام والمسلسلات — روابط داخلية في كل الصفحات) */}
          <div className="md:col-span-12">
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-300 mb-3">تصنيفات الأفلام</h3>
              <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                <li><Link href="/movies/genres/action">أكشن</Link></li>
                <li><Link href="/movies/genres/comedy">كوميديا</Link></li>
                <li><Link href="/movies/genres/drama">دراما</Link></li>
                <li><Link href="/movies/genres/horror">رعب</Link></li>
                <li><Link href="/movies/genres/romance">رومانسي</Link></li>
                <li><Link href="/movies/genres/thriller">إثارة</Link></li>
                <li><Link href="/movies/genres/animation">أنيميشن</Link></li>
                <li><Link href="/movies/genres/family">عائلي</Link></li>
              </ul>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-300 mb-3">تصنيفات المسلسلات</h3>
              <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                <li><Link href="/series/genres/action">أكشن</Link></li>
                <li><Link href="/series/genres/comedy">كوميديا</Link></li>
                <li><Link href="/series/genres/drama">دراما</Link></li>
                <li><Link href="/series/genres/horror">رعب</Link></li>
                <li><Link href="/series/genres/romance">رومانسي</Link></li>
                <li><Link href="/series/genres/mystery">غموض</Link></li>
                <li><Link href="/series/genres/animation">أنيميشن</Link></li>
                <li><Link href="/genres">كل التصنيفات →</Link></li>
              </ul>
            </div>
          </div>

          {/* Copyright - Full Width */}
          <div className="md:col-span-12 text-center border-t border-white/5 pt-3">
            <p className="text-[10px] text-zinc-600">
              © {new Date().getFullYear()} <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500 font-bold">فور سيما</span> - جميع الحقوق محفوظة
            </p>
          </div>
        </div>
        </div>
      </div>
    </footer>
  )
}
 
