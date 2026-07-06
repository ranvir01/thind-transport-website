# HaulDesk agent improvement loop — playbook + prompt library

How this codebase self-improves: Claude (architect/verifier, delivers verified patches + briefs with
backlogs) and Cursor agents (apply, extend, deploy) walk the same loop against `main`, which Vercel
deploys. This file makes the loop runnable by ANY agent without context: copy a prompt, run it, ship,
record the backlog for the next agent. The standing rules live in `AGENTS.md` — they are part of every
prompt below by reference.

---

## 1 · Full-workspace debug prompts (run one at a time)

### 1a. Build + test + type sweep
> Debug the entire workspace. Run `npm run build`, `npx vitest run`, `npm run lint`, and
> `npm run test:sidecars` (skip sidecars if Go/Rust toolchains are missing). Fix every failure you can
> without changing product behavior; for each fix explain the root cause in the commit body. Anything
> you cannot fix, record under `Backlog:` in the commit body. Rules in AGENTS.md apply. Finish with all
> four commands green and push to main.

### 1b. Dead code + duplicate-implementation sweep
> Sweep the repo for dead and duplicated code: exports with zero importers, components no route renders,
> env vars read nowhere, docs describing removed architecture, and two implementations of the same idea
> (we once had two Go services and two routing ladders). Verify each candidate is truly unused with grep
> before deleting. Delete in one commit, update docs that referenced it, `npm run build` + tests green,
> push. List anything you were unsure about under `Backlog:` instead of deleting.

### 1c. Tenancy + permissions audit (correctness-critical)
> Audit every server action in `src/app/hub/_actions/*` and every query in `src/lib/hub/*`:
> (1) each mutation calls `requirePermission` with the right action; (2) each query filters by
> `carrier_id`; (3) cross-table writes guard tenancy on both sides (pattern: `assignFuelToLoad`);
> (4) money mutations call `logAudit`. Produce a table of findings ranked by severity, fix the
> confirmed ones with tests where feasible, push. Do NOT weaken any existing check.

### 1d. Visual QA sweep (needs local Postgres)
> Stand up the app: `npm run db:migrate`, `npm run seed:demo`, `npm run build`, `npm run start`.
> Log in as each role (see `scripts/seed-demo.mjs` for credentials) and screenshot every nav-reachable
> screen at 1440px, and `/hub/driver/*` + `/hub/portal/*` at 390px. Check: no invisible/ghosted text,
> no marketing gold/navy/steel on office screens, forced-dark rules on driver/portal (AGENTS.md),
> tables scroll inside their own container at 390px. Fix what's mechanical; screenshot before/after;
> record the rest under `Backlog:`.

### 1e. Money-math audit
> Verify every money path is integer cents end to end: grep for `parseFloat|toFixed|\* 100|/ 100` near
> money fields, confirm user input flows through `dollarsToCents`, rounding through
> `roundHalfAwayFromZero`, and IFTA fixtures match between `ifta.test.ts` and the Rust suite
> (`npm run test:sidecars`). Add a regression test for any bug found before fixing it.

---

## 2 · Parallel multi-agent prompts (Cursor multitask)

Boundaries prevent merge conflicts: each agent owns a file set, nobody edits shared files
(`types.ts`, `permissions.ts`, `navigation.ts`, `AGENTS.md`) without coordinating in the PR body.
Launch together, merge in any order.

### Lane A — Office UI agent
> You own `src/app/hub/(office)/**` and office components in `src/components/hub/*` (not `driver/`).
> Task: finish the semantic-token cleanup on the remaining office screens (Upload/"New link" buttons in
> `DocumentsPanel.tsx`/`ShareLinkPanel.tsx` are still gold; also planner/safety/messages/tasks screens).
> Mapping doctrine in `docs/hauldesk-ui-polish-notes.md` + AGENTS.md. Do not touch driver/, portal/,
> services/, or shared lib files. Build + tests green before pushing.

### Lane B — Driver PWA agent
> You own `src/app/hub/driver/**` and `src/components/hub/driver/**`. Task: polish the driver PWA at
> 390px with the forced-dark rules (AGENTS.md): fixed dark palette only, 44px tap targets, offline queue
> intact. Verify with local Postgres + a 390px browser, screenshot every screen before/after. Do not
> touch office routes or shared lib files.

### Lane C — Sidecars agent
> You own `services/go/hauldesk-worker`, `services/rust/hauldesk-compute`, and `src/lib/hub/sidecars.ts`.
> Task: add `cargo test` / `go test` coverage for the auth middleware (401 without header, 200 with,
> health open) and a Go test for the OSRM-proxy fallback labeling. Keep golden parity in lockstep with
> `ifta.test.ts`. `make test-sidecars` green before pushing.

