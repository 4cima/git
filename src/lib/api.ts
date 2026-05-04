// API Client for 4CIMA Worker
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

async function apiFetch(path: string, revalidate = 3600) {
  const res = await fetch(`${API_URL}${path}`, {
    next: { revalidate },
    headers: {
      'Content-Type': 'application/json'
    }
  })
  
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`)
  }
  
  return res.json()
}

export const api = {
  // Home
  getHome: () => apiFetch('/api/home', 3600),
  
  // Movies
  getMovies: (page = 1, genre?: string, sortBy = 'popularity') => 
    apiFetch(`/api/movies?page=${page}${genre ? `&genre=${genre}` : ''}&sortBy=${sortBy}`, 3600),
  getMovie: (slug: string) => apiFetch(`/api/movies/${slug}`, 86400),
  
  // TV Series
  getSeries: (page = 1, genre?: string) => 
    apiFetch(`/api/tv?page=${page}${genre ? `&genre=${genre}` : ''}`, 3600),
  getSeriesDetail: (slug: string) => apiFetch(`/api/tv/${slug}`, 86400),
  getEpisodes: (slug: string, season: number) => 
    apiFetch(`/api/tv/${slug}/season/${season}/episodes`, 86400),
  
  // Search
  search: (q: string) => apiFetch(`/api/search?q=${encodeURIComponent(q)}`, 0),
  
  // Genres
  getGenres: () => apiFetch('/api/genres', 86400),
  
  // Actors
  getActor: (slug: string) => apiFetch(`/api/actors/${slug}`, 86400),
  
  // Quran
  getQuranReciters: () => apiFetch('/api/quran/reciters', 86400),
  getQuranSermons: () => apiFetch('/api/quran/sermons', 86400),
  getQuranStories: () => apiFetch('/api/quran/stories', 86400),
}
