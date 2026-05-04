// Prefetch utility for Next.js
export function prefetchRoute(path: string) {
  // In Next.js, prefetching is handled automatically by Link component
  // This is a compatibility shim for the old React Router code
  if (typeof window !== 'undefined') {
    const router = (window as any).__NEXT_ROUTER__
    if (router?.prefetch) {
      router.prefetch(path)
    }
  }
}
