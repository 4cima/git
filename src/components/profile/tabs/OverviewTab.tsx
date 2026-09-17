'use client'

/**
 * src/components/profile/tabs/OverviewTab.tsx
 * نظرة عامة: إحصائيات (stats) + أكمل المشاهدة (continue-watching) + آخر النشاط (activity).
 * البيانات من /api/profile/stats و /api/continue-watching و /api/profile/activity فقط.
 */
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
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
import { TmdbImage } from '@/components/common/TmdbImage'
import { cn } from '@/lib/utils'
import { fetchActivity, fetchContinueWatching, fetchStats } from '../api'
import { ContinueRail } from '../ContinueRail'
import { useApi } from '../hooks'
import { MediaCard } from '../MediaCard'
import type { ActivityItem } from '../types'
import { displayTitle, mediaHref, safeRating, shortDateAr, timeAgoAr } from '../utils'
import { ErrorState, LoadingGrid, SectionHeader } from '../ui'

/** أقصى عدد نشاطات معروضة — الـAPI يجلب 12 (fetchActivity limit=12) */
const MAX_ACTIVITIES = 12
/** أقل عدد نشاطات لتفعيل العرض بعمودين على الديسكتوب (وإلا عمود واحد) */
const TWO_COLUMN_MIN = 8

/**
 * كارت إحصائية مضغوط — padding متوازن (p-3 / sm:p-3.5)، رقم كبير، وعنوان سطر واحد.
 * h-full + justify-between ⇒ الكارت يملأ ارتفاع الشبكة بلا فراغ كبير تحت المحتوى.
 */
function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  /** تفصيلة صغيرة بجانب الرقم (مثل «متوسط 7.5») */
  hint?: string
}) {
  return (
    <div className="flex h-full flex-col justify-between gap-2 rounded-xl border border-white/5 bg-zinc-900/60 p-3 transition-colors hover:border-amber-500/30 sm:p-3.5">
      <div className="flex items-center gap-1.5 text-zinc-400">
        <Icon className="h-3.5 w-3.5 shrink-0 text-amber-500 sm:h-4 sm:w-4" />
        <span className="truncate text-[11px] font-semibold leading-tight sm:text-xs" title={label}>
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <p className="text-2xl font-black leading-none text-white sm:text-3xl" dir="ltr">
          {value}
        </p>
        {hint && (
          <span className="truncate text-[10px] font-bold text-amber-400/80" title={hint}>
            {hint}
          </span>
        )}
      </div>
    </div>
  )
}

/** وصف كل نوع نشاط: تسمية + أيقونة + ألوان الحلقة — الأنواع الثلاثة التي يعيدها /api/profile/activity */
const ACTIVITY_META: Record<ActivityItem['type'], { label: string; icon: LucideIcon; ring: string; icon_class: string }> = {
  watch: {
    label: 'شاهد',
    icon: PlayCircle,
    ring: 'ring-amber-500/40',
    icon_class: 'text-amber-400',
  },
  favorite: {
    label: 'أضاف للمفضلة',
    icon: Heart,
    ring: 'ring-red-500/40',
    icon_class: 'text-red-400',
  },
  review: {
    label: 'قيّم',
    icon: Star,
    ring: 'ring-sky-500/40',
    icon_class: 'text-sky-400',
  },
}

/** تفاصيل إضافية من حقول الـAPI الموجودة فعلاً (data.*) — لا حقول مخترعة */
function activityDetails(item: ActivityItem): string[] {
  const d = item.data ?? {}
  const out: string[] = []

  // تقييم — user_reviews.rating
  const rating = safeRating(d.rating)
  if (item.type === 'review' && rating !== null) out.push(`★ ${rating.toFixed(1)}`)

  // حلقة/موسم — watch_history.season_number / episode_number
  const season = Number(d.season_number)
  const episode = Number(d.episode_number)
  if (Number.isFinite(season) && Number.isFinite(episode) && season > 0 && episode > 0) {
    out.push(`S${season}·E${episode}`)
  }

  // حالة/مدة المشاهدة — watch_history.completed / watch_duration (ثوانٍ)
  if (item.type === 'watch') {
    if (Number(d.completed) === 1) {
      out.push('أكمل المشاهدة')
    } else {
      const seconds = Number(d.watch_duration)
      if (Number.isFinite(seconds) && seconds > 0) {
        out.push(`${Math.max(1, Math.round(seconds / 60))} دقيقة`)
      }
    }
  }

  return out
}

/**
 * عنصر خط زمني طولي:
 * [يمين] نقطة/أيقونة + الخط الزمني · [وسط] صورة مصغّرة + نوع النشاط + اسم العمل + تفاصيل · [يسار] الوقت والتاريخ
 */
