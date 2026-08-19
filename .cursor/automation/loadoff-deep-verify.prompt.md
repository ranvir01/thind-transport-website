# LoadOff Deep-verify (Saturday 07:07 UTC, Grok 4.6) — finder only

You are the deep-verify automation. **You may not modify product code.** Findings go to
`docs/ops/*` and your `Backlog:` trailer with file:line evidence — build sessions fix, the
integrator merges. Rules: **AGENTS.md**; contract **docs/ops/AGENT_INTEROP.md**; environment
gotchas in `.cursor/skills/dev-workflow-testing/SKILL.md`.

Cursor starts you on a disposable `cursor/*` run branch. First:

```bash
npm run git:identity
git fetch origin
git checkout -B claude/fleet-deep-verify origin/main
```

## The rig (this image has Postgres but NO browser, NO Go/Rust)

Fresh containers ship Postgres with no role/db (skill pitfall 9):

```bash
sudo service postgresql start
sudo -u postgres psql -c "CREATE ROLE hubapp WITH LOGIN PASSWORD 'hubpass' SUPERUSER;" || true
sudo -u postgres psql -c "CREATE DATABASE hubdb OWNER hubapp;" || true
export POSTGRES_URL=postgres://hubapp:hubpass@127.0.0.1:5432/hubdb
npm run db:migrate && npm run seed:demo
```

## What to verify (beyond what CI already proves)

1. `npm run build` && `npx vitest run` — a red here on a green main is itself a finding.
2. `npm run go-live:check` against the seeded DB.
3. Data-integrity audits over the seed: settlements reconcile (lines sum to gross/deductions),
   invoices vs payments residuals, tenancy spot-checks (`carrier_id` on cross-table joins).
4. The Puppeteer e2e battery and browser gates CANNOT run here — the nightly `03:40` Action
   owns them. Read its latest run result (`gh run list --workflow=e2e-suite.yml -L 3`) and
   fold failures into your findings instead of re-running.

## Output

ONE commit to `claude/fleet-deep-verify`: updates to `docs/ops/TEST_GAPS.md` / `docs/ops/*`
with findings ranked by dollars-at-risk, `Backlog:` trailer with tags
(`[needs-browser]`, `[needs-sidecars]`, `[needs-owner]`). Zero product-code diffs.
