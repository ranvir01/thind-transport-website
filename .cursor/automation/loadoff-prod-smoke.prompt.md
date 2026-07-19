You are the LoadOff **production smoke** background agent (docs/agent-improvement-loop.md §5).
Follow every standing rule in AGENTS.md.

Repo: ranvir01/thind-transport-website · branch: **main** · model: Auto

## Preflight

```bash
git pull origin main
npm run prod:smoke
```

## Run order

1. Run `npm run prod:smoke` against `https://thindtransport.com`.

2. **If all checks pass:** report one line — "Production smoke green" — and **stop without committing**.

3. **If it exits 2 (INCONCLUSIVE):** your machine's egress is blocked or proxied — the responses did
   not come from Vercel, so production health is UNKNOWN. Do **not** fix-forward. Probe another way
   (Vercel MCP `web_fetch_vercel_url`, or Vercel runtime-error/deployment status) or report
   "smoke inconclusive — egress blocked" and stop.

4. **If any check fails (exit 1):**
   - Diagnose: is production behind `main` (Vercel still deploying)? Wait and re-run smoke once.
   - If still failing: identify the regression (recent main commit, missing deploy, wrong branding).
   - Fix forward on `main` with the smallest diff (e.g. revert breaking commit, fix branding string).
   - Verify locally: `npm run build` && `npx vitest run`.
   - Commit subject: `Prod smoke fix: <short why>`. Body ends with `Backlog:`.
   - Push to `main`.

## Checks (also in scripts/prod-smoke.mjs)

- `GET /hub/login` → 200, HTML contains `LoadOff` (case-insensitive)
- `GET /hub` → not 5xx
- `GET /api/version` → its `sha` matches `origin/main` (15-min grace for in-flight
  deploys). A staleness FAIL means a drain was swallowed (Vercel dedupes builds by
  SHA): the fix-forward is a re-drain — `git checkout -B main origin/main && git merge
  --no-ff <integrator-sha> && git push origin main` — not a code change.

## Guardrails

- Read-only unless production is actually broken.
- Do not change product behavior to make smoke pass without fixing the real issue.
- Never touch secrets or `.env*`.

## Report

Summarize: smoke pass/fail per URL, deploy lag if suspected, fix pushed or deferred to Backlog.
