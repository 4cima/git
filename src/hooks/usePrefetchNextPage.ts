import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ContentFetchParams, ContentResponse, UnifiedContentItem, ContentType } from '../types/unified-section'
import { mapFilterToAPIParams, getEndpointForContentType, ContentType as FilterContentType } from '../lib/filter-utils'

interface UsePrefetchNextPageParams {
  contentType: ContentType
  activeFilter: ContentFetchParams['activeFilter']
  genre?: string | null
  year?: number | string | null  // Support both number and string (for ranges)
  rating?: number | null
  language?: string | null
  currentPage: number
  totalPages?: number
  limit?: number
  enabled?: boolean  // Allow disabling prefetch
}

/**
 * Hook لتحميل الصفحة التالية مسبقاً مع Intersection Observer
 * Hook to prefetch the next page with Intersection Observer
 * 
 * This hook automatically prefetches the next page when:
 * - User scrolls to 70% of the page
 * - There is a next page available (currentPage < totalPages)
 * 
 * Uses React Query's prefetchQuery to load data in the background
 */
export function usePrefetchNextPage(params: UsePrefetchNextPageParams) {
  const {
    contentType,
    activeFilter,
    genre,
    year,
    rating,
    language,
    currentPage,
    totalPages,
    limit = 40,
    enabled = true
  } = params

  const queryClient = useQueryClient()
  const hasPrefetched = useRef(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    // Reset prefetch flag when page changes
    hasPrefetched.current = false
  }, [currentPage])

  useEffect(() => {
    // Don't prefetch if disabled or no next page
    if (!enabled || !totalPages || currentPage >= totalPages) {
      return
    }

    // Don't prefetch if already done
    if (hasPrefetched.current) {
      return
    }

    // Create intersection observer to detect when user scrolls to 70%
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasPrefetched.current) {
          hasPrefetched.current = true
          prefetchNextPage()
        }
      })
    }

    // Create observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '0px 0px 300px 0px', // Trigger 300px before reaching bottom
      threshold: 0
    })

    // Find the last content item to observe
    const contentGrid = document.querySelector('[data-content-grid]')
    if (contentGrid) {
      const lastItem = contentGrid.lastElementChild
      if (lastItem) {
        observerRef.current.observe(lastItem)
      }
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [enabled, currentPage, totalPages])

  const prefetchNextPage = () => {
    const nextPage = currentPage + 1

    // Convert contentType to FilterContentType (map unified types to filter types)
    const filterContentType = (contentType === 'series' ? 'tv' : contentType === 'movies' ? 'movie' : contentType) as FilterContentType
    
    // Build the same query key structure as useUnifiedContent
    const filterParams = mapFilterToAPIParams(activeFilter, filterContentType)
    const finalSortBy = filterParams.sortBy || 'popularity'

    const queryKey = [
      'unified-content',
      contentType,
      activeFilter,
      genre,
      year,
      rating,
      language,
      nextPage,
      limit
    ]

    // Prefetch the next page
    queryClient.prefetchQuery({
      queryKey,
      queryFn: async (): Promise<ContentResponse<UnifiedContentItem>> => {
        // Determine endpoint based on content type
        const endpoint = getEndpointForContentType(filterContentType)

        // Build query parameters
        const queryParams = new URLSearchParams()

        // Add sort parameters
        queryParams.append('sortBy', finalSortBy)

        // Add filter parameters
        if (genre) {
          queryParams.append('genre', genre)
        }

        if (year) {
          // Check if year is a range (e.g., "1990-1999")
          if (typeof year === 'string' && year.includes('-')) {
            const [yearFrom, yearTo] = year.split('-').map(y => y.trim())
            queryParams.append('yearFrom', yearFrom)
            queryParams.append('yearTo', yearTo)
          } else {
            // Single year
            queryParams.append('yearFrom', String(year))
            queryParams.append('yearTo', String(year))
          }
        }

        if (rating || filterParams.rating) {
          queryParams.append('ratingFrom', String(rating || filterParams.rating))
        }

        // Add language parameter
        if (language) {
          queryParams.append('language', language)
        }

        // Add pagination parameters
        queryParams.append('page', String(nextPage))
        queryParams.append('limit', String(limit))

        // Special handling for anime (Japanese TV series)
        if (contentType === 'anime') {
          queryParams.append('language', 'ja')
        }

        // Fetch data from CockroachDB API
        const response = await fetch(`${endpoint}?${queryParams.toString()}`)

        if (!response.ok) {
          throw {
            status: response.status,
            statusText: response.statusText,
            message: await response.text()
          }
        }

        const result = await response.json()

        // Transform response to unified format
        return {
          items: result.data.map((item: any) => ({
            ...item,
            media_type: contentType === 'series' || contentType === 'anime' ? 'tv' : contentType,
            poster_path: item.poster_url || item.poster_path,
            backdrop_path: item.backdrop_url || item.backdrop_path
          })),
          total: result.total || result.data.length,
          page: result.page || nextPage,
          limit: result.limit || limit,
          totalPages: Math.ceil((result.total || result.data.length) / limit)
        }
      },
      staleTime: 15 * 60 * 1000 // 15 minutes - same as useUnifiedContent
    })
  }
}
