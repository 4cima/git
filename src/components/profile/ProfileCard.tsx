'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Play, Star } from 'lucide-react';
import { TmdbImage } from '@/components/common/TmdbImage';
import { contentUrl, displayTitle, normKind } from './utils';
import type { LibraryItem } from './types';

interface ProfileCardProps {
  item: LibraryItem;
  action?: React.ReactNode;
}

/**
 * بطاقة بروفايل خفيفة: بوستر + عنوان + سنة/تقييم — بدون hover-trailer الثقيل.
 * لا تعرض لينك إطلاقاً لو لا يوجد slug نصي (بدل لينك مكسور).
 */
export const ProfileCard = memo(function ProfileCard({ item, action }: ProfileCardProps) {
  const title = displayTitle({
    title_ar: item.title_ar,
    title: item.title,
    title_en: item.title_en,
  });
  const year = typeof item.release_year === 'number' && item.release_year > 1800 ? item.release_year : null;
  const rating = typeof item.vote_average === 'number' && item.vote_average > 0
    ? Math.round(item.vote_average * 10) / 10
    : null;
  const href = contentUrl(item.content_type, item.slug, item.tmdb_id);
  const isTv = normKind(item.content_type) === 'tv';

  const body = (
    <>
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-lumen-muted">
        <TmdbImage path={item.poster_path} size="w185" alt={title} className="h-full w-full" />
        {isTv && (
          <span className="absolute right-2 top-2 rounded-lg bg-black/75 px-2 py-0.5 text-[10px] font-black text-lumen-gold backdrop-blur">
            مسلسل
          </span>
        )}
        {rating != null && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-lg border border-yellow-500/40 bg-black/80 px-2 py-0.5 text-[11px] font-black text-yellow-400 backdrop-blur">
            <Star size={10} fill="currentColor" />
            {rating}
          </span>
        )}
        {href && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition hover:bg-black/35 hover:opacity-100">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-lumen-gold text-black shadow-xl">
              <Play size={20} fill="currentColor" className="-mr-0.5" />
            </span>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <p className="line-clamp-1 text-[13px] font-black leading-tight text-white">{title}</p>
        {year && <p className="text-[11px] font-bold text-lumen-silver">{year}</p>}
        {action && <div className="mt-auto pt-1.5">{action}</div>}
      </div>
    </>
  );

  const shell =
    'flex h-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-lumen-surface transition hover:border-lumen-gold/30';

  if (!href) {
    return <div className={shell} title={title}>{body}</div>;
  }
  return (
    <Link href={href} className={shell} aria-label={title}>
      {body}
    </Link>
  );
});
