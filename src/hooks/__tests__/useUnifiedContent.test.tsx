/**
 * 🧪 useUnifiedContent Hook Tests - Infinite Scroll Bug Condition
 * Cinema Online - اونلاين سينما
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 * 
 * هذا الاختبار يتحقق من أن infinite scroll يعمل بشكل صحيح.
 * الإصلاح تم بالفعل في المهمة 5، لذلك هذا الاختبار يجب أن يمر.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUnifiedContent } from '../useUnifiedContent'
import type { ReactNode } from 'react'
import { fc, test } from '@fast-check/vitest'

// Mock fetch globally
global.fetch = vi.fn()

// Helper to create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Mock response generator
const createMockResponse = (page: number, limit: number, total: number) => {
  const items = Array.from({ length: Math.min(limit, total - (page - 1) * limit) }, (_, i) => ({
    id: (page - 1) * limit + i + 1,
    slug: `item-${(page - 1) * limit + i + 1}`,
    title: `Item ${(page - 1) * limit + i + 1}`,
    poster_url: `/poster-${(page - 1) * limit + i + 1}.jpg`,
    media_type: 'movie' as const,
  }))

  return {
    data: items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

describe('useUnifiedContent - Infinite Scroll Bug Condition Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Property 1: Bug Condition - Infinite Scroll Support', () => {
    it('should support infinite scroll with enableInfiniteScroll=true', async () => {
      // Mock API response
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(1, 40, 200),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(2, 40, 200),
        })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          enableInfiniteScroll: true,
        }),
        { wrapper: createWrapper() }
      )

      // Wait for initial data
      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      // Type guard for infinite query
      if (!('pages' in result.current)) {
        throw new Error('Expected infinite query result')
      }

      // Verify infinite query structure
      if (result.current.data && 'pages' in result.current.data) {
        expect(result.current.data.pages).toBeDefined()
        expect(result.current.data.pages.length).toBeGreaterThan(0)
      }
      if ('fetchNextPage' in result.current) {
        expect(result.current.fetchNextPage).toBeDefined()
      }
      if ('hasNextPage' in result.current) {
        expect(result.current.hasNextPage).toBeDefined()
      }

      // Verify first page loaded
      if (result.current.data && 'pages' in result.current.data) {
        const firstPage = result.current.data.pages[0]
        expect(firstPage?.items.length).toBe(40)
        expect(firstPage?.page).toBe(1)
      }
    })

    it('should load multiple pages when fetchNextPage is called', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(1, 40, 200),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(2, 40, 200),
        })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          enableInfiniteScroll: true,
        }),
        { wrapper: createWrapper() }
      )

      // Wait for initial data
      await waitFor(() => {
        expect(result.current.data).toBeDefined()
        if ('pages' in result.current && result.current.data && 'pages' in result.current.data) {
          expect(result.current.data.pages.length).toBe(1)
        }
      })

      // Type guard for infinite query
      if (!('fetchNextPage' in result.current)) {
        throw new Error('Expected infinite query result')
      }

      // Fetch next page
      result.current.fetchNextPage()

      // Wait for second page
      await waitFor(() => {
        if ('pages' in result.current && result.current.data && 'pages' in result.current.data) {
          expect(result.current.data.pages.length).toBe(2)
        }
      })

      // Verify both pages loaded
      if ('pages' in result.current && result.current.data && 'pages' in result.current.data) {
        expect(result.current.data.pages[0]?.items.length).toBe(40)
        expect(result.current.data.pages[1]?.items.length).toBe(40)
      }
    })

    it('should correctly calculate hasNextPage', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(1, 40, 80), // Only 2 pages total
        })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          enableInfiniteScroll: true,
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      // Type guard and check hasNextPage
      if ('hasNextPage' in result.current) {
        expect(result.current.hasNextPage).toBe(true)
      }
    })

    it('should set hasNextPage to false on last page', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(1, 40, 40), // Only 1 page total
        })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          enableInfiniteScroll: true,
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      // Type guard and check hasNextPage
      if ('hasNextPage' in result.current) {
        expect(result.current.hasNextPage).toBe(false)
      }
    })
  })

  describe('Property 2: Expected Behavior - User Can See More Than 40 Items', () => {
    test.prop([
      fc.integer({ min: 100, max: 500 }), // total items (ensure > 40)
      fc.constant(40),  // limit per page (fixed at 40)
    ], { numRuns: 5 })('should allow users to see more than 40 items through infinite scroll', async (total, limit) => {
      const mockFetch = vi.fn()

      // Mock multiple pages
      const totalPages = Math.ceil(total / limit)
      for (let page = 1; page <= Math.min(totalPages, 3); page++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(page, limit, total),
        })
      }

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          limit,
          enableInfiniteScroll: true,
        }),
        { wrapper: createWrapper() }
      )

      // Wait for initial data
      await waitFor(() => {
        if ('pages' in result.current && result.current.data && 'pages' in result.current.data) {
          expect(result.current.data.pages.length).toBeGreaterThan(0)
        }
      }, { timeout: 5000 })

      // Verify we can load more pages
      if ('hasNextPage' in result.current && 'fetchNextPage' in result.current && result.current.hasNextPage) {
        result.current.fetchNextPage()

        await waitFor(() => {
          if ('pages' in result.current && result.current.data && 'pages' in result.current.data) {
            expect(result.current.data.pages.length).toBeGreaterThanOrEqual(2)
          }
        }, { timeout: 5000 })
      }

      // Calculate total items loaded
      let totalItemsLoaded = 0
      if ('pages' in result.current && result.current.data && 'pages' in result.current.data) {
        totalItemsLoaded = result.current.data.pages.reduce(
          (sum: number, page: any) => sum + page.items.length,
          0
        )
      }

      // Verify user can see more than 40 items (after loading 2 pages)
      expect(totalItemsLoaded).toBeGreaterThan(40)
    })
  })

  describe('Property 3: Preservation - Default Behavior', () => {
    it('should use regular query when enableInfiniteScroll=false', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(1, 40, 200),
      })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          enableInfiniteScroll: false,
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      // Should NOT have infinite query structure
      expect('pages' in result.current).toBe(false)
      expect('fetchNextPage' in result.current).toBe(false)
      expect('hasNextPage' in result.current).toBe(false)
    })

    it('should default to enableInfiniteScroll=true', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(1, 40, 200),
      })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          // enableInfiniteScroll not specified - should default to true
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      // Should have infinite query structure (default behavior)
      if ('pages' in result.current && result.current.data && 'pages' in result.current.data) {
        expect(result.current.data.pages).toBeDefined()
      }
      expect('fetchNextPage' in result.current).toBe(true)
    })

    test.prop([
      fc.integer({ min: 1, max: 40 }), // limit <= 40
    ], { numRuns: 5, timeout: 10000 })('should preserve behavior for limit <= 40', async (limit) => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(1, limit, 200),
      })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          limit,
          enableInfiniteScroll: true,
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      }, { timeout: 8000 })

      // Should still work with infinite scroll
      if ('pages' in result.current && result.current.data && 'pages' in result.current.data) {
        expect(result.current.data.pages).toBeDefined()
        expect(result.current.data.pages[0]?.items.length).toBe(limit)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty results', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          total: 0,
          page: 1,
          limit: 40,
          totalPages: 0,
        }),
      })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          enableInfiniteScroll: true,
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      }, { timeout: 5000 })

      if ('pages' in result.current && result.current.data && 'pages' in result.current.data) {
        expect(result.current.data.pages).toBeDefined()
        expect(result.current.data.pages[0]?.items.length).toBe(0)
      }
      if ('hasNextPage' in result.current) {
        expect(result.current.hasNextPage).toBe(false)
      }
    })

    it('should handle API errors gracefully', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(
        new Error('Network error')
      )

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          enableInfiniteScroll: true,
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      }, { timeout: 5000 })

      expect(result.current.error).toBeDefined()
    })
  })
})