### Lane D — Docs + ops agent
> You own `docs/**`, `scripts/**`, `.env.example`, `README`s. Task: walk `docs/` against the code and fix
> drift (routes, env vars, commands that changed); extend `scripts/go-live-check.mjs` with any check the
> go-live runbook mentions that isn't automated yet. No product code changes.

### Coordinator prompt (after lanes finish)
> All lanes merged. Run prompt 1a (build/test sweep) on main, then prompt 1d (visual QA). Summarize what
> shipped this cycle in one paragraph and produce the next cycle's ranked backlog from all `Backlog:`
> trailers in the merged commits.

---

## 3 · Automation / recurring-cycle prompts

### 3a. The improvement cycle (run on a schedule or after every merge)
> Run one improvement cycle per `docs/agent-improvement-loop.md`: git pull; collect all `Backlog:`
> trailers from commits since the last cycle plus open items in the latest brief; rank by
> (production-breaking > money-correctness > daily-workflow friction > polish); take the TOP item only;
> build it under AGENTS.md rules; verify (build, tests, sidecars if touched, visual if UI); push to main;
> end your commit body with an updated `Backlog:`. One item per cycle — small and shippable beats big.

**Background automation (subscription — no API key):**

Three **Cursor Automations** on staggered hourly schedules (model **Auto**, repo
`ranvir01/thind-transport-website`). Setup: [`.cursor/automation/README.md`](../.cursor/automation/README.md).

| Agent | Cron (UTC) | Branch | Job |
|-------|------------|--------|-----|
| Integrator | `0 * * * *` | `claude/hauldesk-project-setup-l1luoo` | Merge `claude/lane-*` → integrator; verify after each merge |
| Prod smoke | `30 * * * *` | `main` | `npm run prod:smoke`; fix-forward if production broken |
| Deploy + backlog | `59 * * * *` | `main` | **Catch-up:** merge integrator → `main` while drift > threshold. **Steady:** one `Backlog:` item |

Preflight helpers: `npm run agent:status`, `npm run agent:backlog`, `npm run prod:smoke`.

Prompts: `loadoff-integrator.prompt.md`, `loadoff-prod-smoke.prompt.md`, `loadoff-deploy.prompt.md`
(editor drafts: matching `*.workflow.json`).

**Catch-up mode:** while `npm run agent:status` exits 1, deploy agent drains integrator → `main` only
(no new feature work). When caught up, one backlog item per hour.

Legacy single-automation files (`hauldesk-improvement-cycle.*`) alias to `loadoff-deploy.*`.

### 3b. Release gate (before any deploy is called done)
> Verify the release: `npm run build`, `npx vitest run`, `npm run test:sidecars`; then against production
> Postgres `POSTGRES_URL=<prod> HUB_DEMO_LOGIN=false npm run go-live:check` and fix anything red.
> Smoke on production: dispatcher login lands on /hub/loadboard; edit a load-board cell; Suggest miles on
> a load; link a fuel receipt; open the driver PWA at phone size. Report pass/fail per item.

### 3c. Dependency + security pass (weekly)
> Run `npm audit` and `cargo audit` (if installed); update only patch/minor versions of non-framework
> deps; never bump Next.js/React majors without explicit approval. Re-run the full verify chain. Also
> re-check: demo login gated in prod, sidecar secret set before any non-local sidecar deploy, no secrets
> in the repo (`git log -S` spot checks).

### 3d. Self-healing CI substitute (until real CI exists)
> After every push to main: run prompt 3b's local half (build+tests+sidecars). If anything is red, fix
> forward immediately or revert the breaking commit — main must stay deployable. Post the result as the
> commit status comment.

---

## 4 · Guardrails for autonomous cycles (non-negotiable)

1. **One item per cycle**; never batch unrelated changes in one commit.
2. **Main stays green** — a red build is the only thing that preempts the backlog.
3. **Never** touch: `.env*` contents, secrets, `HUB_DEMO_LOGIN` in prod, migrations already applied
   (append a new one instead), the do-not-build list in `docs/small-carrier-v1-master-prompt.md`.
4. **Record everything discovered** — `Backlog:` trailer in every commit; the loop dies without it.
5. Ambiguity about money, permissions, or data deletion → stop and ask the owner instead of guessing.

---

## 5 · Claude routine fleet (parallel Fable agents, collision-proof)

Many routines run concurrently, so each **lane owns a file territory and its own branch** —
`claude/lane-<name>`. Nobody edits shared files (`types.ts`, `permissions.ts`, `navigation.ts`,
`AGENTS.md`, migrations) except through the **integrator**. The flow:

