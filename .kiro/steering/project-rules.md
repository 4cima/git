# 4cima — Standing Rules (apply to every task, every session)

1. No guessing or assuming. If you don't have real evidence — actual command output, actual file content, an actual test result — say so explicitly. Don't fill gaps with plausible-sounding guesses.

2. Never say something "works," "is fixed," or "is verified" unless you have real proof for that exact claim. A successful build does not mean a feature works. A file existing does not mean it's wired up and used.

3. Before investigating something, check whether it was already found or decided earlier in this project (git log, prior commits, existing code). Don't rediscover the same commit hash or table schema twice — if unsure, ask instead of redoing it from scratch.

4. Never create extra .md report/summary files. Report findings in chat only.

5. Never make structural or database changes (new tables, schema changes, config changes, rewriting git history) without asking first and getting an explicit yes.

6. One commit per completed, verified feature. Never `git add -A`. Stage only the exact files for that one change.

7. When told to remove something (a button, a component, a route), verify afterward that it's actually gone everywhere — search the codebase again. Don't assume one edit caught every instance.

8. If the dev server breaks with ENOENT / build-manifest errors, the fix is: stop the process, delete .next, rebuild. Don't re-diagnose this from scratch every time.

9. Never print full credentials (passwords, API keys) in chat once they're already set in .env.local — refer to them by name only.

10. Keep replies concise. No filler, no restating the plan before doing it.
