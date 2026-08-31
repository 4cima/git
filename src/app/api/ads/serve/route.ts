/**
 * GET /api/ads/serve?slot=<slot_key>
 * Public read-only mediation endpoint.
 * Waterfall: eligible network zone → house ad (ads table) → null (fail-open).
 * Cache-Control: private, no-store — kill switch (provider paused) is instant.
 */
import { NextResponse } from 'next/server';
import { executeAll, executeFirst } from '@/lib/db';
import { isHostAllowed, isSafeAdUrl } from '@/lib/adsAllowlist';

export const dynamic = 'force-dynamic';

const VALID_SLOTS = new Set([
  'home-after-hero',
  'details-below-player',
  'watch-preroll',
  'watch-midroll',
  'global-popunder',
]);

const HOUSE_FALLBACK: Record<string, { type: string; position?: string }> = {
  'home-after-hero':      { type: 'banner',   position: 'home-after-hero' },
  'details-below-player': { type: 'banner',   position: 'details-below-player' },
  'watch-preroll':        { type: 'preroll' },
  'watch-midroll':        { type: 'midroll' },
  'global-popunder':      { type: 'popunder' },
};

type HouseAd = {
  id: number
  title: string
  type: string
  content: string
  position?: string | null
  click_url?: string | null
  weight?: number | null
  device?: string | null
  start_at?: string | null
  end_at?: string | null
  frequency_cap?: number | null
  frequency_hours?: number | null
}

type AssignmentRow = {
  assignment_id: number;
  priority: number;
  weight: number;
  frequency_cap: number;
  frequency_hours: number;
  device: string;
  start_at: string | null;
  end_at: string | null;
  zone_id: number;
  zone_type: string;
  integration: string;
  script_url: string | null;
  html_snippet: string | null;
  zone_click_url: string | null;
  vast_url: string | null;
  zone_key: string | null;
  width: number | null;
  height: number | null;
  provider_slug: string;
};

function isDeviceMatch(request: Request, device: string): boolean {
  if (!device || device === 'all') return true;
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  const isMobile = /android|iphone|ipad|ipod|mobile|opera mini|iemobile/.test(ua);
  return device === 'mobile' ? isMobile : !isMobile;
}

function isDateMatch(startAt: string | null, endAt: string | null): boolean {
  const now = Date.now();
  if (startAt && new Date(startAt).getTime() > now) return false;
  if (endAt && new Date(endAt).getTime() < now) return false;
  return true;
}

function weightedPick<T extends { weight: number }>(rows: T[]): T | null {
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, r) => sum + Math.max(1, r.weight || 1), 0);
  let roll = Math.random() * total;
  for (const row of rows) {
    roll -= Math.max(1, row.weight || 1);
    if (roll <= 0) return row;
  }
  return rows[rows.length - 1];
}

