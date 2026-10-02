/**
 * ============================================================
 * 4CIMA Player Worker — https://4cima.stream
 * ============================================================
 * المشغّل المستقل على حساب كلاودفلير المخصص، منفصل تمامًا عن
 * صفحات المعلومات 4cima.com. مُعاد هيكلته 2026-09-22 بهوية
 * الموقع الرئيسي الجديدة + نظام إعلانات adsV2-stream.
 *
 * الراوتات (روابط نظيفة):
 *   GET /movies/{slug}                        → مشغّل فيلم
 *   GET /series/{slug}/season/{n}/episode/{y} → مشغّل حلقة
 *   GET /{slug}                               → سلاج مباشر (النوع يُحل من الكتالوج)
 *   GET /watch?type=&id=&season=&episode=     → الراوت القديم الاحتياطي (tmdb id)
 *   GET /                                     → لاند بج
 *   GET /healthz                              → فحص الحياة
 *   GET /robots.txt                           → منع فهرسة المشغّل (قرار اسلام)
 *   GET /ads.txt                              → إعلان البائعين المعتمدين (6022089)
 *
 * المصدر: كتالوج 4cima.com (وليس TMDB — المفتاح العام القديم أُلغي).
 * الأمان: frame-ancestors يسمح بالتأطير من دوميناتنا فقط (باقي رؤوس
 * الأمان الفرعية غير مفروضة بطلب المالك — سكربتات الإعلانات تعمل بحرية).
 * ============================================================
 */

import {
  PLAY_BASE, TMDB_BACKDROP_BASE, TMDB_POSTER_BASE, safeDecode,
  resolveFromSite, resolveAnyFromSite, resolveByIdFromSite, slugifyLatin,
} from './catalogue.js';
import { buildServerSources } from './servers.js';
import { htmlPage, homePage, errorPage } from './render/page.js';
import { ADS_TXT, ROBOTS_TXT } from './ads-config.js';
import { FAVICON_BASE64 } from './favicon.js';

// أيقونة الموقع — نفس بايتات الموقع الرئيسي (بتخدم مرة واحدة عند الإقلاع)
const FAVICON_BYTES = Uint8Array.from(atob(FAVICON_BASE64), (c) => c.charCodeAt(0));

// رؤوس وظيفية فقط (بلا قيود أمنية على السكربتات — بطلب المالك).
const COMMON_HEADERS = {
  'Referrer-Policy': 'no-referrer-when-downgrade',
  'Permissions-Policy': 'fullscreen=*, encrypted-media=*, autoplay=*',
};

const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  // السماح بتأطير صفحاتنا من دوميناتنا فقط (4cima.com يدمج المشغّل في iframe).
  'Content-Security-Policy': "frame-ancestors 'self' https://4cima.com https://www.4cima.com https://*.4cima.stream",
  ...COMMON_HEADERS,
};

// مسارات أحادية يجب ألا تُعامل كسلاج عمل أبدًا.
const RESERVED_PATHS = new Set([
  'api', 'healthz', 'watch', 'movies', 'series', 'admin', 'login',
  'robots.txt', 'ads.txt', 'favicon.ico',
]);

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === '/healthz') return new Response('ok', { status: 200 });

      // robots.txt: منع فهرسة المشغّل بالكامل (قرار اسلام 2026-09-22)
      if (path === '/robots.txt') {
        return new Response(ROBOTS_TXT, {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400', ...COMMON_HEADERS },
        });
      }

      // ads.txt: إعلان البائعين المعتمدين لدومين 4cima.stream
      if (path === '/ads.txt') {
        return new Response(ADS_TXT, {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600', ...COMMON_HEADERS },
        });
      }

      // الأيقونة: نفس أيقونة الموقع الرئيسي مضمنة هنا — تخدم مباشرة.
      if (path === '/favicon.ico') {
        return new Response(FAVICON_BYTES, {
          status: 200,
          headers: {
            'Content-Type': 'image/vnd.microsoft.icon',
            'Cache-Control': 'public, max-age=604800',
            ...COMMON_HEADERS,
          },
        });
      }

      // الراوت القديم الاحتياطي: /watch?type=tv&id=94997&season=3&episode=4
      if (path === '/watch') return await handleWatchFallback(url);

      const mMovie = path.match(/^\/movies\/(.+)$/);
      if (mMovie) return await handlePlayer(url, safeDecode(mMovie[1]), 'movie', 1, 1);

      const mTv = path.match(/^\/series\/(.+?)\/season\/(\d+)(?:\/episode\/(\d+))?$/);
      if (mTv) return await handlePlayer(url, safeDecode(mTv[1]), 'tv', parseInt(mTv[2], 10), mTv[3] ? parseInt(mTv[3], 10) : 1);

      // السلاج المباشر (مثل /oppenheimer) — النوع غير معروف، يُحل من الكتالوج.
      const mBare = path.match(/^\/([A-Za-z0-9_-]+)$/);
      if (mBare && !RESERVED_PATHS.has(mBare[1].toLowerCase())) {
        const slug = safeDecode(mBare[1]);
        try {
          const { mediaType, data } = await resolveAnyFromSite(slug);
          return await handlePlayer(url, data.slug || slug, mediaType, 1, 1, data);
        } catch (e) {
          return errorPage({ slug, mediaType: null, message: e.message });
        }
      }

      if (path === '/' || path === '') {
        return new Response(homePage(), { status: 200, headers: { 'Cache-Control': 'public, max-age=120', ...HTML_HEADERS } });
      }
      return new Response('Not Found', { status: 404, headers: COMMON_HEADERS });
    } catch (err) {
      console.error(err);
      return new Response('Server error', { status: 500, headers: COMMON_HEADERS });
    }
  },
};

