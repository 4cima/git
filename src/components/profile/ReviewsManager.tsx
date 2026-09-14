'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import { Pencil, Star, Trash2 } from 'lucide-react';
import { TmdbImage } from '@/components/common/TmdbImage';
import { SkeletonPosterCard } from '@/components/common/Skeletons';
import { contentUrl, displayTitle, timeAgo } from './utils';
import { EmptyState } from './EmptyState';
import type { MyReview } from './types';

interface Props {
  items?: MyReview[];
  loading: boolean;
  onDelete: (item: MyReview) => void;
  onEdit: (item: MyReview) => void;
  busyId?: number | null;
}

export const ReviewsManager = memo(function ReviewsManager({ items, loading, onDelete, onEdit, busyId }: Props) {
  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonPosterCard key={i} />)}
      </div>
    );
  }
  if (!items || items.length === 0) {
    return (
      <EmptyState
        title="لم تقيّم أي عمل بعد"
        hint="قيّم الأفلام والمسلسلات التي شاهدتها لتظهر هنا."
        actionHref="/movies"
        actionLabel="اكتشف الأفلام"
      />
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((r) => (
        <ReviewCard key={`${r.content_type}-${r.tmdb_id}`} review={r} onDelete={onDelete} onEdit={onEdit} busy={busyId === r.tmdb_id} />
      ))}
    </div>
  );
});

function ReviewCard({ review: r, onDelete, onEdit, busy }: { review: MyReview; onDelete: (r: MyReview) => void; onEdit: (r: MyReview) => void; busy: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const title = displayTitle({ title_ar: r.title_ar, title: r.title, title_en: r.title_en });
  const href = contentUrl(r.content_type, r.slug, r.tmdb_id);
  const text = r.review_text?.trim() || '';
  const long = text.length > 140;

  return (
    <article className={`rounded-2xl border border-white/5 bg-lumen-surface/70 p-3 transition hover:border-lumen-gold/25 ${busy ? 'opacity-50' : ''}`}>
      <div className="flex gap-3">
        <span className="h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-lumen-muted">
          <TmdbImage path={r.poster_path} size="w185" alt={title} className="h-full w-full" />
        </span>
        <div className="min-w-0 flex-1">
          {href ? (
            <Link href={href} className="block truncate text-sm font-black text-white hover:text-lumen-gold">{title}</Link>
          ) : (
            <p className="truncate text-sm font-black text-white">{title}</p>
          )}
          <p className="mt-1 flex items-center gap-1" aria-label={`تقييمك ${r.rating} من 10`}>
            {Array.from({ length: 10 }).map((_, i) => (
              <Star
                key={i}
                size={12}
                className={i < Math.round(r.rating) ? 'text-lumen-gold' : 'text-white/15'}
                fill="currentColor"
              />
            ))}
            <span className="mr-1 text-xs font-black text-lumen-gold">{r.rating}/10</span>
          </p>
          {(r.created_at || r.updated_at) && (
            <p className="mt-1 text-[11px] text-lumen-silver/60">{timeAgo(r.updated_at || r.created_at)}</p>
          )}
        </div>
      </div>
      {text && (
        <p className={`mt-2.5 text-[13px] leading-relaxed text-lumen-silver ${expanded ? '' : 'line-clamp-3'}`}>
          {text}
        </p>
      )}
      <div className="mt-2.5 flex items-center gap-2">
        {long && (
          <button onClick={() => setExpanded((v) => !v)} className="text-[11px] font-black text-lumen-gold hover:underline">
            {expanded ? 'عرض أقل' : 'عرض المزيد'}
          </button>
        )}
        <span className="mr-auto flex items-center gap-1.5">
          <button
            onClick={() => onEdit(r)}
            className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-black text-lumen-silver transition hover:border-lumen-gold/40 hover:text-lumen-gold"
          >
            <Pencil size={11} /> تعديل
          </button>
          <button
            onClick={() => onDelete(r)}
            disabled={busy}
            className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-black text-lumen-silver transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
          >
            <Trash2 size={11} /> حذف
          </button>
        </span>
      </div>
    </article>
  );
}
