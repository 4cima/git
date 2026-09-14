'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, CalendarDays, LogOut, Mail, Settings, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getAvatarUrl } from '@/utils/avatarUtils';
import { timeAgo } from './utils';

export const ProfileHero = memo(function ProfileHero() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  if (!user) return null;

  const name = profile?.username || user.email?.split('@')[0] || 'مستخدم';
  const avatar = getAvatarUrl(profile?.avatar_url, user.id, user.email);
  const role = profile?.role;
  const joined = user.created_at ? timeAgo(user.created_at) : '';

  const handleSignOut = async () => {
    setLeaving(true);
    try {
      await signOut();
    } finally {
      router.push('/');
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-lumen-surface">
      {/* خلفية سينمائية هادئة */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(600px 220px at 85% -40px, rgba(212,178,110,.16), transparent 60%), radial-gradient(500px 200px at 10% 120%, rgba(212,178,110,.08), transparent 60%)',
        }}
      />
      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
        <div className="relative shrink-0">
          <div className="h-20 w-20 overflow-hidden rounded-2xl border border-lumen-gold/30 sm:h-24 sm:w-24">
            {/* الأفاتار قد يكون data:URL من الرفع — img العادية تدعمه، وnext/image لا يدعم data:URL */}
            <img src={avatar} alt={name} className="h-full w-full object-cover" width={96} height={96} />
          </div>
          {(role === 'admin' || role === 'supervisor') && (
            <span className="absolute -bottom-2 right-1/2 flex translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-lumen-gold px-2.5 py-0.5 text-[10px] font-black text-black">
              <ShieldCheck size={11} />
              {role === 'admin' ? 'إدارة' : 'إشراف'}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-xl font-black text-white sm:text-2xl">
            <span className="truncate">{name}</span>
            <BadgeCheck size={18} className="shrink-0 text-lumen-gold" />
          </h1>
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-lumen-silver">
            <Mail size={13} className="shrink-0" />
            <span className="truncate" dir="ltr">{user.email}</span>
          </p>
          {joined && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-lumen-silver/70">
              <CalendarDays size={13} />
              عضو {joined}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/profile/settings"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black text-white transition hover:border-lumen-gold/40 hover:text-lumen-gold"
          >
            <Settings size={16} />
            الإعدادات
          </Link>
          <button
            onClick={handleSignOut}
            disabled={leaving}
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-black text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            <LogOut size={16} />
            {leaving ? 'جاري الخروج...' : 'خروج'}
          </button>
        </div>
      </div>
      {/* preconnect خفيف لصور TMDB عبر TmdbImage في البطاقات — لا حاجة لصورة مخفية هنا */}
    </section>
  );
});
