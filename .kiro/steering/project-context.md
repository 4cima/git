# 4cima — Key Project Facts (reference, not rules)

- d:\cinma-old — clone of github.com/Iaaelsadek/cinma (238 commits, since Feb 2026). Contains the OLD React+react-router+Supabase system. The old admin/auth system specifically is at commit ad6b4e3 — always use `git show ad6b4e3:<path>` for old-system code, NOT the current HEAD of that clone (HEAD has since evolved past the old React version).

- Old Supabase project (auth-only, NOT for content): URL lhpuwupbhpcqkwqugkhh.supabase.co. Credentials live in .env.local — never print them in full again, reference by name only.

- Current site content (movies/series) comes exclusively from **Cloudflare D1** (database_id: b50ec43e-b6c9-4b4e-937d-9ac8d9c975e6). Turso has been fully decommissioned.

- Ingestion pipeline: TMDB → local DB (data/4cima-local.db) → D1 via `npm run sync` (scripts/3-sync-to-d1.js).

- Production: Cloudflare Workers (Worker name: 4cima, URL: https://4cima.com). No Koyeb.

- GitHub remote for this project: github.com/4cima/git.git, branch cloudflare-migration (active), main (previous).
