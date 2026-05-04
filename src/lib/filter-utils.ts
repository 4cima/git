import type { ContentType as GenreContentType, ContentFetchParams } from '../types/genre'

export type ContentType = GenreContentType

export interface APIParams {
  contentType: string
  filterType?: string
  genre?: string | null
  category?: string | null
  year?: number | null
  rating?: number | null
  sortBy?: string | null
  page?: number
  limit?: number
  language?: string
}

export const getEndpointForContentType = (contentType: ContentType): string => {
  const endpoints: Record<ContentType, string> = {
    movie: '/api/movies',
    tv: '/api/series',
    anime: '/api/anime',
    play: '/api/plays',
  }
  return endpoints[contentType] || '/api/content'
}

export const buildAPIParams = (params: ContentFetchParams): APIParams => {
  return {
    contentType: params.contentType,
    filterType: params.filterType,
    genre: params.genre,
    category: params.category,
    year: params.year,
    rating: params.rating,
    sortBy: params.sortBy,
    page: params.page || 1,
    limit: params.limit || 20,
  }
}

export const mapFilterToAPIParams = (filter: any, contentType: ContentType): APIParams => {
  return {
    contentType: contentType,
    filterType: filter?.filterType,
    genre: filter?.genre,
    category: filter?.category,
    year: filter?.year,
    rating: filter?.rating,
    sortBy: filter?.sortBy,
    page: filter?.page || 1,
    limit: filter?.limit || 20,
  }
}
