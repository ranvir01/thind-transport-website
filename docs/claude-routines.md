# Claude routine prompts — the post-Cursor fleet

Cursor's subscription ended 2026-07-18; its three automations (integrator :00,
prod smoke :30, deploy :59) are replaced by **Claude Code routines** (claude.ai
→ Code → Routines, simple Hourly/Daily triggers) plus the platform-independent
**GitHub Action** `.github/workflows/drain-integrator.yml`, which drains
`main` at :17/:47 whenever the integrator is >3 ahead and green — so the drain
survives even every routine being down. (Fixed 2026-07-19: this drains via a
`--no-ff` merge commit, not a fast-forward push — see below.)

Each routine fires a fresh session: prompts are standalone. House rules live in
AGENTS.md and docs/agent-improvement-loop.md; commits as
`noreply@anthropic.com` / `Claude`, `Backlog:` trailer on the last commit,
never `seed:demo` against production, fetch+rebase before every push.

---

## Routine 1 · "LoadOff integrator + drain" — Hourly

**Status: LIVE** — created 2026-07-19 as `trig_01B99W8MteaPtzwk124DFF4w`, fires
hourly at :43 UTC (fresh session per fire). Do not paste a second copy — two
integrator routines race each other on the branch; if a duplicate ever appears
in the Routines list, delete it by trigger id.

> Work the repo ranvir01/thind-transport-website on branch
> claude/hauldesk-project-setup-l1luoo. Read AGENTS.md and
> docs/agent-improvement-loop.md first. Run `git fetch origin`, then
> `npm run agent:status` and `npm run agent:branches`.
>
> Absorb pending `claude/*` branches into the integrator ONE at a time in the
> inventory's suggested order: merge, then `npm run build && npx vitest run`
> — green before the next merge. Resolve conflicts by inspecting both sides;
> when the integrator already carries a newer superset of the same work, keep
> HEAD. Skip (and note) any branch that stays red after one honest fix attempt.
>
> When the integrator is green and ahead of main: drain it directly — do NOT
> use a bare fast-forward ref push (`git push origin <integrator>:main`); that
> lands a SHA Vercel already built as an integrator-branch preview, and Vercel
> dedupes deployments by SHA, so production can sit stale with no new build
> queued (found 2026-07-19, prod 194 commits stale despite a "successful"
> drain). A bare `--no-ff` merge is ALSO not enough — its tree is identical to
> the integrator preview and Vercel's dedupe keys on content too (found later
> the same day: the first --no-ff drain produced no deployment at all). The
> drain commit must change the tree via `.drain-stamp`:
> `git checkout -B main origin/main && git merge --no-ff --no-commit
> claude/hauldesk-project-setup-l1luoo && printf 'sha=%s\ndrained_at=%s\n'
> "$(git rev-parse claude/hauldesk-project-setup-l1luoo)"
> "$(date -u +%FT%TZ)" > .drain-stamp && git add .drain-stamp && git commit -m
> "Drain integrator to main (<sha>)" && git push origin main` — always a new
> tree, always a real build. If histories diverged, merge main into the
> integrator first, re-verify, then drain the same way. Never wait on a PR or
> another agent — PR #13 is long closed.
>
> If nothing is pending: pick ONE item from `npm run agent:backlog`, fix it
> with its test, verify, push the integrator, and stop. End the last commit
> with a `Backlog:` trailer.

## Routine 2 · "LoadOff prod smoke + fix-forward" — Hourly (set Daily to save usage)

> Work the repo ranvir01/thind-transport-website. Read AGENTS.md. Check
> production health: `npm run prod:smoke` against https://thindtransport.com
> (if sandbox egress is blocked, use the Vercel connector's deployment list,
> runtime errors, and web fetch as documented in
> docs/agent-improvement-loop.md §3b — previews green + production stale means
> a vercel.json cron validation problem on the Hobby plan).
>
> If production is broken: diagnose, fix forward on
> claude/hauldesk-project-setup-l1luoo with a test, verify
> (`npm run build && npx vitest run`), push, and drain to main directly.
> Reverting the breaking commit is acceptable when a forward fix isn't quick —
> main must stay deployable. If production is healthy, confirm the latest main
> SHA has a READY production deployment and stop — no busywork.

## Routine 3 · existing improvement routines — keep them

The feature/QA routines set up earlier (improvement cycle, integrations lane,
verifier/red-team, daily deep audit) already cover Cursor's "apply/extend"
role. Keep them as they are. If duplicates exist in the Routines list
("Integration Lane Copy", a second "Weekly visual QA sweep", a second
"Weekly deep audit"), delete the copies — duplicate firings waste plan usage
and race each other on the branch.

---

## First-firing verification — 2026-07-19 ~08:45 UTC (closes the 3a2bdce backlog)

