// Subtitle utilities for Next.js

export interface Subtitle {
  id: string
  language: string
  label: string
  url: string
}

export interface SubtitleTrack {
  id: string
  language: string
  label: string
  url: string
  src: string
  format?: string
  srcLang?: string
}

export function parseSubtitles(subtitles: any[]): Subtitle[] {
  if (!Array.isArray(subtitles)) return []
  
  return subtitles.map((sub, index) => ({
    id: sub.id || `sub-${index}`,
    language: sub.language || 'ar',
    label: sub.label || sub.language || 'Arabic',
    url: sub.url || sub.file || '',
  }))
}

export function getSubtitleUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
  return `${apiUrl}/api/subtitles/${encodeURIComponent(url)}`
}

export async function fetchSubtitles(
  tmdbId?: string | number,
  imdbId?: string,
  language: string = 'ar'
): Promise<SubtitleTrack[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
    const params = new URLSearchParams()
    
    if (tmdbId) params.append('tmdb_id', String(tmdbId))
    if (imdbId) params.append('imdb_id', imdbId)
    params.append('language', language)
    
    const response = await fetch(`${apiUrl}/api/subtitles?${params}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch subtitles')
    }
    
    const data = await response.json()
    return data.subtitles || []
  } catch (error) {
    console.error('Error fetching subtitles:', error)
    return []
  }
}