```
lane routines ──push──▶ claude/lane-* OR claude/<session>  ──integrator (:00)──▶ integration branch
   (hourly-ish, staggered)         npm run agent:branches finds orphans      │
                              deploy (:59 UTC) ──▶ main ──▶ Vercel
                              prod smoke (:30 UTC) checks thindtransport.com/hub
```

### Session branches (ad-hoc agent names)

Claude Code sessions often push to **random** branch names (`claude/blissful-pascal-q5zlvo`,
`claude/pensive-allen-*`, …) instead of `claude/lane-*`. That is **fine** — the integrator does
not require lane branches.

| Command | Purpose |
|---------|---------|
| `npm run agent:branches` | List every `claude/*` branch with commits **not on main**; suggests lane from changed files |
| `npm run agent:status` | Integrator vs main drift + pending branch count |

**Integrator rule:** each :00 run, merge the **top** branch from `agent:branches` (one branch per
run), then verify. **Deploy rule:** drain integrator → `main` when ahead.

Paste **docs/claude-routine-preamble.md** at the top of every Claude routine so agents know they
can use session branches and must end commits with `Backlog:`.


| Lane branch | Territory (only these paths) | Mission |
|---|---|---|
| `claude/lane-office` | `src/app/hub/(office)/**`, office components in `src/components/hub/*` (not `driver/`) | finish token doctrine, UX friction, empty states |
| `claude/lane-driver` | `src/app/hub/driver/**`, `src/components/hub/driver/**` | PWA polish at 390px, forced-dark rules, offline queue |
| `claude/lane-portal` | `src/app/hub/portal/**`, `src/app/track/**`, sharelink components | broker/shipper surface readability + tracking page |
| `claude/lane-sidecars` | `services/**`, `src/lib/hub/sidecars.ts`, `Makefile` | Go/Rust test coverage, golden parity, worker features |
| `claude/lane-tests` | `src/lib/hub/__tests__/**`, `scripts/e2e-*.mjs` ONLY (never product code) | raise coverage on untested lib modules + E2E drives |
| `claude/lane-compliance` | `src/app/hub/(office)/compliance/**`, `src/lib/hub/ifta*.ts`, `src/app/api/hub/ifta/**` | IFTA generate entry point, worksheet flows, doc expiry |
| `claude/lane-docs` | `docs/**`, `.env.example`, README, `scripts/go-live-check.mjs` | docs drift, runbooks, staff how-to guides |
| `claude/lane-integrations` | `src/lib/hub/integrations/**`, provider adapters (`telematics.ts`-style), `src/app/api/hub/webhooks/**`, settings/integrations UI, `credentials.ts` | work docs/integrations/creds-shopping-list.md order: one adapter slice per run, mock+contract-tested, CSV fallback intact |
| `claude/lane-saas` | onboarding, `hub/admin/**`, per-tenant branding, isolation tests | SaaS-ready hardening — NO billing code |
| `claude/lane-analytics` | `(office)/reports/**`, new dashboard routes, kpi libs | M10 owner dashboard: revenue, CPM, deadhead %, lane leaderboard, AR trend |
| `claude/lane-roadmap` | new feature files within any ONE existing territory per run | NEW capability from `docs/hauldesk-gap-report`-style gaps: pick the top unbuilt feature a 15-truck carrier needs, build it complete with tests + E2E |

**Prod smoke (Cursor automation, :30 UTC):** run `npm run prod:smoke` — `/hub/login` must return 200
with `LoadOff` in the body; `/hub` must not 5xx. Any failure → diagnose, fix forward on `main`, push.
Optional later: Vercel MCP for deployment status. This is the fleet's no-human rollback trigger.

**Meta-governor (routine, weekly):** audit the LOOP itself over the past week: commits per agent,
reverts, test-count trend, build breakages on main, churn (files edited by 3+ agents), busywork
(commits with no user-visible or correctness value). Prune: propose deleting or slowing any routine
producing churn; tighten any guardrail that was violated. The governor's output is a Backlog: of
loop-configuration changes for the owner — the one thing agents never change unilaterally is the
fleet configuration itself.

**Lane rules:** one finished item per run; build + `vitest` green before pushing; UI work is
Playwright-verified on the local rig; end every commit with `Backlog:`. If your item requires
touching a shared file, DON'T — write the need into `Backlog:` for the integrator.

**Integrator (its own routine):** fetch all `claude/lane-*` branches ahead of the integration
branch; review each against AGENTS.md; merge clean lanes into
`claude/hauldesk-project-setup-l1luoo` (octopus or sequential; rebuild + full tests after EACH
merge); a lane that breaks the build gets its merge skipped and the reason pushed to its
`Backlog:`. Shared-file changes requested in lane backlogs are made here, once, coherently.
