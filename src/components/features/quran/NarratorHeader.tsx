import { motion } from 'framer-motion'
import { Mic } from 'lucide-react'
import { useLang } from '../../../state/useLang'
import type { Narrator } from '../../../types/quran-stories'

interface NarratorHeaderProps {
  narrator: Narrator
}

export const NarratorHeader = ({ narrator }: NarratorHeaderProps) => {
  const { lang } = useLang()

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] border border-amber-900/20 p-6 mb-6 shrink-0">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-900/10 via-transparent to-transparent opacity-50" />
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-600/5 rounded-full blur-3xl" />
      
      <div className="relative z-10 flex items-center gap-6">
        {/* Narrator Icon */}
        <div className="w-20 h-20 rounded-full border-2 border-amber-500/30 overflow-hidden bg-[#151515] flex items-center justify-center shrink-0 shadow-lg shadow-amber-900/10">
          <Mic size={28} className="text-amber-500/50" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl md:text-3xl font-bold text-white font-amiri drop-shadow-sm">
              {lang === 'ar' ? narrator.name_ar : narrator.name_en}
            </h2>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <span className="bg-amber-900/20 text-amber-500 px-2 py-0.5 rounded text-xs border border-amber-900/30">
              {lang === 'ar' ? 'راوي' : 'Narrator'}
            </span>
            <span>•</span>
            <span>{narrator.story_count} {lang === 'ar' ? 'قصة' : 'stories'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
