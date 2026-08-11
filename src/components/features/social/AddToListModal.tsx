import { useState, useEffect } from 'react'
import { Plus, List, Check, Lock, Globe } from 'lucide-react'
import { getUserLists, createUserList, addItemToList, removeItemFromList, getListItems } from '../../../lib/supabase'
import { motion } from 'framer-motion'
import { toast } from '../../../lib/toast-manager'
import { clsx } from 'clsx'
import { logger } from '../../../lib/logger'

interface AddToListModalProps {
  userId: string
  contentId: number
  contentType: 'movie' | 'tv'
  onClose: () => void
  lang?: 'ar' | 'en'
}

export const AddToListModal = ({ userId, contentId, contentType, onClose, lang = 'ar' }: AddToListModalProps) => {
  const [lists, setLists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [itemInLists, setItemInLists] = useState<string[]>([])

  const fetchData = async () => {
    try {
      const userLists = await getUserLists(userId)
      setLists(userLists)

      // Check which lists already have this item
      const listsWithItem: string[] = []
      const contentIdStr = contentId.toString()
      for (const list of userLists) {
        const items = await getListItems(list.id)
        if (items.some((i: any) => i.external_id === contentIdStr && i.content_type === contentType)) {
          listsWithItem.push(list.id)
        }
      }
      setItemInLists(listsWithItem)
    } catch (error: any) {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userId, contentId, contentType])

  const handleToggleItem = async (listId: string) => {
    const isInList = itemInLists.includes(listId)
    try {
      if (isInList) {
        await removeItemFromList(listId, contentId.toString(), contentType)
        setItemInLists(prev => prev.filter(id => id !== listId))
        toast.success(lang === 'ar' ? 'تمت الإزالة من القائمة' : 'Removed from list')
      } else {
        await addItemToList(listId, contentId.toString(), contentType)
        setItemInLists(prev => [...prev, listId])
        toast.success(lang === 'ar' ? 'تمت الإضافة إلى القائمة' : 'Added to list')
      }
    } catch (error: any) {
      toast.error(lang === 'ar' ? 'فشل التعديل' : 'Failed to update')
    }
  }

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newListTitle.trim()) return
    try {
      const newList = await createUserList(userId, newListTitle, '', isPublic)
      setLists(prev => [newList, ...prev])
      setNewListTitle('')
      setCreating(false)
      toast.success(lang === 'ar' ? 'تم إنشاء القائمة' : 'List created')
    } catch (error: any) {
      toast.error(lang === 'ar' ? 'فشل إنشاء القائمة' : 'Failed to create list')
    }
  }

  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <List size={16} className="text-lumen-gold" />
            {t('إضافة إلى قائمة', 'Add to List')}
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <Plus size={20} className="rotate-45" />
          </button>
        </div>

        <div className="max-h-[300px] p-2 space-y-1">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-lumen-gold border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : lists.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              {t('لا توجد قوائم بعد', 'No lists yet')}
            </div>
          ) : (
            lists.map(list => (
              <button
                key={list.id}
                onClick={() => handleToggleItem(list.id)}
                className={clsx(
                  "w-full p-3 rounded-xl flex items-center justify-between transition-all group",
                  itemInLists.includes(list.id) ? "bg-lumen-gold/10 border border-lumen-gold/20" : "hover:bg-white/5 border border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "w-8 h-8 rounded-lg flex items-center justify-center border",
                    itemInLists.includes(list.id) ? "border-lumen-gold/50 bg-lumen-gold/20 text-lumen-gold" : "border-white/10 bg-white/5 text-zinc-500 group-hover:text-white"
                  )}>
                    {itemInLists.includes(list.id) ? <Check size={16} /> : <List size={16} />}
                  </div>
                  <div className="text-left">
                    <div className={clsx("text-xs font-bold", itemInLists.includes(list.id) ? "text-lumen-gold" : "text-white")}>
                      {list.title}
                    </div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                      {list.is_public ? <Globe size={10} /> : <Lock size={10} />}
                      {list.is_public ? t('عامة', 'Public') : t('خاصة', 'Private')}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-4 bg-white/[0.02] border-t border-white/5">
          {creating ? (
            <form onSubmit={handleCreateList} className="space-y-3">
              <input
                autoFocus
                value={newListTitle}
                onChange={e => setNewListTitle(e.target.value)}
                placeholder={t('عنوان القائمة الجديدة...', 'New list title...')}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-lumen-gold/50 transition-all"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  {isPublic ? <Globe size={12} /> : <Lock size={12} />}
                  {isPublic ? t('عامة', 'Public') : t('خاصة', 'Private')}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="px-4 py-2 text-[10px] font-bold text-zinc-500 hover:text-white"
                  >
                    {t('إلغاء', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={!newListTitle.trim()}
                    className="px-4 py-2 bg-lumen-gold text-black text-[10px] font-black rounded-lg hover:brightness-110 disabled:opacity-50"
                  >
                    {t('إنشاء', 'Create')}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full p-3 rounded-xl border border-dashed border-white/10 text-zinc-500 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2 text-xs font-bold"
            >
              <Plus size={16} />
              {t('قائمة جديدة', 'New List')}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
