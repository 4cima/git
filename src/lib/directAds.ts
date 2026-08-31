/**
 * Hardcoded Adsterra banner snippets — code-level fallback per slot.
 * Priority: admin mediation (DB) → house ad → these direct snippets → nothing.
 * Mounted directly in the page DOM (no iframe) so the network sees the real
 * origin/referer; mounted only when the serve waterfall returns no creative.
 */
export type DirectAdFallback = {
  html: string
  width: number
  height: number
}

export const DIRECT_AD_FALLBACKS: Record<string, DirectAdFallback> = {
  // 300×250 — home in-feed (mid page)
  'home-in-feed': {
    width: 300,
    height: 250,
    html: `<script type="text/javascript">
  atOptions = {
    'key' : '9a07073ebf48b3d7d98cf315a469e7c2',
    'format' : 'iframe',
    'height' : 250,
    'width' : 300,
    'params' : {}
  };
</script>
<script type="text/javascript" src="https://professionalsusceptible.com/9a07073ebf48b3d7d98cf315a469e7c2/invoke.js"></script>`,
  },
  // 160×600 — desktop side column next to the in-feed unit
  'home-feed-side': {
    width: 160,
    height: 600,
    html: `<script type="text/javascript">
  atOptions = {
    'key' : '538636ef4b7a5d451e5c038b418c921e',
    'format' : 'iframe',
    'height' : 600,
    'width' : 160,
    'params' : {}
  };
</script>
<script type="text/javascript" src="https://professionalsusceptible.com/538636ef4b7a5d451e5c038b418c921e/invoke.js"></script>`,
  },
}