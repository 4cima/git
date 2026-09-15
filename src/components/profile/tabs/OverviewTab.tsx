'use client'

/**
 * src/components/profile/tabs/OverviewTab.tsx
 * نظرة عامة: إحصائيات (stats) + أكمل المشاهدة (continue-watching) + آخر النشاط (activity).
 * البيانات من /api/profile/stats و /api/continue-watching و /api/profile/activity فقط.
 */
import Link from 'next/link'
import {
  BarChart3,
  Clock3,
  Film,
  Heart,
  Layers,
  PlayCircle,
  Star,
  Tv,
} from 'lucide-react'
import { fetchActivity, fetchContinueWatching, fetchStats } from '../api'
import { useApi } from '../hooks'
import { MediaCard } from '../MediaCard'
import type { ActivityItem } from '../types'
import { displayTitle, mediaHref, timeAgoAr } from '../utils'
import { ErrorState, LoadingGrid, SectionHeader } from '../ui'

function StatCard({ icon: Icon, label, value }: { icon: typeof Film; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/60 p-4 transition-colors hover:border-amber-500/30">
      <div className="flex items-center gap-2 text-zinc-400">
        <Icon className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-white" dir="ltr">
        {value}
      </p>
    </div>
  )
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const href = mediaHref(item)
  const label =
    item.type === 'watch' ? 'شاهد' : item.type === 'favorite' ? 'أضاف للمفضلة' : 'قيّم'
  const title = item.title || displayTitle({ title: item.title })

  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/50 px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
        {item.type === 'watch' ? (
          <PlayCircle className="h-4 w-4 text-amber-500" />
        ) : item.type === 'favorite' ? (
          <Heart className="h-4 w-4 text-amber-500" />
        ) : (
          <Star className="h-4 w-4 text-amber-500" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-zinc-200">
          {label}{' '}
          {href ? (
            <Link href={href} className="font-bold text-amber-400 hover:underline">
              {title}
            </Link>
          ) : (
            <span className="font-bold text-zinc-300">{title}</span>
          )}
        </p>
        <p className="text-xs text-zinc-500">{timeAgoAr(item.date)}</p>
      </div>
    </li>
  )
}

export function OverviewTab() {
  const stats = useApi(fetchStats)
  const resume = useApi(fetchContinueWatching)
  const activity = useApi(fetchActivity)

  const s = stats.data?.stats ?? null
  const resumeItems = resume.data?.items ?? []
  const activities = (activity.data?.activities ?? []).slice(0, 8)

  return (
    <div className="space-y-8">
      {/* الإحصائيات */}
      <section>
        <SectionHeader icon={BarChart3} title="إحصائياتك" />
        {stats.loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-800/60" />
            ))}
          </div>
        ) : stats.error ? (
          <ErrorState message={stats.error} onRetry={stats.reload} />
        ) : s ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard icon={Heart} label="في المفضلة" value={s.favoritesCount} />
            <StatCard icon={Clock3} label="ساعات مشاهدة" value={s.totalHours} />
            <StatCard
              icon={Star}
              label={`تقييماتك${s.avgRating !== null ? ` (متوسط ${s.avgRating})` : ''}`}
              value={s.reviewsCount}
            />
            <StatCard icon={PlayCircle} label="قيد المشاهدة" value={s.resumeCount} />
            <StatCard icon={Film} label="أفلام" value={s.moviesCount} />
            <StatCard icon={Tv} label="مسلسلات" value={s.seriesCount} />
          </div>
        ) : null}
      </section>

      {/* أكمل المشاهدة */}
      <section>
        <SectionHeader icon={PlayCircle} title="أكمل المشاهدة" />
        {resume.loading ? (
          <LoadingGrid count={3} />
        ) : resume.error ? (
          <ErrorState message={resume.error} onRetry={resume.reload} />
        ) : resumeItems.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 px-6 py-8 text-center text-sm text-zinc-500">
            لا يوجد ما تُكمله حالياً — ابدأ مشاهدة فيلم أو مسلسل وسيظهر هنا.
          </p>
        ) : (
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
            {resumeItems.map((item) => (
              <div key={`${item.tmdb_id}-${item.season ?? 0}-${item.episode ?? 0}`} className="w-36 shrink-0 sm:w-40">
                <MediaCard
                  item={item}
                  subtitle={
                    <>
                      {item.season != null && item.episode != null && (
                        <span dir="ltr" className="text-[11px] text-amber-400/80">
                          S{item.season}·E{item.episode}
                        </span>
                      )}
                      {item.progress != null && Number(item.progress) > 0 && (
                        <span className="text-[11px] text-zinc-500">
                          {Math.max(1, Math.round(Number(item.progress) / 60))} د
                        </span>
                      )}
                    </>
                  }
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* آخر النشاط */}
      <section>
        <SectionHeader icon={Layers} title="آخر النشاط" />
        {activity.loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-800/60" />
            ))}
          </div>
        ) : activity.error ? (
          <ErrorState message={activity.error} onRetry={activity.reload} />
        ) : activities.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 px-6 py-8 text-center text-sm text-zinc-500">
            لا يوجد نشاط بعد.
          </p>
        ) : (
          <ul className="space-y-2">
            {activities.map((a, i) => (
              <ActivityRow key={`${a.type}-${a.tmdb_id}-${i}`} item={a} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}