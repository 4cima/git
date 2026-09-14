'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Compass, Film, SearchX } from 'lucide-react';

interface EmptyStateProps {
  icon?: 'search' | 'film' | 'compass';
  title: string;
  hint?: string;
  actionHref?: string;
  actionLabel?: string;
}

export const EmptyState = memo(function EmptyState({
  icon = 'film',
  title,
  hint,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  const Icon = icon === 'search' ? SearchX : icon === 'compass' ? Compass : Film;
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-lumen-surface/60 px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
        <Icon size={26} />
      </div>
      <p className="text-base font-black text-white">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-lumen-silver">{hint}</p>}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-red-500"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
});
