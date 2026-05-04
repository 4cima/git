import { useState, useEffect } from 'react'
import { Sparkles, Brain, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateAiInsights } from '../../../lib/groq'
import { clsx } from 'clsx'

interface AiInsightsProps {
  title: string
  type: 'movie' | 'tv'
  overview?: string
  className?: string
}

export const AiInsights = ({ title, type, overview, className }: AiInsightsProps) => {
  const [insights, setInsights] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const fetchInsights = async () => {
    if (!title) return
    setLoading(true)
    setError(false)
    try {
      const result = await generateAiInsights(title, type, overview || '')
      if (result.length > 0) {
        setInsights(result)
      } else {
        setError(true)
      }
    } catch (err: any) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [title])

  if (!loading && insights.length === 0 && !error) return null

  return (
    <div className={clsx("rounded-2xl border border-primary/20 bg-primary/5 p-6 backdrop-blur-sm", className)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-primary/20 text-primary">
          <Brain size={20} />
        </div>
        <div>
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            تحليل الذكاء الاصطناعي
            <Sparkles size={14} className="text-primary animate-pulse" />
          </h3>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Insights powered by Groq AI</p>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 py-4"
            >
              <Loader2 className="animate-spin text-primary" size={20} />
              <span className="text-xs text-zinc-400 font-medium italic">جاري استخراج رؤى سينمائية فريدة...</span>
            </motion.div>
          ) : error ? (
            <motion.p 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-zinc-500 italic"
            >
              تعذر تحميل التحليلات حالياً. جرب لاحقاً.
            </motion.p>
          ) : (
            <div className="grid gap-3">
              {insights.map((insight, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex gap-3 items-start group"
                >
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                  <p className="text-xs text-zinc-300 leading-relaxed font-medium group-hover:text-white transition-colors">
                    {insight}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {!loading && !error && insights.length > 0 && (
        <button 
          onClick={fetchInsights}
          className="mt-4 text-[10px] font-bold text-primary hover:text-white transition-colors flex items-center gap-1 uppercase tracking-tighter"
        >
          تحديث التحليل
        </button>
      )}
    </div>
  )
}
