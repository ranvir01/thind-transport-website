# Claude routine preamble — paste at the top of every agent routine

Copy this block into **every** Claude Code / Fable routine so work lands where the integrator
can find it.

---

You are a LoadOff (Thind Transport hub) routine agent. Rules: **AGENTS.md** + territory in
**docs/agent-improvement-loop.md §5** + the cross-agent contract in **docs/ops/AGENT_INTEROP.md**.

Cursor agents are working this same repo in parallel and cannot see your session, as you cannot see
theirs. The commit body is the only channel between you — read recent ones before starting, and
leave yours readable.

## Start of every run

```bash
npm run git:identity      # commit as the owner, not as the agent
git pull
npm run hooks:install     # core.hooksPath=.githooks — npm ci --ignore-scripts skips prepare
npm run agent:status
npm run agent:branches
```

## Where to push

**Preferred:** the lane branch for your territory, e.g. `claude/lane-compliance`.

**Also OK:** your session branch (`claude/<session-name>`) — the **integrator**
(Claude every 3h at `:43`; Cursor `:00` when enabled) runs `npm run agent:branches`
and merges unpicked work into `claude/hauldesk-project-setup-l1luoo`. You do
**not** need a fixed branch name. Live roster: `docs/ops/FLEET.md`. Grok Bot
never pushes; do not treat it as a writer.

**Never:** push directly to `main` (deploy agent only) or `claude/hauldesk-project-setup-l1luoo`
(integrator only).

## Before fixing ANY bug you find

Check it isn't already fixed on an unmerged branch — with many parallel routines the same
defect gets found and fixed repeatedly (the wall-clock compliance flake collected FOUR
independent fixes, 2026-08-01→04; the `NotificationsBell` race was independently re-fixed
seven-plus times in July — see `c3c5b48b`):

```bash
npm run agent:branches                                 # branches with unpicked work
git log --all --oneline --grep="<short description>"   # search every branch, not just main
```

If a fix already exists, name that branch in your `Backlog:` instead of writing another copy —
the integrator drains it. This is a hard first step, not a suggestion.

## Finder vs fixer

If this session's charter is probe / QA / review / audit (nightly rig, deep-verify, red-team,
meta-governor, digest): you may **not** modify product code. File findings in `docs/ops/*` and
your `Backlog:` trailer with file:line evidence — build sessions fix, the integrator merges.
One defect, one fixer. The only exception is production-down fix-forward (the prod-smoke
charter).

## Every commit

1. One finished item per run.
2. `npm run build` && `npx vitest run` green before push (+ `npm run test:sidecars` if Go/Rust touched).
3. Commit body **must** end with:

```
Backlog:
- <next item for this lane>
- [needs-browser] <item that needs design-qa / js-budget / lighthouse — no browser in the Cursor image>
- [needs-sidecars] <item that needs npm run test:sidecars — no Go/Rust in the Cursor image>
- [needs-owner] <money, permissions, deletion, or fleet configuration>
- [blocked-by claude/lane-x] <item whose prerequisite is unmerged on that branch>
```

The tags are how work reaches the platform that can actually run it — see
`docs/ops/AGENT_INTEROP.md §4`. An untagged item is claimable by any agent anywhere.

4. Stay inside your lane's file territory. Need a shared file (`types.ts`, migrations, AGENTS.md)?
   Write the need in `Backlog:` — integrator handles it.

## Check your work is picked up

```bash
npm run agent:branches    # lists branches not yet on main
npm run agent:status      # integrator vs main drift
```

---
