# LoadOff agent fleet — Cursor Automations

The whole 24/7 fleet runs as Cursor Automations on your **Cursor subscription** (cloud compute
on, no API key). Model is pinned to **Grok 4.6** (`cursor-grok-4.6-high-fast`) in every
workflow JSON — owner decision 2026-08-19 (`docs/ops/DECISIONS.md` D-003). If an import
rejects that slug, pick **Grok 4.6** in the model dropdown; the slug is the only field to fix.

## Hourly mechanical loop (live on the dashboard)

| Automation | Schedule (UTC) | Branch | Prompt | Workflow JSON |
|------------|----------------|--------|--------|---------------|
| **Integrator** | `:00` hourly | `claude/hauldesk-project-setup-l1luoo` | [`loadoff-integrator.prompt.md`](loadoff-integrator.prompt.md) | [`loadoff-integrator.workflow.json`](loadoff-integrator.workflow.json) |
| **Prod smoke** | `:30` hourly | `main` | [`loadoff-prod-smoke.prompt.md`](loadoff-prod-smoke.prompt.md) | [`loadoff-prod-smoke.workflow.json`](loadoff-prod-smoke.workflow.json) |
| **Deploy + backlog** | `:59` hourly | `main` | [`loadoff-deploy.prompt.md`](loadoff-deploy.prompt.md) | [`loadoff-deploy.workflow.json`](loadoff-deploy.workflow.json) |

## Role slots (import-ready, D-003)

| Automation | Schedule (UTC) | Branch | Files |
|------------|----------------|--------|-------|
| **Build A — office/UX** | `13 5 * * *` | `claude/lane-office` | [`loadoff-build-office.workflow.json`](loadoff-build-office.workflow.json) |
| **Build B — driver + portal** | `13 8 * * *` | `claude/lane-driver` (or `lane-portal`) | [`loadoff-build-driver-portal.workflow.json`](loadoff-build-driver-portal.workflow.json) |
| **Build C — tests** | `13 11 * * *` | `claude/lane-tests` | [`loadoff-build-tests.workflow.json`](loadoff-build-tests.workflow.json) |
| **Build D — integrations** | `13 14 * * *` | `claude/lane-integrations` | [`loadoff-build-integrations.workflow.json`](loadoff-build-integrations.workflow.json) |
| **Build E — marketing** | `13 20 * * *` | `claude/lane-marketing` | [`loadoff-build-marketing.workflow.json`](loadoff-build-marketing.workflow.json) |
| **Deep-verify** (finder) | `7 7 * * 6` Sat | `claude/fleet-deep-verify` | [`loadoff-deep-verify.workflow.json`](loadoff-deep-verify.workflow.json) |
| **Red-team** (read-only) | `7 9 * * 0` Sun | `claude/fleet-red-team` | [`loadoff-red-team.workflow.json`](loadoff-red-team.workflow.json) |
| **Meta-governor** (audit) | `7 18 * * 0` Sun | `claude/fleet-meta-governor` | [`loadoff-meta-governor.workflow.json`](loadoff-meta-governor.workflow.json) |
| **Owner digest** | `37 19 * * 5` Fri | `claude/fleet-owner-digest` | [`loadoff-owner-digest.workflow.json`](loadoff-owner-digest.workflow.json) |
| **Dependency pass** | `7 10 * * 1` Mon | `claude/fleet-dependency-pass` | [`loadoff-dependency-pass.workflow.json`](loadoff-dependency-pass.workflow.json) |

Each has a matching `*.prompt.md` with the full charter. Cursor starts every automation run on
a disposable `cursor/<run-name>-*` branch regardless of `gitConfig.branch` — the prompts all
begin with `git checkout -B <target>`, so the work lands on the branch in the table. The `:00`
integrator absorbs every `claude/*` branch; finders write `docs/ops/*` only.

```
build lanes (daily) ──▶ claude/lane-* ─┐
finders (Sat/Sun/Fri/Mon) ─▶ claude/fleet-* ─┤─▶ integrator (:00) ─▶ deploy (:59) ─▶ main ─▶ Vercel
ad-hoc sessions ──────▶ claude/<session> ─┘        prod smoke (:30) checks thindtransport.com/hub
```

## Helper scripts

