'use client';

import { memo } from 'react';
import { CheckCircle2, Clock3, Film, Heart, LayoutGrid, Settings, Star, Tv } from 'lucide-react';
import type { ProfileTab } from './types';
import type { ProfileStats } from './types';
import { formatWatchTime } from './utils';

interface TabsProps {
  active: ProfileTab;
  onChange: (t: ProfileTab) => void;
  counts: { watch: number; favorites: number; reviews: number };
}

const TABS: { id: ProfileTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'نظرة عامة', icon: LayoutGrid },
  { id: 'favorites', label: 'المفضلة', icon: Heart },
  { id: 'watch', label: 'سجل المشاهدة', icon: Clock3 },
  { id: 'reviews', label: 'التقييمات', icon: Star },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
];

export const ProfileTabs = memo(function ProfileTabs({ active, onChange, counts }: TabsProps) {
  const badge = (id: ProfileTab): number | null => {
    if (id === 'favorites') return counts.favorites > 0 ? counts.favorites : null;
    if (id === 'watch') return counts.watch > 0 ? counts.watch : null;
    if (id === 'reviews') return counts.reviews > 0 ? counts.reviews : null;
    return null;
  };
  return (
    <nav
      role="tablist"
      aria-label="أقسام البروفايل"
      className="sticky top-0 z-20 -mx-1 flex gap-1.5 overflow-x-auto bg-[#08080c]/90 px-1 py-3 backdrop-blur"
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const selected = active === id;
        const n = badge(id);
        return (
          <button
            key={id}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-lumen-gold ${
              selected
                ? 'bg-lumen-gold text-black'
                : 'border border-white/10 bg-white/5 text-lumen-silver hover:border-lumen-gold/40 hover:text-white'
            }`}
          >
            <Icon size={15} />
            {label}
            {n != null && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                  selected ? 'bg-white/20 text-white' : 'bg-red-500/15 text-red-400'
                }`}
              >
                {n}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
});

interface StatCardsProps {
  stats?: ProfileStats;
  loading: boolean;
  onGo: (t: ProfileTab) => void;
}

/** 4 كروت فقط — كل رقم حقيقي وقابل للضغط ويودي لمحتواه */
export const StatCards = memo(function StatCards({ stats, loading, onGo }: StatCardsProps) {
  const cards = [
    {
      label: 'ساعات المشاهدة',
      value: stats ? formatWatchTime(stats.totalSeconds) : '—',
      sub: stats ? `${stats.watchEntries} عنصر في السجل` : '',
      icon: Clock3,
      go: 'watch' as ProfileTab,
    },
    {
      label: 'المفضلة',
      value: stats ? String(stats.favoritesCount) : '—',
      sub: stats ? `${stats.moviesCount} أفلام · ${stats.seriesCount} مسلسلات` : '',
      icon: Heart,
      go: 'favorites' as ProfileTab,
    },
    {
      label: 'المكتملة',
      value: stats ? String(stats.completedCount) : '—',
      sub: 'شاهدتها وأنهيتها',
      icon: CheckCircle2,
      go: 'watch' as ProfileTab,
    },
    {
      label: 'تقييماتي',
      value: stats ? String(stats.reviewsCount) : '—',
      sub: stats?.avgRating != null ? `متوسط ${stats.avgRating}/10` : 'قيّم ما شاهدت',
      icon: Star,
      go: 'reviews' as ProfileTab,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ label, value, sub, icon: Icon, go }) => (
        <button
          key={label}
          onClick={() => onGo(go)}
          className="group rounded-2xl border border-white/5 bg-lumen-surface p-4 text-right transition hover:border-red-500/30"
        >
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-400 transition group-hover:bg-red-600 group-hover:text-white">
            <Icon size={18} />
          </div>
          <div className="text-xl font-black text-white">
            {loading ? <span className="inline-block h-6 w-12 animate-pulse rounded bg-white/10" /> : value}
          </div>
          <div className="mt-0.5 text-xs font-black text-lumen-silver">{label}</div>
          {!loading && sub && <div className="mt-1 line-clamp-1 text-[11px] text-lumen-silver/60">{sub}</div>}
        </button>
      ))}
    </div>
  );
});

export function SplitBadge({ movies, series }: { movies: number; series: number }) {
  const total = movies + series;
  if (total <= 0) return null;
  const pct = Math.round((movies / total) * 100);
  return (
    <div className="rounded-2xl border border-white/5 bg-lumen-surface p-4">
      <div className="mb-2 flex items-center justify-between text-xs font-black">
        <span className="flex items-center gap-1.5 text-white">
          <Film size={13} className="text-lumen-gold" /> أفلام {movies}
        </span>
        <span className="flex items-center gap-1.5 text-white">
          مسلسلات {series} <Tv size={13} className="text-lumen-gold" />
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10" dir="ltr">
        <div className="h-full rounded-full bg-lumen-gold" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
