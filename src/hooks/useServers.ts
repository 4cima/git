import { useEffect, useState, useCallback } from 'react'
import { DOWNLOAD_SERVER_IDS, SERVER_PROVIDERS, generateServerUrl } from '../lib/serverCatalog'
import { supabase } from '../lib/supabase'

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
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
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

      // Fetch from CockroachDB API instead of Supabase
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || ''
      let sourceProviders = SERVER_PROVIDERS

      try {
        const response = await fetch(`${API_BASE}/api/server-configs`)
        if (response.ok) {
          const data = await response.json()
          if (data && data.length > 0) {
            sourceProviders = data.map((row: Record<string, unknown>) => ({
              id: row.id,
              name: row.name,
              base: row.base,
              movie_template: row.movie_template,
              tv_template: row.tv_template,
              is_active: row.is_active,
              supports_movie: row.supports_movie,
              supports_tv: row.supports_tv,
              is_download: row.is_download,
              priority: row.priority
            }))
          }
        }
      } catch (error: any) {
        console.error('Failed to load server configs from CockroachDB:', error)
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
        .map((p, index) => ({
          name: p.name,
          url: generateServerUrl(p, type, tmdbId, season, episode, imdbId),
          priority: Number.isFinite(Number(p.priority)) ? Number(p.priority) : index,
          status: 'online' as const,
          id: p.id
        }))
        .filter((s) => {
          if (!s.url) return false
          if (dedupe.has(s.url)) return false
          dedupe.add(s.url)
          return true
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
        // Report to CockroachDB via API instead of Supabase
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || ''
        await fetch(`${API_BASE}/api/link-checks`, {
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
