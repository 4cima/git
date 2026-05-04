import React, { useState, useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'
import { UnifiedPlaceholder } from './UnifiedPlaceholder'
import { getCacheStatus, setCacheStatus } from '../../lib/image-cache'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  priority?: boolean  // Skip lazy loading for above-fold images
  blurDataURL?: string  // Optional blur placeholder
  fallbackSrc?: string  // NEW: Explicit fallback URL
  maxRetries?: number   // NEW: Max retry attempts (default 3)
  timeout?: number      // NEW: Timeout in ms (default 10000)
  contentType?: 'movie' | 'tv' | 'game' | 'software' | 'anime'  // NEW: For placeholder
  onLoad?: () => void
  onError?: () => void
  onFinalError?: () => void  // NEW: Called after all retries fail
}

/**
 * مكون صورة محسّن مع lazy loading و blur placeholder
 * Optimized image component with lazy loading and blur placeholder
 * 
 * Features:
 * - Lazy loading with Intersection Observer
 * - Blur placeholder while loading
 * - WebP format with JPEG fallback
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - Unified placeholder on final failure
 * - Image caching
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  blurDataURL,
  fallbackSrc,
  maxRetries = 3,
  timeout = 10000,
  contentType = 'movie',
  onLoad,
  onError,
  onFinalError
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const [showPlaceholder, setShowPlaceholder] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Load immediately if priority
    if (priority) {
      setIsInView(true)
      return
    }

    // Simple lazy loading with IntersectionObserver
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '200px',
        threshold: 0.01
      }
    )

    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [priority])

  // Check cache on mount
  useEffect(() => {
    // CRITICAL FIX: Always clear error cache for this image on mount
    // This prevents stale error states from blocking valid images
    const cached = getCacheStatus(src)
    if (cached === 'error') {
      // Clear the error cache and force retry
      import('../../lib/image-cache').then(({ removeCacheEntry }) => {
        removeCacheEntry(src)
        // Force component to retry by resetting state
        setHasError(false)
        setRetryCount(0)
        setShowPlaceholder(false)
      })
    } else if (cached === 'success') {
      setIsLoaded(true)
    }
  }, [src])

  // Timeout handling
  useEffect(() => {
    if (!isInView || isLoaded || hasError) return

    timeoutRef.current = setTimeout(() => {
      if (!isLoaded) {
        console.warn(`Image load timeout after ${timeout}ms:`, src)
        handleRetryOrFallback()
      }
    }, timeout)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isInView, isLoaded, hasError, timeout, src])

  const handleRetryOrFallback = () => {
    if (retryCount < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, retryCount) * 1000
      setIsRetrying(true)

      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount(prev => prev + 1)
        setIsRetrying(false)
        setHasError(false)
        // Force re-render by updating src
        setCurrentSrc(src + `?retry=${retryCount + 1}`)
      }, delay)
    } else if (fallbackSrc && currentSrc !== fallbackSrc) {
      // Try fallback URL
      setCurrentSrc(fallbackSrc)
      setRetryCount(0)
      setHasError(false)
    } else {
      // Final failure - show placeholder
      setShowPlaceholder(true)
      setCacheStatus(src, 'error')
      onFinalError?.()
    }
  }

  const handleLoad = () => {
    setIsLoaded(true)
    setCacheStatus(src, 'success')
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    onLoad?.()
  }

  const handleError = () => {
    console.warn('⚠️ OptimizedImage error:', {
      src: currentSrc,
      retryCount,
      maxRetries,
      alt
    })
    setHasError(true)
    onError?.()
    handleRetryOrFallback()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    }
  }, [])

  // Generate WebP URL (assuming your CDN supports it)
  const getWebPUrl = (url: string): string => {
    if (!url) return url
    // If using TMDB images, they support WebP
    if (url.includes('image.tmdb.org')) {
      return url
    }
    // For other sources, try to convert
    return url.replace(/\.(jpg|jpeg|png)$/i, '.webp')
  }

  // Show unified placeholder on final failure
  if (showPlaceholder) {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <UnifiedPlaceholder contentType={contentType} size="md" />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden bg-lumen-surface', className)}
      style={{ aspectRatio: width && height ? `${width}/${height}` : undefined }}
    >
      {/* Blur placeholder */}
      {!isLoaded && !hasError && blurDataURL && (
        <img
          src={blurDataURL}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
        />
      )}

      {/* Loading skeleton */}
      {!isLoaded && !hasError && !blurDataURL && (
        <div className="absolute inset-0 bg-gradient-to-br from-lumen-surface via-lumen-muted to-lumen-surface animate-pulse" />
      )}

      {/* Retry indicator */}
      {isRetrying && (
        <div className="absolute inset-0 flex items-center justify-center bg-lumen-surface/80 z-10">
          <div className="text-lumen-silver text-xs">
            Retrying... ({retryCount}/{maxRetries})
          </div>
        </div>
      )}

      {/* Actual image */}
      {isInView && !showPlaceholder && (
        <picture>
          {/* WebP source for modern browsers */}
          <source srcSet={getWebPUrl(currentSrc)} type="image/webp" />

          {/* Fallback to original format */}
          <img
            ref={imgRef}
            src={currentSrc}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0',
              className
            )}
          />
        </picture>
      )}
    </div>
  )
}

// Utility to generate blur data URL (can be used server-side or build-time)
export function generateBlurDataURL(width: number = 10, height: number = 10): string {
  // Simple gray blur placeholder
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (ctx) {
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#1a1a1a')
    gradient.addColorStop(0.5, '#2a2a2a')
    gradient.addColorStop(1, '#1a1a1a')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }

  return canvas.toDataURL('image/jpeg', 0.1)
}
