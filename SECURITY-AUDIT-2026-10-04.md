# Security Audit — 4cima (2026-10-04)

Method: audit prompt (5 gaps of AI-built web apps) applied to this repo only, evidence = file:line from the working tree at commit `66f8c0e`. One live probe was run (POST /api/revalidate with a non-existent tag — stateless, no visible effect). No code changed in this pass.

---

## STEP 1 — What I found (what the project actually is)

| Question | Answer (evidence) |
|---|---|
| Language / framework / version | TypeScript, Next.js 15 App Router (`^15.1.6`), React 19 — `package.json:43-44`. Tailwind 4, zustand, @tanstack/react-query. |
| Trusted side | YES — ~63 API routes under `src/app/api/**/route.ts`, plus `src/middleware.ts`, plus a Worker entry wrapper `src/edge-cache-worker.ts` (`wrangler.jsonc:5`). Separate worker: `player-worker/` (4cima.stream, different Cloudflare account). |
| Where data lives | Cloudflare D1 (SQLite) via binding `DB` (`wrangler.jsonc:36-42`). KV `NEXT_INC_CACHE_KV` (ISR writes dead on free plan — bypassed by Cache API layer). `src/lib/supabase.ts:1-7` is a deprecated stub returning `null` — Supabase not present. Browser storage: localStorage prefs only. |
| How a user is identified | Google OAuth (id_token verified against Google JWKS via jose — `auth-server.ts:90-99`) → opaque session UUID stored in D1 `sessions` table, cookie `4cima_session`, 30 days (`auth-server.ts:11-12,134-146`). Role = `admin` if email in `ADMIN_EMAILS` else `user` (`auth-server.ts:111`). Admin panel also accepts Basic auth from env (`middleware.ts:210-226`, `requireAdmin.ts:16-30`). No passwords anywhere (no login/reset/OTP surface). |
| Deploy & env source | `git push` → GitHub Actions `.github/workflows/deploy.yml` → build + `verify-build-secrets.js` + wrangler deploy + `purge_everything`. Locally `.env.local` (gitignored); production = Cloudflare Worker secrets (set via dashboard/`wrangler secret put`; `setup-secrets.js` syncs `GOOGLE_CLIENT_SECRET` + `CLOUDFLARE_D1_TOKEN`). Build-time inlining guarded by `scripts/verify-build-secrets.js:35-53` (FORBIDDEN_KEYS fail the build if a secret value lands in `.open-next/cloudflare/next-env.mjs`). |

---

## STEP 2 — The five items

### 1. SECRETS — verdict: FINE (2 notes)

- No credential values in any tracked file: `git grep` for key shapes (`sk-or-v1-`, `gsk_`, `xai-`, `cfut_`, `AIza…`, `GOCSPX-`, `sk-…32`) matches only the checker scripts that define the patterns.
- No env/secret file ever committed in history: `git log --all --diff-filter=A -- .env .env.local .dev.vars 4cima-oauth.txt migrate-secrets.ps1` → empty. `.gitignore` covers `.env`, `.env.local`, `.dev.vars`, `4cima-oauth.txt`, `migrate-secrets.ps1`.
- What the browser downloads: only `NEXT_PUBLIC_*` names get inlined by Next. Every `NEXT_PUBLIC_*` actually read in `src/` is a URL or build-sha (`WORKER_URL`, `API_URL`, `PLAYER_URL`, `BASE_URL`, `BUILD_SHA`). The suspicious names `NEXT_PUBLIC_TMDB_API_KEY` / `NEXT_PUBLIC_SUPABASE_*` / `NEXT_PUBLIC_YOUTUBE_API_KEY` exist only in dead config `src/lib/constants.ts:12-15` (Supabase stub = null; zero consumers of `TMDB_API_KEY` outside constants.ts — grep clean). The real TMDB key is server-side for ingestion scripts only; site images go through the keyless proxy `/img/ → image.tmdb.org` (`next.config.ts:331-338`).
- Build leak guard: `verify-build-secrets.js` scans the OpenNext output for 18 secret names + 7 value shapes and exits 1 (deploy.yml runs it at build).
- Live check: `POST /api/revalidate` returns 401 both with a wrong secret and with no secret field → `REVALIDATE_SECRET` is set in production.
- **Note (weak)**: `src/app/api/revalidate/route.ts:11` uses `process.env.REVALIDATE_SECRET ?? ''` — if that secret were ever deleted from the Worker, `safeEqual('','')` passes and the endpoint becomes an unauthenticated tag-purger (cache-stomping DoS). Fail-open by design; currently moot but should be fail-closed.
- **Note (info)**: `src/lib/db.ts:21-22` hardcodes account/database IDs as fallbacks. Identifiers, not secrets (unusable without an API token). Acceptable.

