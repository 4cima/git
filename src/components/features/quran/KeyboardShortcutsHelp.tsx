import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'
import { useLang } from '../../../state/useLang'
import { useQuranPlayerStore } from '../../../state/useQuranPlayerStore'

/**
 * KeyboardShortcutsHelp Component
 * 
 * Displays a modal overlay with all available keyboard shortcuts.
 * Triggered by pressing '?' key.
 */
export const KeyboardShortcutsHelp = () => {
  const { lang } = useLang()
  const showKeyboardHelp = useQuranPlayerStore((s) => s.showKeyboardHelp)
  const toggleKeyboardHelp = useQuranPlayerStore((s) => s.toggleKeyboardHelp)

  const shortcuts = [
    {
      key: lang === 'ar' ? 'مسافة' : 'Space',
      action: lang === 'ar' ? 'تشغيل/إيقاف' : 'Play/Pause',
      icon: '⏯️'
    },
    {
      key: lang === 'ar' ? 'سهم يمين' : 'Right Arrow',
      action: lang === 'ar' ? 'السورة التالية' : 'Next track',
      icon: '⏭️'
    },
    {
      key: lang === 'ar' ? 'سهم يسار' : 'Left Arrow',
      action: lang === 'ar' ? 'السورة السابقة' : 'Previous track',
      icon: '⏮️'
    },
    {
      key: lang === 'ar' ? 'سهم أعلى' : 'Up Arrow',
      action: lang === 'ar' ? 'رفع الصوت 10%' : 'Increase volume 10%',
      icon: '🔊'
    },
    {
      key: lang === 'ar' ? 'سهم أسفل' : 'Down Arrow',
      action: lang === 'ar' ? 'خفض الصوت 10%' : 'Decrease volume 10%',
      icon: '🔉'
    },
    {
      key: 'M',
      action: lang === 'ar' ? 'كتم/تشغيل الصوت' : 'Toggle mute',
      icon: '🔇'
    },
    {
      key: 'F',
      action: lang === 'ar' ? 'تبديل وضع العرض' : 'Toggle player mode',
      icon: '🖥️'
    },
    {
      key: 'Esc',
      action: lang === 'ar' ? 'تصغير المشغل' : 'Minimize player',
      icon: '⬇️'
    },
    {
      key: '?',
      action: lang === 'ar' ? 'عرض الاختصارات' : 'Show shortcuts',
      icon: '❓'
    }
  ]

  return (
    <AnimatePresence>
      {showKeyboardHelp && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]"
            onClick={toggleKeyboardHelp}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-full max-w-md mx-4"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-b border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Keyboard size={20} className="text-amber-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white">
                      {lang === 'ar' ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}
                    </h2>
                  </div>
                  <button
                    onClick={toggleKeyboardHelp}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
                    style={{ minWidth: '44px', minHeight: '44px' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Shortcuts List */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-3">
                  {shortcuts.map((shortcut, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{shortcut.icon}</span>
                        <span className="text-white/80 group-hover:text-white transition-colors">
                          {shortcut.action}
                        </span>
                      </div>
                      <kbd className="px-3 py-1.5 bg-slate-700 text-white text-sm font-mono rounded-md border border-white/20 shadow-lg">
                        {shortcut.key}
                      </kbd>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-white/5 border-t border-white/10 p-4 text-center">
                <p className="text-white/60 text-sm">
                  {lang === 'ar' 
                    ? 'اضغط ? لإظهار هذه القائمة في أي وقت' 
                    : 'Press ? to show this menu anytime'}
                </p>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
