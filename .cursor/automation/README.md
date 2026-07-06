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

## Deprecated (aliases)

The old single-automation files still work for `@` references but are superseded:

- `hauldesk-improvement-cycle.prompt.md` → use **`loadoff-deploy.prompt.md`**
- `hauldesk-improvement-cycle.workflow.json` → use **`loadoff-deploy.workflow.json`**

Full playbook: [`docs/agent-improvement-loop.md`](../../docs/agent-improvement-loop.md).

## Do not use

- `CURSOR_API_KEY` / `api.cursor.com/v1/agents` — bills outside your subscription
- GitHub Actions to launch agents — removed from this repo for that reason

## Manual run

In Cursor chat: `@loadoff-deploy.prompt.md`, `@loadoff-integrator.prompt.md`, or `@loadoff-prod-smoke.prompt.md`.