### 2. VALUES THE CLIENT SENDS — verdict: FINE (2 weak spots)

- Every user-data endpoint derives identity from the session, never from the body: favorites (`user/favorites:64→108`), reviews (`user/reviews:13,49,71`), watch-progress (`user/watch-progress:64,99`), card-action (`user/card-action:13`), completed (`user/completed:6`), continue-watching (`continue-watching:10-11`), all `profile/*` (getCurrentUser first line each).
- Admin writes re-check on the server: role whitelist `ROLES` + "can't demote last admin" (`admin/users:13,44-56`), server order validated against exactly 8 known ids (`admin/server-order:22-27`), movie/series patch columns whitelisted `PATCHABLE_MOVIE_COLS` (`admin/movies:84-86`), ads provider updates built from fixed `SET` strings (`admin/ads/providers:86-89`), settings drive real middleware behavior.
- Avatar input locked to JPG/PNG/WebP, SVG explicitly rejected, 1MB cap (`profile/upload-avatar:5,10,24-30`; `profile/update:20-24`).
- **Weak**: `/api/ads/[id]/click` + `/api/ads/[id]/impression` have **no guard** → CORRECTED during fix pass: both handlers are **DISABLED stubs** — they return an empty 200 and perform **no D1 write at all** (`api/ads/[id]/click/route.ts:3-12`, same for impression). No write-quota risk, no stats to forge. Downgraded to informational.
- **Weak**: `/api/player/card-action` performs favorite/completed writes with no per-user rate limit (token-gated: uid comes from HMAC-signed payload — `player-bridge.ts:76-91` — but a logged-in user holding a token can spam writes; D1 writes count against quota).
- Cosmetic only: `title`/`poster_path` accepted from client body in favorites/card-action — display strings, rendered via React (auto-escaped; no `dangerouslySetInnerHTML` on user content anywhere — all JSON-LD goes through `safeJsonLd`).

### 3. WHO MAY MAKE THE REQUEST — verdict: FINE

- Choke point: `middleware.ts:179-239` guards `/admin` + `/api/admin` (Basic auth OR admin/supervisor session → else 401/redirect), and each of the 13 admin APIs independently calls `requireAdmin()` (scan: 13/13; `admin/server-order:9-12` does the equivalent inline role check). Defense in depth — two layers, both live.
- All user-data endpoints require a session (401 otherwise) — full scan list available in audit session.
- Public catalog endpoints (`/api/movies|series|genres|tv|home-sections|listing/arabic`, `[slug]` reads) are public catalog reads by design: parameterized, page-capped (≤100 — `api/movies:14-16`), and edge-cached.
- Edge cache deny-list matches the security boundary: `/admin`, `/api/admin`, `/api/ads`, `/api/continue-watching`, `/search`, `/profile` never cached; nothing with `set-cookie` is cached; HTML/JSON content-type enforced (`edge-cache-worker.ts:21-23,144,165-177`).
- No endpoint accepts a user id from the request to decide whose data to return (verified per-route, item 2).
- Note: `/api/revalidate` sits outside the admin choke point but is secret-gated (live-verified 401).
- No user id from request anywhere; no route relying on hidden UI only.

### 4. WHAT THE DATA LAYER ENFORCES — verdict: FINE (by design)

