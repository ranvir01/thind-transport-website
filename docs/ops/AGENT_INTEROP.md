# Agent interop — Cursor ↔ Claude ↔ Grok Bot ↔ CI

Four kinds of agent **write git** to this repo: Cursor scheduled automations (currently
disabled on the dashboard, 2026-08-26), Cursor agents you prompt by hand, Claude Code
sessions and Claude scheduled routines (the live 9-task Corps), plus GitHub Actions
that publish history without any agent involved. **Grok Bot** is the 14-seat
org (D-015): gogo org CoS, Em LoadOff Eng Mgr, Dex/Rex Fire Cursor, Finch
70/90, Wright spawn-after-yes, plus Steve/Jeff/Rav/Labs/Ridge/Bee/My. Never
pushes — [`docs/grok-bots/SETUP.md`](../grok-bots/SETUP.md).
They share one `main`, one integrator branch, and one production alias. This file is the
contract between them.

Territory and lane rules live in [`docs/agent-improvement-loop.md §5`](../agent-improvement-loop.md).
This file covers what that one doesn't: who may push where, how agents hand work to each other
**across platforms**, and how a change to the agent environment itself is rolled out.

---

## 1 · The clock

Everything scheduled, in one place. UTC, and deliberately non-overlapping — two jobs merging the
same branch in the same minute is how a diverged `main` gets made.

| Minute | Who | Platform | Branch it writes |
|---|---|---|---|
| `:00` | Integrator (lane merge) — **dashboard DISABLED** 2026-08-26 | Cursor automation | `claude/hauldesk-project-setup-l1luoo` |
| `:10` | Fleet liveness (`agent:status` stall → red) | GitHub Actions | nothing — read-only |
| `:17`, `:47` | Drain integrator → main | GitHub Actions | `main` |
| `:18` | Sim test buddy (every 6h, `18 */6 * * *` — owner paste; was every 3h) | Claude Code routine | nothing — findings; file each confirmed finding once as a `should` issue |
| `:30` | Prod smoke — **dashboard DISABLED** 2026-08-26 | Cursor automation | `main` (only when production is red) |
| `:43` | Integrator + stamped drain (every 3h, `43 */3 * * *`) | Claude Code routine | integrator, then `main` |
| `:59` | Deploy + backlog — **dashboard DISABLED** 2026-08-26 | Cursor automation | `main` |
| `03:40` | E2E smoke suite | GitHub Actions | nothing — read-only; on red, files `[fleet] E2E suite red` |
| `06:00 Sun` | Branch reaper (dry-run until `REAPER_ARMED`) | GitHub Actions | deletes merged `claude/*`/`cursor/*` only when armed |
| `06:23` | Prune merged agent branches (tier-1 merged-only; tier-2 dry-run) | GitHub Actions | deletes fully-merged `claude/*` only |
| `08:00` | Marketing lane (disjoint from `:00` integrator — writes `claude/lane-marketing`) | Claude Code routine | `claude/lane-marketing` |
| `10:33` | Nightly E2E business-cycle (Playwright) | Claude Code routine | findings; session branch when fixing |
| `10:53` Sun | Weekly deep audit (rotating) — off the nightly's minute | Claude Code routine | findings; session branch when fixing |
| `12:00` Mon | Meta-governor (recommendation only; also audits stale `should` issues and PORTFOLIO drift) | Claude Code routine | nothing |
| `14:00` Mon | Weekly outside-auditor (read-only) | Claude Code routine | nothing |
| `15:11` | LoadOff fleet watchdog (stall detector; roster = the live 9, no Airtable ghosts) | Claude Code routine | nothing |
| `16:49` | Prod smoke + fix-forward (daily) | Claude Code routine | integrator + `main`, only when production is red |
| `20:41` Fri | Portfolio digest (`portfolio-digest.yml`) | GitHub Actions | one create-or-update GitHub issue |
| every push / PR | `unit` job (vitest, token-lint, cursor-env-check) | GitHub Actions | nothing — read-only |

