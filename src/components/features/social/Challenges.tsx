import { useState, useEffect } from 'react'
import { Zap, Award, PlayCircle, MessageSquare, Users, CheckCircle2, Trophy, Flame } from 'lucide-react'
import { getUserChallenges, getAvailableChallenges } from '../../../lib/supabase'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { logger } from '../../../lib/logger'

interface ChallengesProps {
  userId: string
  lang?: 'ar' | 'en'
}

const ICON_MAP: Record<string, any> = {
  Zap, Award, PlayCircle, MessageSquare, Users, Trophy, Flame
}

export const Challenges = ({ userId, lang = 'ar' }: ChallengesProps) => {
  const [userChallenges, setUserChallenges] = useState<any[]>([])
  const [availableChallenges, setAvailableChallenges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [uChallenges, aChallenges] = await Promise.all([
        getUserChallenges(userId),
        getAvailableChallenges()
      ])
      setUserChallenges(uChallenges)
      setAvailableChallenges(aChallenges)
    } catch (error: any) {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userId])

  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-lumen-gold border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">
          {t('جاري تحميل التحديات...', 'Loading Challenges...')}
        </span>
      </div>
    )
  }

  // Merge available challenges with user progress
  const challengesWithProgress = availableChallenges.map(challenge => {
    const userProgress = userChallenges.find(uc => uc.challenge_id === challenge.id)
    return {
      ...challenge,
      current_count: userProgress?.current_count || 0,
      is_completed: userProgress?.is_completed || false,
      completed_at: userProgress?.completed_at || null
    }
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Zap size={18} className="text-lumen-gold" />
          {t('تحديات المجتمع', 'Community Challenges')}
        </h3>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-lumen-gold/10 border border-lumen-gold/20">
          <Trophy size={14} className="text-lumen-gold" />
          <span className="text-[10px] font-black text-lumen-gold uppercase">
            {challengesWithProgress.filter(c => c.is_completed).length} / {challengesWithProgress.length} {t('مكتمل', 'Completed')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {challengesWithProgress.map((challenge, idx) => {
          const Icon = ICON_MAP[challenge.icon] || Zap
          const progress = Math.min(100, (challenge.current_count / challenge.target_count) * 100)

          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={clsx(
                "relative p-6 rounded-[2rem] border transition-all overflow-hidden group",
                challenge.is_completed
                  ? "bg-emerald-500/[0.03] border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.05)]"
                  : "bg-white/[0.02] border-white/5 hover:border-lumen-gold/30"
              )}
            >
              {/* Progress Background */}
              {!challenge.is_completed && (
                <div
                  className="absolute bottom-0 right-0 h-1 bg-lumen-gold/10 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              )}

              <div className="flex items-start gap-5">
                <div className={clsx(
                  "p-4 rounded-2xl transition-all duration-500",
                  challenge.is_completed
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                    : "bg-white/5 text-zinc-500 group-hover:bg-lumen-gold group-hover:text-black group-hover:shadow-lg group-hover:shadow-lumen-gold/20"
                )}>
                  <Icon size={24} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-white font-bold group-hover:text-lumen-gold transition-colors truncate">
                      {t(challenge.title, challenge.title_en)}
                    </h4>
                    {challenge.is_completed ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : (
                      <span className="text-[10px] font-black text-lumen-gold uppercase">
                        +{challenge.reward_xp} XP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mb-4 line-clamp-2 leading-relaxed">
                    {t(challenge.description, challenge.description_en)}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden mr-4">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={clsx(
                          "h-full rounded-full transition-all duration-1000",
                          challenge.is_completed ? "bg-emerald-500" : "bg-lumen-gold"
                        )}
                      />
                    </div>
                    <span className={clsx(
                      "text-[10px] font-black uppercase whitespace-nowrap",
                      challenge.is_completed ? "text-emerald-500" : "text-zinc-500"
                    )}>
                      {challenge.current_count} / {challenge.target_count}
                    </span>
                  </div>
                </div>
              </div>

              {/* Decorative Glow */}
              <div className={clsx(
                "absolute -right-10 -bottom-10 w-32 h-32 blur-[60px] rounded-full opacity-0 group-hover:opacity-10 transition-opacity",
                challenge.is_completed ? "bg-emerald-500" : "bg-lumen-gold"
              )} />
            </motion.div>
          )
        })}
      </div>

      <div className="p-8 rounded-[2.5rem] border border-dashed border-white/5 text-center">
        <Flame size={32} className="mx-auto text-zinc-800 mb-4" />
        <h4 className="text-sm font-black text-white mb-2 uppercase tracking-widest">{t('تحديات موسمية', 'Seasonal Challenges')}</h4>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">{t('ترقبوا الجوائز الكبرى', 'Stay tuned for legendary rewards')}</p>
      </div>
    </div>
  )
}