function emptyResponse(slot: string) {
  return NextResponse.json(
    {
      source: null,
      slot,
      type: null,
      integration: null,
      script_url: null,
      html: null,
      click_url: null,
      vast_url: null,
      zone_id: null,
      ad_id: null,
      provider_slug: null,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slot = (searchParams.get('slot') || '').trim();

  if (!slot || !VALID_SLOTS.has(slot)) {
    return emptyResponse(slot);
  }

  try {
    // ── 1) Network waterfall (active zone + active provider = kill switch) ──
    let rows: AssignmentRow[] = []
    try {
      rows = await executeAll<AssignmentRow>(
        `SELECT a.id AS assignment_id, a.priority, a.weight,
                a.frequency_cap, a.frequency_hours, a.device, a.start_at, a.end_at,
                z.id AS zone_id, z.type AS zone_type, z.integration, z.script_url,
                z.html_snippet, z.click_url AS zone_click_url, z.vast_url,
                z.zone_key, z.width, z.height,
                p.slug AS provider_slug
         FROM ad_slot_assignments a
         JOIN ad_zones z ON z.id = a.zone_id
         JOIN ad_providers p ON p.id = z.provider_id
         WHERE a.slot_key = ? AND a.active = 1 AND z.active = 1 AND p.status = 'active'
         ORDER BY a.priority ASC`,
        [slot],
      )
    } catch (err) {
      // mediation tables not migrated yet (or transient error) → fall through
      // to house fallback quietly. Never a 500.
      console.warn('serve: mediation layer unavailable:', (err as Error).message)
      rows = []
    }

    // Filter by dates + device, group by priority
    const byPriority = new Map<number, AssignmentRow[]>();
    for (const row of rows) {
      if (!isDeviceMatch(request, row.device)) continue;
      if (!isDateMatch(row.start_at, row.end_at)) continue;
      const list = byPriority.get(row.priority) || [];
      list.push(row);
      byPriority.set(row.priority, list);
    }

    // Waterfall: first priority group with a valid zone wins
    for (const [, group] of [...byPriority.entries()].sort((a, b) => a[0] - b[0])) {
      const valid = group.filter((z) => {
        if (z.integration === 'script') {
          return isSafeAdUrl(z.script_url) && isHostAllowed(z.provider_slug, z.script_url || '');
        }
        if (z.integration === 'html') return !!z.html_snippet?.trim();
        if (z.integration === 'click_url') return isSafeAdUrl(z.zone_click_url);
        if (z.integration === 'vast_url') return isSafeAdUrl(z.vast_url);
        return false;
      });
      if (valid.length === 0) continue;

      const chosen = weightedPick(valid);
      if (!chosen) continue;

      return NextResponse.json(
        {
          source: 'network',
          slot,
          type: chosen.zone_type,
          integration: chosen.integration,
          script_url: chosen.integration === 'script' ? chosen.script_url : null,
          html: chosen.integration === 'html' ? chosen.html_snippet : null,
          click_url: chosen.integration === 'click_url' ? chosen.zone_click_url : null,
          vast_url: chosen.integration === 'vast_url' ? chosen.vast_url : null,
          zone_id: chosen.zone_id,
          ad_id: null,
          provider_slug: chosen.provider_slug,
          zone_key: chosen.zone_key || null,
          width: chosen.width,
          height: chosen.height,
          frequency_cap: chosen.frequency_cap,
          frequency_hours: chosen.frequency_hours,
        },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    // ── 2) House ad fallback (existing ads table = house ads) ───────────────
    const house = HOUSE_FALLBACK[slot];
    if (house) {
      try {
        const houseRows = await executeAll<HouseAd>(
          'SELECT * FROM ads WHERE active = 1 AND type = ?',
          [house.type],
        );
        const housePick = houseRows
          .map((ad) => ({ ...ad, weight: Number(ad.weight) || 1 }))
          .filter((ad) => {
            // never serve leftover demo rows
            if (ad.content.includes('example.com') || ad.title.includes('تجريبي')) return false;
            if (house.position && ad.position && String(ad.position) !== house.position) return false;
            if (!isDeviceMatch(request, String(ad.device || 'all'))) return false;
            return isDateMatch(ad.start_at ?? null, ad.end_at ?? null);
          });
        const ad = weightedPick(housePick);
        if (ad) {
          return NextResponse.json(
            {
              source: 'house',
              slot,
              type: ad.type,
              integration: 'html',
              script_url: null,
              html: ad.content || null,
              click_url: ad.click_url || null,
              vast_url: null,
              zone_id: null,
              ad_id: ad.id,
              provider_slug: null,
              zone_key: null,
              width: null,
              height: null,
              frequency_cap: Number.isFinite(Number(ad.frequency_cap)) ? Number(ad.frequency_cap) : 1,
              frequency_hours: Number.isFinite(Number(ad.frequency_hours)) ? Number(ad.frequency_hours) : 24,
            },
            { headers: { 'Cache-Control': 'private, no-store' } },
          );
        }
      } catch (err) {
        // house columns may not exist yet (migration pending) — fail open
        console.warn('serve: house fallback skipped:', (err as Error).message);
      }
    }

    // ── 3) Nothing eligible — no ad, player runs normally ───────────────────
    return emptyResponse(slot);
  } catch (error) {
    console.error('serve: waterfall error:', error);
    return emptyResponse(slot);
  }
}
