import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { ContentFetchParams, ContentResponse, UnifiedContentItem, ContentType } from '../types/unified-section'
import { mapFilterToAPIParams, getEndpointForContentType, ContentType as FilterContentType } from '../lib/filter-utils'
import { ErrorHandler } from '../lib/error-handling'
import { validateContent, logDataIntegrityViolations, filterInvalidContent } from '../lib/data-validation'

/**
 * Custom hook لجلب المحتوى الموحد من CockroachDB مع Infinite Scroll
 * Custom hook to fetch unified content from CockroachDB with Infinite Scroll
 */
export function useUnifiedContent(params: ContentFetchParams & {
  genre?: string | null
  category?: string | null
  language?: string | null
  year?: number | string | null  // Support both number and string (for ranges)
  enableInfiniteScroll?: boolean  // Enable/disable infinite scroll (default: true)
}) {
  const {
    contentType,
    activeFilter,
    genre,
    category,
    year,
    rating,
    language,
    page = 1,
    limit = 40,
    enableInfiniteScroll = true  // Default to true for all content except Quran
  } = params
  
  // Convert contentType to FilterContentType
  const filterContentType = (contentType === 'series' ? 'tv' : contentType === 'movies' ? 'movie' : contentType) as FilterContentType
  
  // دمج معاملات الفلتر النشط مع الفلاتر الإضافية
  const filterParams = mapFilterToAPIParams(activeFilter, filterContentType)
  
  // بناء query key للتخزين المؤقت - يشمل جميع الفلاتر
  const queryKey = [
    'unified-content',
    contentType,
    activeFilter,
    genre ?? null,
    category ?? null,
    year ?? null,
    rating ?? null,
    language ?? null,
    enableInfiniteScroll ? 'infinite' : page
  ]
  
  // Fetch function for both regular and infinite queries
  const fetchContent = async (pageParam: number = 1): Promise<ContentResponse<UnifiedContentItem>> => {
    try {
      // تحديد endpoint حسب نوع المحتوى
      const endpoint = getEndpointForContentType(filterContentType)
      
      // بناء query parameters
      const queryParams = new URLSearchParams()
      
      // sortBy from filterParams (based on activeFilter)
      const finalSortBy = filterParams.sortBy || 'popularity'
      if (finalSortBy) {
        queryParams.append('sortBy', finalSortBy)
      }
      
      // genre parameter (Arabic value from DB)
      if (genre) queryParams.append('genre', genre)
      
      // category parameter (alias for genre, for Islamic content)
      if (category && !genre) queryParams.append('category', category)
      
      // language parameter
      if (language) queryParams.append('language', language)
      
      // Handle year filtering
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
      } else if (filterParams.year) {
        // For classics: filter by year < 2000
        if (activeFilter === 'classics') {
          queryParams.append('yearTo', String(filterParams.year))
        } else {
          queryParams.append('yearFrom', String(filterParams.year))
          queryParams.append('yearTo', String(filterParams.year))
        }
      }
      
      if (rating || filterParams.rating) {
        queryParams.append('ratingFrom', String(rating || filterParams.rating))
      }
      
      // Special handling for summaries
      if (activeFilter === 'summaries') {
        queryParams.append('category', 'recaps')
      }
      
      queryParams.append('page', String(pageParam))
      queryParams.append('limit', String(limit))
      
      if (contentType === 'anime') {
        queryParams.append('language', 'ja')
      }
      
      // جلب البيانات من CockroachDB API
      const response = await fetch(`${endpoint}?${queryParams.toString()}`)
      
      if (!response.ok) {
        throw {
          status: response.status,
          statusText: response.statusText,
          message: await response.text()
        }
      }
      
      const result = await response.json()
      
      // Map items to unified format
      const mappedItems = result.data.map((item: any) => ({
        ...item,
        media_type: contentType === 'series' || contentType === 'anime' ? 'tv' : contentType,
        poster_path: item.poster_url || item.poster_path,
        backdrop_path: item.backdrop_url || item.backdrop_path
      }))
      
      // Validate content integrity
      const validationResult = validateContent(mappedItems, {
        expectedLanguage: filterParams.language || undefined,
        subsectionName: `${contentType}/${activeFilter}`,
        requiredFields: ['id', 'slug']
      })
      
      // Log any data integrity violations
      if (!validationResult.isValid) {
        logDataIntegrityViolations(validationResult.errors, {
          contentType,
          subsection: activeFilter,
          timestamp: new Date().toISOString()
        })
      }
      
      // Filter out invalid content items
      const validItems = filterInvalidContent(mappedItems, validationResult)
      
      // Extract pagination data from result.pagination object
      const pagination = result.pagination || {}
      
      return {
        items: validItems as UnifiedContentItem[],
        total: pagination.total || validItems.length,
        page: pagination.page || pageParam,
        limit: pagination.limit || limit,
        totalPages: pagination.totalPages || Math.ceil((pagination.total || validItems.length) / limit)
      }
    } catch (error: any) {
      throw ErrorHandler.handleAPIError(error)
    }
  }
  
  // Use infinite query if enabled, otherwise use regular query
  if (enableInfiniteScroll) {
    return useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam = 1 }) => fetchContent(pageParam),
      getNextPageParam: (lastPage) => {
        // Return next page number if there are more pages
        if (lastPage.page < lastPage.totalPages) {
          return lastPage.page + 1
        }
        return undefined
      },
      initialPageParam: 1,
      staleTime: 15 * 60 * 1000,   // 15 minutes
      gcTime: 30 * 60 * 1000,      // 30 minutes
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false
    })
  }
  
  // Regular query for Quran and other content that doesn't need infinite scroll
  return useQuery({
    queryKey,
    queryFn: () => fetchContent(page),
    staleTime: 15 * 60 * 1000,   // 15 minutes
    gcTime: 30 * 60 * 1000,      // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  })
}

/**
 * Hook لجلب تفاصيل عنصر واحد
 * Hook to fetch single item details
 */
export function useContentDetails(
  contentType: ContentType,
  identifier: string | number
) {
  // Convert contentType to FilterContentType
  const filterContentType = (contentType === 'series' ? 'tv' : contentType === 'movies' ? 'movie' : contentType) as FilterContentType
  const endpoint = getEndpointForContentType(filterContentType)
  
  return useQuery({
    queryKey: ['content-details', contentType, identifier],
    queryFn: async () => {
      const response = await fetch(`${endpoint}/${identifier}`)
      
      if (response.status === 404) {
        return null
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch details: ${response.statusText}`)
      }
      
      return response.json()
    },
    staleTime: 10 * 60 * 1000, // 10 دقائق
    gcTime: 30 * 60 * 1000, // 30 دقيقة
    retry: 2
  })
}
