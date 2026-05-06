'use client'

import { useParams, useSearchParams, redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function Watch() {
  const params = useParams()
  const searchParams = useSearchParams()
  
  const type = params.type as 'movies' | 'series'
  const slug = params.slug as string
  const season = searchParams.get('season')
  const episode = searchParams.get('episode')
  
  useEffect(() => {
    // Redirect to the appropriate page
    if (type === 'movies') {
      window.location.href = `/movies/${slug}`
    } else if (type === 'series') {
      const query = season && episode ? `?season=${season}&episode=${episode}` : ''
      window.location.href = `/series/${slug}${query}`
    }
  }, [type, slug, season, episode])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <p className="text-white">جاري إعادة التوجيه...</p>
    </div>
  )
}
