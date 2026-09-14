'use client';

import { memo } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, Heart, Star } from 'lucide-react';
import { TmdbImage } from '@/components/common/TmdbImage';
import { SkeletonPosterCard } from '@/components/common/Skeletons';
import { contentUrl, timeAgo } from './utils';
import { EmptyState } from './EmptyState';
import type { ActivityItem } from './types';

const KIND_META = {
  watch: { icon: Clock3, label: 'مشاهدة', cls: 'bg-sky-500/15 text-sky-400' },
  favorite: { icon: Heart, label: 'مفضلة', cls: 'bg-rose-500/15 text-rose-400' },
  review: { icon: Star, label: 'تقييم', cls: 'bg-lumen-gold/15 text-lumen-gold' },
} as const;

interface Props {
  items?: ActivityItem[];
  loading: boolean;
  filter: string;
  onFilter: (f: 'all' | 'watch_history' | 'favorites' | 'reviews') => void;
}

export const ActivityTimeline = memo(function ActivityTimeline({ items, loading, filter, onFilter }: Props) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        <FeedBtn active={filter === 'all'} onClick={() => onFilter('all')} label="الكل" />
        <FeedBtn active={filter === 'watch_history'} onClick={() => onFilter('watch_history')} label="المشاهدات" />
        <FeedBtn active={filter === 'favorites'} onClick={() => onFilter('favorites')} label="المفضلة" />
        <FeedBtn active={filter === 'reviews'} onClick={() => onFilter('reviews')} label="التقييمات" />
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonPosterCard key={i} />)}
        </div>
      ) : !items || items.length === 0 ? (
        <EmptyState title="لا نشاط بعد" hint="تفاعلك مع الأفلام والمسلسلات سيظهر هنا." actionHref="/movies" actionLabel="ابدأ الاستكشاف" />
      ) : (
        <ol className="space-y-2.5">
          {items.slice(0, 30).map((a, i) => {
            const meta = KIND_META[a.type];
            const Icon = meta.icon;
            const href = contentUrl(a.content_type, a.slug, a.tmdb_id);
            const rating = (a.data as { rating?: number })?.rating;
            const row = (
              <>
                <span className="h-11 w-8 shrink-0 overflow-hidden rounded-lg bg-lumen-muted">
                  <TmdbImage path={a.poster_path} size="w92" alt={a.title || ''} className="h-full w-full" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-white">{a.title || 'بدون عنوان'}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-[11px] text-lumen-silver/70">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-black ${meta.cls}`}>
                      <Icon size={10} />{meta.label}
                    </span>
                    {typeof rating === 'number' && (
                      <span className="inline-flex items-center gap-0.5 font-black text-lumen-gold">
                        <Star size={10} fill="currentColor" />{rating}/10
                      </span>
                    )}
                    <span>{timeAgo(a.date)}</span>
                  </span>
                </span>
                {a.type === 'watch' && (a.data as { completed?: number }).completed ? (
                  <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                ) : null}
              </>
            );
            const cls = 'flex items-center gap-3 rounded-2xl border border-white/5 bg-lumen-surface/70 p-2.5 transition hover:border-lumen-gold/25';
            return (
              <li key={`${a.type}-${a.tmdb_id}-${a.date}-${i}`}>
                {href ? <Link href={href} className={cls}>{row}</Link> : <div className={cls}>{row}</div>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
});

function FeedBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-black transition ${active ? 'bg-red-600 text-white' : 'border border-white/10 bg-white/5 text-lumen-silver hover:text-white'}`}>
      {label}
    </button>
  );
}
