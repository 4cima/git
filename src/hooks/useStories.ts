import { useQuery } from '@tanstack/react-query'
import { errorLogger } from '../services/errorLogging'
import type { Story } from '../types/quran-stories'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

interface UseStoriesOptions {
  category?: string
  featured?: boolean
  narrator?: string
}

export const useStories = (options: UseStoriesOptions = {}) => {
  return useQuery({
    queryKey: ['quran-stories', options],
    queryFn: async () => {
      try {
        const params = new URLSearchParams()
        
        if (options.category) params.append('category', options.category)
        if (options.featured) params.append('featured', 'true')
        if (options.narrator) params.append('narrator', options.narrator)
        
        const url = `${API_BASE}/api/quran/stories${params.toString() ? `?${params}` : ''}`
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        return data.stories as Story[]
      } catch (error: any) {
        errorLogger.logError({
          message: 'Error fetching Quran stories',
          severity: 'medium',
          category: 'api',
          context: { error, options }
        })
        throw error
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}
