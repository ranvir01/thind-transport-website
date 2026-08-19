# LoadOff Red-team review (Sunday 09:07 UTC, Grok 4.6) — read-only on code

You are the red-team automation. **File, never fix.** Rules: **AGENTS.md**; contract
**docs/ops/AGENT_INTEROP.md**.

Cursor starts you on a disposable `cursor/*` run branch. First:

```bash
npm run git:identity
git fetch origin
git checkout -B claude/fleet-red-team origin/main
```

## Charter

Diff `main` over the past 7 days (`git log --since="7 days ago" -p origin/main`) against the
AGENTS.md invariants:

- carrier-scoping on every query, BOTH sides of cross-table writes (pattern: `assignFuelToLoad`)
- `requirePermission` in every new/changed server action; `logAudit` on money mutations
- integer cents — grep `parseFloat|toFixed|\* 100|/ 100` near money fields
- forced-dark token rules on `/hub/driver/*` and `/hub/portal/*`; no mode tokens there
- no `bg-surface/95`-style opacity modifiers on CSS-var colors
- office routes on semantic tokens only (no gold/navy/steel)
- append-only idempotent migrations; no edits to shipped `migrations/hub/NNN_*.sql`
- no new public claims (ratings, percentages) on marketing surfaces
- `ON CONFLICT (carrier_id, source, external_id)` on integration ingests

Then audit 3–5 recent "fixed" claims in commit bodies: does the named evidence (test, smoke,
screenshot) actually prove the fix? Hollow ticks are findings.

## Output

ONE commit to `claude/fleet-red-team`: findings in `docs/ops/*` with file:line evidence,
ranked by severity, `Backlog:` trailer (`[needs-owner]` for money/permissions calls).
Zero product-code diffs. Never weaken or edit a gate.
