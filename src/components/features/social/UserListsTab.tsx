import { useState, useEffect } from 'react'
import { List, Trash2, Globe, Lock, ExternalLink, Share2 } from 'lucide-react'
import { getUserLists, deleteUserList } from '../../../lib/supabase'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from '../../../lib/toast-manager'
import { logger } from '../../../lib/logger'

interface UserListsTabProps {
  userId: string
  lang?: 'ar' | 'en'
}

export const UserListsTab = ({ userId, lang = 'ar' }: UserListsTabProps) => {
  const [lists, setLists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLists = async () => {
    try {
      const data = await getUserLists(userId)
      setLists(data)
    } catch (error: any) {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLists()
  }, [userId])

  const handleDelete = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه القائمة؟' : 'Are you sure you want to delete this list?')) return
    try {
      await deleteUserList(id)
      setLists(prev => prev.filter(l => l.id !== id))
      toast.success(lang === 'ar' ? 'تم حذف القائمة' : 'List deleted')
    } catch (error: any) {
      toast.error(lang === 'ar' ? 'فشل الحذف' : 'Delete failed')
    }
  }

  const handleShare = (id: string) => {
    const url = `${window.location.origin}/list/${id}`
    navigator.clipboard.writeText(url)
    toast.success(lang === 'ar' ? 'تم نسخ الرابط' : 'Link copied')
  }

  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-lumen-gold border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">
          {t('جاري التحميل...', 'Loading...')}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <List size={18} className="text-lumen-gold" />
          {t('قوائمي', 'My Lists')}
        </h3>
      </div>

      {lists.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
          <List size={40} className="mx-auto text-zinc-800 mb-4" />
          <p className="text-zinc-500 text-sm">{t('لا توجد قوائم مخصصة بعد', 'No custom lists yet')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4 md:gap-6">
          {lists.map((list, idx) => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group relative rounded-3xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-lumen-gold/10 border border-lumen-gold/20 flex items-center justify-center text-lumen-gold">
                  <List size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleShare(list.id)}
                    className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10"
                    title={t('مشاركة', 'Share')}
                  >
                    <Share2 size={14} />
                  </button>
                  <Link
                    href={`/list/${list.id}`}
                    className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                    title={t('فتح', 'Open')}
                  >
                    <ExternalLink size={14} />
                  </Link>
                  <button
                    onClick={() => handleDelete(list.id)}
                    className="p-2 rounded-lg bg-white/5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <Link href={`/list/${list.id}`} className="block group/link">
                <h4 className="text-white font-bold mb-1 group-hover/link:text-lumen-gold transition-colors">{list.title}</h4>
                <p className="text-[10px] text-zinc-500 line-clamp-2 mb-4 h-8">
                  {list.description || t('لا يوجد وصف', 'No description')}
                </p>
              </Link>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                  {list.is_public ? (
                    <div className="flex items-center gap-1 text-[9px] font-black text-emerald-500/70 uppercase tracking-wider">
                      <Globe size={10} />
                      {t('عامة', 'Public')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[9px] font-black text-zinc-500 uppercase tracking-wider">
                      <Lock size={10} />
                      {t('خاصة', 'Private')}
                    </div>
                  )}
                </div>
                <div className="text-[9px] font-black text-lumen-gold uppercase tracking-wider">
                  {list.items[0]?.count || 0} {t('عنصر', 'Items')}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

