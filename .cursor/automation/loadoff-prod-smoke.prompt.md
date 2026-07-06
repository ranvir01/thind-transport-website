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

3. **If any check fails:**
   - Diagnose: is production behind `main` (Vercel still deploying)? Wait and re-run smoke once.
   - If still failing: identify the regression (recent main commit, missing deploy, wrong branding).
   - Fix forward on `main` with the smallest diff (e.g. revert breaking commit, fix branding string).
   - Verify locally: `npm run build` && `npx vitest run`.
   - Commit subject: `Prod smoke fix: <short why>`. Body ends with `Backlog:`.
   - Push to `main`.

## Checks (also in scripts/prod-smoke.mjs)

- `GET /hub/login` → 200, HTML contains `LoadOff` (case-insensitive)
- `GET /hub` → not 5xx

## Guardrails

- Read-only unless production is actually broken.
- Do not change product behavior to make smoke pass without fixing the real issue.
- Never touch secrets or `.env*`.

## Report

Summarize: smoke pass/fail per URL, deploy lag if suspected, fix pushed or deferred to Backlog.
