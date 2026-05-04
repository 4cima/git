export type MediaType = 'movie' | 'tv'
export type Server = 'vidsrc' | '2embed' | 'embed_su'

export function getEmbedUrl(
  type: MediaType,
  id?: string | number,
  season = 1,
  episode = 1,
  server: Server = 'vidsrc'
): string {
  const tmdb = String(id || '')
  if (!tmdb) return ''
  if (server === 'vidsrc') {
    if (type === 'movie') return `https://vidsrc.to/embed/movie?tmdb=${tmdb}`
    return `https://vidsrc.to/embed/tv?tmdb=${tmdb}&season=${season}&episode=${episode}`
  }
  if (server === '2embed') {
    if (type === 'movie') return `https://www.2embed.cc/embed/${tmdb}`
    return `https://www.2embed.cc/embed/tv/${tmdb}?s=${season}&e=${episode}`
  }
  if (server === 'embed_su') {
    if (type === 'movie') return `https://embed.su/?tmdb=${tmdb}&category=movie`
    return `https://embed.su/?tmdb=${tmdb}&season=${season}&episode=${episode}&category=tv`
  }
  return ''
}

export function getEmbedUrlByIndex(
  type: MediaType,
  id: number,
  options?: { season?: number; episode?: number; serverIndex?: number }
) {
  const s = options?.season ?? 1
  const e = options?.episode ?? 1
  const servers: Array<(t: MediaType, i: number) => string> = [
    (t, i) => (t === 'movie'
      ? `https://vidsrc.to/embed/movie?tmdb=${i}`
      : `https://vidsrc.to/embed/tv?tmdb=${i}&season=${s}&episode=${e}`),
    (t, i) => (t === 'movie'
      ? `https://www.2embed.cc/embed/${i}`
      : `https://www.2embed.cc/embed/tv/${i}?s=${s}&e=${e}`),
    (t, i) => (t === 'movie'
      ? `https://embed.su/?tmdb=${i}&category=movie`
      : `https://embed.su/?tmdb=${i}&season=${s}&episode=${e}&category=tv`)
  ]
  const index = options?.serverIndex ?? 0
  const fn = servers[index] || servers[0]
  return fn(type, id)
}
