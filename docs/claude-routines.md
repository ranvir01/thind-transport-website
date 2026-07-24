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

## Divergence repair + 7-branch absorb + drain — 2026-07-23 ~01:55 UTC (Routine 1 run)

Found the integrator and `main` diverged 1 commit each (a `.drain-stamp` force-deploy
commit had landed on `main` directly without being merged back) — merged `main` into
the integrator first (clean, build+tests green: 177 files/1473 tests) before touching
any lane branch, per the "if histories diverged, merge main into the integrator first"
rule.

Absorbed 7 small clean branches from `agent:branches`, one at a time, build+`vitest`
green after each: `eager-babbage-udxdjn` (IFTA worksheet fuel-tax/surcharge split —
closes a Backlog item carried since `d54be16`), `intelligent-sagan-o3i2oa` (weekly
owner digest was blind to expired equipment compliance), `lane-portal` (progress
bar/stop timeline follow the carrier's accent), `lane-office` (planner lane-packing
unit coverage), `charming-allen-lqe146` (mapbox.ts test coverage), `lane-saas`
(PDF-branding test coverage), `stoic-mccarthy-yx14n1` (fleet-tooling
`agent-loop-status.mjs` fix — conflicted with HEAD's already-shipped superset
implementation; resolved keep-HEAD per AGENTS.md, verified the incoming diff was
fully subsumed before resolving that way).

Skipped every branch above 200 unpicked commits (`lane-compliance` 667, `lane-tests`
644, `lane-roadmap` 632, `practical-franklin-5ol54s` 623, four `gallant-dijkstra-*`
190-188 each) — same call as the 2026-07-22 triage note: too large to reconcile in
one unattended pass, several already carry old integrator-merge history (drain-stamp
and cross-lane merge commits) suggesting long-stale forks rather than fresh unpicked
work. These still need the meta-governor prune pass, now joined by `lane-compliance`
specifically (667 unpicked is the largest single lane branch seen yet flagged this
way).

Local Postgres stood up this cycle (`db:migrate` + `seed:demo`): ran
`scripts/e2e-ifta-smoke.mjs` against the merged fuel-tax/surcharge split — all
checks green including jurisdiction-row-sum-equals-header-net-tax reconciliation —
and screenshotted `/track/:token` at 390px + 1440px for the merged accent-following
progress bar/timeline (readable, no clipping, no regressions).

Drained the resulting integrator tip (`cc703c66`) to `main` with the stamped
`--no-ff` method immediately after — `main` and the integrator now match at
`8f285fca`.

Backlog:
- 84 pending `claude/*` branches remain per `agent:branches`; most of the small
  ones left are QA-rig-drive/verify-and-build log commits with no product diff
  (safe but low-value to absorb) — next cycle should skim for any more with an
  actual code/test diff before falling back to those.
- `lane-compliance` (667 unpicked/1372 raw commits) is now the single largest
  pending lane branch and carries old integrator-merge history in its own log —
  needs the meta-governor prune pass to decide salvage-vs-delete, same as the
  other 600+/190+ branches noted above; not safe for an unattended one-shot merge.

## QA rig drive on main@7e9372eb — 2026-07-23 ~05:30 UTC (owner/dispatcher/driver, read-only prod probe)

First cycle in this window with **Vercel MCP tools connected** (`mcp__Vercel__*`) — every
prior cycle back to `e105f8b2` (~3h13m stale) had only egress-blocked HTTPS to
`thindtransport.com` and could only guess at production health from commit-trailer math.
This confirms what those cycles suspected: **the Vercel Git integration has stopped
deploying `main` to production entirely**, not just fallen behind.

