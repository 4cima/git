'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function WatchEpisodePage() {
  const params = useParams()
  const router = useRouter()
  const [serverIndex, setServerIndex] = useState(0)
  
  const slug = params.slug as string
  const season = params.season as string
  const ep = params.ep as string
  
  // Get series ID from slug (you'll need to fetch this)
  const [seriesId, setSeriesId] = useState<number | null>(null)
  
  useEffect(() => {
    // Fetch series to get ID
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tv/${slug}`)
      .then(res => res.json())
      .then(data => setSeriesId(data.id))
      .catch(console.error)
  }, [slug])
  
  const embedUrl = seriesId
    ? getEmbedUrl(seriesId, Number(season), Number(ep), serverIndex)
    : ''
  
  return (
    <div className="min-h-screen bg-black">
      <div className="page-container py-8">
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="text-primary hover:underline"
          >
            ← العودة
          </button>
        </div>
        
        {/* Player */}
        <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              جاري التحميل...
            </div>
          )}
        </div>
        
        {/* Server Selector */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setServerIndex(0)}
            className={`px-4 py-2 rounded ${
              serverIndex === 0
                ? 'bg-primary text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            vidsrc
          </button>
          <button
            onClick={() => setServerIndex(1)}
            className={`px-4 py-2 rounded ${
              serverIndex === 1
                ? 'bg-primary text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            2embed
          </button>
          <button
            onClick={() => setServerIndex(2)}
            className={`px-4 py-2 rounded ${
              serverIndex === 2
                ? 'bg-primary text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            embed.su
          </button>
        </div>
      </div>
    </div>
  )
}

function getEmbedUrl(
  seriesId: number,
  season: number,
  episode: number,
  serverIndex: number
): string {
  const servers = [
    `https://vidsrc.xyz/embed/tv/${seriesId}/${season}/${episode}`,
    `https://www.2embed.cc/embedtv/${seriesId}&s=${season}&e=${episode}`,
    `https://embed.su/embed/tv/${seriesId}/${season}/${episode}`,
  ]
  return servers[serverIndex] || servers[0]
}
