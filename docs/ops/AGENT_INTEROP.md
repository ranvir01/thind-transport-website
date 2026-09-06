# Agent interop — Cursor ↔ Cursor ↔ Claude ↔ CI

Four kinds of agent write to this repo: Cursor scheduled automations, Cursor agents you prompt by
hand, Claude Code sessions (web, desktop, CLI) and Claude scheduled routines, plus GitHub Actions
that publish history without any agent involved. They share one `main`, one integrator branch, and
one production alias. This file is the contract between them.

Territory and lane rules live in [`docs/agent-improvement-loop.md §5`](../agent-improvement-loop.md).
This file covers what that one doesn't: who may push where, how agents hand work to each other
**across platforms**, and how a change to the agent environment itself is rolled out.

---

## 1 · The clock

Everything scheduled, in one place. UTC, and deliberately non-overlapping — two jobs merging the
same branch in the same minute is how a diverged `main` gets made.

| Minute | Who | Platform | Branch it writes |
|---|---|---|---|
| `:00` | Integrator (lane merge) | Cursor automation | `claude/hauldesk-project-setup-l1luoo` |
| `:17`, `:47` | Drain integrator → main | GitHub Actions | `main` |
| `:30` | Prod smoke | Cursor automation | `main` (only when production is red) |
| `:59` | Deploy + backlog | Cursor automation | `main` |
| `03:40` | E2E smoke suite | GitHub Actions | nothing — read-only |
| every push / PR | `unit` job (vitest, token-lint, cursor-env-check) | GitHub Actions | nothing — read-only |

**Adding anything scheduled — a Claude routine, a Cursor automation, a cron — means picking a minute
not in that table and adding a row here in the same change.** A schedule that exists only in a
Cursor dashboard or a Claude routine is invisible to every other agent, and the next collision is
just a matter of time.

The `:17`/`:47` Action is the backstop that exists because a single platform going dark once left
production hours behind a green integrator. It is deliberately *not* an agent: when Cursor is
broken, it still runs.

---

## 2 · Who may push where

| Branch | Written by | Everyone else |
|---|---|---|
| `main` | the `:59` deploy agent, the `:17`/`:47` drain Action, the `:30` smoke agent when production is red, and the owner (or an agent the owner told to) | never push directly |
| `claude/hauldesk-project-setup-l1luoo` (integrator) | the `:00` integrator agent, and the drain Action carrying the merge back | never push directly |
| `claude/lane-*` | the one agent working that lane | never |
| `claude/<session-name>` | the one agent that created it | never |

Two agents on one branch is the single most expensive mistake available here — it costs a forced
push or a conflict resolution nobody asked for. **One branch, one writer.** If you need work that
lives on someone else's branch, say so in `Backlog:` and let the integrator merge it.

Session branches are fine and preferred for ad-hoc work: the integrator finds them with
`npm run agent:branches`, so nothing needs a fixed name.

---

## 3 · Before you write code: check nobody already did

With parallel agents on two platforms, the same defect gets found and fixed repeatedly — the
compliance wall-clock flake collected four independent fixes in three days, and the
`NotificationsBell` race was re-fixed seven-plus times.

```bash
npm run agent:branches                                  # branches with work not on main
git log --all --oneline --grep="<short description>"    # every branch, not just main
```

Found an existing fix? Name that branch in your `Backlog:` and move to the next item. This is a
hard first step, not a suggestion — it is also the only cross-platform lock this repo has.

---

## 4 · How agents talk to each other

The commit body is the message bus. Every agent reads recent commits before starting
(`npm run agent:backlog` ranks them), so a note in a commit reaches every platform. Nothing else
does — a Cursor agent cannot read a Claude session's transcript, and neither can read the other's
dashboard.

Every commit body ends with a `Backlog:` list. Tag an item when it cannot be picked up by just
anyone:

```
Backlog:
- [needs-browser] js-budget re-measure after the /pay-rates split — needs the puppeteer gates
- [needs-sidecars] regenerate the Rust golden fixtures to match ifta.test.ts
- [needs-owner] whether lane-marketing's schedule restarts or retires
- [blocked-by claude/lane-office] the token migration this depends on is unmerged there
```

Four tags, all greppable, all meaning "do not silently skip this":

- **`[needs-browser]`** — requires `design-qa`, `qa:a11y`, `js-budget` or `qa:lighthouse`. The Cursor
  agent image has no browser today (see §5), so this is for a local run or CI.
- **`[needs-sidecars]`** — requires `npm run test:sidecars`; no Go or Rust in the Cursor image either.
- **`[needs-owner]`** — money, permissions, data deletion, fleet configuration, or anything the
  guardrails in `docs/agent-improvement-loop.md §4` say to stop on. Agents never decide these.
- **`[blocked-by <branch>]`** — names the branch that has to land first. The integrator merges in
  that order.

An untagged item is claimable by any agent on any platform. That is the whole protocol: no agent
waits on another agent's reply, because there is no reply — there is only the next commit.

---

