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

## Live right now (2026-08-19)

| Slot (UTC) | Job | Platform | Writes | Dashboard / id |
|---|---|---|---|---|
| `:00` | Integrator — absorb one pending `claude/*` | Cursor automation | `claude/hauldesk-project-setup-l1luoo` | [Integrator](https://cursor.com/automations/880eec29-78fd-11f1-ba66-0e7d0216e441) `880eec29-78fd-11f1-ba66-0e7d0216e441` |
| `:10` | **Fleet liveness** — `npm run agent:status`; red only on stall (exit 2) | GitHub Action | nothing | `.github/workflows/fleet-liveness.yml` |
| `:17`, `:47` | Drain integrator → main (stamped `--no-ff`) | GitHub Action | `main` | `drain-integrator.yml` |
| `:30` | Prod smoke — `/hub/login` LoadOff, `/hub` not 5xx, `/api/version` SHA | Cursor automation | `main` (only when production is red) | [Prod Smoke](https://cursor.com/automations/4ad7743c-7900-11f1-ba66-0e7d0216e441) `4ad7743c-7900-11f1-ba66-0e7d0216e441` |
| `:43` | Integrator + stamped drain | Claude Code routine | integrator, then `main` | `trig_01B99W8MteaPtzwk124DFF4w` (`docs/claude-routines.md`) |
| `:59` | Deploy + backlog — catch-up drain, else one `Backlog:` item | Cursor automation | `main` | [Deploy + backlog](https://cursor.com/automations/75e8fbf5-7900-11f1-ba66-0e7d0216e441) `75e8fbf5-7900-11f1-ba66-0e7d0216e441` |
| `03:40` | E2E smoke suite | GitHub Action | nothing | `e2e-suite.yml` |
| `06:00 Sun` | Branch reaper (dry-run until `REAPER_ARMED`) | GitHub Action | deletes merged `claude/*`/`cursor/*` only when armed | `branch-reaper.yml` |
| `06:23` | Prune merged `claude/*` (tier-1 always; tier-2 zero-delta dry-run) | GitHub Action | deletes fully-merged `claude/*` only | `prune-merged-branches.yml` |
| every push/PR | unit (vitest, token-lint, cursor-env-check) | GitHub Action | nothing | `e2e-suite.yml` `unit` job |

No two rows share a minute-of-hour (reaper's Sunday `06:00` is the one exception — its
merged-only targets are disjoint from the `:00` integrator's unmerged-only set).
`src/lib/__tests__/fleet-clock-guard.test.ts` fails the build if a workflow schedule is
added off this roster or onto a taken minute. The reaper (Sunday, armed-gated) and the
daily prune overlap in charter — consolidation is a fleet decision, not an agent edit.

**Stray (disable — now URGENT):** Cursor automation [Untitled](https://cursor.com/automations/61b8e855-76b8-11f1-ba66-0e7d0216e441) `61b8e855-76b8-11f1-ba66-0e7d0216e441` fires as "HaulDesk improvement cycle" — a second deploy/backlog writer on `main`. While the environment was broken it died in ~8s; since the 2026-08-19 fix it **actually boots** and was observed RUNNING in the same minute as Deploy + backlog (09:02 UTC). Two writers on one branch is the fleet's most expensive mistake. Turn it off; keep Deploy + backlog above.

Prompts for the three Cursor jobs live in [`.cursor/automation/`](../../.cursor/automation/README.md). Claude's copy-paste prompts live in [`docs/claude-routines.md`](../claude-routines.md).

---

## How Cursor and Claude collaborate (no shared transcript)

They cannot see each other's sessions. The **commit body** is the bus (`Backlog:` trailers, `npm run agent:backlog`). **One branch, one writer.** If a fix already exists on another branch, name it in `Backlog:` and take the next item.

Daily/weekly **build** sessions (office, driver, tests, integrations, marketing) are **Cursor
Automations on Grok 4.6** (`DECISIONS.md` D-003, answered 2026-08-19) — import-ready in
`.cursor/automation/`, table below. They stay off the live table until the owner imports them
and a first run boots — agents do not add dashboard schedules. Until then, the `:59` deploy
agent ships one ranked backlog item per hour when not in catch-up, and ad-hoc Cursor/Claude
sessions push their own branches.

Cursor Cloud Agents on `cursor/*` land via pull request. `claude/<session>` branches are absorbed by the `:00`/`:43` integrators. Do not put two writers on `main` or the integrator.

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

1. ~~Fix the environment so scheduled agents boot~~ **FIXED 2026-08-19.** SYSTEM build
   [`bld-20260819-e34379d9-3634-4174-b245-e3c81319a7a6`](https://cursor.com/dashboard/cloud-agents/builds/bld-20260819-e34379d9-3634-4174-b245-e3c81319a7a6)
   went green 08:33 UTC (install-only `npm ci`, no Docker — first healthy image after three
   weeks of 418-byte Dockerfile failures), and the 09:00-hour scheduled runs **booted**:
   Integrator IDLE-complete, Prod Smoke IDLE-complete, Deploy RUNNING — all on
   `cursor-grok-4.6-high-fast`, ending the ERROR-in-8s streak.
2. **Disable the Untitled duplicate automation (row above) — URGENT now that it boots.**
   Observed RUNNING in the same minute as Deploy + backlog (09:02 UTC, 2026-08-19); both
   write `main`.
3. D-003 answered (Cursor Automations, Grok 4.6): **import the ten role-slot JSONs** from
   `.cursor/automation/` (README "Activate / fix"). Mechanical 24/7 does not wait on them.
4. D-001 — arm the branch reaper after dry-runs, or the integrator keeps triaging dead branches.

Cursor Cloud starts every automation on a disposable `cursor/<run-name>-*` branch even when
`loadoff-*.workflow.json` names `claude/hauldesk-project-setup-l1luoo` or `main`. The
integrator and deploy prompts already `git checkout` the real target after boot. Do not add
more automations to paper over that — one writer per real branch.

GitHub Actions (drain `:17`/`:47`, liveness `:10`, E2E `03:40`) do not need the Cursor
image. They keep the repo moving while Cursor is down. Claude `claude/*` session branches
are the product-work intake; this liveness Action pages when those wait and the integrator
has not moved.
