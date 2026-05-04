import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellOff, Check, Trash2, Info, CheckCircle, AlertTriangle, XCircle, Sparkles, Loader2 } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, Notification } from '../../../lib/supabase'
import { toast } from '../../../lib/toast-manager'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale/ar'
import { clsx } from 'clsx'
import { logger } from '../../../lib/logger'

export const NotificationCenter = () => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getUserNotifications(user.id)
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    } catch (err: any) {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [user])

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err: any) {
      toast.error('فشل تحديث التنبيه')
    }
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    try {
      await markAllNotificationsAsRead(user.id)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast.success('تم تحديد جميع التنبيهات كمقروءة')
    } catch (err: any) {
      toast.error('فشل تحديث التنبيهات')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id)
      const deleted = notifications.find(n => n.id === id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (deleted && !deleted.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err: any) {
      toast.error('فشل حذف التنبيه')
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} className="text-green-400" />
      case 'warning': return <AlertTriangle size={16} className="text-yellow-400" />
      case 'error': return <XCircle size={16} className="text-red-400" />
      case 'recommendation': return <Sparkles size={16} className="text-primary" />
      default: return <Info size={16} className="text-blue-400" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="text-zinc-400" size={24} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-black text-black">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-black text-white">مركز التنبيهات</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Stay updated with your activity</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
          >
            <Check size={12} />
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      <div className="space-y-3 max-h-[400px] pr-2">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="animate-spin text-zinc-700" size={32} />
              <p className="text-xs text-zinc-500 italic">جاري تحميل التنبيهات...</p>
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <motion.div
                key={notification.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={clsx(
                  "group relative rounded-xl border p-4 transition-all",
                  notification.is_read
                    ? "bg-white/[0.01] border-white/5 opacity-60"
                    : "bg-white/[0.04] border-white/10 shadow-lg shadow-black/20"
                )}
              >
                <div className="flex gap-4">
                  <div className="mt-1 shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className={clsx("text-xs font-bold truncate", notification.is_read ? "text-zinc-400" : "text-white")}>
                        {notification.title}
                      </h4>
                      <span className="text-[9px] text-zinc-500 whitespace-nowrap">
                        {format(new Date(notification.created_at), 'PPpp')}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                      {notification.message}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                        title="تحديد كمقروء"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/5 rounded-3xl">
              <BellOff size={48} className="text-zinc-800 mb-4" />
              <h3 className="text-sm font-bold text-zinc-500">لا توجد تنبيهات حالياً</h3>
              <p className="text-[10px] text-zinc-600">سنقوم بإخطارك عند وجود أي جديد</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
