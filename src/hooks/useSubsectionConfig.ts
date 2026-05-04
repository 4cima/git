/**
 * useSubsectionConfig Hook
 * 
 * Custom hook to get subsection configuration for a specific content type.
 * Uses memoization for performance optimization.
 */

import { useMemo } from 'react'
import { getSubsections } from '../lib/subsection-config'
import type { ContentType, SubsectionDefinition } from '../types/subsection'

/**
 * Hook to get subsection configuration
 * 
 * @param contentType - The content type ('movies' | 'series' | 'gaming' | 'software')
 * @returns Array of subsection definitions for the given content type
 * 
 * @example
 * ```tsx
 * const subsections = useSubsectionConfig('movies')
 * // Returns: [{ id: 'all', labelAr: 'الكل', ... }, ...]
 * ```
 */
export function useSubsectionConfig(
  contentType: ContentType
): SubsectionDefinition[] {
  return useMemo(() => {
    return getSubsections(contentType)
  }, [contentType])
}
