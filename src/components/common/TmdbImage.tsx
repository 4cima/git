'use client'

import { useState, memo } from 'react'
import { Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Fallback poster image (gradient with cinema theme)
const FALLBACK_POSTER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"%3E%3Cdefs%3E%3ClinearGradient id="grad" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23374151;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%231f2937;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="300" height="450" fill="url(%23grad)"/%3E%3Ctext x="150" y="225" font-size="24" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-weight="bold"%3E🎬%3C/text%3E%3Ctext x="150" y="280" font-size="16" fill="%236b7280" text-anchor="middle" dominant-baseline="middle" font-family="Arial"%3Eسينما أونلاين%3C/text%3E%3C/svg%3E'

export type TmdbImageSize = 'w92' | 'w154' | 'w185' | 'w300' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original'

/** TMDB size to pixel dimensions for CLS prevention */
const SIZE_DIMENSIONS: Record<TmdbImageSize, { w: number; h: number }> = {
  w92: { w: 92, h: 138 },
  w154: { w: 154, h: 231 },
  w185: { w: 185, h: 278 },
  w300: { w: 300, h: 450 },
  w342: { w: 342, h: 513 },
  w500: { w: 500, h: 750 },
  w780: { w: 780, h: 1170 },
  w1280: { w: 1280, h: 1920 },
  original: { w: 1920, h: 2880 }
}

interface TmdbImageProps extends React.HTMLAttributes<HTMLDivElement> {
  path?: string | null
  size?: TmdbImageSize
  fallback?: React.ReactNode
  showLoading?: boolean
  sizes?: string
  priority?: boolean
  alt: string
  imgClassName?: string
}

const getUrl = (path: string, size: TmdbImageSize) => {
  // If it's already a full URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  // Otherwise, construct TMDB URL
  return `https://image.tmdb.org/t/p/${size}${path}`
}

export const TmdbImage = memo(({
  path,
  size = 'w300',
  fallback,
  showLoading = true,
  className = '',
  imgClassName = '',
  alt,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  style,
  ...props
}: TmdbImageProps) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const dims = SIZE_DIMENSIONS[size]
  const aspectRatio = dims ? `${dims.w} / ${dims.h}` : undefined

  if (!path) {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 ${className}`} style={{ ...(style || {}), aspectRatio }} {...props}>
        <img
          src={FALLBACK_POSTER}
          alt={alt}
          className="h-full w-full object-cover"
        />
        {fallback && <div className="absolute inset-0 flex items-center justify-center">{fallback}</div>}
      </div>
    )
  }

  const src = getUrl(path, size)
  // Generate srcset for responsive images if using standard sizes
  const srcSet = !path.startsWith('http') && size !== 'original'
    ? `${getUrl(path, 'w300')} 300w, ${getUrl(path, 'w342')} 342w, ${getUrl(path, 'w500')} 500w`
    : undefined

  return (
    <div className={`relative overflow-hidden bg-zinc-900 ${className}`} style={{ ...(style || {}), aspectRatio }} {...props}>
      <AnimatePresence>
        {status === 'loading' && showLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900"
          >
            <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
          </motion.div>
        )}
      </AnimatePresence>

      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={dims?.w}
        height={dims?.h}
        draggable={false}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'low'}
        className={`h-full w-full object-cover transition-all duration-500 select-none ${status === 'loaded' ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        onDragStart={(e) => e.preventDefault()}
      />

      {status === 'error' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
          <img src={FALLBACK_POSTER} alt={alt} className="h-full w-full object-cover opacity-50" />
          {fallback && <div className="absolute inset-0 flex items-center justify-center">{fallback}</div>}
        </div>
      )}
    </div>
  )
})
