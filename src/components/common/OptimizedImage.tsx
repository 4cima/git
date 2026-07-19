'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'

interface OptimizedImageProps {
  src: string
  alt: string
  size?: 'w185' | 'w300' | 'w342' | 'w500' | 'w780'
  className?: string
  priority?: boolean
  aspectRatio?: string
}

export const OptimizedImage = ({
  src,
  alt,
  size = 'w300',
  className = '',
  priority = false,
  aspectRatio = '2/3'
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const imgRef = useRef<HTMLDivElement>(null)

  // Convert to WebP URL (TMDB supports WebP)
  const getWebPUrl = (path: string, sizeStr: string) => {
    if (!path) return '/placeholder.jpg'
    const baseUrl = process.env.NEXT_PUBLIC_IMAGE_PROXY || ''
    // Use WebP format
    return `${baseUrl}/tmdb${sizeStr}${path.replace('/w', '/w').replace('.jpg', '.webp')}`
  }

  // Fallback to regular URL if WebP not available
  const getUrl = (path: string, sizeStr: string) => {
    if (!path) return '/placeholder.jpg'
    if (path.startsWith('http')) return path
    const baseUrl = process.env.NEXT_PUBLIC_IMAGE_PROXY || ''
    return `${baseUrl}/tmdb${sizeStr}${path}`
  }

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) return
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '100px' }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [priority])

  const dimensions = {
    w185: { w: 185, h: 278 },
    w300: { w: 300, h: 450 },
    w342: { w: 342, h: 513 },
    w500: { w: 500, h: 750 },
    w780: { w: 780, h: 1170 }
  }

  const dims = dimensions[size]

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden bg-zinc-900 ${className}`}
      style={{ aspectRatio }}
    >
      {/* Loading skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 animate-pulse" />
      )}
      
      {isInView && (
        <img
          src={getUrl(src, size)}
          alt={alt}
          width={dims.w}
          height={dims.h}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'low'}
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
            // Try WebP on error
            const img = e.target as HTMLImageElement
            img.src = getWebPUrl(src, size)
          }}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  )
}
