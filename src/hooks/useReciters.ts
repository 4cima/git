import { useQuery } from '@tanstack/react-query'
import { errorLogger } from '../services/errorLogging'
import { FEATURED_RECITERS } from '../data/quran'
import type { QuranReciter } from '../components/features/quran/ReciterList'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export const useReciters = () => {
  return useQuery({
    queryKey: ['quran-reciters-list'],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_BASE}/api/quran/reciters`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        const list = data as QuranReciter[]
        
        // Remove duplicates based on name (keep first occurrence)
        const uniqueReciters = list.reduce((acc, current) => {
          const isDuplicate = acc.find(item => item.name === current.name)
          if (!isDuplicate) {
            acc.push(current)
          }
          return acc
        }, [] as QuranReciter[])
        
        // Sort: Featured first, then Alphabetical
        return uniqueReciters.sort((a, b) => {
        // Find index in FEATURED_RECITERS (use -1 if not found)
        const aIndex = FEATURED_RECITERS.findIndex(f => a.name.includes(f))
        const bIndex = FEATURED_RECITERS.findIndex(f => b.name.includes(f))
        
        // Both are featured -> sort by order in FEATURED_RECITERS
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        
        // Only A is featured -> A comes first
        if (aIndex !== -1) return -1
        
        // Only B is featured -> B comes first
        if (bIndex !== -1) return 1
        
        // Neither is featured -> Alphabetical
        return a.name.localeCompare(b.name, 'ar')
      })
      } catch (error: any) {
        errorLogger.logError({
          message: 'Error fetching Quran reciters',
          severity: 'medium',
          category: 'api',
          context: { error }
        })
        return []
      }
    },
    staleTime: 1000 * 60 * 60 // 1 hour
  })
}
