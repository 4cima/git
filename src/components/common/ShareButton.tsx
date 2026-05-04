import { useState, useRef } from 'react'
import { Share2 } from 'lucide-react'
import { toast } from '../../lib/toast-manager'
import { clsx } from 'clsx'
import { ShareModal } from './ShareModal'

interface ShareButtonProps {
  title: string
  url?: string
  text?: string
  className?: string
  size?: 'sm' | 'md'
  currentTime?: number
}

export const ShareButton = ({ title, url, text, className = '', size = 'md', currentTime }: ShareButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const getShareUrl = () => {
    const baseUrl = url || (typeof window !== 'undefined' ? window.location.href : '')
    if (currentTime && currentTime > 0) {
      const urlObj = new URL(baseUrl)
      urlObj.searchParams.set('t', Math.floor(currentTime).toString())
      return urlObj.toString()
    }
    return baseUrl
  }

  const shareUrl = getShareUrl()
  const shareText = text || `${title} - شاهد على فور سيما`

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl
        })
        toast.success('تم المشاركة بنجاح')
      } catch (err: any) {
        if ((err as Error).name !== 'AbortError') {
          setIsModalOpen(true)
        }
      }
    } else {
      setIsModalOpen(true)
    }
  }

  return (
    <>
      <button
        onClick={handleNativeShare}
        className={clsx(
          "flex items-center gap-2 rounded-xl transition-all active:scale-95",
          size === 'sm' ? "px-3 py-2 text-[10px]" : "px-4 py-2.5 text-xs",
          "bg-white/5 border border-white/10 text-zinc-400 hover:text-lumen-gold hover:border-lumen-gold/30 hover:bg-lumen-gold/5",
          className
        )}
      >
        <Share2 size={size === 'sm' ? 14 : 16} />
        <span className="font-black uppercase tracking-widest">مشاركة</span>
      </button>

      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        url={shareUrl}
        title={shareText}
      />
    </>
  )
}
