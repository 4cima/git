import { generateContentUrl, generateWatchUrl } from '@/lib/utils';

const isTextSlug = (s: unknown): s is string =>
  typeof s === 'string' && s.trim() !== '' && !/^\d+$/.test(s.trim());

/** هل العنصر مسلسل؟ (نوحد tv/series معاً) */
export const isTvKind = (t: unknown): boolean =>
  String(t || '').toLowerCase() !== 'movie';

export const normKind = (t: unknown): 'movie' | 'tv' =>
  (isTvKind(t) ? 'tv' : 'movie');

/** رابط صفحة التفاصيل — null لو لا يوجد slug نصي (لا نعرض لينك مكسور) */
export function contentUrl(
  contentType: unknown,
  slug?: string | null,
  tmdbId?: number | null
): string | null {
  if (!isTextSlug(slug)) return null;
  try {
    return generateContentUrl({
      slug: String(slug).trim(),
      media_type: normKind(contentType),
      id: tmdbId ?? undefined,
    });
  } catch {
    return null;
  }
}

/** رابط المتابعة/المشاهدة — null لو لا يوجد slug نصي */
export function watchUrl(
  contentType: unknown,
  slug?: string | null,
  tmdbId?: number | null,
  season?: number | null,
  episode?: number | null
): string | null {
  if (!isTextSlug(slug)) return null;
  try {
    return generateWatchUrl(
      { slug: String(slug).trim(), media_type: normKind(contentType), id: tmdbId ?? undefined },
      season ?? undefined,
      episode ?? undefined
    );
  } catch {
    return null;
  }
}

/** عنوان العرض: العربي أولاً ثم الإنجليزي */
export function displayTitle(item: {
  title_ar?: string | null;
  title?: string | null;
  title_en?: string | null;
  name?: string | null;
}): string {
  return (
    item.title_ar?.trim() ||
    item.title?.trim() ||
    item.title_en?.trim() ||
    (item.name?.trim() ?? '') ||
    'بدون عنوان'
  );
}

/** تنسيق المدة الكلية من الثواني: "3 س 20 د" / "45 د" / "—" */
export function formatWatchTime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  if (s <= 0) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h <= 0) return `${m} د`;
  if (m <= 0) return `${h} س`;
  return `${h} س ${m} د`;
}

/** تنسيق آخر موضع مشاهدة (ثواني → دقائق) */
export function formatPosition(seconds?: number | null): string {
  const s = Math.max(0, Math.round(seconds || 0));
  if (s < 60) return `أقل من دقيقة`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m / 60);
  return `${h} س ${m % 60} د`;
}

/** وقت نسبي بالعربية */
export function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  const t = new Date(String(dateStr).replace(' ', 'T')).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'الآن';
  if (min < 60) return `منذ ${min} دقيقة`;
  const h = Math.floor(min / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'أمس';
  if (d < 30) return `منذ ${d} يوم`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `منذ ${mo} شهر`;
  return `منذ ${Math.floor(mo / 12)} سنة`;
}

export { isTextSlug };
