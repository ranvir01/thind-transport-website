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

These three already exist on the dashboard (2026-08-19). Do not create a fourth copy.

| Dashboard name | Id |
|----------------|-----|
| Integrator | [`880eec29-78fd-11f1-ba66-0e7d0216e441`](https://cursor.com/automations/880eec29-78fd-11f1-ba66-0e7d0216e441) |
| Prod Smoke | [`4ad7743c-7900-11f1-ba66-0e7d0216e441`](https://cursor.com/automations/4ad7743c-7900-11f1-ba66-0e7d0216e441) |
| Deploy + backlog | [`75e8fbf5-7900-11f1-ba66-0e7d0216e441`](https://cursor.com/automations/75e8fbf5-7900-11f1-ba66-0e7d0216e441) |

**Disable** Untitled [`61b8e855-76b8-11f1-ba66-0e7d0216e441`](https://cursor.com/automations/61b8e855-76b8-11f1-ba66-0e7d0216e441) — it fires as "HaulDesk improvement cycle" and is a second writer on `main`. Full roster: [`docs/ops/FLEET.md`](../../docs/ops/FLEET.md).
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
