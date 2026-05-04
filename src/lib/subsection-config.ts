import type { ContentType, SubsectionDefinition } from '../types/subsection'

export const getSubsections = (contentType: ContentType): SubsectionDefinition[] => {
  const subsections: Record<ContentType, SubsectionDefinition[]> = {
    movies: [
      { id: 'all', labelEn: 'All', labelAr: 'الكل', path: '/movies', filters: {} },
      { id: 'trending', labelEn: 'Trending', labelAr: 'الأكثر شهرة', path: '/movies/trending', filters: { sortBy: 'trending' } },
      { id: 'top_rated', labelEn: 'Top Rated', labelAr: 'الأعلى تقييماً', path: '/movies/top-rated', filters: { sortBy: 'rating' } },
    ],
    series: [
      { id: 'all', labelEn: 'All', labelAr: 'الكل', path: '/series', filters: {} },
      { id: 'trending', labelEn: 'Trending', labelAr: 'الأكثر شهرة', path: '/series/trending', filters: { sortBy: 'trending' } },
      { id: 'top_rated', labelEn: 'Top Rated', labelAr: 'الأعلى تقييماً', path: '/series/top-rated', filters: { sortBy: 'rating' } },
    ],
    anime: [
      { id: 'all', labelEn: 'All', labelAr: 'الكل', path: '/anime', filters: {} },
      { id: 'trending', labelEn: 'Trending', labelAr: 'الأكثر شهرة', path: '/anime/trending', filters: { sortBy: 'trending' } },
    ],
    gaming: [
      { id: 'all', labelEn: 'All', labelAr: 'الكل', path: '/gaming', filters: {} },
    ],
    software: [
      { id: 'all', labelEn: 'All', labelAr: 'الكل', path: '/software', filters: {} },
    ],
  }
  return subsections[contentType] || []
}
