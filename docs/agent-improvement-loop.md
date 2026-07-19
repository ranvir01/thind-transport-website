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

> **RETIRED 2026-07-18:** the Cursor subscription ended; these three roles are now owned by
> **Claude Code routines** (prompts: [`docs/claude-routines.md`](claude-routines.md)) with the
> GitHub Action `drain-integrator.yml` as the platform-independent drain backstop. The table
> below is kept for the role definitions the routines inherit.

Three roles on staggered hourly schedules (originally Cursor Automations, repo
`ranvir01/thind-transport-website`; legacy setup: [`.cursor/automation/README.md`](../.cursor/automation/README.md)).

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

**Drain redundancy (learned 2026-07-10):** the drain must NOT depend on any single agent being alive.
Cursor's cloud VMs went read-only for a stretch, the :59 deploy agent silently stopped merging, and the
production alias sat hours behind a green integrator — everything looked like "Vercel is broken" when
Vercel was fine. Rule: ANY agent (Claude routine or Cursor) that finds catch-up mode with a green
integrator drains it before its own work. PR #13 is merged/closed (2026-07-03) — never wait on a PR
merge to reach `main`; the drain is direct. Two deploy-blockers seen in the wild so far, both cron
validation on the Vercel Hobby plan: sub-daily schedules and (guard) job count — preview deploys skip
cron validation, so "previews green, production stale" is the signature of a vercel.json cron problem.

**Drain method (fixed twice 2026-07-19 — fast-forward → `--no-ff` merge → `--no-ff` merge +
`.drain-stamp`):** a QA rig drive on main@5218a91 found production 194 commits stale even though the
drain kept reporting success. Root cause #1: `git push origin <integrator>:main` fast-forward lands the
exact commit SHA Vercel already built as an integrator-branch preview, and Vercel dedupes deployments
by SHA. Root cause #2 (found by the next QA drive, main@11c9be2): a bare `--no-ff` merge commit is a
NEW SHA but its **tree is byte-identical** to the integrator tip Vercel already built — the dedupe
keys on content too, and the first `--no-ff` drain produced no deployment at all. Fix: the drain
commit must also change the tree — merge with `--no-commit`, write the drained SHA + timestamp to
`.drain-stamp`, `git add`, then commit and push:
`git checkout -B main origin/main && git merge --no-ff --no-commit <integrator-sha> &&
printf 'sha=%s\ndrained_at=%s\n' <sha> $(date -u +%FT%TZ) > .drain-stamp && git add .drain-stamp &&
git commit -m "Drain integrator to main (<sha>)" && git push origin main`. Every drain then carries a
tree Vercel has never built, so a real production deployment is guaranteed. Applied in both
`.github/workflows/drain-integrator.yml` and `drain-fallback.yml`, enforced by
`scripts/drain-merge-guard.mjs`; any agent draining by hand (Routine 1, §5) must use the same stamped
merge form.

**Platform-independent fallback:** the GitHub Action
[`drain-integrator`](../.github/workflows/drain-integrator.yml) runs hourly at :15 (staggered against
the Cursor agents at :00/:30/:59). When the integrator is more than `AGENT_CATCHUP_THRESHOLD` (3)
commits ahead of `main` and fast-forwardable, it builds and tests the integrator tip on a GitHub
runner and, only if green, pushes the fast-forward. It never merges a diverged integrator (that still
needs an agent) and does nothing in steady state — the hourly agents keep owning the drain; the Action
only fires when every agent platform is down at once. It can also be triggered manually from the
Actions tab (`workflow_dispatch`) when a stale production alias needs healing now.

**Automated backstop:** `.github/workflows/drain-integrator.yml` runs at :17 UTC (offset from the
agent slots). When the integrator is >3 commits ahead of `main` and still a pure fast-forward, it
verifies that exact SHA (`npm ci`, `npm run build`, `npx vitest run`) and pushes it to `main` with a
plain non-force push — a race with a live agent is rejected by GitHub, never clobbered. Diverged
history or drift ≤3 means the loop is alive (or needs a real merge), so the Action stands down and
leaves it to the agents. This keeps the drain working even when both agent platforms are down at once.

**Drain fallback (GitHub Action, shipped 2026-07-10):** `.github/workflows/drain-fallback.yml` runs at
:20/:50 UTC and fast-forwards `main` from the integrator when it is >3 commits ahead, `main` is strictly
behind (pure fast-forward, never force, never merge), and build + `vitest` pass on the integrator head.
It no-ops in a healthy loop and survives both agent platforms being down. Diverged history still needs
an agent to merge — the workflow only warns.

Legacy single-automation files (`hauldesk-improvement-cycle.*`) alias to `loadoff-deploy.*`.

### 3b. Release gate (before any deploy is called done)
> Verify the release: `npm run build`, `npx vitest run`, `npm run test:sidecars`; then against production
> Postgres `POSTGRES_URL=<prod> HUB_DEMO_LOGIN=false npm run go-live:check` and fix anything red.
> Smoke on production: dispatcher login lands on /hub/loadboard; edit a load-board cell; Suggest miles on
> a load; link a fuel receipt; open the driver PWA at phone size. Report pass/fail per item.
>
> If the session's network egress policy blocks direct HTTPS to `thindtransport.com` (403 on CONNECT —
> common in sandboxed agent environments), treat that as inconclusive, not a site defect. Use Vercel
> deployment/status tools instead (confirm the `production` alias is `READY` on the expected commit SHA;
> check runtime errors/logs for new clusters). Same "is prod healthy" question without touching the
> blocked host.
>
> If GitHub shows a **Vercel** commit status of `Deployment failed` whose link lands on
> [cron usage & pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing), the project is on
> **Hobby** and `vercel.json` has a cron that runs more than once per day (e.g. `0 * * * *`). That
> fails the deploy before build — fix the schedule to daily (or upgrade to Pro). Git being
> "connected" is fine; the config is what blocks. Guarded locally by
> `src/lib/__tests__/hobby-cron-guard.test.ts` and `npm run go-live:check` (via
> `scripts/hobby-cron-guard.mjs`) so this fails before Vercel.

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
with `LoadOff` in the body; `/hub` must not 5xx; `/api/version` must report `origin/main`'s SHA
(15-minute grace for in-flight deploys), so a dedupe-swallowed drain alarms within the hour instead
of after days. A staleness failure means re-drain with a `--no-ff` merge (see "Drain method"), not a
code fix. Any other failure → diagnose, fix forward on `main`, push.
When direct prod HTTPS is egress-blocked, fall back to Vercel deployment status (see §3b). This is the
fleet's no-human rollback trigger.

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
