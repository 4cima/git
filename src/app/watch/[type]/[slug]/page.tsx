import { Metadata } from 'next'
import { WatchPage } from '@/components/pages/WatchPage'

export const runtime = 'edge'

export const metadata: Metadata = {
  title: 'مشاهدة | فور سيما',
  description: 'شاهد المحتوى بجودة عالية',
}

export default async function Watch({ 
  params,
  searchParams 
}: { 
  params: Promise<{ type: string; slug: string }>
  searchParams: Promise<{ season?: string; episode?: string }>
}) {
  const { type, slug } = await params
  const search = await searchParams
  
  return (
    <WatchPage 
      type={type as 'movies' | 'series'}
      slug={slug}
      season={search.season ? Number(search.season) : undefined}
      episode={search.episode ? Number(search.episode) : undefined}
    />
  )
}
