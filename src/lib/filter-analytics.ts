// Filter analytics utility
export function trackFilterChange(contentType: string, filter: string, value: any) {
  // Analytics tracking for filter changes
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'filter_change', {
      content_type: contentType,
      filter_name: filter,
      filter_value: value,
    })
  }
}