- **Exactly one** "LoadOff integrator + drain" routine is live (cron `43 * * * *`, enabled);
  the full 23-trigger fleet list has **no duplicate copies** ("Integration Lane Copy" etc.
  do not exist). Prod smoke exists as a daily routine (16:49 UTC) per Routine 2's
  save-usage option.
- **Routine 1's first firing worked**: the 07:43 run absorbed the pending session branches
  into the integrator (merge commits 08:08–08:29 UTC).
- **Drain Action**: all five scheduled runs to date concluded **green**. Caveat learned:
  GitHub throttles the `:17/:47` schedule heavily — observed firings ~1–3.5 h apart
  (22:09, 23:12, 00:12, 03:57, 06:43), so worst-case drain latency via the Action alone is
  a few hours, not 30 min. Routine 1's own direct drain remains the primary path; when
  drift needs clearing *now*, kick the Action manually — it carries `workflow_dispatch`
  and does its own green-check + fast-forward-only push, so a manual kick is always safe:
  `gh workflow run drain-integrator.yml` (or the Actions tab → Run workflow).
- **Proof the dispatch path works**: a manual dispatch fired 08:40 UTC cleared the
  64-commit integrator→main drift that accumulated after the 06:43 scheduled run —
  CI-verified the integrator and fast-forwarded `main` to `8650ab0` (drift now 0),
  even while Routine 1 was still merging (the fast-forward-only push makes the race safe).

## Deploy discipline (learned 2026-07-22)

- **Vercel dedupes deployments by SHA.** Pushing the same commit to the integrator
  branch and `main` simultaneously can attach the only build to the BRANCH ref —
  main silently gets no production deployment. Drains push **main first, alone**;
  sync the integrator afterwards.
- **Hobby has a daily deployment quota.** The fleet's per-branch preview builds
  exhausted it (2026-07-22: production frozen mid-theme-rollout with pushes
  creating zero deployments). `vercel.json` now carries
  `"ignoreCommand": "[ \"$VERCEL_GIT_COMMIT_REF\" != \"main\" ]"` — only main
  ever builds. Preview URLs are gone by design; agents verify on local rigs.
- If a main push creates no deployment (quota window still saturated), the next
  hourly drain re-triggers it automatically once slots free; for urgency, push a
  `.drain-stamp` refresh to main alone.

## Division of labor after Cursor

| Concern | Owner |
|---|---|
| Lane/feature work + backlog | Existing Claude improvement routines |
| Merge pending branches → integrator | Routine 1 (hourly) |
| Drain integrator → main | Routine 1 when green; GitHub Action `drain-integrator.yml` as backstop (:17/:47) |
| Production smoke + fix-forward | Routine 2 |
| Production schema | `/api/hub/cron/migrate` (daily Vercel cron, CRON_SECRET) |

## Pending-branch triage — 2026-07-22 ~02:00 UTC (Routine 1 run)

Integrator sat at 0 drift vs main (last drained 01:02 UTC) with 76 pending `claude/*`
branches. Worked the `agent:branches` priority order looking for a safe absorb; every
candidate tried turned out to be either unmergeable or already superseded:

- **29 of the 76 branches have no merge-base with `main`** (`git merge-base main <ref>`
  returns nothing) — `amazing-meitner-0r0bvi`, `awesome-hypatia-hj5b2c`,
  `charming-dirac-m8b4ig`, both `compassionate-bell-{8r88rj,zef4dj}`, 21 of the
  `gallant-dijkstra-*` family, `practical-franklin-5ol54s`, `stoic-mccarthy-6modfo`.
  Spot-checked two (`compassionate-bell-8r88rj`, `compassionate-bell-zef4dj`): their root
  commits carry **5093–5110 tracked files** vs. `main`'s 833 — these were pushed from a
  shallow/detached clone, not a fork of this repo's real history, and are not safely
  mergeable (`--allow-unrelated-histories` would be required and is not safe to run
  unattended). These can't be absorbed by any future integrator run either; they need a
  human call — either hand-cherry-pick anything valuable out of them or delete the refs.
