import { useState, useEffect } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { voteReview, removeReviewVote, getReviewVotes } from '../../../lib/supabase'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { toast } from '../../../lib/toast-manager'
import { logger } from '../../../lib/logger'

interface ReviewVotesProps {
  commentId: string
  userId?: string
  lang?: 'ar' | 'en'
}

export const ReviewVotes = ({ commentId, userId, lang = 'ar' }: ReviewVotesProps) => {
  const [votes, setVotes] = useState<{ vote_type: 'up' | 'down', user_id: string }[]>([])
  const [loading, setLoading] = useState(false)

  const fetchVotes = async () => {
    try {
      const data = await getReviewVotes(commentId)
      setVotes(data)
    } catch (error: any) {
      // Silently fail
    }
  }

  useEffect(() => {
    fetchVotes()
  }, [commentId])

  const upVotes = votes.filter(v => v.vote_type === 'up').length
  const downVotes = votes.filter(v => v.vote_type === 'down').length
  const userVote = votes.find(v => v.user_id === userId)?.vote_type

  const handleVote = async (type: 'up' | 'down') => {
    if (!userId) {
      toast.error(lang === 'ar' ? 'يجب تسجيل الدخول للتصويت' : 'You must sign in to vote', { id: 'auth-required' })
      return
    }

    setLoading(true)
    try {
      if (userVote === type) {
        await removeReviewVote(commentId, userId)
      } else {
        await voteReview(commentId, userId, type)
      }
      await fetchVotes()
    } catch (error: any) {
      toast.error(lang === 'ar' ? 'فشل التصويت' : 'Vote failed')
    } finally {
      setLoading(false)
    }
  }

  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)

  return (
    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mr-2">
        {t('هل كانت هذه المراجعة مفيدة؟', 'Was this review helpful?')}
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => handleVote('up')}
          disabled={loading}
          className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all",
            userVote === 'up'
              ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/20"
              : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10"
          )}
        >
          <ThumbsUp size={12} className={clsx(userVote === 'up' && "fill-current")} />
          <span>{upVotes}</span>
        </button>

        <button
          onClick={() => handleVote('down')}
          disabled={loading}
          className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all",
            userVote === 'down'
              ? "bg-red-500/20 text-red-500 border border-red-500/20"
              : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10"
          )}
        >
          <ThumbsDown size={12} className={clsx(userVote === 'down' && "fill-current")} />
          <span>{downVotes}</span>
        </button>
      </div>
    </div>
  )
}
