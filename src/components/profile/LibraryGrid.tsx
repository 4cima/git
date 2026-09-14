'use client';

import { memo, useMemo, useState } from 'react';
import { CheckCircle2, Heart, Search, Trash2 } from 'lucide-react';
import { SkeletonGrid } from '@/components/common/Skeletons';
import { ProfileCard } from './ProfileCard';
import { EmptyState } from './EmptyState';
import { displayTitle, normKind } from './utils';
import type { LibraryItem } from './types';

export type LibScope = 'favorites' | 'completed';
export type LibFilter = 'all' | 'movie' | 'tv';
export type LibSort = 'newest' | 'rating' | 'title';

interface Props {
  favorites: LibraryItem[];
  completed: LibraryItem[];
  loadingFav: boolean;
  loadingComp: boolean;
  onRemoveFavorite?: (item: LibraryItem) => void;
  onRemoveCompleted?: (item: LibraryItem) => void;
  busyKey?: string | null;
  /** يثبّت القائمة على نوع واحد ويخفي زر التبديل — يُستخدم عندما يكون القسم نفسه مفضلة أو مكتملة */
  lockedScope?: LibScope;
}

export function filterLibrary(source: LibraryItem[], filter: LibFilter, sort: LibSort, q: string): LibraryItem[] {
  const needle = q.trim();
  const list = source.filter((it) => {
    if (filter !== 'all' && normKind(it.content_type) !== filter) return false;
    if (!needle) return true;
    return displayTitle({ title_ar: it.title_ar, title: it.title, title_en: it.title_en }).includes(needle);
  });
  return [...list].sort((a, b) => {
    if (sort === 'rating') return (b.vote_average || 0) - (a.vote_average || 0);
    if (sort === 'title') {
      const ta = displayTitle({ title_ar: a.title_ar, title: a.title, title_en: a.title_en });
      const tb = displayTitle({ title_ar: b.title_ar, title: b.title, title_en: b.title_en });
      return ta.localeCompare(tb, 'ar');
    }
    return String(b.added_at || '').localeCompare(String(a.added_at || ''));
  });
}


export const LibraryGrid = memo(function LibraryGrid(props: Props) {
  const { favorites, completed, loadingFav, loadingComp, lockedScope } = props;
  const [scopeState, setScope] = useState<LibScope>(lockedScope ?? 'favorites');
  const scope = lockedScope ?? scopeState;
  const [filter, setFilter] = useState<LibFilter>('all');
  const [sort, setSort] = useState<LibSort>('newest');
  const [q, setQ] = useState('');

  const loading = scope === 'favorites' ? loadingFav : loadingComp;
  const source = scope === 'favorites' ? favorites : completed;
  const items = useMemo(() => filterLibrary(source, filter, sort, q), [source, filter, sort, q]);
  const movies = source.filter((i) => normKind(i.content_type) === 'movie').length;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        {!lockedScope && (
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1" role="tablist" aria-label="نوع القائمة">
            <ScopeBtn active={scope === 'favorites'} onClick={() => setScope('favorites')} icon={<Heart size={15} />} label={`المفضلة (${favorites.length})`} />
            <ScopeBtn active={scope === 'completed'} onClick={() => setScope('completed')} icon={<CheckCircle2 size={15} />} label={`المكتملة (${completed.length})`} />
          </div>
        )}
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-lumen-silver/60" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث في مكتبتك..." aria-label="بحث في المكتبة"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-3 pr-10 text-sm text-white placeholder:text-lumen-silver/50 focus:border-lumen-gold/60 focus:outline-none"
          />
        </div>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} label={`الكل (${source.length})`} />
        <FilterBtn active={filter === 'movie'} onClick={() => setFilter('movie')} label={`أفلام (${movies})`} />
        <FilterBtn active={filter === 'tv'} onClick={() => setFilter('tv')} label={`مسلسلات (${source.length - movies})`} />
        <label className="mr-auto flex items-center gap-1.5 text-xs text-lumen-silver">
          ترتيب:
          <select
            value={sort} onChange={(e) => setSort(e.target.value as LibSort)} aria-label="ترتيب المكتبة"
            className="rounded-lg border border-white/10 bg-lumen-surface px-2 py-1.5 text-xs font-black text-white focus:border-lumen-gold/60 focus:outline-none"
          >
            <option value="newest">الأحدث</option>
            <option value="rating">الأعلى تقييماً</option>
            <option value="title">أبجدي</option>
          </select>
        </label>
      </div>
      {loading ? <SkeletonGrid count={12} /> : (
        <LibraryBody scope={scope} items={items} hasQuery={q.trim() !== '' || filter !== 'all'} {...props} />
      )}
    </div>
  );
});

function ScopeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition lg:flex-none ${active ? 'bg-red-600 text-white' : 'text-lumen-silver hover:text-white'}`}>
      {icon}{label}
    </button>
  );
}

function FilterBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-black transition ${active ? 'bg-red-600 text-white' : 'border border-white/10 bg-white/5 text-lumen-silver hover:text-white'}`}>
      {label}
    </button>
  );
}

function LibraryBody({ scope, items, hasQuery, onRemoveFavorite, onRemoveCompleted, busyKey }: Props & { scope: LibScope; items: LibraryItem[]; hasQuery: boolean }) {
  if (items.length === 0) {
    if (hasQuery) return <EmptyState icon="search" title="لا نتائج مطابقة" hint="جرّب كلمة أخرى أو غيّر الفلتر." />;
    if (scope === 'favorites') return <EmptyState title="لا مفضلات بعد" hint="اضغط على القلب في أي بطاقة لإضافتها إلى مفضلتك." actionHref="/movies" actionLabel="اكتشف الأفلام" />;
    return <EmptyState title="لا عناصر مكتملة بعد" hint="علّم ما أنهيته كمكتمل وسيظهر هنا." actionHref="/series" actionLabel="اكتشف المسلسلات" />;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((it) => {
        const key = `${it.content_type}-${it.tmdb_id}`;
        const busy = busyKey === `${scope}:${key}`;
        return (
          <div key={key} className={busy ? 'opacity-50' : ''}>
            <ProfileCard
              item={it}
              action={
                <button
                  onClick={() => (scope === 'favorites' ? onRemoveFavorite?.(it) : onRemoveCompleted?.(it))}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-black text-lumen-silver transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                >
                  <Trash2 size={12} />
                  {scope === 'favorites' ? 'إزالة من المفضلة' : 'إزالة من المكتملة'}
                </button>
              }
            />
          </div>
        );
      })}
    </div>
  );
}
