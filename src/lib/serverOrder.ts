import { executeFirst } from '@/lib/db'
import { STREAM_SERVERS, StreamServer } from '@/services/streamService'

/**
 * src/lib/serverOrder.ts
 *
 * Single source of truth for the runtime order of the 8 stream servers.
 * The stored order lives in D1 (site_config) and is editable from /admin/player-test.
 * If no valid stored order exists, the code-defined STREAM_SERVERS order is used.
 *
 * NOTE: This module imports from @/lib/db and must only be used in server contexts
 * (API routes). Do NOT import it from client components / bundles.
 */

export const STREAM_ORDER_KEY = 'stream_servers_order'

const ALLOWED_IDS = STREAM_SERVERS.map((s) => s.id)

function isValidOrder(ids: unknown): ids is string[] {
  if (!Array.isArray(ids)) return false
  if (ids.length !== ALLOWED_IDS.length) return false
  if (new Set(ids).size !== ALLOWED_IDS.length) return false
  return ids.every((id) => typeof id === 'string' && ALLOWED_IDS.includes(id))
}

/**
 * Return the ordered server catalog:
 * - reads the stored order from D1 (site_config) when present & valid,
 * - otherwise falls back to the code-defined STREAM_SERVERS order.
 * Never throws: DB errors fall back to the default order.
 */
export async function getOrderedServers(): Promise<StreamServer[]> {
  try {
    const row = await executeFirst<{ value: string }>(
      'SELECT value FROM site_config WHERE key = ?',
      [STREAM_ORDER_KEY],
    )
    if (row?.value) {
      const parsed: unknown = JSON.parse(row.value)
      if (isValidOrder(parsed)) {
        const byId = new Map(STREAM_SERVERS.map((s) => [s.id, s]))
        const ordered = parsed
          .map((id) => byId.get(id))
          .filter((s): s is StreamServer => Boolean(s))
        if (ordered.length === STREAM_SERVERS.length) return ordered
      }
    }
  } catch {
    // DB unreachable / no table / bad value → fall through to default order
  }
  return [...STREAM_SERVERS]
}

export { isValidOrder }