/**
 * 🔍 استعلامات المحتوى الموحدة - فور سيما
 * Unified Content Queries
 * 
 * @description استعلامات موحدة 100% بين الموقع والتطبيق
 * @author 4Cima Team
 * @version 2.0.0
 * 
 * ⚠️ CRITICAL: This file uses Turso API endpoints for ALL content queries
 * ⚠️ Supabase is ONLY used for auth and user data (profiles, watchlist, etc.)
 */

import type { Movie, TVSeries } from '../types/database';
import { CONFIG } from '../lib/constants';

const API_BASE = CONFIG.API_BASE || 'https://api.4cima.com';

// ==========================================
// Types
// ==========================================
export interface ContentFilters {
  genres?: string[];
  category?: string;
  minRating?: number;
  minYear?: number;
  maxYear?: number;
  language?: string;
  platform?: string;
  minVoteCount?: number;
  sortBy?: 'popularity' | 'vote_average' | 'release_date' | 'trending';
  [key: string]: unknown;
}

export interface ContentSort {
  field: 'popularity' | 'rating' | 'vote_average' | 'release_date' | 'trending_score' | 'quality_score';
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  _cache?: {
    hit: boolean;
    responseTime: number;
  };
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Deduplicate content array by ID or slug
 * Ensures no duplicate content items in the response
 */
function deduplicateContent<T extends { id?: number; slug?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const deduplicated: T[] = [];

  for (const item of items) {
    // Use ID as primary key, fallback to slug
    const key = item.id ? `id:${item.id}` : item.slug ? `slug:${item.slug}` : null;

    if (key && !seen.has(key)) {
      seen.add(key);
      deduplicated.push(item);
    }
  }

  return deduplicated;
}

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const url = API_BASE ? `${API_BASE}${endpoint}` : endpoint;

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      console.error(`API Error: ${response.statusText}`);
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  } catch (error: any) {
    console.error('Fetch error:', error);
    throw error;
  }
}

function buildQueryString(filters: ContentFilters, pagination: PaginationOptions): string {
  const params = new URLSearchParams();

  if (pagination.page) params.append('page', pagination.page.toString());
  if (pagination.limit) params.append('limit', pagination.limit.toString());

  if (filters.genres && filters.genres.length > 0) {
    params.append('genre', filters.genres[0]);
  }
  if (filters.category) params.append('category', filters.category);

  // Language filtering with support for exclusion (e.g., '!ar' for non-Arabic)
  if (filters.language) {
    params.append('language', filters.language);
  }

  // Platform filtering for gaming and software
  if (filters.platform) {
    params.append('platform', filters.platform);
  }

  if (filters.minYear) params.append('yearFrom', filters.minYear.toString());
  if (filters.maxYear) params.append('yearTo', filters.maxYear.toString());
  if (filters.minRating) params.append('ratingFrom', filters.minRating.toString());
  if (filters.minVoteCount) params.append('minVoteCount', filters.minVoteCount.toString());
  if (filters.sortBy) params.append('sortBy', filters.sortBy);

  // Always request DISTINCT results to prevent duplicates
  params.append('distinct', 'true');

  return params.toString();
}

// ==========================================
// Movies Queries (Turso)
// ==========================================

/**
 * جلب الأفلام مع الفلاتر والترتيب
 * Fetch movies with filters and sorting from Turso
 */
export async function getMovies(
  filters: ContentFilters = {},
  sort: ContentSort = { field: 'popularity', order: 'desc' },
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<Movie>> {
  const queryString = buildQueryString(filters, pagination);
  const endpoint = `/api/movies${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetchAPI(endpoint);
    // Apply deduplication to ensure no duplicate movies
    const deduplicated = deduplicateContent(response.data || []);

    return {
      ...response,
      data: deduplicated,
      pagination: {
        ...response.pagination,
        total: deduplicated.length
      }
    } as PaginatedResponse<Movie>;
  } catch (error: any) {
    console.error('getMovies error:', error);
    return {
      data: [],
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: 0,
        totalPages: 0
      }
    };
  }
}


/**
 * جلب المسلسلات مع الفلاتر والترتيب
 * Fetch TV series with filters and sorting from Turso
 * 
 * CRITICAL: Always uses DISTINCT queries to prevent duplicates
 * CRITICAL: Supports language filtering including exclusion (e.g., '!ar')
 */
export async function getTVSeries(
  filters: ContentFilters = {},
  sort: ContentSort = { field: 'popularity', order: 'desc' },
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<TVSeries>> {
  const queryString = buildQueryString(filters, pagination);
  const endpoint = `/api/tv${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetchAPI(endpoint);
    // Apply deduplication to ensure no duplicate series (especially for Korean content)
    const deduplicated = deduplicateContent(response.data || []);

    return {
      ...response,
      data: deduplicated,
      pagination: {
        ...response.pagination,
        total: deduplicated.length
      }
    } as PaginatedResponse<TVSeries>;
  } catch (error: any) {
    console.error('getTVSeries error:', error);
    return {
      data: [],
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: 0,
        totalPages: 0
      }
    };
  }
}