// ------------------------------------------------------------------
// معالج الراوت القديم /watch — حل برقم TMDB ثم رسم نفس صفحة المشغّل.
// ------------------------------------------------------------------
async function handleWatchFallback(url) {
  const type = (url.searchParams.get('type') || '').toLowerCase();
  const id = parseInt(url.searchParams.get('id') || '', 10);
  if (type !== 'movie' && type !== 'tv') {
    return new Response('Bad Request — type must be movie or tv', { status: 400, headers: COMMON_HEADERS });
  }
  if (!Number.isFinite(id) || id <= 0) {
    return new Response('Bad Request — missing/invalid id', { status: 400, headers: COMMON_HEADERS });
  }
  const season = parseInt(url.searchParams.get('season') || '1', 10) || 1;
  const episode = parseInt(url.searchParams.get('episode') || '1', 10) || 1;

  let resolved;
  try {
    resolved = await resolveByIdFromSite(id, type);
  } catch (e) {
    return errorPage({ slug: String(id), mediaType: type, message: e.message });
  }

  // السلاج الكنوني من الكتالوج للتنقل داخل الصفحة.
  const slug = resolved.slug || slugifyLatin(resolved.latinTitle, `${type}-${id}`);
  return await handlePlayer(url, slug, type, season, episode, resolved);
}

// ------------------------------------------------------------------
// معالج صفحة المشغّل
// ------------------------------------------------------------------
async function handlePlayer(url, slug, mediaType, season = 1, episode = 1, preResolved = null) {
  if (!slug) return new Response('Bad Request — missing slug', { status: 400, headers: COMMON_HEADERS });

  // اسم العرض (غير سري) يُمرَّر من زر المشاهدة عبر ?who= لترحيب المسجل.
  const who = url.searchParams.get('who') || '';
  // رابط الأفاتار (غير سري) يأتي من كولباك الدخول.
  const avatar = url.searchParams.get('avatar') || '';

  let resolved;
  if (preResolved) {
    resolved = preResolved;
  } else {
    try {
      resolved = await resolveFromSite(slug, mediaType);
    } catch (e) {
      return errorPage({ slug, mediaType, message: e.message });
    }
  }

  const { tmdbId, title, backdrop, poster } = resolved;
  const servers = buildServerSources(mediaType, tmdbId, season, episode);

  // توكن الجسر الموقّع قصير العمر (?pt=…). يُتحقق منه على 4cima.com
  // (الـWorker لا يفحص التواقيع محليًا)؛ عند الفشل تعمل الصفحة عاديًا
  // بدون جسر المفضلة فقط.
  const pt = url.searchParams.get('pt') || '';
  let bridge = null;
  if (pt) {
    try {
      const vRes = await fetch(
        `https://4cima.com/api/player/verify?type=${encodeURIComponent(mediaType)}&id=${encodeURIComponent(tmdbId)}`,
        { headers: { Authorization: `Bearer ${pt}` } },
      );
      if (vRes.ok) bridge = await vRes.json();
    } catch {
      bridge = null;
    }
  }

  let seasonsList = [];
  let epList = [];
  if (mediaType === 'tv') {
    seasonsList = resolved.seasons || [];
    const cnt = (seasonsList.find((s) => s.season_number === season) || {}).episode_count || 0;
    epList = Array.from({ length: cnt }, (_, i) => ({ episode_number: i + 1, name: '' }));
  }

  const backdropUrl = backdrop
    ? `${TMDB_BACKDROP_BASE}${backdrop}`
    : poster ? `${TMDB_POSTER_BASE}${poster}` : '';

  // روابط الرجوع للموقع الرئيسي.
  const backUrl = mediaType === 'movie'
    ? `${PLAY_BASE}/movies/${encodeURIComponent(slug)}`
    : `${PLAY_BASE}/series/${encodeURIComponent(slug)}`;

  // قبول روابط ?ref= العميقة التي تعود إلى 4cima.com فقط.
  let refUrl = url.searchParams.get('ref') || '';
  if (!/^https:\/\/4cima\.com\//i.test(refUrl)) refUrl = backUrl;

  // رابط المشاهدة الحالي الكامل — هدف next للدخول/الخروج.
  const selfUrl = url.toString();
  // نفس الرابط بدون باراميترات الجلسة (who/avatar/pt) — لتحويل الخروج
  // حتى لا تبقى هوية قديمة بعد تسجيل الخروج.
  const cleanSelf = (() => {
    try {
      const u = new URL(selfUrl);
      u.searchParams.delete('who');
      u.searchParams.delete('avatar');
      u.searchParams.delete('pt');
      return u.toString();
    } catch {
      return selfUrl;
    }
  })();

  return new Response(
    htmlPage({
      slug, mediaType, tmdbId, title, titleEn: resolved.latinTitle, season, episode,
      servers, seasons: seasonsList, episodes: epList,
      backdropUrl, refUrl, who, avatar, selfUrl, cleanSelf,
      bridge, pt, posterPath: poster,
      year: resolved.year, runtime: resolved.runtime, rating: resolved.rating, genres: resolved.genres,
    }),
    {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=120', ...HTML_HEADERS },
    }
  );
}