| Command | Purpose |
|---------|---------|
| `npm run agent:status` | Branch drift + recent `Backlog:` blocks; exit 1 = catch-up mode |
| `npm run agent:branches` | Pending `claude/*` branches not on main (session + lane); top = integrator's next merge |
| `npm run agent:backlog` | Ranked backlog from last 30 commits on `main` |
| `npm run prod:smoke` | HTTP smoke: `/hub/login` shows LoadOff, `/hub` not 5xx |

## Activate / fix (one time, ~15 min)

Claude Corps is the live scheduled writer (14 tasks). These Cursor automations are
**optional redundancy**. As of 2026-08-26 all four dashboard copies were **disabled**.

1. **If you want Cursor drain/smoke redundancy:** re-enable Integrator, Prod Smoke, and
   Deploy + backlog (do not import duplicates). Set **Model: Grok 4.6**, repository
   `ranvir01/thind-transport-website`, cloud compute on.

| Dashboard name | Id |
|----------------|-----|
| Integrator | [`880eec29-78fd-11f1-ba66-0e7d0216e441`](https://cursor.com/automations/880eec29-78fd-11f1-ba66-0e7d0216e441) |
| Prod Smoke | [`4ad7743c-7900-11f1-ba66-0e7d0216e441`](https://cursor.com/automations/4ad7743c-7900-11f1-ba66-0e7d0216e441) |
| Deploy + backlog | [`75e8fbf5-7900-11f1-ba66-0e7d0216e441`](https://cursor.com/automations/75e8fbf5-7900-11f1-ba66-0e7d0216e441) |

2. **Keep Untitled disabled** [`61b8e855-76b8-11f1-ba66-0e7d0216e441`](https://cursor.com/automations/61b8e855-76b8-11f1-ba66-0e7d0216e441)
   — "HaulDesk improvement cycle", a second writer on `main`. Already off as of 2026-08-26.
3. **Import only Cursor slots Claude does not already run** (office / driver / tests /
   integrations) at [cursor.com/automations](https://cursor.com/automations/new). Keep cron
   minutes `:07`/`:13`/`:37`. **Do not import** marketing / deep-verify / meta-governor /
   red-team while those Claude tasks are live — full table in
   [`docs/ops/FLEET.md`](../../docs/ops/FLEET.md) ("One charter, one platform").
   Grok Bot paste files: [`docs/grok-bots/`](../../docs/grok-bots/README.md).
4. If the environment still fails to boot (runs ERROR in seconds with no setup logs): Save the
   install-only environment config — dashboard → environments →
   [`5241c374-0579-442f-bf88-309dbcbe37f3`](https://cursor.com/dashboard/cloud-agents/environments/e/5241c374-0579-442f-bf88-309dbcbe37f3).
5. **Manual first run:** trigger **Deploy + backlog** once to drain integrator → `main` if
   `npm run agent:status` shows catch-up mode *and* that automation is enabled.
6. After Vercel deploys, run `npm run prod:smoke` — expect **LoadOff** on `/hub/login`.

## Catch-up vs steady state

Deploy agent runs **Phase A** while integrator is >3 commits ahead of `main` (see `AGENT_CATCHUP_THRESHOLD`):
merge integrator → `main`, verify, push — **one merge per run**, no new feature work.

When caught up, **Phase B** ships one ranked `Backlog:` item per hour.

## Drain backstop (GitHub Action, last resort)

`.github/workflows/drain-integrator.yml` (`:17` and `:47` UTC) covers the 2026-07-10 failure mode:
both agent platforms down while the integrator sits green ahead of `main`, so production goes
stale. It publishes to `main` ONLY when the integrator is >3 ahead — or, since 2026-08-07, when
the oldest pending commit is ≥12h old (`MAX_PENDING_AGE_HOURS`; a count-only gate stranded a money
fix for two days while the fleet was quiet) — **and** `main` is still an ancestor of it **and**
`npm run build`, `npx vitest run`, `typecheck-gate` and `license-audit` are green on that exact
tip. It never resolves conflicts and never launches agents. Each drain also warns (non-blocking)
on pending commits missing the `Backlog:` trailer.

It publishes as a stamped `--no-ff` merge, never a fast-forward ref push — a plain fast-forward
lands a SHA (and a tree) Vercel has already built as a preview, and the dedupe then skips the
production build entirely. `scripts/drain-merge-guard.mjs` enforces this. The last step carries the
merge commit back onto the integrator branch so the next run's gate still sees a linear history.

`drain-fallback.yml` (`:15`) and `main-drain-fallback.yml` (`:20`) were deleted 2026-07-28 — three
copies of this job under three `concurrency` groups raced each other every hour, and
`main-drain-fallback.yml` published with the bare ref push the guard exists to prevent.

**No kill switch.** This section previously documented a repo variable `DRAIN_FALLBACK_DISABLED=1`;
no workflow in this repo has ever read it, so setting it does nothing. To stop the drain, disable
the workflow from the Actions tab (or delete its `schedule:` trigger).

## Deprecated (removed 2026-08-19)

`hauldesk-improvement-cycle.prompt.md` / `.workflow.json` were deleted — they were the import
template for the stray "HaulDesk improvement cycle" automation (a second `main` writer that
raced Deploy + backlog). Use **`loadoff-deploy.*`**. The dashboard copy still exists until the
owner disables it (Untitled `61b8e855-76b8-11f1-ba66-0e7d0216e441`).

Full playbook: [`docs/agent-improvement-loop.md`](../../docs/agent-improvement-loop.md).

## Do not use

- `CURSOR_API_KEY` / `api.cursor.com/v1/agents` — bills outside your subscription
- GitHub Actions to launch agents — removed from this repo for that reason
  (the drain-integrator Action above is a plain git job, not an agent)

## Working alongside the other agents

Claude Code sessions and scheduled routines write to this repo in parallel with these automations,
and neither side can see the other's transcript. The contract that keeps them out of each other's
way — the full schedule, who may push to which branch, and the `Backlog:` tags that hand work to the
platform that can run it — is [`docs/ops/AGENT_INTEROP.md`](../../docs/ops/AGENT_INTEROP.md). Paste
[`docs/cursor-agent-preamble.md`](../../docs/cursor-agent-preamble.md) at the top of any Cursor agent
you start by hand.

## Agent environment (`.cursor/environment.json`)

Every cloud-compute agent — the automations above, and background agents you start by hand — boots
from [`.cursor/environment.json`](../environment.json). It declares **no custom image on purpose**:
Cursor boots its own default machine and runs the `install` line, which is the same recipe CI uses
(`npm ci --ignore-scripts` + `npm rebuild bcrypt sharp`). Nothing in `src/` imports canvas, and CI
proves that recipe carries a full production build and the whole e2e suite.

That default is a scar. A custom `.cursor/Dockerfile` shipped on 2026-07-26 with no `FROM` line, so
every environment build failed at parse time and **no agent on this repo could start until
2026-08-19** — three weeks, silently, because nothing here builds that image and the failure never
reached the repo. A custom image is one more thing between you and a working agent; the bar for
putting one back is a build you have watched go green.

[`.cursor/Dockerfile`](../Dockerfile) is still here as the opt-in image (pinned Node 22 + the
node-canvas headers that `scripts/extract-pdf-pages.mjs` and `fix-legacy-signatures.mjs` need). It is
valid and unreferenced. To use it, add `"build": { "dockerfile": "Dockerfile", "context": "." }` to
environment.json and re-import.

**Cursor keeps its own copy.** The environment editor saves the config server-side, and that saved
copy — not the file in this repo — is what runs. After changing anything under `.cursor/`, open the
environment in Cursor and re-import from the repository, or the old one keeps failing. A build log
whose `transferring dockerfile: NNNB` does not match `wc -c .cursor/Dockerfile` is that mismatch,
every time — and a build log at all, when environment.json declares no build, means the saved copy is
stale.

Changed anything under `.cursor/`? Run `npm run cursor:env-check` — it catches what a `docker build`
would reject (missing `FROM`, a `CMD`/`ENTRYPOINT` Cursor overrides, a context outside the repo, a
missing install script), and it checks the opt-in Dockerfile too, so the day someone wires it back up
is not the day they discover it never parsed. CI runs it in the `unit` job of `e2e-suite.yml`. It is
static validation, not a build: after a real change, start one agent and watch it boot once.

## Manual run

In Cursor chat: `@loadoff-deploy.prompt.md`, `@loadoff-integrator.prompt.md`, or `@loadoff-prod-smoke.prompt.md`.
