import { motion, AnimatePresence } from 'framer-motion'
import { Search, User, Mic } from 'lucide-react'
import { useLang } from '../../../state/useLang'

export type QuranReciter = {
  id: number
  name: string
  image: string | null
  rewaya: string | null
  server: string | null
  is_active?: boolean
  surah_list?: string | null
  featured?: boolean
  category?: string
  letter: string
  count: number
}

interface ReciterListProps {
  reciters: QuranReciter[]
  selectedReciter: QuranReciter | null
  onSelect: (reciter: QuranReciter) => void
  isLoading: boolean
}

export const ReciterList = ({ reciters, selectedReciter, onSelect, isLoading }: ReciterListProps) => {
  const { lang } = useLang()

  // Helper to clean reciter name
  const cleanName = (name: string) => {
    return name.replace(/\s*\[.*?\]\s*/g, '').trim()
  }

  return (
    <div className="w-full shrink-0 flex flex-col bg-amber-950/20 backdrop-blur-2xl border border-amber-500/10 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] lg:h-full h-[350px] relative z-10">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 text-amber-500/50 gap-4">
            <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
          </div>
        ) : reciters.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {reciters.map((reciter, idx) => (
              <motion.button
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                key={reciter.id}
                onClick={() => onSelect(reciter)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                  selectedReciter?.id === reciter.id 
                    ? 'bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]' 
                    : 'hover:bg-amber-500/5 border border-transparent'
                }`}
              >
                {selectedReciter?.id === reciter.id && (
                  <motion.div 
                    layoutId="active-reciter"
                    className="absolute left-0 top-0 w-1 h-full bg-emerald-500"
                  />
                )}
                
                <div className="flex-1 text-left overflow-hidden">
                  <h3 className={`font-bold font-amiri truncate text-sm ${selectedReciter?.id === reciter.id ? 'text-emerald-400' : 'text-amber-100/70 group-hover:text-white'}`}>
                    {cleanName(reciter.name)}
                  </h3>
                  <p className={`text-[10px] font-sans truncate transition-colors ${selectedReciter?.id === reciter.id ? 'text-emerald-500/60' : 'text-amber-900'}`}>
                    {reciter.rewaya || (lang === 'ar' ? 'رواية حفص عن عاصم' : 'Hafs an Asim')}
                  </p>
                </div>
                
                {reciter.featured && (
                  <Mic size={14} className="shrink-0 transition-colors" style={{ color: '#c0e0ff' }} />
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-amber-900 gap-3">
            <Search size={32} strokeWidth={1} />
            <span className="text-sm font-amiri">{lang === 'ar' ? 'لم يتم العثور على القارئ' : 'Reciter not found'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
