# AUTOMATION-HANDOFF — paste for an agent combining automation work

Give this file to any agent that is building Cursor automations (or Claude
routines) for this account, so it combines its work with the layer that
already shipped instead of duplicating it. Paste everything inside the fence
into that agent's prompt. State as of commit `657be66f` on
[PR #42](https://github.com/ranvir01/thind-transport-website/pull/42),
branch `cursor/fleet-24-7-liveness-931f`.

````
You are working for Ranvir Thind on github.com/ranvir01/thind-transport-website.
A previous agent already shipped the full automation layer on branch
cursor/fleet-24-7-liveness-931f (PR #42, commits 770b6f99 + 657be66f). Your
job: COMBINE your automation designs with that layer, and IMPROVE the Claude
side. Do not rebuild what exists. Work autonomously; do not wait mid-task.

If a file below is missing on your checkout, fetch it raw:
https://raw.githubusercontent.com/ranvir01/thind-transport-website/cursor/fleet-24-7-liveness-931f/<path>

READ FIRST, IN ORDER
1. docs/ops/CURSOR-START.md        — owner import pack: 7 Cursor automations
2. docs/ops/CLAUDE-START.md        — owner pack for the live 9 Claude tasks
3. .cursor/automation/README.md    — the automation library + activation rules
4. docs/ops/FLEET.md               — live roster + "One charter, one platform"
5. docs/ops/AGENT_INTEROP.md §1    — the shared clock (every schedule is a row)
6. docs/ops/DECISIONS.md           — D-003, D-006, D-007, D-016, D-017
7. docs/claude-routines.md         — full Claude prompt library (9 live tasks)
8. docs/ops/PORTFOLIO.md           — which repos are active vs dormant
9. docs/cursor-agent-preamble.md   — start-of-run contract for Cursor agents

WHAT ALREADY EXISTS — DO NOT REBUILD
- Cursor, import-ready in .cursor/automation/ (owner clicks; model pinned
  cursor-grok-4.6-high-fast; canonical JSON shape =
  loadoff-build-office.workflow.json):
  A office 05:13 · B driver 08:13 · C tests 11:13 · D integrations 14:13 UTC
  (daily home-repo builders, write claude/lane-*), portfolio radar daily
  09:37 (issues only, never commits), BLS maintenance Wed 12:37 (PR on
  ranvir01/bls-website), MyCO maintenance Thu 12:37 (PR on
  ranvir01/myco-website). Day-2 optional: owner digest Fri 19:37,
  dependency pass Mon 10:07.
- Cursor, DISABLED on the dashboard (D-006 unanswered — leave them off):
  Integrator :00, Prod Smoke :30, Deploy + backlog :59. "Untitled" stays off.
- Claude, LIVE (9 tasks, claude.ai, home repo only — trigger ids in
  CLAUDE-START): integrator 43 */3, prod smoke 16:49, nightly E2E 10:33,
  deep audit Sun 10:53, meta-governor Mon 12:00, watchdog 15:11, marketing
  08:00, outside-auditor Mon 14:00, sim buddy 18 */6.
- GitHub Actions: drain :17/:47, liveness :10, E2E 03:40, digest Fri 20:41,
  reaper Sun 06:00, prune 06:23.
- Grok Bot: 14-seat org, never writes git. Dispatch SOPs already written:
  docs/grok-bots/templates/fire-cursor.md (Dex/Rex/Bee) and
  templates/fire-claude.md (Em only, idle-window gated).
- Guard tests that will fail your build if you break the contract:
  src/lib/__tests__/cursor-automation-guard.test.ts,
  fleet-clock-guard.test.ts, grok-bot-instructions-guard.test.ts,
  drain-workflow-guard.test.ts.

HARD RULES (each one has a scar behind it)
- One charter, one platform. Never create a Cursor twin of a live Claude job
  or vice versa (reconciliation table in FLEET.md). Same ticket never on a
  scheduled lane AND a fired agent AND the Claude Corps.
- Every schedule is a row in AGENT_INTEROP.md §1 AND FLEET.md in the same
  change. A schedule that exists only in a dashboard or a JSON is invisible
  to every other agent. Minutes :07/:13/:37 are reserved for Cursor slots;
  never put two writers on one minute+branch.
- Claude scheduled work is HOME REPO ONLY (D-007). The ceiling is 9 tasks: a
  new Claude task must name the live task it retires, in the same change.
  bls-website NEVER sees Claude Code (D-016). Dormant PORTFOLIO repos and
  the private career repo get no automation of any kind.
- Agents cannot click dashboards. Everything ships as import-ready files +
  docs; the owner activates via CURSOR-START / CLAUDE-START. Update those
  packs when you add or change a slot — they are the owner's only UI.
- Morgan token discipline: routines only where they can act; act-or-exit (no
  "no updates" runs); one item per run; intake = collaborator-labeled
  `should` issues first, then Backlog: trailers; dedupe claude/* branches
  AND open cursor/* PRs before building.
- Money integer cents, carrier-scoped queries, no new heavy deps, no secrets
  in git — AGENTS.md is law for anything touching app code.

BRANCH DISCIPLINE (most expensive mistake available)
- Do NOT push to cursor/fleet-24-7-liveness-931f — it has one writer.
- Branch OFF it (or off main once PR #42 merges):
  git fetch origin cursor/fleet-24-7-liveness-931f &&
  git checkout -b cursor/<your-task>-<suffix> origin/cursor/fleet-24-7-liveness-931f
- Commit as the owner: npm run git:identity (Ranvir Thind
  <130034150+ranvir01@users.noreply.github.com>). Land via your own PR.

YOUR JOB, IN ORDER
1. Inventory your own automation designs. For each, check FLEET.md's
   one-charter table: if a live Claude task, GitHub Action, or import-ready
   Cursor slot already owns that charter, drop yours or write down which
   file it supersedes and why — never ship both.
2. New Cursor automation = 4 files in one commit: <name>.prompt.md +
   <name>.workflow.json in .cursor/automation/ (model pinned
   cursor-grok-4.6-high-fast; cron on a :07/:13/:37 minute that no row uses;
   prompts start with git:identity and agent:status; act-or-exit; never
   merge), a row in CURSOR-START.md §1/§1b + the report-back block, rows in
   FLEET.md + AGENT_INTEROP.md §1 dormant list, and new assertions in
   cursor-automation-guard.test.ts.
3. Claude improvements (the "better Claude automations" ask):
   - Work in docs/claude-routines.md as PASTE DELTAS appended to the live
     prompts (the owner never re-pastes whole charters) + update the
     CLAUDE-START toggle/delta sections to match.
   - Worthwhile upgrades: intake-first wording (should issues → Closes #N)
     on tasks that predate D-012; idempotent create-or-comment issue filing
     on every red-path task; act-or-exit wording on the sim buddy and
     watchdog; roster hygiene (the 9 trigger ids, no ghosts); make the
     marketing lane read MODEL-ROUTING.md. Keep each delta a short quoted
     block the owner can paste in one click.
   - If you genuinely need a NEW Claude charter, it must fit the home repo,
     retire one of the 9, and land as: prompt body in claude-routines.md +
     CLAUDE-START row/toggle + FLEET/INTEROP rows + DECISIONS.md entry.
4. Verify: npm run build && npx vitest run && npm run typecheck:gate; after
   any .cursor/ change also npm run cursor:env-check. All green before push.
5. Ship: push your branch, open a PR titled "Automations: <what>", body ends
   with a Backlog: list ([needs-owner] for every dashboard click you are
   handing to Ranvir). Update CURSOR-START/CLAUDE-START report-back blocks
   if you changed what the owner must click.

REPORT BACK (this shape)
Combined: <your slots kept / dropped-as-duplicate / superseded>
New Cursor slots: <name · cron · repo · writes> …
Claude deltas: <task · one-line change> …
Owner clicks added: <n> (all in CURSOR-START / CLAUDE-START)
Guards: cursor-automation-guard + fleet-clock-guard green: yes/no
Blocked: …
````

## Notes for the owner (outside the paste)

- The receiving agent needs repo access and nothing else — no dashboard
  access, no secrets. Everything it ships is import-ready; you still click.
- If it proposes re-enabling Integrator / Prod Smoke / Deploy, that is
  answering D-006 — your call, not the agent's.
- If two agents end up editing `.cursor/automation/` in parallel, merge
  order does not matter as long as each added its guard assertions — the
  clock guard catches minute collisions at build time.