- Tried five more with a real merge-base and a small diff
  (`stoic-mccarthy-yx14n1`, `inspiring-sagan-qrnct7`, `pensive-allen-bgqbgg`,
  `inspiring-sagan-posqqo`, `pensive-allen-lz41rp`): all five conflict against `HEAD`,
  and in every conflict HEAD already carries a newer/more complete version of the same
  fix (e.g. `agent-loop-status.mjs`'s STALLED-mode assessor, `seed-demo.mjs` truncating
  `hub.integration_events` too, `TasksBoard.tsx`'s confirm-delete flow). Per AGENTS.md
  ("keep HEAD when it's already a superset"), none were merged.
- The single largest branch (`gallant-dijkstra-tfl0e7`, 190 unpicked/298 raw commits)
  produces 20+ file-level conflicts including `vercel.json` and `src/proxy.ts` — too
  stale and too risky to reconcile in one unattended pass.
- `inspiring-sagan-2npdmr` (96 files / 4426 lines, merge-base flush with current main)
  looked promising but the dry-run merge hit **add/add conflicts** on files like
  `LoadProgressBar.tsx`, `NotificationsPanel.tsx`, and `integrations/event-processors.ts`
  — both sides independently built the same components, another duplicate-work case.

Net: main/integrator verified green this run (`npm run build`, `npx vitest run` — 168
files/1431 tests green; `npm run lint` clean) and a full local-rig `node
scripts/e2e-run-all.mjs` battery (Postgres migrated + seeded, `NEXTAUTH_SECRET`/
`CREDENTIALS_KEY`/`CRON_SECRET` set) passed **46/46 with 0 defects** — no code fix was
available to ship. This sharpens the existing "75+ pending branches await a meta-governor
prune pass" backlog line: roughly 40% of the pile (the 29 no-merge-base branches) is
un-mergeable by construction and should be deleted rather than re-triaged every cycle;
most of the rest sampled so far is stale/superseded, not unabsorbed value. The
meta-governor pass should treat "no merge-base with main" as an auto-delete candidate
list rather than re-running `agent:branches` priority order against it each hour.

## Integrator + backlog sweep — 2026-07-22 ~05:50 UTC (Routine 1 run)

Absorbed the two pending branches in `agent:branches` order (`eager-babbage-zy9rbx`,
then `practical-franklin-4zwwy0`) — both were empty verify-and-build/QA-drive cycles
whose only diff was a stale `.drain-stamp` echo, no product code. Build + `vitest`
green after each merge (168 files/1431 tests). Integrator's tree ended up
byte-identical to `main`'s despite 3 new commits (the two branches' `.drain-stamp`
edits round-tripped back to the same content `main` already had) — drained with the
stamped `--no-ff` method (not a plain fast-forward) specifically because a
tree-identical commit is exactly the Root-cause-#2 dedupe trap this doc already
documents; a fresh `.drain-stamp` timestamp guarantees Vercel sees a new tree.

Then swept `agent:backlog` for a pickable item: every item still carried on the
newest commit is owner-gated (IFTA holiday roll needs a shared-date-util design call;
portal gold-vs-accent color choice needs an owner call; the no-merge-base branch prune
needs a human) — none are agent-guessable per AGENTS.md's money/permissions ambiguity
rule. Checked the "older mentions" tail for anything already resolved that's safe to
drop:

- `scripts/e2e-reports-smoke.mjs`'s "range-following lanes export not covered" item is
  **resolved** — step 3b already covers `/hub/reports/export/lanes?from&to` (landed in
  `4af102ab`).
- `reseed()`'s "doesn't reset `hub.carriers.status`" item is **resolved** — `e2e-lib.mjs`
  already resets both demo tenants to `active` on every reseed (landed in `07b4baf`).
- The "~7-9 sleep-then-assert sites in fleet/fuel/loads/qbo-push/reports/settlements/
  statements/tasks" item is **resolved** — grepped all eight named files, zero
  `sleep()`/`waitForTimeout()` calls remain. Remaining `sleep()` calls repo-wide
  (`e2e-apply-smoke.mjs`, `e2e-dat-freight-smoke.mjs`, `e2e-notifications-smoke.mjs`) are
  bounded retry-loop backoffs or documented regression-window waits, not guessed
  pre-screenshot settles — not the same class of issue, don't convert them.
- The canvas-deps setup-script/README note is **resolved** — `npm run setup:canvas-deps`
  + the README line already exist.
- Sidecars lane's cargo-audit item is **still blocked**, but the reason changed: `cargo`
  and `go` toolchains ARE present in this session (unlike prior cycles), `test-sidecars`
  passed clean (26/26 Rust + Go tests), but `cargo-audit` itself isn't installed and
  `cargo install cargo-audit --locked` didn't complete inside a reasonable timeout
  (compiling from source against the sandboxed proxy) — still needs a session with either
  a pre-warmed `cargo-audit` binary or a longer budget, not a code fix.
- hauldesk-compute's OSRM-fallback-parity gap is unchanged: still blocked on a routing
  endpoint that doesn't exist yet in the Rust sidecar (a feature-design item, not a
  same-cycle fix).

No local Postgres running in this session, so no visual/E2E sweep this cycle — build +
`vitest` (168 files/1431 tests) + lint all green is what's verified here.

Drained the resulting integrator tip to `main` immediately after (stamped `--no-ff`,
see above) since it was already ahead and green — never left a green integrator
waiting on a PR.