/**
 * جلب المسرحيات العربية
 * Fetch Arabic plays from Turso
 */
export async function getPlays(
  subCategory?: 'adel-imam' | 'classics' | 'gulf' | 'masrah-masr',
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<Movie>> {
  const filters: ContentFilters = {
    genres: ['play'],
    language: 'ar'
  };

  // Add subcategory-specific filters
  if (subCategory === 'classics') {
    filters.maxYear = 1999;
  }

  return getMovies(filters, { field: 'popularity', order: 'desc' }, pagination);
}

/**
 * جلب الملخصات
 * Fetch summaries from Turso
 */
export async function getSummaries(
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<Movie>> {
  const filters: ContentFilters = {
    genres: ['summary']
  };

  return getMovies(filters, { field: 'release_date', order: 'desc' }, pagination);
}

/**
 * جلب الأفلام الكلاسيكية
 * Fetch classic movies from Turso
 */
export async function getClassics(
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<Movie>> {
  const filters: ContentFilters = {
    maxYear: 1999,
    minVoteCount: 50,
    category: 'classic'
  };

  return getMovies(filters, { field: 'vote_average', order: 'desc' }, pagination);
}

/**
 * جلب المسلسلات الكورية
 * Fetch Korean dramas from Turso
 * CRITICAL: Uses DISTINCT to prevent duplicates
 */
export async function getKDramas(
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<TVSeries>> {
  const filters: ContentFilters = {
    language: 'ko'
  };

  return getTVSeries(filters, { field: 'popularity', order: 'desc' }, pagination);
}

/**
 * جلب المسلسلات التركية
 * Fetch Turkish series from Turso
 */
export async function getTurkishSeries(
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<TVSeries>> {
  const filters: ContentFilters = {
    language: 'tr'
  };

  return getTVSeries(filters, { field: 'popularity', order: 'desc' }, pagination);
}

/**
 * جلب المسلسلات الصينية
 * Fetch Chinese series from Turso
 */
export async function getChineseSeries(
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<TVSeries>> {
  const filters: ContentFilters = {
    language: 'zh'
  };

  return getTVSeries(filters, { field: 'popularity', order: 'desc' }, pagination);
}

/**
 * جلب المسلسلات العربية
 * Fetch Arabic series from Turso
 */
export async function getArabicSeries(
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<TVSeries>> {
  const filters: ContentFilters = {
    language: 'ar'
  };

  return getTVSeries(filters, { field: 'popularity', order: 'desc' }, pagination);
}

/**
 * جلب مسلسلات رمضان
 * Fetch Ramadan series from Turso
 * CRITICAL: Only Arabic series (language='ar')
 */
export async function getRamadanSeries(
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<TVSeries>> {
  const filters: ContentFilters = {
    language: 'ar',
    genres: ['رمضان', 'دراما']
  };

  return getTVSeries(filters, { field: 'popularity', order: 'desc' }, pagination);
}

/**
 * جلب المسلسلات الأجنبية (غير عربية)
 * Fetch foreign (non-Arabic) series from Turso
 */
export async function getForeignSeries(
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<TVSeries>> {
  const filters: ContentFilters = {
    language: '!ar'  // Exclude Arabic
  };

  return getTVSeries(filters, { field: 'popularity', order: 'desc' }, pagination);
}

/**
 * جلب تفاصيل فيلم من Turso
 */
export async function getMovieDetails(slug: string): Promise<Movie | null> {
  try {
    const data = await fetchAPI(`/api/movies/${slug}`);
    return data as Movie;
  } catch (error: any) {
    console.error('getMovieDetails error:', error);
    return null;
  }
}

/**
 * جلب تفاصيل مسلسل من Turso
 */
export async function getTVSeriesDetails(slug: string): Promise<TVSeries | null> {
  try {
    const data = await fetchAPI(`/api/tv/${slug}`);
    return data as TVSeries;
  } catch (error: any) {
    console.error('getTVSeriesDetails error:', error);
    return null;
  }
}

/**
 * البحث في الأفلام والمسلسلات من Turso
 */
export async function searchContent(
  query: string,
  contentType: 'movie' | 'tv' | 'all' = 'all',
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<{
  movies?: Movie[];
  tv?: TVSeries[];
  total: number;
}> {
  try {
    const { page = 1, limit = 20 } = pagination;
    const response = await fetchAPI(
      `/api/search?q=${encodeURIComponent(query)}&type=${contentType}&limit=${limit}`
    );

    // Apply deduplication to search results
    const movies = deduplicateContent(response.movies || []) as Movie[];
    const tv = deduplicateContent(response.tv || []) as TVSeries[];

    return {
      movies,
      tv,
      total: movies.length + tv.length
    };
  } catch (error: any) {
    console.error('searchContent error:', error);
    return {
      movies: [],
      tv: [],
      total: 0
    };
  }
}

/**
 * جلب المحتوى الشائع من Turso
 */
export async function getTrending(
  contentType: 'movie' | 'tv' | 'all' = 'all',
  limit: number = 20
): Promise<{
  movies?: Movie[];
  tvSeries?: TVSeries[];
}> {
  try {
    if (contentType === 'all') {
      const [moviesResponse, tvResponse] = await Promise.all([
        getMovies({}, { field: 'popularity', order: 'desc' }, { page: 1, limit: Math.floor(limit / 2) }),
        getTVSeries({}, { field: 'popularity', order: 'desc' }, { page: 1, limit: Math.floor(limit / 2) })
      ]);

      // Deduplication already applied in getMovies and getTVSeries
      return {
        movies: moviesResponse.data,
        tvSeries: tvResponse.data
      };
    }

    if (contentType === 'movie') {
      const response = await getMovies({}, { field: 'popularity', order: 'desc' }, { page: 1, limit });
      return { movies: response.data };
    }

    const response = await getTVSeries({}, { field: 'popularity', order: 'desc' }, { page: 1, limit });
    return { tvSeries: response.data };
  } catch (error: any) {
    console.error('getTrending error:', error);
    return {};
  }
}

/**
 * جلب الأعلى تقييماً من Turso
 */
export async function getTopRated(
  contentType: 'movie' | 'tv' = 'movie',
  limit: number = 20
): Promise<{
  data: (Movie | TVSeries)[];
}> {
  try {
    if (contentType === 'movie') {
      const response = await getMovies(
        { minRating: 7 },
        { field: 'vote_average', order: 'desc' },
        { page: 1, limit }
      );
      return { data: response.data };
    }

    const response = await getTVSeries(
      { minRating: 7 },
      { field: 'vote_average', order: 'desc' },
      { page: 1, limit }
    );
    return { data: response.data };
  } catch (error: any) {
    console.error('getTopRated error:', error);
    return { data: [] };
  }
}

/**
 * جلب البرامج مع الفلاتر والترتيب
 * Fetch software with filters and sorting from Turso
 */
export async function getSoftware(
  filters: ContentFilters = {},
  sort: ContentSort = { field: 'popularity', order: 'desc' },
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<any>> {
  const queryString = buildQueryString(filters, pagination);
  const endpoint = `/api/software${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetchAPI(endpoint);
    // Apply deduplication to ensure no duplicate software
    const deduplicated = deduplicateContent(response.data || []);

    return {
      ...response,
      data: deduplicated,
      pagination: {
        ...response.pagination,
        total: deduplicated.length
      }
    };
  } catch (error: any) {
    console.error('getSoftware error:', error);
    return {
      data: [],
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: 0,
        totalPages: 0
      }
    };
  }
}

/**
 * جلب برامج Windows
 * Fetch Windows software from Turso
 */
export async function getWindowsSoftware(
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<any>> {
  const filters: ContentFilters = {
    platform: 'windows'
  };

  return getSoftware(filters, { field: 'popularity', order: 'desc' }, pagination);
}

/**
 * جلب برامج Mac
 * Fetch Mac software from Turso
 */
export async function getMacSoftware(
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<any>> {
  const filters: ContentFilters = {
    platform: 'mac'
  };

  return getSoftware(filters, { field: 'popularity', order: 'desc' }, pagination);
}

/**
 * جلب برامج Linux
 * Fetch Linux software from Turso
 */
export async function getLinuxSoftware(
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<any>> {
  const filters: ContentFilters = {
    platform: 'linux'
  };

  return getSoftware(filters, { field: 'popularity', order: 'desc' }, pagination);
}

/**
 * جلب برامج Android
 * Fetch Android software from Turso
 */
export async function getAndroidSoftware(
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<any>> {
  const filters: ContentFilters = {
    platform: 'android'
  };

  return getSoftware(filters, { field: 'popularity', order: 'desc' }, pagination);
}

/**
 * جلب برامج iOS
 * Fetch iOS software from Turso
 */
export async function getIOSSoftware(
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<PaginatedResponse<any>> {
  const filters: ContentFilters = {
    platform: 'ios'
  };

  return getSoftware(filters, { field: 'popularity', order: 'desc' }, pagination);
}

export default {
  getMovies,
  getTVSeries,
  getPlays,
  getSummaries,
  getClassics,
  getKDramas,
  getTurkishSeries,
  getChineseSeries,
  getArabicSeries,
  getRamadanSeries,
  getForeignSeries,
  getSoftware,
  getWindowsSoftware,
  getMacSoftware,
  getLinuxSoftware,
  getAndroidSoftware,
  getIOSSoftware,
  getMovieDetails,
  getTVSeriesDetails,
  searchContent,
  getTrending,
  getTopRated,
};
