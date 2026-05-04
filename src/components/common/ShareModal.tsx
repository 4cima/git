import {X, Copy, MessageCircle, Send, LinkIcon} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '../../lib/toast-manager'
import clsx from 'clsx'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  url: string
  title: string
  lang?: 'ar' | 'en'
}

export const ShareModal = ({ isOpen, onClose, url, title, lang = 'ar' }: ShareModalProps) => {
  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
  
  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl)
    toast.success(lang === 'ar' ? 'تم نسخ الرابط' : 'Link copied')
  }

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-[#25D366]',
      href: `https://wa.me/?text=${encodeURIComponent(title + ' ' + fullUrl)}`
    },
    {
      name: 'Telegram',
      icon: Send,
      color: 'bg-[#0088cc]',
      href: `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(title)}`
    }
  ]

  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6 z-[101]"
          >
            <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-lumen-gold/5 blur-3xl -mr-16 -mt-16 rounded-full" />
              
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tighter uppercase">{t('مشاركة', 'Share')}</h3>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t('انشر المتعة مع أصدقائك', 'Spread the fun with friends')}</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-3 rounded-2xl bg-white/5 text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-8">
                {shareOptions.map((option) => (
                  <a
                    key={option.name}
                    href={option.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={clsx(
                      "w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-all duration-300 group-hover:scale-110 shadow-lg",
                      option.color
                    )}>
                      <option.icon size={24} />
                    </div>
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-white transition-colors">
                      {option.name}
                    </span>
                  </a>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">
                  {t('رابط مباشر', 'Direct Link')}
                </label>
                <div className="relative group">
                  <input
                    readOnly
                    value={fullUrl}
                    className="w-full h-14 pr-6 pl-14 rounded-2xl bg-white/[0.03] border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-lumen-gold transition-all"
                  />
                  <button
                    onClick={handleCopy}
                    className="absolute left-2 top-2 bottom-2 w-10 flex items-center justify-center bg-lumen-gold text-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-lumen-gold/20"
                    title={t('نسخ الرابط', 'Copy Link')}
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-2 p-4 rounded-2xl bg-lumen-gold/5 border border-lumen-gold/10">
                <LinkIcon size={16} className="text-lumen-gold" />
                <p className="text-[10px] font-bold text-lumen-gold/80 leading-relaxed">
                  {t('بمشاركة هذا الرابط، يمكن للآخرين الوصول مباشرة لهذا المحتوى.', 'By sharing this link, others can directly access this content.')}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
