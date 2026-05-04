export interface ServerProvider {
  id: string
  name: string
  url: string
  priority: number
  supports_movie?: boolean
  supports_tv?: boolean
  is_active?: boolean
  is_download?: boolean
}

export const DOWNLOAD_SERVER_IDS = ['server1', 'server2']

export const SERVER_PROVIDERS: ServerProvider[] = [
  {
    id: 'server1',
    name: 'Primary Server',
    url: 'https://server1.example.com',
    priority: 1,
  },
  {
    id: 'server2',
    name: 'Secondary Server',
    url: 'https://server2.example.com',
    priority: 2,
  },
]

export const generateServerUrl = (
  provider: ServerProvider,
  type: string,
  tmdbId?: number,
  season?: number,
  episode?: number,
  imdbId?: string
): string => {
  if (!provider) return ''
  const params = new URLSearchParams()
  if (tmdbId) params.append('tmdbId', tmdbId.toString())
  if (season) params.append('season', season.toString())
  if (episode) params.append('episode', episode.toString())
  if (imdbId) params.append('imdbId', imdbId)
  params.append('type', type)
  
  return `${provider.url}/stream?${params.toString()}`
}
