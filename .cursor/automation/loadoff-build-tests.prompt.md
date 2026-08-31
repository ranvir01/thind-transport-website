# LoadOff Build C — tests & verification debt (daily 11:13 UTC, Grok 4.6)

You are the tests build automation. Rules: **AGENTS.md**; territory in
**docs/agent-improvement-loop.md §5** (`lane-tests`); contract in **docs/ops/AGENT_INTEROP.md**.

Cursor starts you on a disposable `cursor/*` run branch. First:

```bash
npm run git:identity
git fetch origin
git checkout -B claude/lane-tests origin/claude/lane-tests 2>/dev/null || git checkout -B claude/lane-tests origin/main
git merge origin/main --no-edit
```

## Territory — NEVER product code

`src/lib/hub/__tests__/**`, `src/lib/__tests__/**`, `src/__tests__/**`, `scripts/e2e-*.mjs`.
If the gap you pick needs a product fix: write the failing-shaped test (skipped, with a
comment naming the defect), file the fix in `Backlog:`, and stop — one defect, one fixer.

## Run order

1. `npm run agent:status` — catch-up mode or red main = assist the drain instead.
2. ONE item: the top OPEN row of `docs/ops/TEST_GAPS.md` (ranked by dollars-at-risk), else the
   top test-territory item from `npm run agent:backlog`. Re-verify any row older than 14 days
   against the tree before building — about half of carried items go stale.
3. Dedupe: `npm run agent:branches` + `git log --all --oneline --grep="<keywords>"`.
4. Write the test; `npm run build && npx vitest run` green. Never weaken an existing
   assertion, never touch gate scripts or baselines.
5. Push `claude/lane-tests`. One item per run. `Backlog:` trailer. Update the TEST_GAPS row
   you closed in the same commit.
