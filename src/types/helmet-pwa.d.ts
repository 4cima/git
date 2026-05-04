declare module 'react-helmet-async' {
  import * as React from 'react'
  export const HelmetProvider: React.ComponentType<{ children?: React.ReactNode }>
  export const Helmet: React.ComponentType<{ children?: React.ReactNode }>
}

declare module 'virtual:pwa-register' {
  export function registerSW(options?: any): () => void
}
