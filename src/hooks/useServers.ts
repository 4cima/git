import { useEffect, useState, useCallback } from 'react'
import { DOWNLOAD_SERVER_IDS, SERVER_PROVIDERS } from '../lib/serverCatalog'
import { STREAM_SERVERS, buildServerUrl } from '@/services/streamService'

export type Server = {
  id?: string
  name: string
  url: string
  priority: number
  status: 'unknown' | 'online' | 'offline' | 'degraded'
  responseTime?: number
}

export const useServers = (tmdbId: number, type: 'movie' | 'tv', season?: number, episode?: number, imdbId?: string) => {
  const [baseServers, setBaseServers] = useState<Server[]>([])
  const [downloadServerIds, setDownloadServerIds] = useState<string[]>(DOWNLOAD_SERVER_IDS)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reporting, setReporting] = useState(false)

  // Initialize providers
  useEffect(() => {
    console.log('🔄 useServers: useEffect triggered', { tmdbId, type, season, episode, isValid: Number.isFinite(tmdbId) && tmdbId > 0 })
    
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
      console.log('⚠️ useServers: Invalid tmdbId, skipping', { tmdbId })
      setBaseServers([])
      setActive(0)
      setLoading(true)
      return
    }

    // CRITICAL FIX: Prevent TV requests for movies
    if (type === 'movie' && (season !== undefined || episode !== undefined)) {
      console.warn('⚠️ CRITICAL: Movie should not have season/episode!', { tmdbId, season, episode })
      // Continue anyway but log the violation
    }

    const loadProviders = async () => {
      setLoading(true)
      console.log('🚀 useServers: loadProviders called', { tmdbId, type, season, episode })

      // Fetch server configs from Next.js API (not Worker)
      let sourceProviders = SERVER_PROVIDERS

      try {
        const response = await fetch(`/api/server-configs`)
        console.log('📡 useServers: API response', { ok: response.ok, status: response.status })
        if (response.ok) {
          const data = await response.json()
          const servers = data.servers || data
          console.log('📦 useServers: Received servers', { count: servers?.length, first: servers?.[0] })
          if (servers && servers.length > 0) {
            sourceProviders = servers.map((row: Record<string, unknown>) => ({
              id: row.id,
              name: row.name,
              base: row.base || row.url, // Use url as base if base not provided
              movie_template: row.movie_template,
              tv_template: row.tv_template,
              is_active: row.is_active ?? true,
              supports_movie: row.supports_movie ?? true,
              supports_tv: row.supports_tv ?? true,
              is_download: row.is_download,
              priority: row.priority
            }))
          }
        }
      } catch (error: any) {
        console.error('Failed to load server configs from CockroachDB:', error)
      }

      // If no servers from API, use STREAM_SERVERS from streamService
      if (sourceProviders === SERVER_PROVIDERS || sourceProviders.length === 0) {
        sourceProviders = STREAM_SERVERS.map((s, i) => ({
          id: s.id,
          name: s.name,
          base: s.base,
          priority: i,
          supports_movie: true,
          supports_tv: true,
          is_active: true
        }))
      }

      // Show ALL servers (remove is_active filter for testing)
      const filtered = sourceProviders.filter((provider) => {
        // if (provider.is_active === false) return false // DISABLED FOR TESTING
        if (type === 'movie' && provider.supports_movie === false) return false
        if (type === 'tv' && provider.supports_tv === false) return false
        return true
      })
      const rankedProviders = filtered
        .map((provider, index) => {
          const basePriority = Number.isFinite(Number(provider.priority)) ? Number(provider.priority) : index
          return {
            provider,
            priority: basePriority
          }
        })
        .sort((a, b) => a.priority - b.priority)
        .map((entry) => entry.provider)

      const dedupe = new Set<string>()
      const allServers = rankedProviders
        .map((p, index) => {
          // Find matching server from STREAM_SERVERS for URL building
          const streamServer = STREAM_SERVERS.find(s => s.id === p.id || s.name === p.name)
          const url = streamServer 
            ? buildServerUrl(streamServer, type as 'movie' | 'tv', tmdbId, season, episode)
            : `${p.base}/${type === 'movie' ? 'movie' : 'tv'}/${tmdbId}${type === 'tv' ? `/${season}/${episode}` : ''}`
          
          return {
            name: p.name,
            url,
            priority: Number.isFinite(Number(p.priority)) ? Number(p.priority) : index,
            status: 'online' as const,
            id: p.id
          }
        })
        .filter((s) => {
          if (!s.url) return false
          if (dedupe.has(s.url)) return false
          dedupe.add(s.url)
          return true
        })

      console.log('🎯 useServers: Generated servers', {
        type,
        tmdbId,
        season,
        episode,
        serverCount: allServers.length,
        firstServer: allServers[0],
        sourceProviders: sourceProviders.length,
        streamServersMatch: STREAM_SERVERS.length
      })

      setBaseServers(allServers)
      const resolvedDownloadIds = sourceProviders
        .filter((provider) => provider.is_download === true)
        .map((provider) => provider.id)
      setDownloadServerIds(resolvedDownloadIds.length > 0 ? resolvedDownloadIds : DOWNLOAD_SERVER_IDS)
      setActive(0)
      setLoading(false)
    }

    loadProviders()
  }, [tmdbId, type, season, episode, imdbId])

  const reportServer = async () => {
    const current = baseServers[active]
    if (!current || reporting) return
    setReporting(true)
    setBaseServers((prev) =>
      prev.map((server, idx) =>
        idx === active ? { ...server, status: 'degraded' } : server
      )
    )
    try {
      if (current.id) {
        // Report to API
        await fetch(`/api/link-checks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider_id: current.id,
            url: current.url,
            ok: false,
            status_code: 0,
            response_ms: 0,
            checked_at: new Date().toISOString(),
            source: 'watch-report'
          })
        })
      }
    } catch {
    } finally {
      if (baseServers.length > 1) {
        setActive((prev) => (prev < baseServers.length - 1 ? prev + 1 : 0))
      }
      setReporting(false)
    }
  }

  const checkBatchAvailability = useCallback(async (
    items: Array<{ s: number; e: number }>
  ): Promise<Record<string, boolean>> => {
    const results: Record<string, boolean> = {}
    items.forEach(({ s, e }) => {
      results[`${s}-${e}`] = true
    })
    return results
  }, [])

  const setActiveSafe = (next: number) => {
    if (next < 0 || next >= baseServers.length) return
    setActive(next)
  }

  const activeServer = baseServers[active]
  const downloadServers = downloadServerIds
    .map((id) => baseServers.find((server) => server.id === id))
    .filter((server): server is Server => Boolean(server))
    .slice(0, 3)

  return {
    servers: baseServers,
    downloadServers,
    activeServer,
    setActiveServer: setActiveSafe,
    active,
    setActive: setActiveSafe,
    loading,
    reportServer,
    reportBroken: reportServer,
    reporting,
    checkBatchAvailability
  }
}
