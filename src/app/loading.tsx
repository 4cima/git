export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero Skeleton - matches MegaHero dimensions */}
      <div className="pt-16">
        <div className="mx-auto max-w-[2400px]">
          <div 
            className="relative h-[60vh] min-h-[440px] sm:h-[65vh] sm:min-h-[480px] overflow-hidden rounded-2xl border border-white/10 mx-4 sm:mx-6 bg-gray-900"
            style={{ aspectRatio: '16 / 9' }}
          >
            {/* Static gradient placeholder */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/80 to-transparent" />
          </div>
        </div>
      </div>
      
      {/* Content placeholder rows */}
      <div className="max-w-[2400px] mx-auto px-4 sm:px-6 mt-12 space-y-8">
        <div className="h-48 bg-gray-900/50 rounded-xl" />
        <div className="h-48 bg-gray-900/50 rounded-xl" />
      </div>
    </div>
  )
}
