/**
 * Auth Layout - Split-screen design for login/register pages
 * Left: Branding and features
 * Right: Auth forms
 * Mobile: Stacked vertically
 */

import { Sparkles, BookMarked, Play, Star } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex" dir="rtl">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
      
      {/* Branding Section - Desktop Left Panel */}
      <div className="hidden lg:flex lg:w-[40%] relative z-10 flex-col justify-center px-12 border-r border-zinc-800">
        <div className="max-w-md">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
            <div className="flex items-center gap-1 font-black text-4xl tracking-tighter lowercase" dir="ltr">
              <span className="text-red-600 group-hover:scale-110 transition-transform">4</span>
              <span className="text-cyan-400 group-hover:scale-110 transition-transform">cima</span>
            </div>
          </Link>
          
          {/* Tagline */}
          <div className="space-y-2 mb-12">
            <h1 className="text-3xl font-bold text-zinc-100">
              استمتع بأفضل تجربة سينمائية
            </h1>
            <p className="text-lg text-zinc-400">
              The ultimate cinema experience
            </p>
          </div>
          
          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start gap-4 group">
              <div className="p-2 rounded-lg bg-red-600/10 text-red-600 group-hover:bg-red-600/20 transition-colors">
                <BookMarked size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100 mb-1">قائمة متابعة شخصية</h3>
                <p className="text-sm text-zinc-500">Personal watchlist</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 group">
              <div className="p-2 rounded-lg bg-cyan-400/10 text-cyan-400 group-hover:bg-cyan-400/20 transition-colors">
                <Play size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100 mb-1">متابعة مشاهدتك</h3>
                <p className="text-sm text-zinc-500">Continue watching</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 group">
              <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 transition-colors">
                <Star size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100 mb-1">تقييمات ومراجعات</h3>
                <p className="text-sm text-zinc-500">Ratings & reviews</p>
              </div>
            </div>
          </div>
          
          {/* Decorative element */}
          <div className="absolute bottom-12 right-12 opacity-10">
            <Sparkles size={120} className="text-red-600" />
          </div>
        </div>
      </div>
      
      {/* Form Section - Desktop Right Panel / Mobile Full Width */}
      <div className="flex-1 relative z-10 flex items-center justify-center p-4 lg:p-8">
        {/* Mobile Logo */}
        <div className="absolute top-4 right-4 lg:hidden">
          <Link href="/" className="inline-flex items-center gap-1 font-black text-2xl tracking-tighter lowercase" dir="ltr">
            <span className="text-red-600">4</span>
            <span className="text-cyan-400">cima</span>
          </Link>
        </div>
        
        {/* Form Container */}
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
