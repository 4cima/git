/**
 * QuantumTrain wrapper that automatically fetches and merges aggregate ratings
 * 
 * This component wraps QuantumTrain and uses the useAggregateRatings hook
 * to batch-fetch ratings for all items, then merges them before rendering.
 */

import { useMemo } from 'react'
import { QuantumTrain } from './QuantumTrain'
import { useAggregateRatings } from '../../../hooks/useAggregateRatings'

type QuantumTrainWithRatingsProps = {
  items: any[]
  title?: string
  link?: string
  type?: string
  icon?: React.ReactNode
  badge?: string
  className?: string
  color?: 'cyan' | 'purple' | 'gold' | 'red' | 'pink' | 'blue' | 'green' | 'indigo' | 'orange'
  contentType?: 'movie' | 'tv' | 'game' | 'software'
  enableRatings?: boolean // Allow disabling ratings fetch
}

export function QuantumTrainWithRatings({
  items,
  contentType = 'movie',
  enableRatings = true,
  ...props
}: QuantumTrainWithRatingsProps) {
  // Fetch aggregate ratings for all items
  const { ratings, loading } = useAggregateRatings(
    enableRatings ? items : [],
    contentType
  )

  // Merge ratings into items
  const itemsWithRatings = useMemo(() => {
    if (!enableRatings || loading || Object.keys(ratings).length === 0) {
      return items
    }

    return items.map(item => {
      const ratingData = ratings[String(item.id)]
      if (!ratingData) return item

      return {
        ...item,
        aggregate_rating: ratingData.average_rating,
        rating_count: ratingData.rating_count,
        review_count: ratingData.review_count
      }
    })
  }, [items, ratings, loading, enableRatings])

  return <QuantumTrain {...props} items={itemsWithRatings} />
}
