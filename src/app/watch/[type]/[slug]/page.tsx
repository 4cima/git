'use client'

import { WatchPage } from '@/components/pages/WatchPage'
import { useParams, useSearchParams } from 'next/navigation'

export default function Watch() {
  const params = useParams()
  const searchParams = useSearchParams()
  
  const type = params.type as 'movies' | 'series'
  const slug = params.slug as string
  const season = searchParams.get('season') ? Number(searchParams.get('season')) : undefined
  const episode = searchParams.get('episode') ? Number(searchParams.get('episode')) : undefined
  
  return (
    <WatchPage 
      type={type}
      slug={slug}
      season={season}
      episode={episode}
    />
  )
}
