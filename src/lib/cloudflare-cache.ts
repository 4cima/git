/**
 * src/lib/cloudflare-cache.ts
 *
 * Purges the whole Cloudflare edge cache for the 4CIMA zone.
 *
 * Credentials: CF_CACHE_PURGE_TOKEN + CF_ZONE_ID (from .env.local / Worker secrets).
 * The token needs the "Cache Purge" permission scoped to that zone only.
 *
 * Consumers:
 *   - POST /api/admin/purge-cache  → manual button in /admin/settings
 *   - scripts/3-sync-to-d1.js      → automatic purge after a successful sync
 *     (the script is CommonJS and runs outside the Next bundler, so it carries an
 *      intentionally mirrored copy of this logic — keep both in sync.)
 */

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

export interface PurgeCacheResult {
  ok: boolean;
  error?: string;
}

/**
 * Purges EVERYTHING in the zone cache (`purge_everything: true`).
 *
 * Never throws — returns { ok: false, error } so callers can log/display the reason
 * without wrapping every call site in try/catch.
 */
export async function purgeCloudflareCache(): Promise<PurgeCacheResult> {
  const token = process.env.CF_CACHE_PURGE_TOKEN;
  const zoneId = process.env.CF_ZONE_ID;

  if (!token || !zoneId) {
    return { ok: false, error: 'missing_credentials' };
  }

  try {
    const res = await fetch(
      `${CF_API_BASE}/zones/${zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purge_everything: true }),
      },
    );

    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `${res.status}: ${txt.slice(0, 200)}` };
    }

    // Cloudflare can answer 200 with { success: false, errors: [...] } — treat as failure.
    const bodyText = await res.text();
    if (bodyText) {
      try {
        const payload = JSON.parse(bodyText) as { success?: boolean; errors?: unknown };
        if (payload.success === false) {
          return {
            ok: false,
            error: `cf_api_error: ${JSON.stringify(payload.errors ?? []).slice(0, 200)}`,
          };
        }
      } catch {
        // Non-JSON 200 body → the purge itself already succeeded.
      }
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}
