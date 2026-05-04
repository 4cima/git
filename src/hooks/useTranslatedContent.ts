import { useQuery } from '@tanstack/react-query'
import { getTranslation, resolveOverviewWithFallback, resolveTitleWithFallback } from '../lib/translation'

export const useTranslatedContent = (items: any[] | undefined) => {
  return useQuery({
    queryKey: ['translated-content', items?.map(i => i.id).join(',')],
    queryFn: async () => {
      if (!items || !items.length) return []
      return Promise.all(items.map(async (item: any) => {
        const mediaType = item?.media_type === 'tv' || (!!item?.name && !item?.title) ? 'tv' : 'movie'
        const shouldFetchTranslation = !resolveTitleWithFallback(item) || !resolveOverviewWithFallback(item)
        const translated = shouldFetchTranslation ? await getTranslation({ ...item, media_type: mediaType }) : null
        const effectiveItem = translated ? { ...item, ...translated } : item
        const resolvedTitle = resolveTitleWithFallback(effectiveItem)
        const resolvedOverview = resolveOverviewWithFallback(effectiveItem)

        return {
          ...effectiveItem,
          title: mediaType === 'movie' ? (resolvedTitle || item?.title || undefined) : (effectiveItem?.title || undefined),
          name: mediaType === 'tv' ? (resolvedTitle || item?.name || undefined) : (effectiveItem?.name || undefined),
          overview: resolvedOverview
        }
      }))
    },
    enabled: !!items && items.length > 0,
    staleTime: 1000 * 60 * 60 // 1 hour
  })
}
