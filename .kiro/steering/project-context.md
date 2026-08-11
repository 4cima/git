# 4cima — Key Project Facts (reference, not rules)

- d:\cinma-old — clone of github.com/Iaaelsadek/cinma (238 commits, since Feb 2026). Contains the OLD React+react-router+Supabase system. The old admin/auth system specifically is at commit ad6b4e3 — always use `git show ad6b4e3:<path>` for old-system code, NOT the current HEAD of that clone (HEAD has since evolved past the old React version).

- Old Supabase project (auth-only, separate from Turso, NOT for content): URL lhpuwupbhpcqkwqugkhh.supabase.co. Credentials live in .env.local — never print them in full again, reference by name only.

- Current site content (movies/series) comes exclusively from Turso (libsql) — never from Supabase.

- GitHub remote for this project: github.com/4cima/git.git, branch main.
