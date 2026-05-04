import { motion } from 'framer-motion'
import { Mic } from 'lucide-react'
import { useLang } from '../../../state/useLang'
import type { QuranReciter } from './ReciterList'

interface ReciterHeaderProps {
  reciter: QuranReciter
}

export const ReciterHeader = ({ reciter }: { reciter: QuranReciter }) => {
  // Helper to clean reciter name
  const cleanName = (name: string) => {
    return name.replace(/\s*\[.*?\]\s*/g, '').trim()
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] border border-amber-900/20 p-6 mb-6 shrink-0">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-900/10 via-transparent to-transparent opacity-50" />
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-600/5 rounded-full blur-3xl" />
      
      <div className="relative z-10 flex items-center gap-6">
        {/* Reciter Icon */}
        <div className="w-20 h-20 rounded-full border-2 border-amber-500/30 overflow-hidden bg-[#151515] flex items-center justify-center shrink-0 shadow-lg shadow-amber-900/10">
          <Mic size={28} className="text-amber-500/50" />
        </div>
        
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white font-amiri mb-1 drop-shadow-sm">
            {cleanName(reciter.name)}
          </h2>
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <span className="bg-amber-900/20 text-amber-500 px-2 py-0.5 rounded text-xs border border-amber-900/30">
              {reciter.rewaya}
            </span>
            <span>•</span>
            <span>{reciter.count} سورة</span>
          </div>
        </div>
      </div>
    </div>
  )
}
