'use client'

/**
 * src/components/profile/ui.tsx
 * عناصر واجهة صغيرة مشتركة بين تبويبات البروفايل.
 */
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { TmdbImage } from '@/components/common/TmdbImage'

export function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
        <Icon className="h-5 w-5 text-amber-500" />
        {title}
      </h2>
      {action}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
        <Icon className="h-7 w-7 text-amber-500/80" />
      </span>
      <p className="font-bold text-zinc-200">{title}</p>
      {hint && <p className="max-w-sm text-sm text-zinc-500">{hint}</p>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-10 text-center">
      <AlertTriangle className="h-7 w-7 text-red-400" />
      <p className="text-sm text-red-300">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          إعادة المحاولة
        </button>
      )}
    </div>
  )
}

export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] w-full rounded-xl bg-zinc-800/70" />
          <div className="mt-2 h-3.5 w-3/4 rounded bg-zinc-800/70" />
          <div className="mt-1.5 h-3 w-1/3 rounded bg-zinc-800/50" />
        </div>
      ))}
    </div>
  )
}

export function PosterThumb({ path, alt }: { path?: string | null; alt: string }) {
  return (
    <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/5">
      <TmdbImage path={path} size="w154" alt={alt} className="h-full w-full" />
    </div>
  )
}