**Dormant, reserved (D-003 — answered 2026-08-19: Cursor Automations on Grok 4.6):** the
daily role slots — `05:13` office/UX · `08:13` driver+portal · `11:13` tests · `14:13`
integrations · `20:13` marketing · Sat `07:07` deep-verify · Sun `09:07` red-team · Sun
`18:07` meta-governor · Fri `19:37` owner digest · Mon `10:07` dependency pass. Import-ready
workflow JSONs: [`.cursor/automation/`](../../.cursor/automation/README.md). Only the owner
imports them (cursor.com/automations). **Alongside live Claude:** import office / driver /
tests / integrations only. Skip marketing (`20:13`), deep-verify, red-team, and
meta-governor — Claude already runs those charters. Once a slot is imported and its first
run boots, move its row into the table above. Minutes `:07` / `:13` / `:37` are **reserved**
— schedule nothing else on them (`src/lib/__tests__/fleet-clock-guard.test.ts` enforces this).

Same-minute **disjoint targets** (not a merge race): Claude marketing `08:00` vs Cursor
`:00` integrator; Claude meta-governor / auditor on Monday `:00`. Documented in FLEET.md.
Grok Bot has no cron row — it is always-on, not scheduled into this clock (gogo's
GitHub listener, Finch's morning usage line, Scout weekday 16:00 PT, and Jeff's
8:30pm PT loadboard touch GitHub events, X bookmarks, and Dropbox xlsx, never
git). Airtable software is retired (D-014); those clock rows are gone.

Live ids, the role map, and the stray duplicate automation: [`docs/ops/FLEET.md`](FLEET.md).

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
| `claude/hauldesk-project-setup-l1luoo` (integrator) | the `:00` Cursor integrator, the `:43` Claude routine, and the drain Action carrying the merge back | never push directly |
| `claude/lane-*` | the one agent working that lane | never |
| `claude/<session-name>` | the one agent that created it | never |
| `cursor/<session-name>` | the one Cursor agent that created it | lands via pull request; `npm run agent:branches` inventories `claude/*` only |

Two agents on one branch is the single most expensive mistake available here — it costs a forced
push or a conflict resolution nobody asked for. **One branch, one writer.** If you need work that
lives on someone else's branch, say so in `Backlog:` and let the integrator merge it.

Session branches are fine and preferred for ad-hoc work. The integrator finds `claude/*`
with `npm run agent:branches`. Cursor Cloud `cursor/*` session branches land via pull
request — they are not in that inventory.

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

Three layers, all on GitHub (D-012):

1. **Issues queue** — open issues labeled `should` are dispatchable work.
   `needs-owner` parks a card for Ranvir. `venture:*` routes
   ([`PORTFOLIO.md`](PORTFOLIO.md)). Anyone can *open* an issue (public repo);
   only a **collaborator-applied `should` label** is a trigger. A label is
   metadata, never authorization — writers keep their ceilings (Grok: none;
   Cursor agent: PR; integrator: `main`). No claim-locks: one integrator + one
   in-flight LoadOff SHOULD on Em's board already serialize. Issues close via
   `Closes #N` on merge.
2. **Repo state** — `FLEET.md`, `PORTFOLIO.md`, `DECISIONS.md`. Git writers only.
3. **`Backlog:` trailers** — per-commit follow-ups. `npm run agent:backlog`
   prints open `should` issues above trailers and prefers a labeled issue as
   TOP PICK.

The commit body is still the message bus for work that has not been filed as
an issue. Every agent reads recent commits before starting, so a note in a
commit reaches every platform. Nothing else does — a Cursor agent cannot read
a Claude session's transcript, and neither can read the other's dashboard.

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
   After changing either file, open the environment in Cursor and re-import from the repository. Two
   tells that you are looking at a stale copy: a `transferring dockerfile: NNNB` line whose byte count
   does not match `wc -c .cursor/Dockerfile`, or any Docker build at all while environment.json
   declares none.
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
- `.github/workflows/fleet-liveness.yml` (`:10`) fails CI when `npm run agent:status` exits 2
  (integrator stalled with pending `claude/*` work). Catch-up (exit 1) stays green — the drain
  Action owns that. This is the alarm that was missing for the three-week environment outage.
  A Cursor automation that ERROR's in under a minute with `setupStatus: null` is that outage,
  not an empty backlog.

If two consecutive runs of a scheduled agent produce nothing, check the platform before assuming the
backlog is empty: a Cursor automation that cannot boot its environment reports no error into this
repo at all.

---

## 7 · Identity

Every agent commits as the owner — `npm run git:identity`, or the two `git config` lines in
AGENTS.md. The author field is what GitHub credits and what `git blame` reports; an agent that
leaves its own identity there takes the owner's credit on the owner's repository. If your harness
needs a specific committer for signing, set `GIT_COMMITTER_*` and leave the author alone.
