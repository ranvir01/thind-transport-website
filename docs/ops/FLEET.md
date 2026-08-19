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
| every push/PR | unit (vitest, token-lint, cursor-env-check) | GitHub Action | nothing | `e2e-suite.yml` `unit` job |

**Stray (disable):** Cursor automation [Untitled](https://cursor.com/automations/61b8e855-76b8-11f1-ba66-0e7d0216e441) `61b8e855-76b8-11f1-ba66-0e7d0216e441` is enabled and fires as "HaulDesk improvement cycle" — a second deploy/backlog writer on `main`. Two writers on one branch is the fleet's most expensive mistake. Turn it off; keep Deploy + backlog above.

Prompts for the three Cursor jobs live in [`.cursor/automation/`](../../.cursor/automation/README.md). Claude's copy-paste prompts live in [`docs/claude-routines.md`](../claude-routines.md).

---

## How Cursor and Claude collaborate (no shared transcript)

They cannot see each other's sessions. The **commit body** is the bus (`Backlog:` trailers, `npm run agent:backlog`). **One branch, one writer.** If a fix already exists on another branch, name it in `Backlog:` and take the next item.

Daily/weekly **build** sessions (office, driver, tests, integrations, marketing) are Claude routines in the 2026-08-07 manual (`DECISIONS.md` D-003). They stay off this table until the owner creates them — agents do not add dashboard schedules. Until then, the `:59` deploy agent ships one ranked backlog item per hour when not in catch-up, and ad-hoc Cursor/Claude sessions push their own branches.

Cursor Cloud Agents on `cursor/*` land via pull request. `claude/<session>` branches are absorbed by the `:00`/`:43` integrators. Do not put two writers on `main` or the integrator.

---

## Role map (website + FMS "get it running" team)

Post-launch support / customer-success seats are out of scope. Everyone else maps onto a job that already exists, so we do not hire a parallel 18-person agent org that races the integrator.

| Seat | Who actually runs it |
|---|---|
| Product / prioritization | `:59` deploy + backlog (`npm run agent:backlog`); `[needs-owner]` items stay in `docs/ops/DECISIONS.md` |
| Tech lead / architecture | Integrator (shared files only); standing rules in `AGENTS.md` |
| BA / logistics SME | Domain notes in commit `Backlog:`; money/HOS/IFTA ambiguity stops (`[needs-owner]`) |
| UI/UX + visual/brand | `claude/lane-marketing` (public site), `claude/lane-office`, `claude/lane-driver` — `[needs-browser]` for visual gates |
| Frontend (web) | Same three lanes + session branches |
| Mobile (driver PWA) | `claude/lane-driver` |
| Backend / full-stack | office + integrations + session branches; permissions in server actions |
| DBA / schema | append-only `migrations/hub/NNN_*.sql` via integrator |
| DevOps / SRE | drain Action + Vercel on `main`; this liveness Action |
| Integrations | `claude/lane-integrations` (stub-first doctrine) |
| Security | tenancy/permissions audits in backlog; `license:audit`; never log credential values |
| QA / test automation | `claude/lane-tests`, nightly E2E `03:40`, prod smoke `:30` |
| Data / analytics | `claude/lane-analytics` when a backlog item in that territory is top |
| GIS | not a scheduled seat; routing via sidecars `[needs-sidecars]` |
| Tech writer | `claude/lane-docs` |
| Compliance (FMCSA/IFTA/ELD) | `claude/lane-compliance` + `[needs-owner]` for legal calls |

---

## What still blocks unattended 24/7

1. **Promote the green environment build for scheduled agents.** Recurring SYSTEM
   build [`bld-20260819-e34379d9-3634-4174-b245-e3c81319a7a6`](https://cursor.com/dashboard/cloud-agents/builds/bld-20260819-e34379d9-3634-4174-b245-e3c81319a7a6)
   **SUCCEEDED** 2026-08-19 08:33 UTC (install-only `npm ci`, no Docker). That is the first
   healthy SYSTEM image after three weeks of 418-byte Dockerfile failures. This hand-agent
   pod still reports `no_healthy_builds` because it booted just-in-time before that snapshot.
   Open [the environment](https://cursor.com/dashboard/cloud-agents/environments/e/5241c374-0579-442f-bf88-309dbcbe37f3),
   **Save** the install-only config, **Enable builds**, and watch the next `:00` Integrator
   run — it must leave `ERROR` / `setupStatus: null` behind. Until a scheduled run actually
   boots, treat Cursor automations as down.
2. Disable the Untitled duplicate automation (row above). It is still **enabled** and
   ERROR's on the same hour as Deploy + backlog.
3. D-003 in `DECISIONS.md` — Claude daily build slots. Optional; mechanical 24/7
   (integrator, drain, smoke, liveness) does not wait on it. Agents cannot create claude.ai
   routines.
4. D-001 — arm the branch reaper after dry-runs, or the integrator keeps triaging dead branches.

Cursor Cloud starts every automation on a disposable `cursor/<run-name>-*` branch even when
`loadoff-*.workflow.json` names `claude/hauldesk-project-setup-l1luoo` or `main`. The
integrator and deploy prompts already `git checkout` the real target after boot. Do not add
more automations to paper over that — one writer per real branch.

GitHub Actions (drain `:17`/`:47`, liveness `:10`, E2E `03:40`) do not need the Cursor
image. They keep the repo moving while Cursor is down. Claude `claude/*` session branches
are the product-work intake; this liveness Action pages when those wait and the integrator
has not moved.
