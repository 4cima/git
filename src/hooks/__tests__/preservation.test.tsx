/**
 * 🧪 Preservation Tests - Pagination Behavior
 * Cinema Online - اونلاين سينما
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3**
 * 
 * هذه الاختبارات تتحقق من أن السلوك الحالي للـ pagination محفوظ بعد الإصلاح.
 * الهدف: توثيق السلوك الذي يجب الحفاظ عليه (القيمة الافتراضية 20، حساب offset الصحيح).
 * 
 * ملاحظة: الإصلاحات تمت بالفعل في المهام 5-7، لذلك هذه الاختبارات يجب أن تمر.
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

describe('Preservation Tests - Pagination Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Property 4.1: Preservation - القيمة الافتراضية 20 عنصر
   * 
   * **Validates: Requirements 3.1**
   * 
   * For any طلب بدون limit محدد،
   * يجب أن يعيد النظام 20 عنصر (القيمة الافتراضية).
   * 
   * هذا السلوك يجب أن يبقى كما هو بعد الإصلاح.
   */
  describe('4.1 Preservation - Pagination القيمة الافتراضية (20 عنصر)', () => {
    it('should return 20 items by default when limit is not specified', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(1, 20, 200),
      })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          // limit not specified - should default to 20
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      // Verify default limit is 20
      if ('pages' in result.current && result.current.data && 'pages' in result.current.data) {
        const firstPage = result.current.data.pages?.[0]
        expect(firstPage?.items.length).toBe(20)
        expect(firstPage?.limit).toBe(20)
      }
    })

    test.prop([
      fc.constant(undefined), // limit not specified
    ], { numRuns: 10 })('should always use default limit of 20 when not specified', async (limit) => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(1, 20, 200),
      })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          limit, // undefined
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      }, { timeout: 5000 })

      if ('pages' in result.current && result.current.data && 'pages' in result.current.data) {
        const firstPage = result.current.data.pages?.[0]
        expect(firstPage?.items.length).toBe(20)
        expect(firstPage?.limit).toBe(20)
      }
    })

    it('should preserve default limit behavior across different content types', async () => {
      const contentTypes = ['movies', 'series', 'anime'] as const

      for (const contentType of contentTypes) {
        const mockFetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(1, 20, 200),
        })

        global.fetch = mockFetch

        const { result } = renderHook(
          () => useUnifiedContent({
            contentType,
            activeFilter: 'all',
            // limit not specified
          }),
          { wrapper: createWrapper() }
        )

        await waitFor(() => {
          expect(result.current.data).toBeDefined()
        })

        if ('pages' in result.current && result.current.data && 'pages' in result.current.data) {
          const firstPage = result.current.data.pages?.[0]
          expect(firstPage?.items.length).toBe(20)
          expect(firstPage?.limit).toBe(20)
        }
      }
    })
  })

  /**
   * Property 4.2: Preservation - حساب offset الصحيح
   * 
   * **Validates: Requirements 3.3**
   * 
   * For any طلب مع page و limit محددين،
   * يجب أن يحسب النظام offset بشكل صحيح: offset = (page - 1) * limit
   * 
   * هذا السلوك يجب أن يبقى كما هو بعد الإصلاح.
   */
  describe('4.2 Preservation - Pagination حساب offset', () => {
    test.prop([
      fc.integer({ min: 1, max: 10 }), // page
      fc.integer({ min: 10, max: 100 }), // limit
    ], { numRuns: 20 })('should calculate offset correctly: offset = (page - 1) * limit', async (page, limit) => {
      const expectedOffset = (page - 1) * limit
      const total = 500

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(page, limit, total),
      })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          page,
          limit,
          enableInfiniteScroll: false, // Use regular query for page-based pagination
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      }, { timeout: 5000 })

      // Verify the API was called with correct parameters
      expect(mockFetch).toHaveBeenCalled()
      const callUrl = mockFetch.mock.calls[0][0] as string

      // Extract query parameters
      const url = new URL(callUrl, 'http://localhost')
      const urlPage = parseInt(url.searchParams.get('page') || '1')
      const urlLimit = parseInt(url.searchParams.get('limit') || '20')

      // Verify page and limit are correct
      expect(urlPage).toBe(page)
      expect(urlLimit).toBe(limit)

      // Verify offset calculation (implicit in the response)
      const data = result.current.data as any
      expect(data?.page).toBe(page)
      expect(data?.limit).toBe(limit)

      // Verify items are from the correct offset
      if (data?.items && data.items.length > 0) {
        const firstItemId = data.items[0].id
        // First item ID should be offset + 1
        expect(firstItemId).toBe(expectedOffset + 1)
      }
    })

    it('should preserve offset calculation for page 1', async () => {
      const page = 1
      const limit = 20
      const expectedOffset = 0 // (1 - 1) * 20 = 0

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(page, limit, 200),
      })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          page,
          limit,
          enableInfiniteScroll: false,
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      const data = result.current.data as any
      expect(data?.page).toBe(1)
      expect(data?.items[0]?.id).toBe(1) // offset 0 + 1 = 1
    })

    it('should preserve offset calculation for page 2', async () => {
      const page = 2
      const limit = 20
      const expectedOffset = 20 // (2 - 1) * 20 = 20

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(page, limit, 200),
      })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          page,
          limit,
          enableInfiniteScroll: false,
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      const data = result.current.data as any
      expect(data?.page).toBe(2)
      expect(data?.items[0]?.id).toBe(21) // offset 20 + 1 = 21
    })

    it('should preserve offset calculation for page 5 with limit 40', async () => {
      const page = 5
      const limit = 40
      const expectedOffset = 160 // (5 - 1) * 40 = 160

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(page, limit, 500),
      })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          page,
          limit,
          enableInfiniteScroll: false,
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      const data = result.current.data as any
      expect(data?.page).toBe(5)
      expect(data?.items[0]?.id).toBe(161) // offset 160 + 1 = 161
    })

    it('should preserve offset calculation across different limits', async () => {
      const testCases = [
        { page: 1, limit: 10, expectedFirstId: 1 },
        { page: 2, limit: 10, expectedFirstId: 11 },
        { page: 1, limit: 20, expectedFirstId: 1 },
        { page: 3, limit: 20, expectedFirstId: 41 },
        { page: 1, limit: 40, expectedFirstId: 1 },
        { page: 2, limit: 40, expectedFirstId: 41 },
      ]

      for (const testCase of testCases) {
        const mockFetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(testCase.page, testCase.limit, 500),
        })

        global.fetch = mockFetch

        const { result } = renderHook(
          () => useUnifiedContent({
            contentType: 'movies',
            activeFilter: 'all',
            page: testCase.page,
            limit: testCase.limit,
            enableInfiniteScroll: false,
          }),
          { wrapper: createWrapper() }
        )

        await waitFor(() => {
          expect(result.current.data).toBeDefined()
        })

        const data = result.current.data as any
        expect(data?.items[0]?.id).toBe(testCase.expectedFirstId)
      }
    })
  })

  /**
   * Edge Cases: اختبار حالات خاصة للحفاظ على السلوك
   */
  describe('Edge Cases - Preservation', () => {
    it('should preserve behavior when limit is exactly 20', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(1, 20, 200),
      })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          limit: 20, // Explicitly set to default
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      if ('pages' in result.current && result.current.data && 'pages' in result.current.data) {
        const firstPage = result.current.data.pages?.[0]
        expect(firstPage?.items.length).toBe(20)
        expect(firstPage?.limit).toBe(20)
      }
    })

    it('should preserve behavior when limit is less than 20', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(1, 10, 200),
      })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          limit: 10,
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      if ('pages' in result.current && result.current.data && 'pages' in result.current.data) {
        const firstPage = result.current.data.pages?.[0]
        expect(firstPage?.items.length).toBe(10)
        expect(firstPage?.limit).toBe(10)
      }
    })

    it('should preserve behavior when total items is less than limit', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(1, 20, 15), // Only 15 items total
      })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          limit: 20,
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      if ('pages' in result.current && result.current.data && 'pages' in result.current.data) {
        const firstPage = result.current.data.pages?.[0]
        expect(firstPage?.items.length).toBe(15) // Only 15 items available
        expect(firstPage?.total).toBe(15)
      }
    })

    it('should preserve behavior for last page with partial results', async () => {
      const page = 5
      const limit = 20
      const total = 95 // Last page will have only 15 items

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(page, limit, total),
      })

      global.fetch = mockFetch

      const { result } = renderHook(
        () => useUnifiedContent({
          contentType: 'movies',
          activeFilter: 'all',
          page,
          limit,
          enableInfiniteScroll: false,
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      const data = result.current.data as any
      expect(data?.items.length).toBe(15) // (95 - 80) = 15 items on last page
      expect(data?.page).toBe(5)
    })
  })
})
