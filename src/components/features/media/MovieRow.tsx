import { memo, useRef } from 'react'
import { ChevronLeft, ChevronRight, Film } from 'lucide-react'
import { MovieCard } from './MovieCard'
import { SectionHeader } from '../../common/SectionHeader'

type Item = {
  id: number
  title?: string
  name?: string
  media_type?: 'movie' | 'tv'
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  overview?: string
  release_date?: string
  first_air_date?: string
}

type Props = {
  title: string
  movies: Item[]
  isSeries?: boolean
  icon?: React.ReactNode
  link?: string
}

export const MovieRow = memo(({ title, movies, isSeries, icon, link }: Props) => {
  const ref = useRef<HTMLDivElement>(null)
  
  const onLeft = () => ref.current?.scrollBy({ left: -window.innerWidth * 0.8, behavior: 'smooth' })
  const onRight = () => ref.current?.scrollBy({ left: window.innerWidth * 0.8, behavior: 'smooth' })

  if (!movies.length) return null

  return (
    <section className="group relative py-4">
      <div className="px-4 lg:px-12">
        <SectionHeader 
          title={title} 
          icon={icon || <Film />} 
          link={link} 
        />
      </div>

      <div className="relative">
        <div
          ref={ref}
          className="scrollbar-hide no-scrollbar flex snap-x snap-mandatory flex-row flex-nowrap gap-3 overflow-x-auto overflow-y-hidden scroll-smooth px-4 lg:px-12 pb-4"
        >
          {movies.map((m, idx) => (
            <div key={`${m.media_type || 'm'}-${m.id}`} className="snap-start w-[120px] xs:w-[130px] sm:w-[140px] md:w-[160px] xl:w-[180px] 2xl:w-[200px] 3xl:w-[220px] shrink-0">
              <MovieCard movie={m as any} index={idx} />
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <button
          aria-label="prev"
          onClick={onLeft}
          className="absolute top-1/2 -translate-y-1/2 left-0 z-40 hidden h-[calc(100%-1.5rem)] w-16 items-center justify-center bg-gradient-to-r from-luxury-obsidian via-luxury-obsidian/80 to-transparent text-white opacity-0 transition-all duration-300 hover:opacity-100 group-hover:flex lg:w-24"
        >
          <div className="rounded-full bg-white/5 p-3 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
            <ChevronLeft size={32} />
          </div>
        </button>
        
        <button
          aria-label="next"
          onClick={onRight}
          className="absolute top-1/2 -translate-y-1/2 right-0 z-40 hidden h-[calc(100%-1.5rem)] w-16 items-center justify-center bg-gradient-to-l from-luxury-obsidian via-luxury-obsidian/80 to-transparent text-white opacity-0 transition-all duration-300 hover:opacity-100 group-hover:flex lg:w-24"
        >
          <div className="rounded-full bg-white/5 p-3 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
            <ChevronRight size={32} />
          </div>
        </button>
      </div>
    </section>
  )
}, (prev, next) => {
  // Only re-render if the movie IDs change
  if (prev.movies.length !== next.movies.length) return false
  if (prev.title !== next.title) return false
  
  // Fast check: compare first and last ID if length is same (heuristic)
  // or compare all IDs if needed for absolute correctness.
  // Using the user's suggestion for a robust check:
  return prev.movies.map(m => m.id).join(',') === next.movies.map(m => m.id).join(',')
})
