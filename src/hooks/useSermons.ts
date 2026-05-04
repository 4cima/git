import { useQuery } from '@tanstack/react-query'
import { errorLogger } from '../services/errorLogging'
import type { Sermon } from '../types/quran-sermons'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

interface UseSermonsOptions {
  category?: string
  featured?: boolean
  scholar?: string
}

export const useSermons = (options: UseSermonsOptions = {}) => {
  return useQuery({
    queryKey: ['quran-sermons', options],
    queryFn: async () => {
      try {
        const params = new URLSearchParams()
        
        if (options.category) params.append('category', options.category)
        if (options.featured) params.append('featured', 'true')
        if (options.scholar) params.append('scholar', options.scholar)
        
        const url = `${API_BASE}/api/quran/sermons${params.toString() ? `?${params}` : ''}`
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        return data.sermons as Sermon[]
      } catch (error: any) {
        errorLogger.logError({
          message: 'Error fetching Quran sermons',
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