- D1 (SQLite) has no per-row/per-document rule concept — all safety lives in application code. That is acceptable here **only because the browser has no path to the store**: no DB URL/token ships in the bundle. `db.ts` is imported exclusively by server code (grep of `src/components|contexts|hooks` = zero hits); production uses the Worker binding (`db.ts:50-59`); the D1 HTTP fallback reads `CLOUDFLARE_D1_TOKEN` server-side only (`db.ts:80`).
- Every user-scoped query filters by the session-derived uid (`WHERE user_id = ?` with `user.id` from `getCurrentUser` — favorites/reviews/watch_history/completed_watch).
- No SQL injection: all user input goes through parameterized `?`; dynamic SET clauses come from whitelists (`admin/movies:84-95`, `admin/server-order:22-27`); the one interpolated table name `${table}` comes from a fixed ternary (`user/slugs:27`).
- Rate events / per-user limits are also app-enforced (D1 can't do otherwise) — consistent with above.

### 5. WHAT STOPS REPETITION — verdict: MIXED (weakest area)

Code-enforced limits (`src/lib/rateLimit.ts` — in-memory fixed window per Worker instance, key = hash(ip+UA)):

| Endpoint | Limit | Evidence |
|---|---|---|
| `/api/search` | 30/min **central** CF Rate Limiting binding + local 30/min fallback | `wrangler.jsonc:45-51`, `api/search:23-35` |
| `/api/suggestions` | 5/min/IP | `api/suggestions:44` |
| `/api/plays` | 30/min | `api/plays:8` |
| `/api/user/*` (bulk) | 30/min + ≤100 items cap on slugs | `api/user/slugs:9,16-18` |
| favorites/watch writes | extra per-user 1/min in D1 `rate_events` | `user/favorites:25-56` |
| `/api/ads/serve` | 240/min per slot | `api/ads/serve:130` |

**No limit at all (gaps):**
1. **`/img/` image proxy** (`next.config.ts:331-338`) — unauthenticated, every request = 1 Worker invocation + TMDB fetch, not edge-cached by our layer. Free Workers plan = 100k req/day shared with the whole site → a scraper can exhaust the daily quota and take 4cima.com down. Biggest repetition risk. Fix belongs in `middleware.ts` (existing `guard()`) or a CF WAF rule (dashboard).
2. **`/api/ads/[id]/click` + `/impression`** — unauthenticated D1 writes (write quota 100k/day on free plan) + forgeable stats.
3. **`/api/auth/google` + `/api/auth/callback`** — no rate limit (D1 reads; account creation gated by `registration_open` only). Google rate-limits its own token endpoint; state cookie blocks blind forgery. Low.
4. **`/api/player/token`** (session-gated D1 read), **`/api/player/verify` + `card-action`** (token-gated; card-action = writes) — no limits.
- Login brute-force / password reset / OTP: **N/A** — no password auth exists (Google only).
- What someone could run up in an hour today: Workers request quota via `/img/`, D1 write quota via ad click/impression spam, D1 reads via auth-callback hammering. Mitigation already in place for pages: 30-day edge cache absorbs catalog scraping (`edge-cache-worker.ts`).
- Note: the in-memory limiter is per-isolate (resets on redeploy/eviction — acknowledged in `rateLimit.ts:3-4`); only `/api/search` uses the central CF Rate Limiting API.

---

## STEP 3 — Report table (ordered)

| # | Item | Status | Evidence | What goes wrong if left | Fix in this stack |
|---|---|---|---|---|---|
| A1 | `/img/` unthrottled proxy | **Exploitable now** (quota-exhaustion DoS) | `next.config.ts:331-338`; no guard anywhere | Scraper burns 100k/day Workers quota → whole site down for the day | `guard(request,'img',N)` in `middleware.ts` (pattern exists in `rateLimit.ts:64-76`), or CF WAF rule on `/img/*` |
| W1 | `/api/revalidate` fail-open if secret removed | Weak (currently protected — 401 live) | `revalidate/route.ts:11` | If `REVALIDATE_SECRET` ever deleted → public cache-tag purger | `if (!process.env.REVALIDATE_SECRET) return 500` before compare |
| W2 | Ad click/impression unthrottled writes | Weak | `api/ads/[id]/click`, `/impression` (no guard) | D1 write-quota burn + fake stats | `guard(...,30)` first line of each handler |
| W3 | Player card-action unthrottled writes | Weak | `api/player/card-action:18-64` | Token-holding user spams D1 writes | reuse `rate_events` pattern or `guard()` |
| W4 | Auth endpoints unthrottled | Weak | `api/auth/google`, `api/auth/callback` (no guard) | D1 read/row churn; new-account spam if registration open | `guard(request,'auth',20)` on both |
| W5 | In-memory limiter per-isolate | Weak (known) | `rateLimit.ts:3-10` | Limits reset on deploy; partial coverage across isolates | acceptable; extend CF Rate Limiting binding if ever needed |
| F1 | Secrets hygiene | Fine | verify-build-secrets.js:35-53; git history clean; NEXT_PUBLIC audit | — | keep guard in CI (already mandatory) |
| F2 | Session/auth model | Fine | auth-server.ts:57-183; timing-safe compares middleware.ts:219-220 | — | — |
| F3 | Admin choke points (2 layers) | Fine | middleware.ts:179-239 + requireAdmin ×13; server-order:9-12 inline | — | — |
| F4 | Client-trusted values | Fine | all user/* session-derived; whitelists admin/movies:84-86, users:13,44-56, server-order:22-27 | — | — |
| F5 | D1 scoping & no direct browser path | Fine | db.ts server-only; binding-only prod (db.ts:50-59) | — | — |
| F6 | SQLi / XSS | Fine | parameterized queries; whitelisted SET clauses; safeJsonLd on all JSON-LD; no raw HTML from user data | — | — |
| F7 | Edge cache boundaries | Fine | edge-cache-worker.ts deny-list + no-set-cookie + content-type rules | — | — |
| F8 | Security headers | Fine | next.config.ts:349-391 (HSTS, nosniff, frame-ancestors, CSP subset + Report-Only) | — | — |

Dead-but-harmless (cleanup candidates, not security): `/api/plays` proxies to a deleted embed worker (always returns empty — `plays/route.ts:15`), `errorLogging.ts:50` points to `/api/log` which doesn't exist, `constants.ts:12-15` dead TMDB/SUPABASE/YOUTUBE config, `supabase.ts` stub.

Player worker (separate account, in-repo): `frame-ancestors` locked to own domains (`player-worker/src/index.js:46`); no secrets in its tracked config.

---

## STEP 4 — Fix plan (APPROVED by Islam «اعمل» — IMPLEMENTED 2026-10-04, local-verified, NOT committed/deployed)

All fixes use existing project patterns only, zero new dependencies. `npx tsc --noEmit` = clean (exit 0, `.open-next` removed first per standing lesson).

| Fix | File(s) | Change | Verification |
|---|---|---|---|
| A1 — `/img/` throttle | `src/middleware.ts` | `guard(request,'img',120,60_000)` early-return before maintenance check (avoids a D1 settings read per image) + matcher gains explicit `'/img/:path*'` entry (paths ending `.jpg/.png/...` were excluded by the generic matcher) | Local dev run: 125 sequential requests to `/img/w500/…jpg` → **120 passed (404 from TMDB) + 5×429**; 429 carries `cache-control: private, no-store`; homepage + `/api/genres` still 200 |
| W1 — revalidate fail-closed | `src/app/api/revalidate/route.ts` | `if (!process.env.REVALIDATE_SECRET) return 401` before the compare — deleting the secret now closes the door instead of comparing empty==empty | tsc clean; live behavior unchanged (real secret still set — 401 verified live pre-fix and locally post-fix) |
| W4 — auth gates | `api/auth/google/route.ts`, `api/auth/callback/route.ts` | shared bucket `'auth'` 20/min/IP (a full login = 2 hits → 10 attempts/min) | tsc clean |
| W3 — player bridge gates | `api/player/token` (60/min), `api/player/verify` (60/min, same `'player-bridge'` bucket), `api/player/card-action` (30/min writes, `'player-write'`; OPTIONS stays unguarded so browser preflight never breaks) | tsc clean |
| W2 — ads click/impression | none needed | handlers are disabled no-write stubs (see corrected item 2) | — |

## Deploy & live verification (2026-10-05, Islam ordered «انشر»)

- Commit `8c257ed` pushed to main → CI green (Build → verify-build-secrets ✓ → Deploy → purge_everything). Live `x-build-sha: 8c257edb…` confirmed on 4cima.com; homepage + `/api/genres` 200.
- **Live rate-limit proof:** 140 unique-URL image requests over a single keep-alive connection → **exactly 120×200 + 20×429 `{"error":"rate_limited"}`** — the guard enforces at precisely the configured limit.
- **Key discovery (improves the original threat model):** Cloudflare's zone CDN caches `/img/` responses at the edge (`CF-Cache-Status: HIT`, TMDB's `cache-control: public, max-age≈370d` passes through, `.jpg` is a default-cacheable extension). **Repeated requests for the same image URL never reach the Worker at all** — zero quota burn. And TMDB itself runs on BunnyCDN (same PullZone 775336 in both origin and proxy responses — no hidden server). The only Worker-touching pattern is unique-URL scraping — exactly what the guard now throttles.
- Remaining caveat (W5, unchanged): the in-memory counter is per Worker isolate — connection churn/parallelism spreads one IP across isolates, so the effective ceiling is ~120 × isolates. This applies equally to every in-memory guard on the site (search fallback, suggestions, plays, user/*, ads/serve). The deterministic complement is a CF WAF rate-limiting rule on `/img/*` from the dashboard (same as the existing search-api-limit rule) — optional, Islam's dashboard.
