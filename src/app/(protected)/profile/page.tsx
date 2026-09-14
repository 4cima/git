/**
 * Profile Page — 5 أقسام حقيقية (?tab=overview|favorites|watch|reviews|settings).
 * كل قسم يقرأ من APIs موجودة مسبقاً فقط، وله حالة فارغة صادقة عند غياب البيانات.
 */

'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Bell, LogOut, Settings as SettingsIcon, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileTabs, SplitBadge, StatCards } from '@/components/profile/ProfileTabs';
import { ContinueRail } from '@/components/profile/ContinueRail';
import { LibraryGrid } from '@/components/profile/LibraryGrid';
import { ActivityTimeline } from '@/components/profile/ActivityTimeline';
import { ReviewsManager } from '@/components/profile/ReviewsManager';
import { EditReviewModal } from '@/components/profile/EditReviewModal';
import { useActivityFeed, useInvalidateProfile, useLibraryList } from '@/components/profile/hooks';
import { useMyReviews, useProfileStats, useResumeList } from '@/components/profile/hooks';
import type { LibraryItem, MyReview, ProfileTab, ResumeItem } from '@/components/profile/types';

const VALID_TABS: ProfileTab[] = ['overview', 'favorites', 'watch', 'reviews', 'settings'];

function getTab(param: string | null): ProfileTab {
  return VALID_TABS.includes(param as ProfileTab) ? (param as ProfileTab) : 'overview';
}

export type FeedFilter = 'all' | 'watch_history' | 'favorites' | 'reviews';

/** بوابات قسم الإعدادات — كل واحدة تفتح قسمها الحقيقي داخل صفحة /profile/settings الموجودة */
const SETTINGS_LINKS: { icon: typeof User; title: string; desc: string; href: string }[] = [
  { icon: User, title: 'الحساب والاسم', desc: 'تعديل اسم العرض وصورة الحساب', href: '/profile/settings?section=profile' },
  { icon: ShieldCheck, title: 'الخصوصية', desc: 'من يرى سجل مشاهدتك ومفضلاتك', href: '/profile/settings?section=privacy' },
  { icon: Bell, title: 'الإشعارات', desc: 'تنبيهات البريد والمحتوى الجديد', href: '/profile/settings?section=notifications' },
];

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <ProfilePageBody />
    </Suspense>
  );
}

function ProfilePageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-3 pb-16 pt-20 sm:px-5" dir="rtl" aria-busy="true" aria-label="جاري تحميل البروفايل">
      <div className="h-32 animate-pulse rounded-3xl border border-white/5 bg-lumen-surface" />
      <div className="mt-4 h-12 animate-pulse rounded-xl bg-white/5" />
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-white/5 bg-lumen-surface" />
        ))}
      </div>
    </div>
  );
}

function ProfilePageBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const invalidate = useInvalidateProfile();

  const activeTab = getTab(searchParams.get('tab'));
  const setTab = useCallback((t: ProfileTab) => {
    router.push(`/profile?tab=${t}`, { scroll: false });
  }, [router]);

  const statsQ = useProfileStats();
  // كل قسم يجلب بياناته فقط عند الحاجة — لا طلبات زائدة على تبويب مغلق
  const showResume = !!user && (activeTab === 'overview' || activeTab === 'watch');
  const showFav = !!user && activeTab === 'favorites';
  const showComp = !!user && activeTab === 'watch';
  const showFeed = !!user && (activeTab === 'overview' || activeTab === 'watch');
  const showReviews = !!user && activeTab === 'reviews';
  const resumeQ = useResumeList(showResume);
  const favQ = useLibraryList('favorites', showFav);
  const compQ = useLibraryList('completed', showComp);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const feedQ = useActivityFeed(feedFilter, showFeed);
  const reviewsQ = useMyReviews(showReviews);

  const [busyLibKey, setBusyLibKey] = useState<string | null>(null);
  const [busyResumeKey, setBusyResumeKey] = useState<string | null>(null);
  const [busyReviewId, setBusyReviewId] = useState<number | null>(null);
  const [editingReview, setEditingReview] = useState<MyReview | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const removeFavorite = useCallback(async (item: LibraryItem) => {
    setBusyLibKey(`favorites:${item.content_type}-${item.tmdb_id}`);
    try {
      const res = await fetch(`/api/user/favorites?tmdb_id=${item.tmdb_id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('x');
      invalidate();
      setNotice('تمت الإزالة من المفضلة');
    } catch {
      setNotice('تعذّرت الإزالة. حاول مجدداً.');
    } finally {
      setBusyLibKey(null);
    }
  }, [invalidate]);

  const removeCompleted = useCallback(async (item: LibraryItem) => {
    setBusyLibKey(`completed:${item.content_type}-${item.tmdb_id}`);
    try {
      const res = await fetch('/api/user/card-action', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_type: item.content_type === 'movie' ? 'movie' : 'tv', tmdb_id: item.tmdb_id }),
      });
      if (!res.ok) throw new Error('x');
      invalidate();
      setNotice('تمت الإزالة من المكتملة');
    } catch {
      setNotice('تعذّرت الإزالة. حاول مجدداً.');
    } finally {
      setBusyLibKey(null);
    }
  }, [invalidate]);

  const removeResume = useCallback(async (item: ResumeItem) => {
    setBusyResumeKey(`${item.content_type}-${item.tmdb_id}`);
    try {
      const params = new URLSearchParams({ tmdb_id: String(item.tmdb_id) });
      if (item.season != null) params.set('season', String(item.season));
      if (item.episode != null) params.set('episode', String(item.episode));
      const res = await fetch(`/api/continue-watching?${params}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('x');
      invalidate();
      setNotice('تمت الإزالة من أكمل المشاهدة');
    } catch {
      setNotice('تعذّرت الإزالة. حاول مجدداً.');
    } finally {
      setBusyResumeKey(null);
    }
  }, [invalidate]);

  const deleteReview = useCallback(async (item: MyReview) => {
    setBusyReviewId(item.tmdb_id);
    try {
      const res = await fetch(`/api/user/reviews?tmdb_id=${item.tmdb_id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('x');
      invalidate();
      setNotice('تم حذف التقييم');
    } catch {
      setNotice('تعذّر حذف التقييم. حاول مجدداً.');
    } finally {
      setBusyReviewId(null);
    }
  }, [invalidate]);

  const stats = statsQ.data;
  const counts = useMemo(() => ({
    watch: stats?.watchEntries ?? resumeQ.data?.length ?? 0,
    favorites: stats?.favoritesCount ?? favQ.data?.length ?? 0,
    reviews: stats?.reviewsCount ?? reviewsQ.data?.length ?? 0,
  }), [stats, resumeQ.data, favQ.data, reviewsQ.data]);

  return (
    <div className="mx-auto w-full max-w-7xl px-3 pb-16 pt-20 sm:px-5" dir="rtl">
      <ProfileHero />
      <div className="mt-4">
        <ProfileTabs active={activeTab} onChange={setTab} counts={counts} />
      </div>
      {notice && (
        <div role="status" className="mt-3 rounded-xl border border-lumen-gold/30 bg-lumen-gold/10 px-4 py-2.5 text-sm font-bold text-lumen-gold">
          {notice}
        </div>
      )}
      {activeTab === 'overview' && (
        <OverviewTab
          statsQ={statsQ} resumeQ={resumeQ} feedQ={feedQ}
          feedFilter={feedFilter} setFeedFilter={setFeedFilter}
          busyResumeKey={busyResumeKey} removeResume={removeResume} setTab={setTab}
        />
      )}
      {activeTab === 'favorites' && (
        <div className="mt-4">
          <LibraryGrid
            favorites={favQ.data || []} completed={[]}
            loadingFav={favQ.isPending} loadingComp={false}
            onRemoveFavorite={removeFavorite} busyKey={busyLibKey}
            lockedScope="favorites"
          />
        </div>
      )}
      {activeTab === 'watch' && (
        <WatchTab
          resumeQ={resumeQ} compQ={compQ} feedQ={feedQ}
          feedFilter={feedFilter} setFeedFilter={setFeedFilter}
          busyResumeKey={busyResumeKey} removeResume={removeResume}
          busyLibKey={busyLibKey} removeCompleted={removeCompleted}
        />
      )}
      {activeTab === 'reviews' && (
        <div className="mt-4">
          <ReviewsManager
            items={reviewsQ.data} loading={reviewsQ.isPending}
            onDelete={deleteReview} onEdit={setEditingReview} busyId={busyReviewId}
          />
        </div>
      )}
      {activeTab === 'settings' && <SettingsTab />}
      <p className="mt-10 text-center text-xs text-lumen-silver/50">
        تريد تعديل اسمك أو صورتك أو خصوصيتك؟{' '}
        <Link href="/profile/settings" className="font-black text-lumen-gold hover:underline">صفحة الإعدادات</Link>
      </p>
      <EditReviewModal review={editingReview} onClose={() => setEditingReview(null)} onSaved={invalidate} />
    </div>
  );
}



function OverviewTab({ statsQ, resumeQ, feedQ, feedFilter, setFeedFilter, busyResumeKey, removeResume, setTab }: {
  statsQ: ReturnType<typeof useProfileStats>;
  resumeQ: ReturnType<typeof useResumeList>;
  feedQ: ReturnType<typeof useActivityFeed>;
  feedFilter: FeedFilter;
  setFeedFilter: (f: FeedFilter) => void;
  busyResumeKey: string | null;
  removeResume: (i: ResumeItem) => void;
  setTab: (t: ProfileTab) => void;
}) {
  return (
    <div className="mt-4 space-y-6">
      <StatCards stats={statsQ.data} loading={statsQ.isPending} onGo={setTab} />
      {statsQ.data && <SplitBadge movies={statsQ.data.moviesCount} series={statsQ.data.seriesCount} />}
      <section aria-label="أكمل المشاهدة">
        <SectionHead title="أكمل المشاهدة" showAll={(resumeQ.data?.length || 0) > 0} onAll={() => setTab('watch')} />
        <ContinueRail items={resumeQ.data} loading={resumeQ.isPending} compact onRemove={removeResume} removingId={busyResumeKey} />
      </section>
      <section aria-label="آخر النشاط">
        <SectionHead title="آخر النشاط" showAll onAll={() => setTab('watch')} allLabel="السجل الكامل" />
        <ActivityTimeline items={feedQ.data?.slice(0, 6)} loading={feedQ.isPending} filter={feedFilter} onFilter={setFeedFilter} />
      </section>
    </div>
  );
}

/** قسم «سجل المشاهدة» — أكمل المشاهدة + تمت مشاهدتها + سجل النشاط (كلها مصادر حقيقية) */
function WatchTab({ resumeQ, compQ, feedQ, feedFilter, setFeedFilter, busyResumeKey, removeResume, busyLibKey, removeCompleted }: {
  resumeQ: ReturnType<typeof useResumeList>;
  compQ: ReturnType<typeof useLibraryList>;
  feedQ: ReturnType<typeof useActivityFeed>;
  feedFilter: FeedFilter;
  setFeedFilter: (f: FeedFilter) => void;
  busyResumeKey: string | null;
  removeResume: (i: ResumeItem) => void;
  busyLibKey: string | null;
  removeCompleted: (i: LibraryItem) => void;
}) {
  return (
    <div className="mt-4 space-y-8">
      <section aria-label="أكمل المشاهدة">
        <h2 className="mb-3 text-lg font-black text-white">أكمل المشاهدة</h2>
        <ContinueRail items={resumeQ.data} loading={resumeQ.isPending} onRemove={removeResume} removingId={busyResumeKey} />
      </section>
      <section aria-label="تمت مشاهدتها">
        <h2 className="mb-3 text-lg font-black text-white">
          تمت مشاهدتها {compQ.data ? <span className="text-sm text-lumen-silver">({compQ.data.length})</span> : null}
        </h2>
        <LibraryGrid
          favorites={[]} completed={compQ.data || []}
          loadingFav={false} loadingComp={compQ.isPending}
          onRemoveCompleted={removeCompleted} busyKey={busyLibKey}
          lockedScope="completed"
        />
      </section>
      <section aria-label="سجل النشاط">
        <h2 className="mb-3 text-lg font-black text-white">سجل النشاط</h2>
        <ActivityTimeline items={feedQ.data} loading={feedQ.isPending} filter={feedFilter} onFilter={setFeedFilter} />
      </section>
    </div>
  );
}

/** قسم «الإعدادات» — ملخص وبوابات لأقسام صفحة الإعدادات الموجودة (بلا تكرار لوظائفها) */
function SettingsTab() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const handleSignOut = async () => {
    setLeaving(true);
    try {
      await signOut();
    } finally {
      router.push('/');
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {SETTINGS_LINKS.map(({ icon: Icon, title, desc, href }) => (
          <Link
            key={title}
            href={href}
            className="group rounded-2xl border border-white/5 bg-lumen-surface p-4 transition hover:border-red-500/30"
          >
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-400 transition group-hover:bg-red-600 group-hover:text-white">
              <Icon size={18} />
            </span>
            <p className="text-sm font-black text-white">{title}</p>
            <p className="mt-1 text-xs text-lumen-silver">{desc}</p>
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-lumen-surface p-4">
        <Link
          href="/profile/settings"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black text-white transition hover:border-red-500/50 hover:text-red-400"
        >
          <SettingsIcon size={16} />
          كل الإعدادات
        </Link>
        <button
          onClick={handleSignOut}
          disabled={leaving}
          className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-black text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
        >
          <LogOut size={16} />
          {leaving ? 'جاري الخروج...' : 'تسجيل الخروج'}
        </button>
        <p className="text-xs text-lumen-silver/60">حذف الحساب نهائياً متاح من صفحة الإعدادات (بتأكيد إضافي).</p>
      </div>
    </div>
  );
}

function SectionHead({ title, showAll, onAll, allLabel }: { title: string; showAll?: boolean; onAll?: () => void; allLabel?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-black text-white">{title}</h2>
      {showAll && onAll && (
        <button onClick={onAll} className="flex items-center gap-1 text-xs font-black text-lumen-gold hover:underline">
          {allLabel || 'عرض الكل'} <ArrowLeft size={13} />
        </button>
      )}
    </div>
  );
}

