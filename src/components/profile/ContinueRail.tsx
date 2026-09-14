'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Clock3, Play, Trash2, Tv } from 'lucide-react';
import { TmdbImage } from '@/components/common/TmdbImage';
import { SkeletonPosterCard } from '@/components/common/Skeletons';
import { displayTitle, formatPosition, timeAgo, watchUrl } from './utils';
import { EmptyState } from './EmptyState';
import type { ResumeItem } from './types';

interface Props {
  items?: ResumeItem[];
  loading: boolean;
  compact?: boolean;
  onRemove: (item: ResumeItem) => void;
  removingId?: string | null;
}

export const ContinueRail = memo(function ContinueRail({ items, loading, compact, onRemove, removingId }: Props) {
  if (loading) {
    return (
      <div className={compact ? 'grid grid-cols-2 gap-3 sm:grid-cols-4' : 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5'}>
        {Array.from({ length: compact ? 4 : 10 }).map((_, i) => (
          <SkeletonPosterCard key={i} />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <EmptyState
        title="لا يوجد ما تكمله الآن"
        hint="ابدأ مشاهدة أي فيلم أو مسلسل وسيظهر هنا لمتابعته لاحقاً."
        actionHref="/movies"
        actionLabel="اكتشف الأفلام"
      />
    );
  }

  const list = compact ? items.slice(0, 8) : items;

  return (
    <div className={compact ? 'grid grid-cols-2 gap-3 sm:grid-cols-4' : 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5'}>
      {list.map((r) => {
        const key = `${r.content_type}-${r.tmdb_id}-${r.season ?? 0}-${r.episode ?? 0}`;
        const title = displayTitle({ title_ar: r.title_ar, title: r.title, title_en: r.title_en });
        const href = watchUrl(r.content_type, r.slug, r.tmdb_id, r.season, r.episode);
        const isTv = String(r.content_type).toLowerCase() !== 'movie';
        const busy = removingId === key;

        const card = (
          <>
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-lumen-muted">
              <TmdbImage path={r.poster_path} size="w185" alt={title} className="h-full w-full" />
              <span className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/85 to-transparent" />
              <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/80 px-2 py-0.5 text-[10px] font-black text-lumen-gold backdrop-blur">
                <Clock3 size={10} />
                {formatPosition(r.progress)}
              </span>
              {isTv && (r.season || r.episode) && (
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-black/75 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur">
                  <Tv size={10} />
                  S{r.season || 1} E{r.episode || 1}
                </span>
              )}
              {href && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition hover:bg-black/35 hover:opacity-100">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-xl">
                    <Play size={20} fill="currentColor" className="-mr-0.5" />
                  </span>
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-0.5 p-2.5">
              <p className="line-clamp-1 text-[13px] font-black text-white">{title}</p>
              {r.updated_at && (
                <p className="text-[11px] text-lumen-silver/70">{timeAgo(r.updated_at)}</p>
              )}
              <div className="mt-auto flex items-center gap-1.5 pt-1.5">
                {href ? (
                  <Link
                    href={href}
                    className="flex-1 rounded-lg bg-red-600 px-2 py-1.5 text-center text-[11px] font-black text-white transition hover:bg-red-500"
                  >
                    متابعة
                  </Link>
                ) : (
                  <span className="flex-1 rounded-lg bg-white/5 px-2 py-1.5 text-center text-[11px] font-black text-lumen-silver/50">
                    قريباً
                  </span>
                )}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(r); }}
                  disabled={busy}
                  aria-label={`إزالة ${title} من أكمل المشاهدة`}
                  title="إزالة"
                  className="rounded-lg border border-white/10 p-1.5 text-lumen-silver transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </>
        );

        return (
          <div
            key={key}
            className={`flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-lumen-surface transition hover:border-lumen-gold/30 ${busy ? 'opacity-50' : ''}`}
          >
            {card}
          </div>
        );
      })}
    </div>
  );
});
