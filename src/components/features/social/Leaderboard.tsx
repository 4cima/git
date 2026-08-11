import { useState, useEffect } from 'react'
import { Trophy, Film, MessageSquare, TrendingUp, Medal } from 'lucide-react'
import { getLeaderboard } from '../../../lib/supabase'
import Link from 'next/link'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { logger } from '../../../lib/logger'

interface LeaderboardProps {
  limit?: number
  lang?: 'ar' | 'en'
}

export const Leaderboard = ({ limit = 20, lang = 'ar' }: LeaderboardProps) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = async () => {
    try {
      const data = await getLeaderboard(limit)
      setEntries(data)
    } catch (error: any) {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [limit])

  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-lumen-gold border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">
          {t('جاري تحميل قائمة المتصدرين...', 'Loading Leaderboard...')}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-4 items-end max-w-2xl mx-auto pt-10">
        {/* 2nd Place */}
        {entries[1] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-zinc-400 overflow-hidden shadow-2xl">
                <img
                  src={entries[1].avatar_url || '/default-avatar.png'}
                  alt={entries[1].username}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-zinc-400 text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase shadow-lg">
                #2
              </div>
            </div>
            <div className="text-center w-full">
              <p className="text-white font-bold text-xs truncate mb-1">{entries[1].username}</p>
              <div className="h-24 bg-gradient-to-t from-zinc-500/20 to-zinc-400/50 rounded-t-2xl flex flex-col items-center justify-center border-x border-t border-zinc-400/20">
                <span className="text-zinc-300 text-xs font-black">{entries[1].total_xp}</span>
                <span className="text-[8px] text-zinc-400 uppercase font-black tracking-widest">XP</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* 1st Place */}
        {entries[0] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center z-10"
          >
            <div className="relative mb-6">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-6 left-1/2 -translate-x-1/2 text-lumen-gold"
              >
                <Trophy size={32} />
              </motion.div>
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-lumen-gold overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                <img
                  src={entries[0].avatar_url || '/default-avatar.png'}
                  alt={entries[0].username}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-lumen-gold text-black px-4 py-1 rounded-full text-xs font-black uppercase shadow-xl">
                #1
              </div>
            </div>
            <div className="text-center w-full">
              <p className="text-white font-black text-sm truncate mb-1">{entries[0].username}</p>
              <div className="h-32 bg-gradient-to-t from-lumen-gold/20 to-lumen-gold/50 rounded-t-2xl flex flex-col items-center justify-center border-x border-t border-lumen-gold/30">
                <span className="text-white text-lg font-black">{entries[0].total_xp}</span>
                <span className="text-[10px] text-lumen-gold uppercase font-black tracking-widest">XP</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* 3rd Place */}
        {entries[2] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-4">
              <div className="w-16 h-16 md:w-18 md:h-18 rounded-full border-4 border-amber-700/50 overflow-hidden shadow-xl">
                <img
                  src={entries[2].avatar_url || '/default-avatar.png'}
                  alt={entries[2].username}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-700 text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase shadow-lg">
                #3
              </div>
            </div>
            <div className="text-center w-full">
              <p className="text-white font-bold text-xs truncate mb-1">{entries[2].username}</p>
              <div className="h-20 bg-gradient-to-t from-amber-700/20 to-amber-700/50 rounded-t-2xl flex flex-col items-center justify-center border-x border-t border-amber-700/20">
                <span className="text-amber-200 text-xs font-black">{entries[2].total_xp}</span>
                <span className="text-[8px] text-amber-500 uppercase font-black tracking-widest">XP</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] overflow-hidden backdrop-blur-md">
        <div className="grid grid-cols-12 p-6 border-b border-white/5 bg-white/[0.03] text-[10px] font-black text-zinc-500 uppercase tracking-widest">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-5 px-4">{t('المستخدم', 'User')}</div>
          <div className="col-span-2 text-center flex items-center justify-center gap-1">
            <TrendingUp size={12} />
            <span className="hidden md:inline">XP</span>
          </div>
          <div className="col-span-2 text-center flex items-center justify-center gap-1">
            <Film size={12} />
            <span className="hidden md:inline">{t('مشاهدة', 'Watched')}</span>
          </div>
          <div className="col-span-2 text-center flex items-center justify-center gap-1">
            <MessageSquare size={12} />
            <span className="hidden md:inline">{t('مراجعات', 'Reviews')}</span>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {entries.slice(3).map((entry, idx) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-12 p-4 items-center hover:bg-white/[0.03] transition-colors group"
            >
              <div className="col-span-1 text-center">
                <span className="text-xs font-black text-zinc-600 group-hover:text-lumen-gold transition-colors">
                  {entry.rank}
                </span>
              </div>
              <div className="col-span-5 px-4">
                <Link href={`/user/${entry.username}`} className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={entry.avatar_url || '/default-avatar.png'}
                      alt={entry.username}
                      className="w-10 h-10 rounded-xl object-cover border border-white/10 group-hover:border-lumen-gold/30 transition-all"
                    />
                    {entry.rank <= 10 && (
                      <div className="absolute -top-1 -right-1 bg-lumen-gold text-black p-0.5 rounded-md">
                        <Medal size={8} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate group-hover:text-lumen-gold transition-colors">{entry.username}</p>
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Level {Math.floor(entry.total_xp / 100) + 1}</p>
                  </div>
                </Link>
              </div>
              <div className="col-span-2 text-center">
                <span className="text-xs font-black text-white">{entry.total_xp}</span>
              </div>
              <div className="col-span-2 text-center">
                <span className="text-xs font-bold text-zinc-400">{entry.movies_watched}</span>
              </div>
              <div className="col-span-2 text-center">
                <span className="text-xs font-bold text-zinc-400">{entry.reviews_written}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

