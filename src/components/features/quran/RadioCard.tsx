import { motion } from 'framer-motion'
import { Radio } from 'lucide-react'
import { useLang } from '../../../state/useLang'

export const RadioCard = () => {
  const { lang } = useLang()
  
  return (
    <motion.button 
      whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(245,158,11,0.3)" }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        const width = 420
        const height = Math.max(320, Math.round((window.screen?.height || 700) * 0.5))
        const left = Math.max(0, Math.round(((window.screen?.width || 900) - width) / 2))
        const top = Math.max(0, Math.round(((window.screen?.height || 700) - height) / 2))

        const popup = window.open(
          '/quran/radio',
          'QuranRadio',
          `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`
        )

        if (popup) {
          try {
            popup.opener = null
            popup.focus()
          } catch {
            popup.focus()
          }
          return
        }

        window.location.href = '/quran/radio'
      }}
      className="group relative flex items-center gap-3 px-4 py-[22px] rounded-2xl bg-gradient-to-br from-cyan-900/40 to-sky-900/40 border border-cyan-500/40 text-cyan-100 transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.15)] overflow-hidden"
    >
      {/* Shimmering Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      
      <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/40 group-hover:bg-cyan-500/30 group-hover:border-cyan-300 transition-all duration-300 shrink-0">
        <Radio size={18} className="animate-pulse text-cyan-400" />
      </div>
      <div className="flex flex-col items-start relative z-10 flex-1 min-w-0">
        <span className="text-sm font-bold font-amiri leading-tight text-white group-hover:text-cyan-300 transition-colors truncate w-full">
          {lang === 'ar' ? 'إذاعة القرآن الكريم' : 'Quran Radio'}
        </span>
        <span className="text-[9px] text-cyan-400/80 font-normal flex items-center gap-1.5 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
          {lang === 'ar' ? 'بث مباشر 24/7' : 'Live 24/7'}
        </span>
      </div>
    </motion.button>
  )
}
