interface SermonCardSkeletonProps {
  viewMode?: 'grid' | 'list'
}

export const SermonCardSkeleton = ({ viewMode = 'grid' }: SermonCardSkeletonProps) => {
  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-4 p-4 bg-amber-950/20 backdrop-blur-md border border-amber-500/10 rounded-2xl animate-pulse">
        <div className="w-12 h-12 bg-amber-500/10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-amber-500/10 rounded w-3/4" />
          <div className="h-3 bg-amber-500/10 rounded w-1/2" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 bg-amber-500/10 rounded w-16" />
          <div className="h-6 bg-amber-500/10 rounded w-16" />
        </div>
      </div>
    )
  }

  return (
    <div className="group relative bg-amber-950/20 backdrop-blur-md border border-amber-500/10 rounded-2xl p-4 hover:border-amber-500/30 transition-all duration-300 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 bg-amber-500/10 rounded-xl" />
        <div className="h-6 bg-amber-500/10 rounded w-16" />
      </div>
      
      <div className="space-y-2 mb-3">
        <div className="h-5 bg-amber-500/10 rounded w-full" />
        <div className="h-4 bg-amber-500/10 rounded w-3/4" />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="h-4 bg-amber-500/10 rounded w-20" />
        <div className="h-4 bg-amber-500/10 rounded w-24" />
      </div>
    </div>
  )
}
