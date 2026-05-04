'use client'

import { SeriesDetailsPage } from '@/components/pages/SeriesDetailsPage'
import { useParams } from 'next/navigation'

export default function SeriesDetails() {
  const params = useParams()
  const slug = params.slug as string
  return <SeriesDetailsPage slug={slug} />
}

