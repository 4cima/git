import { useState, useEffect } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

export const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowReconnected(true)
      setTimeout(() => setShowReconnected(false), 3000)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-lg bg-red-500/90 px-4 py-2 text-white shadow-lg backdrop-blur-sm md:bottom-4"
          dir="rtl"
        >
          <WifiOff size={20} />
          <span className="text-sm font-medium">لا يوجد اتصال بالإنترنت</span>
        </motion.div>
      )}
      {showReconnected && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-lg bg-green-500/90 px-4 py-2 text-white shadow-lg backdrop-blur-sm md:bottom-4"
          dir="rtl"
        >
          <Wifi size={20} />
          <span className="text-sm font-medium">عاد الاتصال بالإنترنت</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
