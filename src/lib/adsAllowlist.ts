/**
 * src/lib/adsAllowlist.ts
 * Known ad-network hosts allowed to serve third-party scripts.
 * script_url must be https AND its host must be in this list (or belong to
 * a Custom provider with a host the admin registered).
 */

export const NETWORK_HOSTS: Record<string, string[]> = {
  propellerads:  ['propellerads.com', 'propellerclick.com', 'propelleradsystem.com', 'al5sm.com', 'www.al5sm.com', 'monetag.com', 'www.monetag.com'],
  adsterra:      ['adsterra.com', 'profitableratecpm.com', 'highperformancecpm.com', 'effectivegatecpm.com'],
  exoclick:      ['exoclick.com', 'exosrv.com', 'exdynsrv.com', 'realsrv.com'],
  popads:        ['popads.net', 'popads.cn'],
  popcash:       ['popcash.net', 'popcashworld.com'],
  hilltopads:    ['hilltopads.net', 'hilltopads.com', 'highrevenuecpm.com'],
  trafficstars:  ['traffic-stars.com', 'trafficjunky.com', 'tsyndicate.com'],
  custom:        [], // admin-registered hosts (added from the admin panel)
};

/** Extra hosts registered by admin for Custom providers (runtime-extensible). */
const extraHosts = new Set<string>();

export function addAllowedHost(host: string) {
  const clean = host.trim().toLowerCase();
  if (clean && !clean.includes('/') && clean.includes('.')) {
    extraHosts.add(clean);
  }
}

export function isHostAllowed(providerSlug: string, scriptUrl: string): boolean {
  try {
    const url = new URL(scriptUrl);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (extraHosts.has(host)) return true;
    const allowed = NETWORK_HOSTS[providerSlug] || [];
    return allowed.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** http/https-only validation for any ad-related URL. */
export function isSafeAdUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
