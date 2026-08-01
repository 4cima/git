'use client'

import { useState, useMemo, useEffect } from 'react'
import { EmbedPlayer } from '@/components/features/media/EmbedPlayer'
import { STREAM_SERVERS, buildServerUrl } from '@/services/streamService'

const TEST_MOVIE_TMDB_ID = 550 // Fight Club
const TEST_SERIES_TMDB_ID = 1396 // Breaking Bad

export default function TestServersPage() {
  const [mounted, setMounted] = useState(false)
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie')
  const [tmdbId, setTmdbId] = useState(TEST_MOVIE_TMDB_ID)
  const [season, setSeason] = useState(1)
  const [episode, setEpisode] = useState(1)
  const [active, setActive] = useState(0)
  const [reporting, setReporting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentTmdbId = mediaType === 'movie' ? tmdbId : TEST_SERIES_TMDB_ID

  // Build servers from STREAM_SERVERS (12 servers)
  const servers = useMemo(() => {
    if (!mounted) return []
    
    return STREAM_SERVERS.map(server => ({
      id: server.id,
      name: server.name,
      url: buildServerUrl(
        server,
        mediaType,
        currentTmdbId,
        season,
        episode
      ),
      priority: 1,
      status: 'online' as const
    }))
  }, [mounted, mediaType, currentTmdbId, season, episode])

  const activeServer = servers[active]

  const handleReport = () => {
    setReporting(true)
    setTimeout(() => {
      setReporting(false)
      // Move to next server
      setActive((active + 1) % servers.length)
    }, 500)
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-zinc-400">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">
            Server Test Page
          </h1>
          <p className="text-zinc-400">اختبار السيرفرات الـ 12</p>
        </div>

        {/* Controls */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          
          {/* Media Type Selector */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">نوع المحتوى:</label>
            <div className="flex gap-3">
              <button
                onClick={() => setMediaType('movie')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  mediaType === 'movie'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                فيلم
              </button>
              <button
                onClick={() => setMediaType('tv')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  mediaType === 'tv'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                مسلسل
              </button>
            </div>
          </div>

          {/* Movie Input */}
          {mediaType === 'movie' && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400">TMDB ID:</label>
              <input
                type="number"
                value={tmdbId}
                onChange={(e) => setTmdbId(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white"
                placeholder="550"
              />
            </div>
          )}

          {/* Series Input */}
          {mediaType === 'tv' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400">الموسم:</label>
                <input
                  type="number"
                  value={season}
                  onChange={(e) => setSeason(Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400">الحلقة:</label>
                <input
                  type="number"
                  value={episode}
                  onChange={(e) => setEpisode(Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white"
                  min="1"
                />
              </div>
            </div>
          )}

          {/* Server List */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400">
              السيرفرات ({servers.length}):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {servers.map((server, idx) => (
                <button
                  key={`${server.name}-${idx}`}
                  onClick={() => setActive(idx)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    active === idx
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  S{idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Current Server Info */}
          {activeServer && (
            <div className="p-4 bg-zinc-800 rounded-xl border border-zinc-700">
              <div className="text-sm space-y-1">
                <div className="text-zinc-400">
                  <span className="font-bold">السيرفر النشط:</span> {activeServer.name}
                </div>
                <div className="text-zinc-500 text-xs break-all">
                  <span className="font-bold">الرابط:</span> {activeServer.url}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Player */}
        <div className="space-y-4">
          <EmbedPlayer
            server={activeServer}
            serverIndex={active}
            cinemaMode={false}
            toggleCinemaMode={() => {}}
            loading={false}
            onNextServer={() => setActive((active + 1) % servers.length)}
            onReport={handleReport}
            reporting={reporting}
            lang="ar"
            servers={servers}
            activeServerIndex={active}
            onServerSelect={setActive}
          />
        </div>

        {/* Debug Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-zinc-300 mb-4">معلومات التشخيص:</h3>
          <div className="space-y-2 text-sm font-mono">
            <div className="text-zinc-400">
              <span className="text-cyan-400">Type:</span> {mediaType}
            </div>
            <div className="text-zinc-400">
              <span className="text-cyan-400">TMDB ID:</span> {currentTmdbId}
            </div>
            {mediaType === 'tv' && (
              <>
                <div className="text-zinc-400">
                  <span className="text-cyan-400">Season:</span> {season}
                </div>
                <div className="text-zinc-400">
                  <span className="text-cyan-400">Episode:</span> {episode}
                </div>
              </>
            )}
            <div className="text-zinc-400">
              <span className="text-cyan-400">Active Server:</span> {active + 1}/{servers.length}
            </div>
            <div className="text-zinc-400">
              <span className="text-cyan-400">Total Servers:</span> {servers.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
