import { useEffect, useRef } from 'react'

export function InfiniteScrollLoader({
  hasMore,
  onLoadMore,
  isLoading
}: {
  hasMore: boolean
  onLoadMore: () => void
  isLoading: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !hasMore) return
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading) {
          onLoadMore()
        }
      },
      { 
        root: null,
        rootMargin: '400px',
        threshold: 0
      }
    )
    
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, isLoading, onLoadMore])

  if (!hasMore) return null

  return (
    <div 
      ref={ref} 
      style={{ 
        height: '20px',
        width: '100%',
        margin: '20px 0'
      }} 
    />
  )
}