`get_project` on `prj_QKMg8o77DoEYiVQgQbI0FB5F4tAg`: `live: false`, `latestDeployment`
CANCELED with `target: null` (a preview build for a session branch, not production).
`list_deployments` (20 most recent + a windowed follow-up): the last deployment with
`target: "production"` and `state: "READY"` is `97a9f6a9` (the `961950ce1` dedupe-trap
force-deploy from `FxpgVvgTBD4RZ6sdJPL6Cwx91Das`/`3ABZnHjnyvFk7LiLGghjzigTrS8j`), created
2026-07-22 23:31:58 UTC — **5h38m stale** as of this cycle. Every one of the 15+ commits
landed on `main` since then (`ac62cb48` through `7e9372eb`, including the DVIR
release-when-unsafe safety fix `727ba61b`/`45e08c0b` and the sidecars POST body-size cap)
produced **zero** deployment records with `target: "production"` — not READY, not
CANCELED, not even a SKIPPED/ignored one. Every deployment in the window is a preview
build (`target: null`) for a feature/session/integrator branch. Ruled out as the cause:
the integrator→main drain itself (`npm run agent:status` reports STEADY STATE, integrator
within 3 commits of main and moving) and the `drain-integrator.yml` GitHub Action (last 15
scheduled runs all `completed`/`success` on `main`, correctly no-op'ing in steady state —
that workflow only fast-forwards the *integrator* to `main`, it has no role in Vercel's
own main→production trigger). This is specifically Vercel's GitHub App integration/webhook
no longer firing production builds on push to `main` — fixable only from the Vercel
dashboard (Git integration connection, production-branch setting, Ignored Build Step).
Notified the owner directly (push notification) since three prior cycles flagged rising
staleness in their trailers with no way to act on it.

Direct HTTPS probe to `thindtransport.com` stayed egress-blocked this session too (curl
exit 56 on both `/` and `/hub/login`) — consistent with every prior cycle, not new
information.

Fresh rig from scratch: Postgres 16 started (was down), `hubapp` role + `hubdb` database
created, `npm ci` (720 packages, 3 high-severity `npm audit` findings — same carried
semver-major-bump item, not re-attempted), `npm run db:migrate` through `020_outreach.sql`
clean, `seed:demo`, `npm run build` (Next.js 16, zero TS errors) clean, `npx vitest run`
(181 files/1515 tests green), `npm run test:sidecars` (28 Rust tests + Go vet/test green,
clippy clean).

No new commits landed on `main` since the last three QA cycles (`efcd2fbf`, `d335e724`,
`1e6bfd9f`) all audited this exact window at this exact SHA with 0 regressions found — not
re-auditing the same diff a fourth time; nothing to add there.

Drove the full `e2e-run-all.mjs` battery (47 `e2e-*-smoke.mjs` scripts) as owner,
dispatcher, and driver: first pass showed 4 failures (`e2e-detention-alerts-smoke`,
`e2e-mailbox-oauth-smoke`, `e2e-recurring-lane-smoke`, `e2e-recurring-rollup-smoke`, all
401/"CREDENTIALS_KEY missing" symptoms) — traced to **this session's own rig setup**, not
a product bug: appending `CREDENTIALS_KEY`/`CRON_SECRET` to `.env.local` and restarting
`next start` in one shell call left the *old* process still bound to :3000 (the new one
lost the port race), so the server under test never actually picked up the new secrets.
Force-killed both processes, started clean, re-ran all 4 individually — all pass. **47/47
green**, 0 real defects, 0 console errors. Leaving this note so the next agent doesn't
chase the same phantom failure if it recurs from the same shortcut.

Backlog:
- Owner: production Vercel deploy pipeline confirmed broken (not just stale) — see above,
  needs a dashboard check of the Git integration/production-branch/Ignored-Build-Step
  settings; no in-repo fix is possible for this one.
- `lane-compliance` (1362 unpicked commits, up from 667 two cycles ago) and
  `lane-roadmap` (1233, up from 632) are growing fast — meta-governor prune pass is now
  well overdue on both.
- Carried, unchanged: npm audit's 3 high-severity findings (nodemailer/@auth/core,
  sharp/next's image optimizer) still blocked on an owner-approved semver-major bump;
  portal invoice-pill accent-vs-gold call; IFTA due-date roll not accounting for legal
  holidays.

## Divergence repair + fuel/expenses/messages subsystem audit — 2026-07-23 ~09:40 UTC (verify-and-build cycle)

