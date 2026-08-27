# LoadOff 24/7 fleet registry

The live schedule. Agents never add a cron, Cursor automation, or Claude routine
that is not a row here **and** a row in [`AGENT_INTEROP.md`](AGENT_INTEROP.md) §1
in the same change. A schedule that exists only in a dashboard is invisible to
every other agent.

This is not a 30-person hiring chart. The field (and this repo's own 2026-08-07
manual in `docs/research/2026-08/prompt-6-agent-team.md`) converged on **high-frequency
mechanical jobs** (merge / drain / smoke / liveness) plus **low-frequency build
sessions** (daily lanes). Hourly feature agents duplicate fixes and race on the
same branch.

---

## Live right now (2026-08-26)

**Claude Corps is the live scheduled writer** (14 tasks, all enabled — owner's
2026-08-26 master context). **Cursor dashboard automations are currently
DISABLED** (Integrator, Prod Smoke, Deploy + backlog, Untitled — looked up
2026-08-26). Untitled stays off. GitHub Actions still drain `main` and page
stall. Grok Bot watches; it never writes git ([`docs/grok-bots/`](../grok-bots/README.md)).

### Mechanical loop + CI

| Slot (UTC) | Job | Platform | Writes | Dashboard / id |
|---|---|---|---|---|
| `:00` | Integrator — absorb one pending `claude/*` | Cursor automation **DISABLED** 2026-08-26 | `claude/hauldesk-project-setup-l1luoo` | [Integrator](https://cursor.com/automations/880eec29-78fd-11f1-ba66-0e7d0216e441) `880eec29-78fd-11f1-ba66-0e7d0216e441` |
| `:10` | **Fleet liveness** — `npm run agent:status`; red only on stall (exit 2) | GitHub Action | nothing | `.github/workflows/fleet-liveness.yml` |
| `:17`, `:47` | Drain integrator → main (stamped `--no-ff`) | GitHub Action | `main` | `drain-integrator.yml` |
| `:18` every 3h | Sim test buddy — live verification, report unproven as such | Claude routine | nothing (findings) | Claude Corps #9 |
| `:30` | Prod smoke | Cursor automation **DISABLED** 2026-08-26 | `main` (only when production is red) | [Prod Smoke](https://cursor.com/automations/4ad7743c-7900-11f1-ba66-0e7d0216e441) `4ad7743c-7900-11f1-ba66-0e7d0216e441` |
| `:43` every 3h | Integrator + stamped drain | Claude Code routine | integrator, then `main` | Claude Corps #1 (`43 */3 * * *` — **not hourly**) |
| `:59` | Deploy + backlog | Cursor automation **DISABLED** 2026-08-26 | `main` | [Deploy + backlog](https://cursor.com/automations/75e8fbf5-7900-11f1-ba66-0e7d0216e441) `75e8fbf5-7900-11f1-ba66-0e7d0216e441` |
| `03:40` | E2E smoke suite | GitHub Action | nothing | `e2e-suite.yml` |
| `06:00 Sun` | Branch reaper (dry-run until `REAPER_ARMED`) | GitHub Action | deletes merged `claude/*`/`cursor/*` only when armed | `branch-reaper.yml` |
| `06:23` | Prune merged `claude/*` | GitHub Action | deletes fully-merged `claude/*` only | `prune-merged-branches.yml` |
| every push/PR | unit (vitest, token-lint, cursor-env-check) | GitHub Action | nothing | `e2e-suite.yml` `unit` job |

### Claude LoadOff lane (live)

| Slot (UTC) | Job | Writes |
|---|---|---|
| `08:00` daily | Marketing lane (state pages + funnel) | `claude/lane-marketing` |
| `10:33` daily | Nightly E2E business-cycle (Playwright; older docs had the wrong hour) | findings; fix-forward when red |
| `10:33` Sun | Weekly deep audit (rotating 1c/1e/1b) — **same minute as nightly on Sunday** | `claude/*` session |
| `12:00` Mon | Meta-governor (recommendation only, never edits fleet config) | nothing |
| `14:00` Mon | Weekly outside-auditor (read-only) | nothing |
| `15:11` daily | Fleet watchdog (stall detector; push notification is the deliverable) | nothing |
| `16:49` daily | Prod smoke + fix-forward | integrator + `main` only when production is red |

### Claude Airtable lane (does not write this git repo)

| Slot (UTC) | Job |
|---|---|
| `01:00` daily | Infra crew — nightly build + 13-check |
| `09:00` daily | Human panel — persona walks |
| `15:00` daily | Morning brief — one task, no nagging |
| `19:30` daily | Watchdog — silent unless broken |
| 2026-08-31 15:00 | Trial-decision one-shot |

Same minute-of-hour across **different write targets** is allowed (Claude
marketing `08:00` vs Cursor integrator `:00`; Airtable `19:30` vs Cursor smoke
`:30`; meta-governor / auditor on Monday `:00`). Two writers on **one branch**
in the same minute is not. `src/lib/__tests__/fleet-clock-guard.test.ts`
encodes both. The reaper (Sunday, armed-gated) and the daily prune overlap in
charter — consolidation is a fleet decision, not an agent edit.

**Untitled stays off:** [Untitled](https://cursor.com/automations/61b8e855-76b8-11f1-ba66-0e7d0216e441)
`61b8e855-76b8-11f1-ba66-0e7d0216e441` (HaulDesk improvement cycle) was a second
`main` writer. Observed **disabled** 2026-08-26. Do not re-enable it.

Prompts for Cursor jobs: [`.cursor/automation/`](../../.cursor/automation/README.md).
Claude prompts: [`docs/claude-routines.md`](../claude-routines.md). Owner paste
for Grok Bot: [`docs/grok-bots/`](../grok-bots/README.md). Paste for extending
this operating system to other `ranvir01` repos: [`EXPANSION-PROMPT.md`](EXPANSION-PROMPT.md).
Sanitized owner context: [`OWNER-CONTEXT.md`](OWNER-CONTEXT.md).

---

## How Cursor, Claude, and Grok Bot collaborate (no shared transcript)

They cannot see each other's sessions **across platforms** (Cursor cannot read a
Claude transcript; neither can read a Grok Bot thread). The **commit body** is the
bus between platforms (`Backlog:` trailers, `npm run agent:backlog`). **One branch, one writer.** If a fix already exists on another branch, name it in `Backlog:` and take the next item.

**Grok Bots among themselves can share a thread.** Put 2–6 named Bots in a group
chat; they @mention and hand off so the owner is not the router. Standing groups
and paste files: [`docs/grok-bots/SETUP.md`](../grok-bots/SETUP.md) is the one
owner file (real job titles, project specialists, Claude stand-up board).
Grok Bot still never writes git. Its four scheduled routines (D-009 — Claude
board 07:30, platform sweep 07:00, Friday backup reminder, Monday career scan,
all `America/Los_Angeles`) are read-only and silent-when-healthy, so they do not
join this table's write clock.

**D-007 (code):** Claude still writes git and long prompts. **D-008 (roster):**
the Technical Program Manager **does** spawn job-titled specialists for LoadOff,
BLS, and other `ranvir01` repos. Engineering Communications Lead posts
HAPPENED / IN FLIGHT / SHOULD in Claude stand-up — that is how Grok communicates
every implementation that happened or should happen. Setup: [`docs/grok-bots/SETUP.md`](../grok-bots/SETUP.md).

Daily/weekly **build** sessions that Claude does *not* already run (office, driver, tests,
integrations) remain import-ready Cursor Automations on Grok 4.6 (`DECISIONS.md` D-003) —
table below. They stay off the live table until the owner imports them. **Do not import
marketing / deep-verify / meta-governor** while Claude Corps #4/#5/#7 are live — that is
two writers on one charter.

Until Cursor Integrator / Deploy are re-enabled, GitHub drain `:17`/`:47` plus Claude
integrator every 3h at `:43` are the path to `main`. Ad-hoc Cursor sessions still land
via PR on `cursor/*`.

Cursor Cloud Agents on `cursor/*` land via pull request. `claude/<session>` branches are absorbed by the `:00` (when enabled) / `:43` integrators. Do not put two writers on `main` or the integrator.

## Role slots — import-ready Cursor Automations, Grok 4.6 (D-003 answered 2026-08-19)

Workflow JSONs + full prompts live in [`.cursor/automation/`](../../.cursor/automation/README.md)
— one import per row (cursor.com/automations, ~15 min total), model pinned
`cursor-grok-4.6-high-fast`. Minutes `:07`/`:13`/`:37` are reserved for these; the clock
guard test keeps them clear. Once a slot's first run boots, move its row into the live table.

| Slot (UTC) | Automation | Writes | Charter |
|---|---|---|---|
| `05:13` daily | Build A — office/UX | `claude/lane-office` | office screens, semantic tokens, usability friction, empty states |
| `08:13` daily | Build B — driver + portal | `claude/lane-driver` / `lane-portal` | 390px forced-dark PWA, offline queue, broker/shipper surface |
| `11:13` daily | Build C — tests & verification debt | `claude/lane-tests` | `TEST_GAPS.md` top row; never product code |
| `14:13` daily | Build D — integrations | `claude/lane-integrations` | stub-first adapters, creds shopping-list order |
| `20:13` daily | Build E — marketing/public site | `claude/lane-marketing` | js-budget ratchet, recruiting funnel, `[needs-browser]` tags |
| `07:07` Sat | Deep-verify (finder) | `claude/fleet-deep-verify` (docs only) | local rig + data-integrity audit; reads nightly E2E results |
| `09:07` Sun | Red-team review (read-only) | `claude/fleet-red-team` (docs only) | week's `main` diff vs AGENTS.md invariants |
| `18:07` Sun | Meta-governor (audit) | `claude/fleet-meta-governor` (docs only) | fleet audit vs this file; strays → `DECISIONS.md` |
| `19:37` Fri | Owner digest | `claude/fleet-owner-digest` (docs only) | `docs/ops/weekly-YYYY-MM-DD.md` + top-3 owner actions |
| `10:07` Mon | Dependency + security pass | `claude/fleet-dependency-pass` | `npm audit`, patch/minor only; majors → `DECISIONS.md` |

Five build lanes + nightly E2E + weekend verify/review + the hourly mechanical loop ≈ the
manual's ~9 scheduled sessions/day ceiling. That IS the maxed-out shape — more hourly feature
agents duplicate fixes and race the integrator (`docs/research/2026-08/prompt-6-agent-team.md` §1.1).
The Claude-routine prompt blocks for the same charters remain in
[`docs/claude-routines.md`](../claude-routines.md) §"Scheduled fleet v2" as the fallback —
never run a slot on both platforms at once.

## One charter, one platform (Cursor ↔ Claude ↔ Grok)

The fleets collaborate through branches and commit bodies, never by sharing a charter.
A charter running on two code platforms is two writers on one lane. Grok Bot is a
**watcher**, not a third writer — do not give it a branch.

Claude Corps names and crons below are from the 2026-08-26 master context (older docs
had the nightly E2E at the wrong hour).

### Safe to import on Cursor (Claude has no twin)

| Cursor slot | Writes | Why it's safe |
|---|---|---|
| Build A office `05:13` | `claude/lane-office` | no Claude scheduled twin |
| Build B driver+portal `08:13` | `claude/lane-driver` | no Claude scheduled twin |
| Build C tests `11:13` | `claude/lane-tests` | no Claude scheduled twin |
| Build D integrations `14:13` | `claude/lane-integrations` | no Claude scheduled twin |
| Owner digest Fri `19:37` | docs only | no Claude twin |
| Dependency pass Mon `10:07` | `claude/fleet-dependency-pass` | no Claude twin |

### Do not import while Claude is live

| Cursor slot | Live Claude twin | Action |
|---|---|---|
| Build E marketing `20:13` | Marketing lane `08:00` → `claude/lane-marketing` | skip Cursor; Claude keeps it |
| Deep-verify Sat `07:07` | Weekly deep audit Sun `10:33` | skip Cursor |
| Meta-governor Sun `18:07` | Meta-governor Mon `12:00` | skip Cursor |
| Red-team Sun `09:07` | Weekly outside-auditor Mon `14:00` | skip Cursor (same read-only charter) |
| Untitled / improvement cycle | — | **keep disabled** |

### Deliberate same-charter pairs (different minutes, fetch-before-write)

These are redundancy, not duplicates — only if the owner re-enables the Cursor side.

| Pair | Why it stays |
|---|---|
| Cursor `:00` integrator + Claude `:43` every 3h | Same integrator branch; different minutes; both fetch+rebase first. Cursor side currently disabled — Claude + GitHub drain cover it. |
| Cursor `:30` smoke + Claude `16:49` smoke | Both read-only unless production is red. Later fixer fetches and re-checks; first fixer wins. |
| Claude `10:33` nightly E2E | Needs a browser. Cursor image has none. Do not re-create as a Cursor automation. |

Grok Bot (Technical Program Manager + job-titled specialists) has **no git
charter**. Named Bots collaborate in group chats (2–6), not as extra writers on
`main`. Engineering Communications Lead publishes HAPPENED / IN FLIGHT / SHOULD;
Claude or Cursor picks SHOULD items from that board or `Backlog:`.

Everything else in the collaboration contract is unchanged: `claude/*` branches are absorbed
by the `:00`/`:43` integrators, `cursor/*` session work lands via PR, the commit-body
`Backlog:` trailer with `[needs-browser]`/`[needs-sidecars]`/`[needs-owner]`/`[blocked-by …]`
tags is the only cross-platform channel, and the first hard step of every session on either
platform is the search-before-you-fix dedupe (`AGENT_INTEROP.md` §3).

---

## Role map (website + FMS "get it running" team)

Every seat of a full delivery org, mapped onto a job that already exists here. The
"get it up and running" scope: post-launch seats (Customer Success / Training Lead,
Support Engineers) are **explicitly excluded**. Nobody hires a parallel 18-agent org
that races the integrator — a seat is a *mechanism*, not another hourly firing.

### 1 · Leadership & product

| Seat | Who actually runs it |
|---|---|
| Product Manager / Product Owner | The ranked backlog (`npm run agent:backlog`, `TOP_10.md` dollars-per-owner-hour); the owner answers scope in `docs/ops/DECISIONS.md` |
| Project Manager / Scrum Master | The clock in `AGENT_INTEROP.md` §1 + integrator serialization — one item per session, one branch one writer; no standing agent |
| Technical Lead / Eng Manager | Standing rules in `AGENTS.md` + the integrator's conflict/superset reviews + the gates (typecheck, license, token-lint, js-budget) |
| Business Analyst (logistics) | Research corpus (`docs/research/**`) + domain notes in commit `Backlog:`; money/HOS/IFTA ambiguity stops with `[needs-owner]` |

### 2 · Design

| Seat | Who actually runs it |
|---|---|
| UI/UX Designer | Build A (office/UX) + Build B (driver+portal) dormant slots; ad-hoc sessions in those territories today |
| Product Designer / UX Researcher | QA rig drives (owner/dispatcher/driver role walks, logged in `claude-routines.md`) + `design-qa` gate (contrast, tap targets, overflow) |
| Visual / Brand Designer | `thind-brand-identity` skill + `claude/lane-marketing`; `token-lint` keeps redesigned components on tokens |

### 3 · Engineering — frontend

| Seat | Who actually runs it |
|---|---|
| Frontend (web) | `claude/lane-office`, `lane-portal`, `lane-marketing` + session branches; `[needs-browser]` hands visual gates to CI/local |
| Mobile (driver app) | `claude/lane-driver` — the PWA at 390px forced-dark IS the mobile app (offline queue, camera PODs, push) |

### 4 · Engineering — backend & platform

| Seat | Who actually runs it |
|---|---|
| Backend | Server actions + `src/lib/hub/**` via session branches; permissions in actions, carrier-scoped queries |
| Full-stack | `:59` deploy agent Phase B — one ranked backlog item per hour, any territory |
| Database Engineer / DBA | Append-only `migrations/hub/NNN_*.sql` through the integrator; `npm run db:migrate`; tenancy harness |
| DevOps / Cloud / SRE | Drain Action `:17`/`:47` + fleet liveness `:10` + prod smoke `:30` + Vercel deploy on `main` + branch hygiene Actions |
| Integration Engineers | `claude/lane-integrations` — registry + stub-first adapters + contract suite before credentials |

### 5 · Specialized technical

| Seat | Who actually runs it |
|---|---|
| Security Engineer | Red-team automation (Sun `09:07`, import-ready) + tenancy/permissions audit prompts (`agent-improvement-loop.md` §1c) + `license:audit` + never-log-credentials rule |
| QA / Test Automation | `claude/lane-tests` + nightly E2E `03:40` + prod smoke `:30` + `TEST_GAPS.md` ranked by dollars-at-risk |
| Data / Analytics Engineer | `claude/lane-analytics` (reports, KPI libs, owner dashboard) |
| GIS / Mapping | Rust compute sidecar territory (`lane-sidecars`), `[needs-sidecars]` — not a scheduled seat |

### 6 · Domain & operations

| Seat | Who actually runs it |
|---|---|
| Fleet / Logistics SME | `docs/research/**` corpus + `[needs-owner]` stops — the owner IS the SME of record |
| Technical Writer | `claude/lane-docs` — docs drift walks, runbooks, `go-live-check` |
| Customer Success / Training Lead | **Excluded** — post-launch seat |
| Support Engineers | **Excluded** — post-launch seat |

### 7 · Scaling seats

| Seat | Who actually runs it |
|---|---|
| Solutions Architect | Fixed language boundaries (`docs/architecture/trilingual-stack.md`) + do-not-build list; changes are `[needs-owner]` |
| Compliance Specialist (FMCSA/IFTA/ELD) | `claude/lane-compliance` + `[needs-owner]` for legal calls |
| Marketing / Content | `claude/lane-marketing` — measured-gaps mission list, never by feel |

---

## What still blocks unattended 24/7

The repo already runs unattended on **Claude + GitHub Actions**. You do not have to come
back to a Cursor agent to keep `main` moving. Remaining owner clicks:
[`OWNER-WORKSHEET.md`](OWNER-WORKSHEET.md).

1. ~~Fix the environment so scheduled agents boot~~ **FIXED 2026-08-19.** SYSTEM build
   [`bld-20260819-e34379d9-3634-4174-b245-e3c81319a7a6`](https://cursor.com/dashboard/cloud-agents/builds/bld-20260819-e34379d9-3634-4174-b245-e3c81319a7a6)
   went green 08:33 UTC. Then on **2026-08-26** every Cursor dashboard automation was
   **disabled** (Integrator, Prod Smoke, Deploy + backlog, Untitled). Boot is no longer
   the blocker — the Cursor side is simply off. Claude `43 */3` + drain `:17`/`:47` cover it.
2. ~~Disable Untitled~~ **DONE** (disabled as of 2026-08-26). Do not re-enable it.
3. Optional: re-enable Integrator / Prod Smoke / Deploy + backlog for Cursor redundancy.
   Import only the Cursor role slots Claude does not already run (office/driver/tests/
   integrations). Do not import marketing / deep-verify / meta-governor twins.
4. Follow **`docs/grok-bots/SETUP.md`** — retitle Bots, spawn project specialists,
   open groups including Claude stand-up. No git.
5. D-001 — arm the branch reaper after dry-runs, or the integrator keeps triaging dead branches.
6. Human-dated: Form 2290 by Aug 31; Airtable Team ~Sep 2; SMTP App Password (30+ days dead).

Cursor Cloud starts every automation on a disposable `cursor/<run-name>-*` branch even when
`loadoff-*.workflow.json` names `claude/hauldesk-project-setup-l1luoo` or `main`. The
integrator and deploy prompts already `git checkout` the real target after boot. Do not add
more automations to paper over that — one writer per real branch.

GitHub Actions (drain `:17`/`:47`, liveness `:10`, E2E `03:40`) do not need the Cursor
image. They keep the repo moving while Cursor is down. Claude `claude/*` session branches
are the product-work intake; this liveness Action pages when those wait and the integrator
has not moved.
