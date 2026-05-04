'use client'

import { MovieDetailsPage } from '@/components/pages/MovieDetailsPage'
import { useParams } from 'next/navigation'

export default function MovieDetails() {
  const params = useParams()
  const slug = params.slug as string
  return <MovieDetailsPage slug={slug} />
}