Found the integrator 1 ahead of `main` (`9eac3a5b`, the DVIR pre-trip-grounding widen) and
`main` 1 ahead of the integrator (a `.drain-stamp` drain commit not yet merged back) — same
divergence shape as the 07-23 01:55 UTC cycle. Merged `main` into the integrator first
(clean, no conflicts). `npm ci` + `npm run build` + `npx vitest run` (182 files/1519 tests)
+ `npm run lint` all green before touching anything else.

Picked up the fuel-subsystem audit next in the rotation (per `168446e4`'s backlog: "fuel —
`fuel.ts` receipts + `assignFuelToLoad`'s cross-table tenancy, IFTA gallon/odometer
rollup"). Walked every fuel entry point against AGENTS.md: `fuel.ts` (all 9 exports —
tenancy joins guard both sides, `assignFuelToLoad` already matches the canonical
carrier-scoped-both-sides pattern AGENTS.md cites it for), `_actions/fuel.ts`
(`reclassifyFuelUse`/`assignFuelLoadAction` both `requirePermission("fuel:write")` +
`logAudit`), the CSV bulk importer and the WEX/EFS/Comdata poll-sync ingests (all
carrier-scoped truck matching, `ON CONFLICT (carrier_id, source, external_id)`,
`dollarsToCents` on money fields), and the IFTA gallon rollup in `ifta.ts` (tractor-only
gallons, carrier+date scoped, unknown-jurisdiction gallons tracked not silently dropped).
**No defect found** — this subsystem is clean. `odometer` on `fuel_transactions` is
captured but never fed into mileage math (IFTA miles come from GPS pings or imported
CSV mileage only, never card-reported odometer) — that's correct IFTA practice, not a gap.

While there, spot-checked the next two items already flagged as "unaudited" and found both
already resolved by intervening commits, so clearing them from future rotation notes:
- `expenses.ts` + `_actions/money.ts#createExpenseAction` + the driver-receipt path in
  `_actions/driver.ts`: permission-gated (`money:write`), `assertCarrierRefs` on
  truck/driver/load, audited, integer cents throughout. Clean.
- `messages.ts`: `sendMessage`/`markThreadRead` don't take/re-check `carrierId` internally,
  but every caller in `_actions/messages.ts` goes through `canAccessThread` (which calls
  `getThread(carrierId, threadId)`) before any write — verify-then-write, not a live gap.

Also confirmed three carried backlog lines from `168446e4`/earlier cycles are stale
(already fixed, just not pruned from the trailer chain): `today.ts`/`digest.ts` NOT EXISTS
carrier_id gaps (closed by `af69299d`), the DVIR pre-trip-release safety bug (closed by
`45e08c0b`/`9eac3a5b`/`c3647dfa`), and the portal invoice-pill accent-vs-gold call (closed
by `83198c68` — it turned out to be a mechanical token fix, not an owner design call after
all).

Stood up local Postgres, migrated + seeded, `npm run build && npm run start`, and ran the
four smokes touching what was just audited: `e2e-fuel-smoke` (36 unassigned receipts,
link/reclassify/driver-blocked all pass), `e2e-expenses-smoke` (odd-cents record + P&L
delta + QBO CSV reconcile), `e2e-messages-smoke` (office↔driver thread, unread badges, read
receipts, driver blocked from office routes), `e2e-ifta-smoke` (compute → draft → filed,
worksheet/CSV/header net-tax reconciliation). **All four green, 0 defects, 0 console
errors** — matches the static-audit conclusion.

`agent:branches` (81 pending, down from 84): every branch under ~150 unpicked commits from
the last two cycles is already absorbed; every remaining candidate is 150+ unpicked
(`lane-compliance` 662, `eager-babbage-ibsmrz` 652, `lane-tests` 639, `lane-roadmap` 627,
`practical-franklin-5ol54s` 618, the `gallant-dijkstra-*`/`stoic-mccarthy-*`/
`compassionate-bell-*` family 150-186 each) — same "too large for one unattended pass" call
as prior cycles, nothing new to absorb.

Drained the resulting integrator tip to `main` with the stamped `--no-ff` method
immediately after.

