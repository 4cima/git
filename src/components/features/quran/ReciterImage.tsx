import { useState } from 'react'
import { User } from 'lucide-react'
import { NATURE_IMAGES } from '../../../data/quran'

export const ReciterImage = ({ src, alt, className, id }: { src: string | null, alt: string, className?: string, id: number }) => {
  const [error, setError] = useState(false)
  const [fallbackError, setFallbackError] = useState(false)
  
  // Deterministic fallback based on ID or Name
  const safeId = typeof id === 'number' ? id : 0
  const fallbackIndex = safeId % NATURE_IMAGES.length
  const fallbackSrc = NATURE_IMAGES[fallbackIndex] || NATURE_IMAGES[0]
  
  // If primary source fails or is missing, try fallback
  // If fallback also fails, show gradient
  if (fallbackError) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-amber-900 to-yellow-900 ${className}`}>
        <User className="text-amber-500/50 w-1/2 h-1/2" />
      </div>
    )
  }

  const finalSrc = (error || !src) ? fallbackSrc : src

  return (
    <img 
      src={finalSrc} 
      alt={alt} 
      className={className}
      onError={() => {
        if (!error && src) {
          setError(true)
        } else {
          setFallbackError(true)
        }
      }}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  )
}
