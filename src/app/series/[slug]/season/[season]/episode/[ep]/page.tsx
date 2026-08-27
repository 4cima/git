'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { buildServerUrl, StreamServer } from '@/services/streamService'

export default function WatchEpisodePage() {
  const params = useParams()
  const router = useRouter()
  const [serverIndex, setServerIndex] = useState(0)
  const [servers, setServers] = useState<StreamServer[]>([])

  const slug = params.slug as string
  const season = params.season as string
  const ep = params.ep as string

  // Get series ID from slug
  const [seriesId, setSeriesId] = useState<number | null>(null)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tv/${slug}`)
      .then(res => res.json())
      .then(data => setSeriesId(data.id))
      .catch(console.error)
  }, [slug])

  // Load the single source of truth for server order at runtime
  useEffect(() => {
    fetch(`/api/server-configs`)
      .then(res => res.json())
      .then(data => {
        const list = data?.servers || []
        if (Array.isArray(list) && list.length > 0) {
          setServers(list.map((row: { id: string; name: string; url: string }) => ({
            id: row.id,
            name: row.name,
            base: row.url,
          })))
        }
      })
      .catch(console.error)
  }, [])

  const current = servers[serverIndex]
  const embedUrl = seriesId && current
    ? buildServerUrl(current, 'tv', seriesId, Number(season), Number(ep))
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
        <div className="flex flex-wrap gap-2 mb-8">
          {servers.map((server, idx) => (
            <button
              key={server.id}
              onClick={() => setServerIndex(idx)}
              aria-label={`سيرفر ${idx + 1}`}
              className={`px-4 py-2 rounded ${
                serverIndex === idx
                  ? 'bg-primary text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              v{idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}