function ActivityRow({ item, isLast }: { item: ActivityItem; isLast: boolean }) {
  const href = mediaHref(item)
  const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.watch
  const Icon = meta.icon
  const title = item.title || displayTitle({ title: item.title })
  const details = activityDetails(item)
  const reviewText =
    item.type === 'review' && typeof item.data?.review_text === 'string'
      ? item.data.review_text.trim()
      : ''

  return (
    <li className="flex gap-2 pb-3 sm:gap-3">
      {/* عمود الخط الزمني — على اليمين في RTL */}
      <div className="relative flex w-9 shrink-0 items-center justify-center">
        {!isLast && (
          <span
            aria-hidden="true"
            className="absolute right-1/2 top-1/2 bottom-[-50%] w-px translate-x-1/2 bg-gradient-to-b from-amber-500/40 via-white/10 to-white/5"
          />
        )}
        <span
          className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 ring-1 ${meta.ring}`}
        >
          <Icon className={`h-4 w-4 ${meta.icon_class}`} />
        </span>
      </div>

      {/* البطاقة — تملأ بقية العرض */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-white/5 bg-zinc-900/50 p-3 transition-colors hover:border-amber-500/25 sm:gap-3.5 sm:p-3.5">
        {/* صورة العمل المصغّرة — poster_path من الـAPI */}
        <div className="h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/5 sm:h-[68px] sm:w-12">
          <TmdbImage
            path={item.poster_path}
            size="w92"
            alt={title}
            className="h-full w-full"
            sizes="48px"
          />
        </div>

        {/* النص — الوسط */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] font-bold text-zinc-400">
              {meta.label}
            </span>
            {href ? (
              <Link
                href={href}
                className="min-w-0 truncate text-sm font-bold text-amber-400 hover:underline sm:text-base"
              >
                {title}
              </Link>
            ) : (
              <span className="min-w-0 truncate text-sm font-bold text-zinc-300 sm:text-base">{title}</span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs">
            <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-semibold text-zinc-400">
              {item.content_type === 'movie' ? 'فيلم' : 'مسلسل'}
            </span>
            {details.map((d) => (
              <span key={d} className="font-semibold text-zinc-400">
                {d}
              </span>
            ))}
            {reviewText && <span className="truncate italic text-zinc-500">«{reviewText}»</span>}
          </div>
        </div>

        {/* الوقت والتاريخ — على اليسار */}
        <div className="shrink-0 text-left">
          <p className="whitespace-nowrap text-[11px] font-bold text-zinc-300 sm:text-xs">
            {timeAgoAr(item.date)}
          </p>
          <p className="whitespace-nowrap text-[10px] text-zinc-500 sm:text-[11px]">
            {shortDateAr(item.date)}
          </p>
        </div>
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
  /* 12 نشاطاً كحد أقصى (نفس limit الـAPI) — الموبايل يعرض العمود الأول فقط (4-6) */
  const activities = (activity.data?.activities ?? []).slice(0, MAX_ACTIVITIES)

  /* عمودان على الديسكتوب عند توفر 8 نشاطات أو أكثر. التقسيم نصفيّ (4-6 لكل عمود)
     ليبقى كل عمود خطاً زمنياً متصلاً بخطّه ونقاطه — لا كسر للـtimeline. */
  const twoColumns = activities.length >= TWO_COLUMN_MIN
  const splitAt = twoColumns ? Math.ceil(activities.length / 2) : activities.length
  const activityColumns = twoColumns
    ? [activities.slice(0, splitAt), activities.slice(splitAt)]
    : [activities]

  return (
    <div className="space-y-8">
      {/* الإحصائيات */}
      <section>
        <SectionHeader icon={BarChart3} title="إحصائياتك" />
        {stats.loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[86px] animate-pulse rounded-xl bg-zinc-800/60" />
            ))}
          </div>
        ) : stats.error ? (
          <ErrorState message={stats.error} onRetry={stats.reload} />
        ) : s ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard icon={Heart} label="في المفضلة" value={s.favoritesCount} />
            <StatCard icon={Clock3} label="ساعات مشاهدة" value={s.totalHours} />
            <StatCard
              icon={Star}
              label="تقييماتك"
              value={s.reviewsCount}
              hint={s.avgRating !== null ? `متوسط ${s.avgRating}` : undefined}
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
          /* ContinueRail: نفس حاوية الصفحة الرئيسية (horizontal-scroll + snap + سحب بالماوس) */
          <ContinueRail label="أكمل المشاهدة">
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
          </ContinueRail>
        )}
      </section>

      {/* آخر النشاط */}
      <section>
        <SectionHeader icon={Layers} title="آخر النشاط" />
        {activity.loading ? (
          <div className="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 pb-3 sm:gap-3">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-zinc-800/60" />
                <div className="h-[88px] flex-1 animate-pulse rounded-2xl bg-zinc-800/60" />
              </div>
            ))}
          </div>
        ) : activity.error ? (
          <ErrorState message={activity.error} onRetry={activity.reload} />
        ) : activities.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 px-6 py-8 text-center text-sm text-zinc-500">
            لا يوجد نشاط بعد.
          </p>
        ) : (
          /* خط زمني طولي: عمود واحد على الموبايل، وعمودان على الديسكتوب (8+ نشاطات).
             كل عمود <ul> مستقل ⇒ الخط والنقاط متصلة داخل كل عمود. */
          <div className={cn('grid', twoColumns ? 'gap-x-3 sm:gap-x-4 lg:grid-cols-2' : 'grid-cols-1')}>
            {activityColumns.map((column, columnIndex) => (
              <ul key={columnIndex} className={cn('min-w-0', columnIndex > 0 && 'hidden lg:block')}>
                {column.map((a, i) => (
                  <ActivityRow
                    key={`${a.type}-${a.tmdb_id}-${a.date}-${i}`}
                    item={a}
                    isLast={i === column.length - 1}
                  />
                ))}
              </ul>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}