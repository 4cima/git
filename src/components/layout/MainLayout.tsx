'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'
import { QuantumNavbar } from './QuantumNavbar'
import { AuroraBackground } from '../effects/AuroraBackground'
import { Footer } from './Footer'
import { usePathname } from 'next/navigation'
import { useLang } from '../../state/useLang'
import { QuranPlayerBar } from '../features/quran/QuranPlayerBar'
import { useAudioController } from '../../hooks/useAudioController'
import { ErrorBoundary } from '../common/ErrorBoundary'

interface MainLayoutProps {
  children: ReactNode
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { lang } = useLang()
  const pathname = usePathname()
  
  // Initialize Audio Controller (Global Singleton)
  useAudioController()

  if (pathname === '/quran/radio') {
    return <>{children}</>
  }

  return (
    <div className={`min-h-screen font-dm selection:bg-lumen-gold selection:text-lumen-void ${lang === 'ar' ? 'font-cairo' : ''}`}>
      {/* THE LIVING ORGANISM CORE */}
      <AuroraBackground />

      <div className="relative z-10 w-full min-h-screen bg-lumen-void/60 backdrop-blur-sm transition-all duration-300">
        <div className="sticky top-0 z-[100] w-full">
          <QuantumNavbar />
        </div>
      
        <AnimatePresence mode="wait">
          <ErrorBoundary>
            <motion.main
              key={pathname}
              initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full relative z-10 overflow-x-hidden"
            >
              {children}
            </motion.main>
          </ErrorBoundary>
        </AnimatePresence>
      </div>

      <Footer />
      <QuranPlayerBar />
    </div>
  )
}
