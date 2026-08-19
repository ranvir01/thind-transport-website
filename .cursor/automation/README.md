# LoadOff agent fleet — Cursor Automations

Three scheduled background agents keep lane work merged, shipped to `main`, and verified live on
production. All run on your **Cursor subscription** (model **Auto**, cloud compute on) — no API key.

| Automation | Schedule (UTC) | Branch | Prompt | Workflow JSON |
|------------|----------------|--------|--------|---------------|
| **Integrator** | `:00` every hour (`0 * * * *`) | `claude/hauldesk-project-setup-l1luoo` | [`loadoff-integrator.prompt.md`](loadoff-integrator.prompt.md) | [`loadoff-integrator.workflow.json`](loadoff-integrator.workflow.json) |
| **Prod smoke** | `:30` every hour (`30 * * * *`) | `main` | [`loadoff-prod-smoke.prompt.md`](loadoff-prod-smoke.prompt.md) | [`loadoff-prod-smoke.workflow.json`](loadoff-prod-smoke.workflow.json) |
| **Deploy + backlog** | `:59` every hour (`59 * * * *`) | `main` | [`loadoff-deploy.prompt.md`](loadoff-deploy.prompt.md) | [`loadoff-deploy.workflow.json`](loadoff-deploy.workflow.json) |

```
lane agents ──▶ claude/lane-* ──▶ integrator (:00) ──▶ deploy (:59) ──▶ main ──▶ Vercel
                                              prod smoke (:30) checks thindtransport.com/hub
```

## Helper scripts

| Command | Purpose |
|---------|---------|
| `npm run agent:status` | Branch drift + recent `Backlog:` blocks; exit 1 = catch-up mode |
| `npm run agent:branches` | Pending `claude/*` branches not on main (session + lane); top = integrator's next merge |
| `npm run agent:backlog` | Ranked backlog from last 30 commits on `main` |
| `npm run prod:smoke` | HTTP smoke: `/hub/login` shows LoadOff, `/hub` not 5xx |

## Activate (one time, ~5 min)

1. Open **[cursor.com/automations](https://cursor.com/automations/new)** (or Cursor → Automations → New).
2. Create **three** automations — import each `loadoff-*.workflow.json` or paste the matching `*.prompt.md`.
3. Set **Repository:** `ranvir01/thind-transport-website` with the branch shown in the table above.
4. Enable **cloud compute** on all three.
5. Confirm the automation bot has **write access** to the repo.
6. **Manual first run:** trigger **Deploy + backlog** once to drain integrator → `main` if
   `npm run agent:status` shows catch-up mode.
7. After Vercel deploys, run `npm run prod:smoke` — expect **LoadOff** on `/hub/login`.

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

## Deprecated (aliases)

The old single-automation files still work for `@` references but are superseded:

- `hauldesk-improvement-cycle.prompt.md` → use **`loadoff-deploy.prompt.md`**
- `hauldesk-improvement-cycle.workflow.json` → use **`loadoff-deploy.workflow.json`**

Full playbook: [`docs/agent-improvement-loop.md`](../../docs/agent-improvement-loop.md).

## Do not use

- `CURSOR_API_KEY` / `api.cursor.com/v1/agents` — bills outside your subscription
- GitHub Actions to launch agents — removed from this repo for that reason
  (the drain-integrator Action above is a plain git job, not an agent)

## Agent environment (`.cursor/environment.json` + `.cursor/Dockerfile`)

Every cloud-compute agent — automations above, and background agents you start by hand — boots the
image built from [`.cursor/Dockerfile`](../Dockerfile). That is a plain `docker build`: the file has
to be a complete image (`FROM ubuntu:24.04` + everything the loop needs), **not** a fragment layered
onto a Cursor base. It shipped as a bare `RUN apt-get ...` with no `FROM` from 2026-07-26 to
2026-08-19, so every environment build failed at parse time and no agent on this repo could start.

The image carries Node 22 (CI's pin), node-gyp/node-canvas headers, Chrome's shared libraries for
the puppeteer-backed gates (`design-qa`, `qa:a11y`, `js-budget`), and Go + Rust for
`npm run test:sidecars`. `install` then runs `scripts/setup-canvas-deps.sh` (a no-op on this image —
it verifies the headers) and `npm install`.

Changed either file? Run `npm run cursor:env-check` — it catches the mistakes a `docker build` would
reject (missing `FROM`, a `CMD`/`ENTRYPOINT` Cursor overrides, a context outside the repo, an
`install` script that isn't there). CI runs it in the `unit` job of `e2e-suite.yml`. It is static
validation, not a build: after a real change to the toolchain layers, start one agent and watch the
environment build once.

## Manual run

In Cursor chat: `@loadoff-deploy.prompt.md`, `@loadoff-integrator.prompt.md`, or `@loadoff-prod-smoke.prompt.md`.
