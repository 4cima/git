import { useState, useEffect } from 'react'
import { X, Smartphone, Download } from 'lucide-react'
import { useLang } from '../../../state/useLang'

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const STORAGE_KEY = 'cinma_pwa_install_dismissed'

export const PwaInstallPrompt = () => {
  const { lang } = useLang()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [installed, setInstalled] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
  })

  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY)
    if (dismissed === '1') return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setShow(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShow(false)
    sessionStorage.setItem(STORAGE_KEY, '1')
  }

  if (!show || installed) return null

  return (
    <div
      className="fixed bottom-6 z-[99999] rounded-2xl border-2 border-lumen-gold/30 bg-lumen-surface/95 backdrop-blur-xl shadow-2xl p-5 animate-in slide-in-from-bottom-4 max-w-[380px] w-[calc(100%-2rem)]"
      style={{
        right: '1rem',
        boxShadow: '0 25px 50px -12px rgba(201, 169, 98, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
      }}
      role="dialog"
      aria-label={lang === 'ar' ? 'تثبيت التطبيق' : 'Install app'}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-lumen-gold/20 text-lumen-gold">
          <Smartphone size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lumen-cream">
            {lang === 'ar' ? 'نزّل التطبيق' : 'Install the app'}
          </h3>
          <p className="mt-1 text-sm text-lumen-silver">
            {lang === 'ar'
              ? 'افتح فور سيما كتطبيق ووفر المساحة. يعمل أوفلاين للصفحات السابقة.'
              : 'Open 4cima as an app and save to home screen. Works offline for visited pages.'}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleInstall}
              className="inline-flex items-center gap-2 rounded-xl bg-lumen-gold px-4 py-2 text-sm font-bold text-lumen-void hover:brightness-110 transition"
            >
              <Download size={16} />
              {lang === 'ar' ? 'تثبيت' : 'Install'}
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-xl border border-lumen-muted px-4 py-2 text-sm font-medium text-lumen-silver hover:bg-lumen-muted/50 transition"
            >
              {lang === 'ar' ? 'لاحقاً' : 'Later'}
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1 text-lumen-silver hover:bg-lumen-muted/50 hover:text-lumen-cream transition"
          aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
