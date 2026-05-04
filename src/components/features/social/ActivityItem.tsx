import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlayCircle, Star, Award, Heart, MessageCircle, Send, Trash2, X, Smile, Reply } from 'lucide-react'
import Link from 'next/link'
import {
  addActivityReaction,
  removeActivityReaction,
  getActivityReactions,
  addActivityComment,
  getActivityComments,
  deleteActivityComment,
  addActivityCommentReply,
  getActivityCommentReplies,
  deleteActivityCommentReply,
  reportActivityComment,
  blockUser,
  supabase,
  createNotification,
  type ActivityComment,
  type ActivityCommentReply,
  type Activity as SupabaseActivity
} from '../../../lib/supabase'
import { fetchBatchContent, ContentDetails } from '../../../services/contentAPI'
import { toast } from '../../../lib/toast-manager'
import clsx from 'clsx'
import { MoreVertical, Flag, UserX } from 'lucide-react'
import { logger } from '../../../lib/logger'

const MentionText = ({ text }: { text: string }) => {
  const parts = text.split(/(@\w+)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const username = part.slice(1)
          return (
            <Link
              key={i}
              href={`/user/${username}`}
              className="text-lumen-gold hover:underline font-bold"
            >
              {part}
            </Link>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'أعجبني', color: 'text-blue-500' },
  { type: 'love', emoji: '❤️', label: 'أحببته', color: 'text-red-500' },
  { type: 'haha', emoji: '😂', label: 'هاها', color: 'text-yellow-500' },
  { type: 'wow', emoji: '😮', label: 'واو', color: 'text-yellow-500' },
  { type: 'sad', emoji: '😢', label: 'حزين', color: 'text-blue-400' },
  { type: 'angry', emoji: '😡', label: 'غاضب', color: 'text-orange-600' },
]

interface ActivityItemProps {
  activity: SupabaseActivity
  currentUserId: string | undefined
  currentUserRole?: 'user' | 'admin' | 'supervisor'
}

export const ActivityItem = ({ activity, currentUserId, currentUserRole }: ActivityItemProps) => {
  const [reactions, setReactions] = useState<{ type: string, user_id: string }[]>([])
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<(ActivityComment & { replies?: ActivityCommentReply[], showReplies?: boolean })[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [newReply, setNewReply] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [contentDetails, setContentDetails] = useState<ContentDetails | null>(null)

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'supervisor'

  useEffect(() => {
    fetchReactions()
    fetchContentDetails()
  }, [activity.id])

  const fetchContentDetails = async () => {
    // For content-related activities, fetch content details using external_id
    if ((activity.type === 'watch' || activity.type === 'review') && activity.metadata?.external_id) {
      try {
        const results = await fetchBatchContent([{
          id: activity.metadata.external_id,
          content_type: activity.content_type as 'movie' | 'tv'
        }])
        if (results[0]) {
          setContentDetails(results[0])
        }
      } catch (err: any) {
        // Silently fail
      }
    }
  }

  const handleReportComment = async (commentId: string) => {
    if (!currentUserId) return
    const reason = prompt('لماذا تبلغ عن هذا التعليق؟')
    if (!reason) return

    try {
      await reportActivityComment(commentId, currentUserId, reason)
      toast.success('تم إرسال البلاغ')
    } catch {
      toast.error('لقد أبلغت عن هذا التعليق مسبقاً')
    }
  }

  const handleBlockUser = async (targetUserId: string) => {
    if (!currentUserId) return
    if (!confirm('هل أنت متأكد من حظر هذا المستخدم؟')) return

    try {
      await blockUser(currentUserId, targetUserId)
      toast.success('تم حظر المستخدم')
    } catch {
      toast.error('حدث خطأ أثناء الحظر')
    }
  }

  const fetchReactions = async () => {
    try {
      const data = await getActivityReactions(activity.id)
      setReactions(data)
    } catch (err: any) {
      // Silently fail
    }
  }

  const notifyMentions = async (text: string, payload: { message: string; data: Record<string, any> }) => {
    if (!currentUserId) return
    const usernames = Array.from(
      new Set(
        (text.match(/@\w+/g) || [])
          .map((mention) => mention.slice(1).trim().toLowerCase())
          .filter(Boolean)
      )
    )
    if (usernames.length === 0) return
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username')
      .in('username', usernames)
    if (error || !profiles?.length) return
    await Promise.all(
      profiles
        .filter((profile) => profile.id !== currentUserId)
        .map((profile) =>
          createNotification({
            userId: profile.id,
            title: 'إشارة جديدة',
            message: payload.message,
            type: 'info',
            data: payload.data
          })
        )
    )
  }

  const handleReaction = async (type: string) => {
    if (!currentUserId) {
      toast.error('يجب تسجيل الدخول للتفاعل', { id: 'auth-required' })
      return
    }

    if (isBusy) return
    setIsBusy(true)

    const myExistingReaction = reactions.find(r => r.user_id === currentUserId)

    try {
      if (myExistingReaction?.type === type) {
        await removeActivityReaction(activity.id, currentUserId)
        setReactions(prev => prev.filter(r => r.user_id !== currentUserId))
      } else {
        await addActivityReaction(activity.id, currentUserId, type)
        setReactions(prev => {
          const filtered = prev.filter(r => r.user_id !== currentUserId)
          return [...filtered, { type, user_id: currentUserId }]
        })
      }
      setShowReactionPicker(false)
    } catch {
      toast.error('حدث خطأ أثناء التفاعل', { id: 'reaction-error' })
    } finally {
      setIsBusy(false)
    }
  }

  const toggleComments = async () => {
    if (!showComments) {
      try {
        const data = await getActivityComments(activity.id)
        setComments(data.map(c => ({ ...c, replies: [], showReplies: false })))
      } catch {
        toast.error('حدث خطأ أثناء تحميل التعليقات')
      }
    }
    setShowComments(!showComments)
  }

  const fetchReplies = async (commentId: string) => {
    try {
      const replies = await getActivityCommentReplies(commentId)
      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, replies, showReplies: true } : c
      ))
    } catch {
      toast.error('حدث خطأ أثناء تحميل الردود')
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId || !newComment.trim() || isBusy) return

    setIsBusy(true)
    try {
      const comment = await addActivityComment(activity.id, currentUserId, newComment.trim())
      setComments(prev => [...prev, { ...comment, replies: [], showReplies: false }])

      // Process mentions
      await notifyMentions(newComment, {
        message: `ذكرك ${activity.user?.username || 'مستخدم'} في تعليق`,
        data: { activity_id: activity.id, comment_id: comment.id }
      })

      setNewComment('')
      toast.success('تم إضافة التعليق')
    } catch {
      toast.error('حدث خطأ أثناء إضافة التعليق')
    } finally {
      setIsBusy(false)
    }
  }

  const handleAddReply = async (commentId: string) => {
    if (!currentUserId || !newReply.trim() || isBusy) return

    setIsBusy(true)
    try {
      const reply = await addActivityCommentReply(commentId, currentUserId, newReply.trim())
      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, replies: [...(c.replies || []), reply], showReplies: true } : c
      ))

      // Process mentions in reply
      await notifyMentions(newReply, {
        message: `ذكرك ${activity.user?.username || 'مستخدم'} في رد`,
        data: { activity_id: activity.id, comment_id: commentId, reply_id: reply.id }
      })

      setNewReply('')
      setReplyingTo(null)
      toast.success('تم إضافة الرد')
    } catch {
      toast.error('حدث خطأ أثناء إضافة الرد')
    } finally {
      setIsBusy(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUserId) return
    try {
      // In a real app, deleteActivityComment should handle admin logic via RLS or a specialized function
      // For now, we assume the user is authorized if isAdmin is true or it's their comment
      await deleteActivityComment(commentId, currentUserId)
      setComments(prev => prev.filter(c => c.id !== commentId))
      toast.success('تم حذف التعليق')
    } catch {
      toast.error('حدث خطأ أثناء حذف التعليق')
    }
  }

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    if (!currentUserId) return
    try {
      await deleteActivityCommentReply(replyId, currentUserId)
      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, replies: c.replies?.filter(r => r.id !== replyId) } : c
      ))
      toast.success('تم حذف الرد')
    } catch {
      toast.error('حدث خطأ أثناء حذف الرد')
    }
  }

  const myReaction = reactions.find(r => r.user_id === currentUserId)
  const reactionCounts = reactions.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topReactions = Object.entries(reactionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const getIcon = () => {
    switch (activity.type) {
      case 'watch': return <PlayCircle size={18} />
      case 'review': return <Star size={18} />
      case 'achievement': return <Award size={18} />
      case 'follow': return <Heart size={18} />
      default: return <ActivityIcon size={18} />
    }
  }

  const getColor = () => {
    switch (activity.type) {
      case 'watch': return "bg-blue-500/10 text-blue-500"
      case 'review': return "bg-lumen-gold/10 text-lumen-gold"
      case 'achievement': return "bg-purple-500/10 text-purple-500"
      case 'follow': return "bg-red-500/10 text-red-500"
      default: return "bg-zinc-500/10 text-zinc-500"
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
      <div className="flex gap-4">
        <div className={clsx("p-3 h-fit rounded-2xl", getColor())}>
          {getIcon()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white leading-relaxed">
            {activity.user && (
              <Link href={`/user/${activity.user.username}`} className="text-lumen-gold hover:underline mr-1">
                {activity.user.username}
              </Link>
            )}
            {activity.type === 'watch' && `شاهد ${activity.content_type === 'movie' ? 'فيلم' : 'مسلسل'} جديد`}
            {activity.type === 'review' && `أضاف مراجعة جديدة`}
            {activity.type === 'achievement' && `حصل على إنجاز جديد: ${activity.metadata?.achievement_title || 'إنجاز'}`}
            {activity.type === 'follow' && `بدأ بمتابعة مستخدم جديد`}
          </p>

          {/* Display content details if available */}
          {(activity.type === 'watch' || activity.type === 'review') && (
            <div className="mt-2">
              {/* For watch activities, show content details inline */}
              {activity.type === 'watch' && (
                <>
                  {contentDetails ? (
                    <Link
                      href={`/watch/${activity.content_type}/${activity.metadata?.external_id || activity.content_id}`}
                      className="flex items-center gap-2 text-xs text-zinc-400 hover:text-lumen-gold transition-colors"
                    >
                      {contentDetails.poster_path && (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${contentDetails.poster_path}`}
                          alt={contentDetails.title || contentDetails.name}
                          className="w-8 h-12 rounded object-cover"
                        />
                      )}
                      <span className="font-medium">{contentDetails.title || contentDetails.name}</span>
                    </Link>
                  ) : activity.metadata?.external_id ? (
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      <div className="w-8 h-12 rounded bg-white/5 flex items-center justify-center">
                        <PlayCircle size={12} />
                      </div>
                      <span>المحتوى غير متوفر</span>
                    </div>
                  ) : null}
                </>
              )}

              {/* Review Details */}
              {activity.type === 'review' && activity.metadata && (
                <div className="mt-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  {/* Content Title and Poster */}
                  {contentDetails ? (
                    <Link
                      href={`/watch/${activity.content_type}/${activity.metadata.external_id}`}
                      className="flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity"
                    >
                      {contentDetails.poster_path && (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${contentDetails.poster_path}`}
                          alt={contentDetails.title || contentDetails.name}
                          className="w-10 h-14 rounded object-cover"
                        />
                      )}
                      <span className="text-xs font-bold text-white">{contentDetails.title || contentDetails.name}</span>
                    </Link>
                  ) : activity.metadata.external_id ? (
                    <div className="flex items-center gap-2 mb-2 text-xs text-zinc-600">
                      <div className="w-10 h-14 rounded bg-white/5 flex items-center justify-center">
                        <PlayCircle size={14} />
                      </div>
                      <span>المحتوى غير متوفر</span>
                    </div>
                  ) : null}

                  {/* Review Title */}
                  {activity.metadata.title && (
                    <h4 className="text-sm font-bold text-white mb-1">{activity.metadata.title}</h4>
                  )}

                  {/* Rating */}
                  {activity.metadata.rating && (
                    <div className="flex items-center gap-1 mb-2">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-xs text-yellow-500 font-bold">{activity.metadata.rating}/10</span>
                    </div>
                  )}

                  {/* Review Excerpt */}
                  {activity.metadata.excerpt && (
                    <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{activity.metadata.excerpt}</p>
                  )}

                  {/* Link to Full Review */}
                  {activity.metadata.review_id && (
                    <Link
                      href={`/reviews/${activity.metadata.review_id}`}
                      className="text-xs text-lumen-gold hover:underline inline-block"
                    >
                      اقرأ المراجعة الكاملة
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-tighter mt-1">
            {new Date(activity.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 px-2 relative">
        <div
          className="relative"
          onMouseEnter={() => setShowReactionPicker(true)}
          onMouseLeave={() => setShowReactionPicker(false)}
        >
          <button
            onClick={() => handleReaction('like')}
            className={clsx(
              "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
              myReaction ? REACTIONS.find(r => r.type === myReaction.type)?.color : "text-zinc-500 hover:text-white"
            )}
          >
            {myReaction ? (
              <span className="text-sm">{REACTIONS.find(r => r.type === myReaction.type)?.emoji}</span>
            ) : (
              <Smile size={14} />
            )}
            {reactions.length > 0 && reactions.length}
            <span className="ml-1">{myReaction ? REACTIONS.find(r => r.type === myReaction.type)?.label : 'تفاعل'}</span>
          </button>

          <AnimatePresence>
            {showReactionPicker && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="absolute bottom-full mb-2 left-0 flex gap-1 p-1 rounded-full bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl z-50"
              >
                {REACTIONS.map((r) => (
                  <button
                    key={r.type}
                    onClick={() => handleReaction(r.type)}
                    className="w-8 h-8 flex items-center justify-center hover:scale-125 transition-transform"
                    title={r.label}
                  >
                    <span className="text-lg">{r.emoji}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={toggleComments}
          className={clsx(
            "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all text-zinc-500 hover:text-white",
            showComments && "text-lumen-gold"
          )}
        >
          <MessageCircle size={14} />
          {comments.length > 0 && comments.length}
          <span className="ml-1">تعليق</span>
        </button>

        <div className="flex -space-x-1 ml-auto">
          {topReactions.map(([type, _count]) => (
            <div key={type} className="w-5 h-5 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px]">
              {REACTIONS.find(r => r.type === type)?.emoji}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-4 pt-2 border-t border-white/5"
          >
            <div className="space-y-4 max-h-80 no-scrollbar px-1">
              {comments.map((comment) => (
                <div key={comment.id} className="space-y-2">
                  <div className="flex gap-3 p-3 rounded-2xl bg-white/[0.01]">
                    <img
                      src={comment.user?.avatar_url || '/default-avatar.png'}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                      alt={comment.user?.username}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-white">{comment.user?.username}</p>
                        <div className="flex items-center gap-2 relative">
                          <button
                            onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                            className="text-[9px] font-black text-zinc-500 hover:text-white transition-colors uppercase"
                          >
                            رد
                          </button>

                          <button
                            onClick={() => setActiveMenu(activeMenu === comment.id ? null : comment.id)}
                            className="p-1 rounded-lg hover:bg-white/5 text-zinc-600 transition-colors"
                          >
                            <MoreVertical size={12} />
                          </button>

                          <AnimatePresence>
                            {activeMenu === comment.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                className="absolute top-full right-0 mt-1 w-32 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-[60] overflow-hidden"
                              >
                                {currentUserId === comment.user_id || isAdmin ? (
                                  <button
                                    onClick={() => {
                                      handleDeleteComment(comment.id)
                                      setActiveMenu(null)
                                    }}
                                    className="w-full px-3 py-2 text-[9px] font-black text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-all"
                                  >
                                    <Trash2 size={10} />
                                    حذف
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        handleReportComment(comment.id)
                                        setActiveMenu(null)
                                      }}
                                      className="w-full px-3 py-2 text-[9px] font-black text-zinc-400 hover:bg-white/5 flex items-center gap-2 transition-all"
                                    >
                                      <Flag size={10} />
                                      إبلاغ
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleBlockUser(comment.user_id)
                                        setActiveMenu(null)
                                      }}
                                      className="w-full px-3 py-2 text-[9px] font-black text-zinc-400 hover:bg-white/5 flex items-center gap-2 transition-all"
                                    >
                                      <UserX size={10} />
                                      حظر
                                    </button>
                                  </>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 break-words">
                        <MentionText text={comment.text} />
                      </p>
                    </div>
                  </div>

                  {/* Nested Replies */}
                  <div className="mr-8 space-y-2">
                    {comment.replies?.map((reply) => (
                      <div key={reply.id} className="flex gap-2 p-2 rounded-xl bg-white/[0.005] border-r border-white/5">
                        <img
                          src={reply.user?.avatar_url || '/default-avatar.png'}
                          className="w-5 h-5 rounded-full object-cover shrink-0"
                          alt={reply.user?.username}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] font-black text-white/70">{reply.user?.username}</p>
                            {currentUserId === reply.user_id && (
                              <button
                                onClick={() => handleDeleteReply(comment.id, reply.id)}
                                className="text-zinc-700 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-0.5 break-words">
                            <MentionText text={reply.text} />
                          </p>
                        </div>
                      </div>
                    ))}

                    {!comment.showReplies && (
                      <button
                        onClick={() => fetchReplies(comment.id)}
                        className="text-[9px] font-black text-lumen-gold/50 hover:text-lumen-gold transition-colors flex items-center gap-1"
                      >
                        <Reply size={10} className="rotate-180" />
                        عرض الردود
                      </button>
                    )}

                    {replyingTo === comment.id && (
                      <div className="flex gap-2 mt-2">
                        <input
                          autoFocus
                          value={newReply}
                          onChange={(e) => setNewReply(e.target.value)}
                          placeholder="اكتب رداً..."
                          className="flex-1 h-8 px-3 rounded-lg bg-white/[0.02] border border-white/10 text-[10px] text-white focus:outline-none focus:border-lumen-gold/50 transition-all"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddReply(comment.id)}
                        />
                        <button
                          onClick={() => handleAddReply(comment.id)}
                          disabled={!newReply.trim() || isBusy}
                          className="px-3 rounded-lg bg-lumen-gold/20 text-lumen-gold text-[9px] font-black hover:bg-lumen-gold/30 transition-all disabled:opacity-50"
                        >
                          رد
                        </button>
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="px-2 rounded-lg bg-white/5 text-zinc-500 hover:text-white transition-all"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-center py-4 text-[10px] text-zinc-600 font-black uppercase tracking-widest">لا توجد تعليقات</p>
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="اكتب تعليقاً..."
                className="flex-1 h-10 px-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white focus:outline-none focus:border-lumen-gold transition-all"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isBusy}
                className="w-10 h-10 rounded-xl bg-lumen-gold text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