## 5 · Changing the agent environment

`.cursor/environment.json` describes the machine every Cursor cloud agent boots into. It declares
**no custom image**: Cursor uses its own default machine and runs the `install` line, which mirrors
CI (`npm ci --ignore-scripts` + `npm rebuild bcrypt sharp`).

That is deliberate. A custom `.cursor/Dockerfile` with no `FROM` line shipped on 2026-07-26 and every
Cursor agent — the three automations included — failed to start until 2026-08-19. Nothing in this
repo built that image and no gate looked at it, so three weeks of total agent outage produced not one
red signal here. `.cursor/Dockerfile` remains as a valid, unreferenced, opt-in image; re-enabling it
means adding `"build": { "dockerfile": "Dockerfile", "context": "." }` back and watching a build go
green before trusting it.

The rules that follow from that outage:

1. **Run `npm run cursor:env-check` after touching anything under `.cursor/`.** It asserts what
   `docker build` would reject — a missing `FROM`, a `CMD`/`ENTRYPOINT` Cursor overrides, a build
   context outside the repo, an `install` script that isn't there — and it checks the opt-in
   Dockerfile even while nothing references it. CI runs it in the `unit` job.
2. **Cursor keeps its own server-side copy of the environment, and runs that — not the repo's.**
   After changing either file, open the environment in Cursor and re-import from the repository
   (or Save a tested snapshot+`install` proposal). Two tells that you are looking at a stale copy:
   a `transferring dockerfile: NNNB` line whose byte count does not match
   `wc -c .cursor/Dockerfile` (the check now prints that size), or any Docker build at all while
   environment.json declares none.

   Evidence, 2026-08-19: personal environment `5241c374-0579-442f-bf88-309dbcbe37f3` was still
   running recurring SYSTEM builds of the July fragment. Newest log
   (`bld-20260819-d11f8ed9-2492-4048-b2e7-d76a5a8cd62a`) transferred a **418-byte** Dockerfile
   that starts at `RUN apt-get` and died with `ERROR: failed to solve: no build stage in current
   context`. Repo `.cursor/Dockerfile` is 3934 bytes and starts with `FROM ubuntu:24.04`;
   `.cursor/environment.json` on `main` (`f36b46df`) declares no `build` at all. The repo fix
   is inert until the dashboard copy is replaced. Every scheduled automation on that environment
   then ERROR'd in ~8s with `setupStatus: null` — that is a dead fleet, not an empty backlog.
3. **Land environment changes on `main` first, then fast-forward the fleet branches.** An agent
   booted on `claude/lane-*` or the integrator reads the config *on that branch*. A fix that exists
   only on `main` leaves every other branch unbootable:

   ```bash
   git push origin main:claude/hauldesk-project-setup-l1luoo
   for lane in analytics compliance docs driver integrations office portal roadmap saas sidecars tests tests-qa-sweep; do
     git push origin main:claude/lane-$lane
   done
   ```

   These are fast-forwards while the lane branches carry no commits of their own
   (`git rev-list --count origin/main..origin/claude/lane-<name>` is `0`). If one is non-zero, that
   lane has unmerged work — merge it through the integrator instead of forcing anything.
4. **Static validation is not a boot.** After a real change, start one agent and watch it come up.
   `cursor-env-check` catches parse-level mistakes, not a package that stopped existing.

### What a Cursor agent can and cannot run

On Cursor's default machine, with dependencies installed the CI way: `npm run build`, `npx vitest
run`, `typecheck:gate`, `token-lint`. The puppeteer-backed gates (`design-qa`, `qa:a11y`,
`js-budget`, `qa:lighthouse`) need a browser that install step does not fetch, and
`npm run test:sidecars` needs Go and Rust. Work needing those gets tagged per §4 and runs locally or
in CI.

## 6 · When a scheduled agent goes quiet

A failing agent is loud. A *dead* agent is silent, and silence reads exactly like "nothing needed
doing" — which is how three weeks passed with no Cursor agent able to start.

- `npm run agent:status` — integrator vs `main` drift, and whether the fleet is in catch-up mode.
- `npm run agent:branches` — pending work nobody has merged.
- The `:17`/`:47` drain Action is the liveness signal that does not depend on Cursor: if its runs are
  green and `main` is still moving, publishing works even when every agent is down.
- A scheduled Cursor automation that ERROR's in under a minute with `setupStatus: null` is an
  environment-build death (stale Dockerfile), not "nothing needed doing". Check the environment
  build log before assuming the backlog is empty.

If two consecutive runs of a scheduled agent produce nothing, check the platform before assuming the
backlog is empty: a Cursor automation that cannot boot its environment reports no error into this
repo at all.

---

## 7 · Identity

Every agent commits as the owner — `npm run git:identity`, or the two `git config` lines in
AGENTS.md. The author field is what GitHub credits and what `git blame` reports; an agent that
leaves its own identity there takes the owner's credit on the owner's repository. If your harness
needs a specific committer for signing, set `GIT_COMMITTER_*` and leave the author alone.
