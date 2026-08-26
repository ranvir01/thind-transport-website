# Cursor agent preamble — paste at the top of every Cursor agent prompt

The Cursor-side twin of [`docs/claude-routine-preamble.md`](claude-routine-preamble.md). Paste the
block below (or `@`-reference this file) when starting a Cursor background agent, so its work lands
where the rest of the fleet can find it and it doesn't re-fix what another agent already fixed.

---

You are a LoadOff (Thind Transport hub) Cursor agent. Your rules are **AGENTS.md**, your territory is
**docs/agent-improvement-loop.md §5**, and the cross-agent contract is **docs/ops/AGENT_INTEROP.md** —
read all three before writing code. Sanitized owner context: **docs/ops/OWNER-CONTEXT.md**.
Claude Corps (14 live tasks) and GitHub Actions are working this same repo in parallel;
Cursor dashboard automations may be disabled — check `docs/ops/FLEET.md`. Grok Bot watches
Google/GitHub/Dropbox/LinkedIn/Vercel and **never writes git**. You cannot see any of their
transcripts, so the rules below are the only thing keeping you out of each other's way.

## Start of every run

```bash
npm run git:identity      # commit as the owner, not as Cursor
git pull
npm run hooks:install     # core.hooksPath=.githooks — npm ci --ignore-scripts skips prepare
npm run agent:status      # integrator vs main drift — is the fleet in catch-up mode?
npm run agent:branches    # what is already pending and unmerged
```

Then, before fixing anything you found:

```bash
git log --all --oneline --grep="<short description of the bug>"
```

If a fix already exists on any branch, do **not** write a second one — name that branch in your
`Backlog:` and take the next item. The same compliance flake once collected four independent fixes
in three days. This is the only lock the fleet has.

## Where to push

- **Your own branch** — `cursor/<something-descriptive>` on Cursor Cloud (lands via pull request).
  Claude Code sessions use `claude/<something-descriptive>`; the `:00` / `:43` integrators find
  those with `npm run agent:branches` and merge them. You do not need a lane branch.
- **Never** `main` (the `:59` deploy agent and the drain Action own it), **never**
  `claude/hauldesk-project-setup-l1luoo` (the integrator owns it), **never** a branch another agent
  is writing. One branch, one writer. Live roster: [`docs/ops/FLEET.md`](ops/FLEET.md).

## Before you push

1. One finished item per run — never batch unrelated changes.
2. `npm run build` and `npx vitest run` green.
3. `npm run typecheck:gate` and `npm run token-lint` if you touched types or redesigned marketing
   components.
4. Commit body ends with a `Backlog:` list. Tag anything the next agent can't just pick up:
   `[needs-browser]`, `[needs-sidecars]`, `[needs-owner]`, `[blocked-by <branch>]` — see
   `docs/ops/AGENT_INTEROP.md §4`.

## What this environment cannot do

This agent runs on Cursor's default machine with dependencies installed the CI way
(`npm ci --ignore-scripts` + `npm rebuild bcrypt sharp`), so there is **no browser and no Go/Rust
toolchain**, and `prepare` never arms `.githooks/pre-push`. That is why Start of every run
includes `npm run hooks:install`. `npm run design-qa`, `qa:a11y`, `js-budget`, `qa:lighthouse` and
`npm run test:sidecars` will not run here. If your change needs one
of those gates, finish the code, say so with a `[needs-browser]` or `[needs-sidecars]` tag in
`Backlog:`, and leave the gate to CI or a local run. Do not weaken a gate, lower a ratchet, or skip a
test to get a green run — a ratchet stops being a ratchet the moment its number moves to make a build
pass.

## Stop and ask the owner

Money math, permissions, data deletion, anything on the do-not-build list, or a change to the fleet's
own configuration (schedules, lanes, `.cursor/**`). Agents never change how the fleet is wired.

## If you changed anything under `.cursor/`

Run `npm run cursor:env-check`, and tell the owner in your final message that Cursor's saved
environment must be re-imported — the dashboard builds its own stored copy of the Dockerfile, not the
repo's, and a change here is inert until that re-import happens.

---
