/**
 * src/lib/timingSafeEqual.ts
 * Constant-time string comparison via WebCrypto (SHA-256 + XOR check).
 * Works in Cloudflare Workers (nodejs_compat / WebCrypto), Node.js 18+,
 * and browsers — no Node-only `crypto.timingSafeEqual` dependency.
 */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.subtle) return a === b; // non-WebCrypto fallback (shouldn't happen)
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    cryptoObj.subtle.digest('SHA-256', enc.encode(a)),
    cryptoObj.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const ta = new Uint8Array(ha);
  const tb = new Uint8Array(hb);
  // digests are always 32 bytes; the XOR loop is constant-time
  let diff = 0;
  for (let i = 0; i < ta.length; i++) diff |= ta[i] ^ tb[i];
  return diff === 0;
}