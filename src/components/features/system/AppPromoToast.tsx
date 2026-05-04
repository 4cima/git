/**
 * 🎯 AppPromoToast Component
 * Toast جانبي احترافي للترويج لتطبيق الأندرويد
 * 
 * @description توست أنيق يظهر أسفل الموقع بشكل غير مزعج
 * @author Online Cinema Team
 * @version 1.0.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone } from 'lucide-react';
import { useAppPromoToast } from '../../../hooks/useAppPromoToast';
import { useLang } from '../../../state/useLang';
import type { AppPromoToastProps } from '../../../types/appPromo';

/**
 * محتوى التوست بالعربية والإنجليزية
 */
const content = {
  ar: {
    title: 'جرّب تطبيقنا!',
    description: 'تجربة أفضل وأسرع',
    action: 'افتح التطبيق',
  },
  en: {
    title: 'Try our app!',
    description: 'Better and faster experience',
    action: 'Open App',
  },
};

/**
 * مكون AppPromoToast
 */
export const AppPromoToast: React.FC<AppPromoToastProps> = () => {
  const { isVisible, isFadingOut, progress, handleDismiss, handleOpenApp } = useAppPromoToast();
  const { lang } = useLang();
  const text = content[lang];
  const isRTL = lang === 'ar';
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{
            x: isRTL ? -400 : 400,
            opacity: 0,
            scale: 0.8,
          }}
          animate={{
            x: 0,
            opacity: isFadingOut ? 0.5 : 1,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            scale: 0.9,
            y: 20,
          }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 300,
          }}
          className="fixed bottom-6 z-[99999] max-w-[380px] w-[calc(100%-2rem)]"
          style={{
            [isRTL ? 'left' : 'right']: '1rem',
          }}
          whileHover={{ scale: 1.02 }}
        >
          {/* Toast Card */}
          <div
            className="relative overflow-hidden rounded-2xl p-5 shadow-2xl backdrop-blur-xl border-2"
            style={{
              background: 'linear-gradient(135deg, rgb(24, 24, 27) 0%, rgb(39, 39, 42) 100%)',
              borderColor: 'rgba(168, 85, 247, 0.3)',
              boxShadow: '0 25px 50px -12px rgba(168, 85, 247, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-2 rounded-lg transition-all duration-200 hover:bg-white/20 z-10 bg-white/10"
              aria-label="Close"
            >
              <X size={18} className="text-zinc-300 hover:text-white" />
            </button>
            
            {/* Content Container */}
            <div
              className="flex items-center gap-4"
              style={{
                direction: isRTL ? 'rtl' : 'ltr',
              }}
            >
              {/* App Icon */}
              <div className="flex-shrink-0">
                <div
                  className="w-16 h-16 rounded-xl shadow-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgb(168, 85, 247) 0%, rgb(126, 34, 206) 100%)',
                    boxShadow: '0 8px 16px rgba(168, 85, 247, 0.4)',
                  }}
                >
                  <Smartphone size={32} className="text-white" />
                </div>
              </div>
              
              {/* Text Content */}
              <div className="flex-1 min-w-0 pr-8">
                <h3 className="text-lg font-bold text-white mb-1 truncate">
                  {text.title}
                </h3>
                <p className="text-sm text-zinc-300 truncate">
                  {text.description}
                </p>
              </div>
            </div>
            
            {/* Action Button */}
            <button
              onClick={handleOpenApp}
              className="w-full mt-4 px-5 py-3 rounded-xl font-bold text-white text-sm transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              style={{
                background: 'linear-gradient(135deg, rgb(168, 85, 247) 0%, rgb(126, 34, 206) 100%)',
                boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)',
              }}
            >
              {text.action}
            </button>
            
            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800/80">
              <div
                className="h-full transition-all duration-100 ease-linear"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, rgb(168, 85, 247), rgb(126, 34, 206))',
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