Backlog:
- Subsystem-audit rotation: fuel + expenses + messages are now confirmed clean. Next
  unaudited per AGENTS.md's per-entry-point pass: safety/claims, recruiting, settlements,
  tasks.
- `lane-compliance` (662 unpicked) and `lane-roadmap` (627) remain the largest pending
  branches — meta-governor prune pass still overdue, unchanged from prior cycles.
- Carried, unchanged: npm audit's 3 high-severity findings (owner-approval-gated
  semver-major bump); IFTA due-date roll not accounting for legal holidays; Owner's Vercel
  production-pipeline dashboard check (re-verify with Vercel MCP before paging again — no
  access this cycle to re-confirm either way).

## Named-workflow E2E sweep + branch triage — 2026-07-23 ~16:48 UTC (verify-and-build cycle)

Integrator (`2f400ace`) was 1 commit ahead of `main` (`318a5b12`), no divergence — build
(`npm run build`), `npx vitest run` (182 files/1521 tests), and `npm run lint` all green on
the integrator tip before touching anything else.

Worked `agent:branches`' suggested order looking for a safe absorb (95 pending branches).
`lane-compliance`/`eager-babbage-ibsmrz`/`lane-tests`/`lane-roadmap`/`practical-franklin-5ol54s`
and the `gallant-dijkstra-*`/`stoic-mccarthy-*` 150-660+ unpicked-commit family are the same
too-large-for-one-unattended-pass branches prior cycles have already ruled out (confirmed
again via diffstat: 150-345 files / 7.8k-19k line diffs each). Dry-ran merges on every branch
with 20 or fewer unpicked commits (`stoic-mccarthy-{08z45u,p7dtl2,smz6m4}`, `gallant-dijkstra-
5pt308`, `compassionate-bell-8r88rj`, `pensive-allen-{bgqbgg,lz41rp,kpjskl,1wsr8h,pd71ho,
ao14bb,6gmrh4}`, `gallant-dijkstra-hi3km2`): 7 have no merge-base with `main` (unrelated-
history forks, not safely mergeable unattended), the rest conflict against HEAD. Spot-checked
the two single-file conflicts (`stoic-mccarthy-p7dtl2`/`smz6m4`, both "NotificationsBell badge
race" fixes) and the pending-count fix (`stoic-mccarthy-08z45u`) directly against HEAD: all
three are superseded — HEAD already carries a newer/more complete version of each (the
`NotificationsBell` awaited-POST fix plus epoch tracking and app-badge sync; `agent-loop-
status.mjs`'s `parsePendingCount` + 64 MB `maxBuffer` fix for the same execSync-truncation
bug `08z45u` was chasing). Per AGENTS.md's keep-HEAD-when-superset rule, none merged. No
absorbable branch this cycle.

`agent:backlog`'s top pick (`2f400ace`) carries only owner-gated items (npm audit semver-major
bump, meta-governor prune pass) — nothing an agent can act on without an owner call, so per
step 6 ran a full E2E sweep instead of forcing a guess. Local Postgres 16 stood up from scratch
(server was down; no `hubapp` role/`hubdb` database existed yet — created both per the dev-
workflow-testing skill's pitfall #9), `npm run db:migrate` (all 20 migrations clean) + `npm run
seed:demo`, `npm run build && npm run start`. Drove all five workflows the routine template
names by their `e2e-*-smoke.mjs` scripts: **compliance** (wall summary counts, item tracking,
consortium resolution, driver-doc upload, driver blocked from office routes), **messages**
(office↔driver thread at 390px, template chips, unread badges, read receipts, driver blocked
from office routes), **dispatch board** (legal advance, server-side refusal on an expired-
medical-card load, cancel-confirm flow, accountant's `loads:read`-only refusal), **expenses**
(odd-cents recording, P&L delta, QuickBooks CSV reconcile, reimbursable tagging, dispatcher's
read-only view), and **IFTA generate** (compute → draft → reviewed → filed, worksheet/CSV
jurisdiction-row-sum-equals-header-net-tax reconciliation, partial-current-quarter compute).
**All five green, 0 defects, 0 console errors.** `npm run test:sidecars` also green this cycle
(28 Rust tests + Go vet/test, clippy clean) though nothing Go/Rust was touched.

No code fix was available to ship — draining the unchanged integrator tip would just replay
`2f400ace` with a fresh `.drain-stamp`, so left `main` as-is this cycle rather than manufacture
a no-op deploy.

Backlog:
- 95 pending `claude/*` branches remain per `agent:branches`, up from 84 two cycles ago —
  `lane-compliance` (662 unpicked) and `lane-roadmap` (627) are still the largest and the
  meta-governor prune pass remains overdue; this cycle adds confirmation that at least 7 of
  the small (<=20 unpicked) branches are unrelated-history forks and should be deleted rather
  than re-triaged every hour (`stoic-mccarthy-6modfo`, `gallant-dijkstra-{5pt308,vu6skb,
  kj6yrh,mta231,hi3km2,7ra44b}`, `compassionate-bell-8r88rj`).
- Carried, unchanged: npm audit's 3 high-severity findings (owner-approval-gated semver-major
  bump); IFTA due-date roll not accounting for legal holidays (documented scope decision, not
  a bug, per 83198c6 — drop unless an owner asks); Owner's Vercel production-pipeline status
  last confirmed recovered (per `b7eb6c2`), not re-checked this cycle (no Vercel MCP tool
  available) — no new information to page on.

## Money-subsystem audit (invoices/advances/settlements/statements) — 2026-07-23 ~18:40 UTC (verify-and-build cycle)

Integrator and `main` matched exactly at `80150e8c` (0 drift) — `npm ci`, `npm run build`,
`npx vitest run` (182 files/1521 tests), `npm run lint`, and `npm run test:sidecars` (28 Rust
tests + Go vet/test, clippy clean) all green before touching anything else.

`agent:backlog`'s top item is owner-gated only (npm audit major bump, meta-governor prune),
so per step 6 picked the next unaudited subsystem in the AGENTS.md tenancy/permission/money
rotation: invoices, advances, and settlements (fuel/expenses/messages/safety/claims/tasks/
recruiting/settlements-adjacent items were already confirmed clean in the last two cycles;
invoices/advances specifically hadn't been named yet). Walked every entry point: `invoices.ts`
(tenancy joins on both sides for customers/loads in `INVOICE_SELECT`, `invoiceTotalCents` vs.
`loadTotalCents` cross-check before insert, `ON CONFLICT (carrier_id, load_id)` race handled
with a re-fetch-and-report path, `recordPayment`'s status derivation done inside a `SELECT ...
FOR UPDATE` transaction so two concurrent payments can't both land on `partial`), `advances-
core.ts` + `settlements.ts#insertAdvanceWithinExposureCap` (per-driver `pg_advisory_xact_lock`
closes the TOCTOU window between office-issued and driver-requested advances, both entry points
in `_actions/money.ts` and `_actions/driver.ts` share the same capped-insert helper and each
carry their own `requirePermission`/`logAudit`), and `_actions/money.ts`'s invoice/advance/
settlement actions (all `money:write` or `money:approve`, all audited). **No defect found** —
this subsystem is already well-hardened (the advisory-lock exposure-cap pattern explicitly
mirrors the escrow-ledger race fix cited in its own comments).

Stood up a fresh local rig this cycle (Postgres was down, no `hubapp` role/`hubdb` database
existed yet — created both per the dev-workflow-testing skill's pitfall #9), `npm run
db:migrate` (all 20 migrations clean) + `npm run seed:demo`, `npm run build && npm run start`.
Ran the four smokes covering what was just audited: `e2e-invoices-smoke` (one-click invoice
from POD, odd-cents partial payment, exact-remainder final payment, dispatcher read-only),
`e2e-advances-smoke` (driver request over $1,000 refused server-side, exposure math exact
through approve/deny, office-issued advance, dispatcher read-only), `e2e-settlements-smoke`
(draft is idempotent on rerun, company-driver and O/O percentage settlements itemize to the
cent including detention share, escrow bumps exactly once, EFS advance flips to applied on
approval), `e2e-statements-smoke` (AR rollup excludes fully-paid customers, statement PDF
serves, send-without-SMTP stays graceful, dispatcher read-only). **All four green, 0 defects,
0 console errors** — matches the static-audit conclusion.

No code fix was available to ship — draining the unchanged integrator tip would just replay
`80150e8c` with a fresh `.drain-stamp`, so left `main` as-is this cycle rather than manufacture
a no-op deploy.

Backlog:
- Subsystem-audit rotation: invoices, advances, settlements, and statements are now confirmed
  clean, joining fuel/expenses/messages/safety/claims/tasks/recruiting from the last two
  cycles. Remaining unaudited per AGENTS.md's per-entry-point pass: dispatch/loads core,
  planner, reports, portal/tracking, integrations webhooks, driver PWA offline queue.
- 99 pending `claude/*` branches remain per `agent:branches` (up from 95) — `lane-compliance`
  (664 unpicked/1370 raw) and `lane-roadmap` are still the largest; meta-governor prune pass
  remains overdue, unchanged from prior cycles.
- Carried, unchanged: npm audit's 3 high-severity findings (owner-approval-gated semver-major
  bump); IFTA due-date roll not accounting for legal holidays (documented scope decision, not
  a bug); Owner's Vercel production-pipeline status last confirmed recovered, not re-checked
  this cycle (no Vercel MCP tool available).

## Seven-lane absorb + reports merge-conflict resolution — 2026-07-24 ~03:40 UTC (verify-and-build cycle)

Integrator was pure fast-forwardable from `main` (0 ahead/1 behind) — fast-forwarded first, then
`npm ci` + `npm run build` + `npx vitest run` (182 files/1522 tests) all green before touching any
lane branch.

`agent:branches`/`agent:status` showed nine lane branches ahead of the integrator: two huge ones
(`lane-tests` 1443, `lane-compliance` 1536 unpicked) matched the same too-large-for-one-unattended-
pass shape prior cycles have already ruled out (skipped again, unchanged call); the other seven were
small (1-2 commits each, real merge-bases) and absorbed one at a time with build+`vitest` green after
each: `lane-portal` (quote-form CTA accent), `lane-sidecars` (Go worker graceful SIGINT/SIGTERM
shutdown — verified with `go test -count=1` since `go test` caches by default and the change was
Go-only), `lane-docs` (fmcsa/eia/terminal/scout-rotation doc scout passes, no code), `lane-roadmap`
(new random drug & alcohol testing pool feature — migration `021_random_testing.sql`, new cron entry
in `vercel.json` at a fixed once-daily time, well under the Hobby per-project job cap), `lane-
integrations` (fuel-feed CSV parser test coverage, test-only), `lane-analytics` (real conflict, see
below), `lane-saas` (driver PWA bottom-nav now follows the carrier's accent, forced-dark rules
respected — fixed navy/steel/white classes only, no fg/surface/border tokens).

`lane-analytics`'s merge conflicted in `reports.ts#toLeaderboardRows`: the incoming branch was the
original implementation (manual `Number()` coercion + inline `avg_rpm_cents` math), but HEAD already
carried a newer refactor (`4788ca06`, already on `main`) that reuses the shared `avgRpmCents` helper
from `lanes.ts` and trusts `LaneAggregateRow`'s already-numeric fields (coercion happens once inside
`aggregateLanes`, not again downstream) — a genuine keep-HEAD-superset case per AGENTS.md, not a
blind conflict-marker resolution. Verified by reading `aggregateLanes` in `lanes.ts` directly to
confirm the numeric coercion already happens there before this call ever sees the row.

Verify chain after all seven merges: `npm run build`, `npx vitest run` (185 files/1540 tests), `npm
run lint` (clean), `npm run test:sidecars` (28 Rust + Go vet/test, clippy clean, Go re-run with
`-count=1` to bypass the test cache and confirm the new shutdown test actually executed). Local
Postgres stood up fresh (role/db didn't exist yet, pitfall #9), `db:migrate` (all 21 migrations
including the new `021_random_testing.sql` applied clean) + `seed:demo`, `build && start`. Drove four
E2E smokes covering everything touched this cycle: `e2e-random-testing-smoke` (new feature end to
end — pool selection, idempotent re-run, result recording, driver blocked, 390px no-overflow, 0
console errors), `e2e-driver-smoke` (15-step phone flow, accent change didn't regress anything),
`e2e-portal-smoke` (broker/shipper flows), `e2e-reports-smoke` (P&L, CSV exports, owner dashboard
lane leaderboard — the exact code path the merge conflict touched). **All four green, 0 defects.**

Pushed the integrator; the `drain-integrator.yml` GitHub Action backstop fast-forwarded `main` to the
integrator tip (`b2c391e0`) automatically before this cycle got to its own drain step — confirmed via
`npm run agent:status` (0 drift either direction) rather than re-draining a no-op.

`agent:backlog`'s top pick is an owner-gated architecture call (Rust sidecar's `tiny_http` has no
per-connection timeout/thread cap — needs accept-risk/vendor-patch/switch-crates decision, not a
guessable fix), so no further code change was forced this cycle per AGENTS.md's ambiguity rule.

Backlog:
- 92 pending `claude/*` branches remain (down from 99) — `lane-tests` (1443 unpicked) and
  `lane-compliance` (1536 unpicked) are now the two largest by a wide margin and growing every
  cycle; meta-governor prune pass is significantly overdue on both.
- Rust sidecar `tiny_http` connection-timeout/thread-cap gap (from `agent:backlog`'s top pick) still
  needs an owner decision before any code change.
- Carried, unchanged: npm audit's 3 high-severity findings (owner-approval-gated semver-major bump);
  IFTA due-date roll not accounting for legal holidays (documented scope decision); registry.test.ts
  for provider/webhook consistency (lane-integrations territory); reseed() not resetting
  hub.carriers.status (lane-tests territory).

## Dispatch/loads-core subsystem audit + small-branch triage — 2026-07-24 ~06:40 UTC (verify-and-build cycle)

`main` was 1 commit ahead of the integrator (a `.drain-stamp` drain commit not yet merged back) — same
divergence shape as prior cycles. Fast-forwarded the integrator to `main` (pure fast-forward, no
conflicts), pushed. `npm ci` + `npm run build` + `npx vitest run` (186 files/1546 tests) all green
before touching anything else.

Before absorbing branches, dry-ran merges on the 12 smallest pending candidates from `agent:branches`
not yet individually confirmed in prior triage notes: `stoic-mccarthy-{08z45u,p7dtl2,smz6m4,97wgd7}`
and `pensive-allen-{bgqbgg,lz41rp,kpjskl,1wsr8h,pd71ho,6gmrh4,ao14bb,6tmehe,smw0re}`. All 12 conflict
against HEAD (none are unrelated-history forks — every one has a real merge-base, just 300+ commits
stale). Verified rather than assumed: read the actual conflicting hunks for a representative sample —
`pensive-allen-kpjskl`'s compliance-page bad/ok token mapping is already on HEAD (`bg-bad`/`bg-ok`/
`text-bad` etc., `src/app/hub/(office)/compliance/page.tsx`); `pensive-allen-{1wsr8h,pd71ho,6gmrh4,
ao14bb}`'s `text-emerald-300` → `text-ok` IFTA fix is superseded by a newer three-way `text-warn`/
`text-ok`/`text-fg` ternary already on HEAD (`ifta/page.tsx`); `stoic-mccarthy-97wgd7`'s
`.cursor/automation/README.md` rewrite is byte-identical to HEAD's current content; `pensive-allen-
{6tmehe,smw0re}`'s `dev-workflow-testing/SKILL.md` pitfall additions are a strict subset of HEAD's
(HEAD already carries pitfalls 5-12, these branches only had a couple of the earlier ones). Per
AGENTS.md's keep-HEAD-superset rule, none merged — no absorbable branch this cycle.

`agent:backlog`'s top items are all owner-gated (npm audit major bump, meta-governor prune, tiny_http
decision), so per step 6 picked the next unaudited subsystem in the AGENTS.md tenancy/permission/money
rotation: dispatch/loads core (fuel/expenses/messages/invoices/advances/settlements/statements/safety/
claims/tasks/recruiting already confirmed clean in prior cycles). Walked every entry point: `loads.ts`
(all queries carrier-scoped, `LOAD_SELECT`'s lateral joins guard `carrier_id` on every joined table,
`assertCarrierRefs` gates customer/driver/truck/trailer on create+update), `_actions/loads.ts` (every
action calls `requirePermission` with the right action — `loads:write`/`loads:status`/`documents:write`
— money-adjacent update logs old/new linehaul+FSC via `logAudit`, `logCheckCallAction` proves the
client-supplied `loadId` belongs to the carrier via `getLoad` before writing an event row), `loadboard.ts`
(`patchLoadBoardField` re-derives the load server-side, re-applies the same dispatch-legality + POD
gates as the load-detail path so inline editing can't bypass them, `assertCarrierRefs` on driver_id/
truck_id reassignment), `_actions/loadboard.ts` (permission check keyed off field name, `loads:status`
for status changes), `sharelinks.ts` (`createShareLink` calls `assertCarrierRefs({load_id})` before
issuing a token; `revokeShareLink` is carrier-scoped in its own WHERE clause), `recurring.ts#rebookLoad`
(source load fetched via carrier-scoped `getLoad` before any field is copied), and `documents.ts`
(`saveDocument`/`deleteDocument` both carrier-scoped, entity ref proven via `assertCarrierRefs` in the
action layer before the DB write). **No defect found** — this subsystem is clean.

Stood up a fresh local rig this cycle (Postgres was down, no `hubapp` role/`hubdb` database existed
yet — created both per the dev-workflow-testing skill's pitfall #9), `npm run db:migrate` (all 21
migrations clean) + `npm run seed:demo`, `npm run build && npm run start`. Ran the four smokes covering
what was just audited: `e2e-loads-smoke` (booking flow, cent-exact rate math, driver blocked from
Book-a-Load), `e2e-dispatch-smoke` (legal advance, server-side refusal on the expired-medical-card
load, cancel-confirm flow, accountant's `loads:read`-only refusal), `e2e-duplicate-load-smoke`
(per-shipment facts stripped on rebook, assignment/factored flag carried over, accountant not offered
Duplicate), `e2e-load-osd-chip-smoke` (driver POD-with-exception opens a draft claim, load detail chips
it, chip links back to the exact claim). **All four green, 0 defects, 0 console errors** — matches the
static-audit conclusion.

No code fix was available to ship — draining the unchanged integrator tip would just replay `main`'s
tip with a fresh `.drain-stamp`, so left `main` as-is this cycle rather than manufacture a no-op deploy.

Backlog:
- Subsystem-audit rotation: dispatch/loads core is now confirmed clean, joining fuel/expenses/
  messages/invoices/advances/settlements/statements/safety/claims/tasks/recruiting from prior cycles.
  Remaining unaudited per AGENTS.md's per-entry-point pass: planner, reports, portal/tracking,
  integrations webhooks, driver PWA offline queue.
- All 12 of this cycle's dry-run candidates (`stoic-mccarthy-{08z45u,p7dtl2,smz6m4,97wgd7}`,
  `pensive-allen-{bgqbgg,lz41rp,kpjskl,1wsr8h,pd71ho,6gmrh4,ao14bb,6tmehe,smw0re}`) are confirmed
  superseded-by-HEAD, not just conflicting — safe deletion candidates for the meta-governor prune pass
  rather than re-triage targets.
- `lane-tests` (1443 unpicked) and `lane-compliance` (1536 unpicked) remain the two largest pending
  branches; meta-governor prune pass remains overdue, unchanged from prior cycles.
- Carried, unchanged: npm audit's 3 high-severity findings (owner-approval-gated semver-major bump);
  Rust sidecar `tiny_http` connection-timeout/thread-cap gap (owner decision); IFTA due-date roll not
  accounting for legal holidays (documented scope decision).

