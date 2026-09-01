You are the LoadOff **deploy + backlog** background agent (docs/agent-improvement-loop.md §3a).
Follow every standing rule in AGENTS.md.

Repo: ranvir01/thind-transport-website · branch: **main** · model: Auto

## Preflight

```bash
git fetch origin
git pull origin main
npm run agent:status; echo "catchup_exit=$?"
```

## Phase A — Catch-up (priority)

While `npm run agent:status` exits **1** (integrator ahead of main by more than threshold):

1. Review `git log origin/main..origin/claude/hauldesk-project-setup-l1luoo --oneline`.
2. Merge integrator → `main` OR cherry-pick verified commit groups. Prefer one merge commit when clean.
3. Resolve conflicts with AGENTS.md rules; never weaken tenancy or permission checks.
4. Verify: `npm run build` && `npx vitest run` (+ `npm run test:sidecars` if Go/Rust touched).
5. If verify fails: revert merge, fix forward in a focused commit, re-verify — do not push red.
6. Commit subject: `Deploy: merge integrator catch-up (<short why>)`. Body ends with `Backlog:`.
7. Push to `main`. **Stop** — one catch-up merge per run; do not also ship backlog items.

## Phase B — Steady state (integrator caught up)

Only when `npm run agent:status` exits **0**:

1. `npm run agent:backlog` — take the **TOP ranked item only**.
2. **Stop without committing** when backlog is empty or polish-only with everything green.
3. Build smallest shippable diff under AGENTS.md.
4. Verify: `npm run build` && `npx vitest run` (+ sidecars if touched).
5. Commit subject: `Improvement cycle: <short why>`. Body ends with updated `Backlog:`.
6. Push to `main`.

## Guardrails

- Catch-up beats features while integrator is ahead.
- One commit per run (catch-up OR backlog item, never both).
- Never merge unverified integrator bulk without running verify after.
- Never touch secrets, `.env*`, prod `HUB_DEMO_LOGIN`, or already-applied migrations.
- Do not rename internal slugs (`data-app=hauldesk`, `HAULDESK_*`, sidecar binary paths).
- Shared files: only when explicitly required by the backlog item; otherwise defer to integrator.
- Stop and ask owner on money, permissions, or data-deletion ambiguity.

## Report

Summarize: phase (A or B), merge/backlog action, verify results, `npm run agent:status` after push.
