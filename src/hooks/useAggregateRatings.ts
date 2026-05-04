/**
 * Hook for batch fetching aggregate ratings and review counts for content lists
 * 
 * Usage:
 * const { ratings, loading } = useAggregateRatings(items, 'movie')
 * 
 * Then merge ratings into items:
 * const itemsWithRatings = items.map(item => ({
 *   ...item,
 *   aggregate_rating: ratings[item.id]?.average_rating,
 *   rating_count: ratings[item.id]?.rating_count,
 *   review_count: ratings[item.id]?.review_count
 * }))
 */

import { useEffect, useState } from 'react'
import { CONFIG } from '../lib/constants'

export type AggregateRatingData = {
  external_id: string
  content_type: string
  average_rating: number | null
  rating_count: number
  review_count?: number
}

export type AggregateRatingsMap = Record<string, AggregateRatingData>

export function useAggregateRatings(
  items: Array<{ id: number | string }>,
  contentType: 'movie' | 'tv' | 'game' | 'software'
) {
  const [ratings, setRatings] = useState<AggregateRatingsMap>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!items || items.length === 0) {
      setRatings({})
      return
    }

    const fetchRatings = async () => {
      setLoading(true)
      setError(null)

      try {
        // Prepare batch request (max 100 items)
        const batchItems = items.slice(0, 100).map(item => ({
          external_id: String(item.id),
          content_type: contentType
        }))

        const apiBase = CONFIG.API_BASE || ''

        // Fetch both aggregate ratings and review counts in parallel
        const [ratingsResponse, countsResponse] = await Promise.all([
          fetch(apiBase ? `${apiBase}/api/ratings/aggregate/batch` : '/api/ratings/aggregate/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: batchItems })
          }),
          fetch(apiBase ? `${apiBase}/api/reviews/count/batch` : '/api/reviews/count/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: batchItems })
          })
        ])

        if (!ratingsResponse.ok) {
          throw new Error(`Failed to fetch ratings: ${ratingsResponse.statusText}`)
        }

        const ratingsData = await ratingsResponse.json()
        const countsData = countsResponse.ok ? await countsResponse.json() : { results: [] }

        // Create a map of review counts
        const countsMap: Record<string, number> = {}
        if (countsData.results && Array.isArray(countsData.results)) {
          countsData.results.forEach((item: { external_id: string; count: number }) => {
            countsMap[item.external_id] = item.count
          })
        }

        // Convert array to map for easy lookup, merging review counts
        const ratingsMap: AggregateRatingsMap = {}
        if (ratingsData.results && Array.isArray(ratingsData.results)) {
          ratingsData.results.forEach((rating: AggregateRatingData) => {
            ratingsMap[rating.external_id] = {
              ...rating,
              review_count: countsMap[rating.external_id] || 0
            }
          })
        }

        setRatings(ratingsMap)
      } catch (err: any) {
        console.error('Error fetching aggregate ratings:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setRatings({}) // Clear ratings on error
      } finally {
        setLoading(false)
      }
    }

    fetchRatings()
  }, [items.map(i => (i as any).slug || String(i.id)).join(','), contentType])

  return { ratings, loading, error }
}
