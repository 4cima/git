import { NextRequest, NextResponse } from 'next/server';
import { executeFirst } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

/**
 * GET /api/profile/stats
 * إحصائيات حقيقية محسوبة من الجداول الفعلية — بدون تخمين.
 * - watch_duration مخزنة بالثواني (VideoPlayer يرسل playedSeconds)
 * - content_type قد يكون movie | tv | series — نوحّد tv/series معاً
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const uid = user.id;

  // عدّادات مباشرة
  const fav = await executeFirst<{ c: number }>(
    `SELECT COUNT(*) AS c FROM favorites WHERE user_id = ?`, [uid]
  );
  const comp = await executeFirst<{ c: number }>(
    `SELECT COUNT(*) AS c FROM completed_watch WHERE user_id = ?`, [uid]
  );
  const rev = await executeFirst<{ c: number; avg: number | null }>(
    `SELECT COUNT(*) AS c, AVG(rating) AS avg FROM user_reviews WHERE user_id = ?`, [uid]
  );
  const watch = await executeFirst<{ entries: number; seconds: number; done: number }>(
    `SELECT COUNT(*) AS entries,
            COALESCE(SUM(watch_duration), 0) AS seconds,
            COALESCE(SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END), 0) AS done
     FROM watch_history WHERE user_id = ?`, [uid]
  );

  // أفلام vs مسلسلات — عناصر مميزة عبر الجداول الثلاثة
  const split = await executeFirst<{ movies: number; series: number }>(
    `SELECT
       COUNT(DISTINCT CASE WHEN norm = 'movie' THEN tmdb_id END) AS movies,
       COUNT(DISTINCT CASE WHEN norm = 'tv' THEN tmdb_id END) AS series
     FROM (
       SELECT tmdb_id,
              CASE WHEN content_type = 'movie' THEN 'movie' ELSE 'tv' END AS norm
       FROM favorites WHERE user_id = ?
       UNION
       SELECT tmdb_id,
              CASE WHEN content_type = 'movie' THEN 'movie' ELSE 'tv' END
       FROM completed_watch WHERE user_id = ?
       UNION
       SELECT tmdb_id,
              CASE WHEN content_type = 'movie' THEN 'movie' ELSE 'tv' END
       FROM watch_history WHERE user_id = ?
     )`, [uid, uid, uid]
  );

  // عناصر غير مكتملة (أكمل المشاهدة)
  const resume = await executeFirst<{ c: number }>(
    `SELECT COUNT(*) AS c FROM watch_history WHERE user_id = ? AND COALESCE(completed, 0) = 0`,
    [uid]
  );

  const totalSeconds = Math.max(0, Math.round(Number(watch?.seconds ?? 0)));
  const stats = {
    favoritesCount: fav?.c ?? 0,
    completedCount: comp?.c ?? 0,
    reviewsCount: rev?.c ?? 0,
    avgRating: rev?.avg != null ? Math.round(Number(rev.avg) * 10) / 10 : null,
    watchEntries: watch?.entries ?? 0,
    completedEntries: watch?.done ?? 0,
    totalSeconds,
    totalMinutes: Math.round(totalSeconds / 60),
    totalHours: Math.round((totalSeconds / 3600) * 10) / 10,
    moviesCount: split?.movies ?? 0,
    seriesCount: split?.series ?? 0,
    resumeCount: resume?.c ?? 0,
    // مفاتيح توافقية للخلف (الصفحة القديمة كانت تقرأ هذه الأسماء)
    favorites: fav?.c ?? 0,
    user_reviews: rev?.c ?? 0,
    watch_history: watch?.entries ?? 0,
    total_watch_duration_minutes: Math.round(totalSeconds / 60),
  };

  return NextResponse.json(
    { ok: true, stats },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

