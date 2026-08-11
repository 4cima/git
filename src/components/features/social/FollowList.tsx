import Link from 'next/link'
import { motion } from 'framer-motion'
import { UserMinus, UserPlus, Users, Heart, ExternalLink, X, Plus } from 'lucide-react'
import clsx from 'clsx'

interface FollowListProps {
  users: ProfileType[] | undefined
  type: 'followers' | 'following'
  isLoading?: boolean
  onAction?: (userId: string, isFollowing: boolean) => Promise<void>
  onRemove?: (userId: string) => Promise<void>
  currentUserId?: string
  followingIds?: string[]
  hasMore?: boolean
  onLoadMore?: () => void
}

export const FollowList = ({ 
  users, 
  type, 
  isLoading, 
  onAction, 
  onRemove,
  currentUserId,
  followingIds = [],
  hasMore,
  onLoadMore
}: FollowListProps) => {
  if (isLoading && (!users || users.length === 0)) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-white/5 rounded" />
              <div className="h-3 w-16 bg-white/5 rounded" />
            </div>
            <div className="w-24 h-10 bg-white/5 rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  if (!users || users.length === 0) {
    return (
      <div className="text-center py-20 rounded-[2.5rem] border-2 border-dashed border-white/5">
        <div className="p-4 rounded-full bg-white/[0.02] w-fit mx-auto mb-4">
          {type === 'followers' ? <Users size={32} className="text-zinc-800" /> : <Heart size={32} className="text-zinc-800" />}
        </div>
        <p className="text-zinc-500 text-sm font-bold">
          {type === 'followers' ? 'لا يوجد متابعون حالياً' : 'أنت لا تتابع أحداً حالياً'}
        </p>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2">
          {type === 'followers' ? 'Your followers will appear here' : 'People you follow will appear here'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {users.map((user, index) => {
        const isFollowed = followingIds.includes(user.id)
        const isOwn = user.id === currentUserId

        return (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-4 p-4 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group"
          >
            <Link href={`/user/${user.username}`} className="relative shrink-0">
              <img
                src={user.avatar_url || '/default-avatar.png'}
                alt={user.username}
                className="w-14 h-14 rounded-full object-cover border-2 border-white/10 group-hover:border-lumen-gold transition-colors"
              />
              {user.role === 'admin' && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-[#0f0f0f] flex items-center justify-center">
                  <span className="text-[8px] font-black text-white">A</span>
                </div>
              )}
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link href={`/user/${user.username}`} className="text-sm font-black text-white hover:text-lumen-gold transition-colors truncate">
                  {user.username}
                </Link>
                {isOwn && (
                  <span className="px-2 py-0.5 rounded-md bg-white/5 text-[8px] font-black text-zinc-500 uppercase">أنت</span>
                )}
              </div>
              <p className="text-[10px] text-zinc-500 font-medium truncate mt-0.5">
                {user.bio || 'لا توجد سيرة ذاتية'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isOwn && onAction && (
                <button
                  onClick={() => onAction(user.id, isFollowed)}
                  className={clsx(
                    "h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    isFollowed
                      ? "bg-white/5 text-zinc-400 border border-white/10 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20"
                      : "bg-lumen-gold text-black hover:scale-105 active:scale-95 shadow-lg shadow-lumen-gold/10"
                  )}
                >
                  {isFollowed ? (
                    <div className="flex items-center gap-2">
                      <UserMinus size={14} />
                      <span className="hidden sm:inline">إلغاء المتابعة</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <UserPlus size={14} />
                      <span className="hidden sm:inline">متابعة</span>
                    </div>
                  )}
                </button>
              )}
              
              {!isOwn && type === 'followers' && onRemove && (
                <button
                  onClick={() => onRemove(user.id)}
                  title="إزالة المتابع"
                  className="p-2.5 rounded-xl bg-white/5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                >
                  <X size={16} />
                </button>
              )}

              <Link
                href={`/user/${user.username}`}
                className="p-2.5 rounded-xl bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
              >
                <ExternalLink size={16} />
              </Link>
            </div>
          </motion.div>
        )
      })}

      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 p-4 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-lumen-gold disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-lumen-gold border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Plus size={14} />
              تحميل المزيد
            </>
          )}
        </button>
      )}
    </div>
  )
}

