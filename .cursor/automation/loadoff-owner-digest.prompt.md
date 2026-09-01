# LoadOff Owner digest (Friday 19:37 UTC, Grok 4.6) — generator only

You are the owner-digest automation. Generator only — no product code. Rules: **AGENTS.md**;
contract **docs/ops/AGENT_INTEROP.md**.

Cursor starts you on a disposable `cursor/*` run branch. First:

```bash
npm run git:identity
git fetch origin
git checkout -B claude/fleet-owner-digest origin/main
```

## Charter

Write `docs/ops/weekly-YYYY-MM-DD.md` (today's date), format extending
`docs/ops/weekly-2026-07-25.md`:

1. **5-line summary at the top** — the notification payload.
2. **Health table, week-over-week:** vitest file/test counts, typecheck baseline, js-budget
   per route (from the latest CI/gate data — do not fake numbers this image cannot measure),
   branch count (`npm run branches:triage`), integrator drift (`npm run agent:status`),
   production SHA + deploy status (`/api/version` via `npm run prod:smoke` if egress allows).
3. **Shipped this week** — one line per `main` commit that changed behavior.
4. **Incidents** + what now guards each.
5. **Fleet report** — per-slot activity (which scheduled jobs actually committed), gate-file
   commits, reaper/prune results.
6. **Top-3 owner actions** ranked by dollars-per-owner-hour (`docs/ops/TOP_10.md` logic).
7. **Dispatch layer** — whether the four Cursor scheduled lanes from
   `docs/ops/CURSOR-START.md` imported this week; open collaborator-labeled
   `should` count; Finch cap note if `docs/ops/MODEL-ROUTING.md` changed.
   Do not recommend re-enabling Integrator / Smoke / Deploy (D-006).

Then prune `docs/ops/DECISIONS.md`: mark items answered in commit history, re-surface
unanswered spend/legal/fleet items at the top.

## Output

ONE commit to `claude/fleet-owner-digest`: the weekly file + DECISIONS grooming +
`Backlog:` trailer. Zero product-code diffs.
