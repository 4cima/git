'use client'

import { Play } from 'lucide-react'
import clsx from 'clsx'

interface WatchButtonProps {
  label: string
  sublabel?: string
  onClick: () => void
  className?: string
}

/**
 * Prominent Call-to-Action "مشاهدة" button (Catalog‑Only site).
 * Opens the pop‑under ad first, then the external player on 4cima.stream
 * (the actual navigation is handled by the `onClick` callback).
 */
export const WatchButton = ({ label, sublabel, onClick, className }: WatchButtonProps) => {
  return (
    <div className={clsx('group relative', className)}>
      {/* Glow behind the button */}
      <div
        aria-hidden="true"
        className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 opacity-60 blur-lg transition-opacity duration-300 group-hover:opacity-100"
      />
      <button
        type="button"
        onClick={onClick}
        className="relative flex w-full items-center justify-center gap-3 sm:gap-4 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 px-6 py-4 text-white shadow-xl transition-transform duration-200 active:scale-95"
      >
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/25 ring-2 ring-white/30">
          <Play className="ml-0.5 h-6 w-6 fill-current" />
        </span>
        <span className="flex flex-col text-right">
          <span className="text-lg leading-tight font-black sm:text-xl">{label}</span>
          {sublabel && <span className="text-xs font-medium leading-tight text-white/85">{sublabel}</span>}
        </span>
      </button>
    </div>
  )
}