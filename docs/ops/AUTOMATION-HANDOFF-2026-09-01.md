# AUTOMATION-HANDOFF — 2026-09-01 afternoon update

Give this file to the agent that is creating Cursor automations (and
improving Claude routines). It **combines** three things:

1. The fleet layer already shipped on [`PR #42`](https://github.com/ranvir01/thind-transport-website/pull/42)
   (`cursor/fleet-24-7-liveness-931f`) — do not rebuild that.
2. **Live dashboard facts from this afternoon** that supersede PR #42's
   morning snapshot ("Integrator / Prod Smoke / Deploy still disabled").
3. Lessons from the home pay-copy session ([`PR #62`](https://github.com/ranvir01/thind-transport-website/pull/62),
   now **merged**) plus how to write **better Claude automations**.

Paste everything inside the fence into that agent's prompt. Do **not** push
onto `cursor/fleet-24-7-liveness-931f` — it has one writer
([Agent Setup 1](https://cursor.com/agents/bc-01a018fb-831d-7f3e-859f-0507f50d931f)).

If a file below 404s on your checkout, fetch it raw from the fleet branch:

`https://raw.githubusercontent.com/ranvir01/thind-transport-website/cursor/fleet-24-7-liveness-931f/<path>`

````
You are working for Ranvir Thind on github.com/ranvir01/thind-transport-website.
A previous agent already shipped the full automation layer on branch
cursor/fleet-24-7-liveness-931f (PR #42). Your job: COMBINE your automation
designs with that layer, FIX the live Cursor trio's branch-discipline bug,
and IMPROVE how Claude automations are written. Do not rebuild what exists.
Do not invent a fourth fleet. Work autonomously; do not wait mid-task.

If a file below is missing on your checkout, fetch it raw:
https://raw.githubusercontent.com/ranvir01/thind-transport-website/cursor/fleet-24-7-liveness-931f/<path>

================================================================
BRANCH FIRST
================================================================
Do NOT push to cursor/fleet-24-7-liveness-931f — one writer.
Branch OFF it:

  git fetch origin cursor/fleet-24-7-liveness-931f
  git checkout -b cursor/<your-task>-<suffix> origin/cursor/fleet-24-7-liveness-931f

Commit as the owner: npm run git:identity
  Ranvir Thind <130034150+ranvir01@users.noreply.github.com>
Never push to main. Never push to claude/hauldesk-project-setup-l1luoo.

================================================================
READ FIRST, IN ORDER
================================================================
1. docs/ops/CURSOR-START.md        — owner import pack (7 Cursor slots)
2. docs/ops/CLAUDE-START.md        — owner pack for the live 9 Claude tasks
3. docs/ops/AUTOMATION-HANDOFF.md  — the morning combine-don't-duplicate paste
4. .cursor/automation/README.md    — library + activation rules
5. docs/ops/FLEET.md               — live roster + "One charter, one platform"
6. docs/ops/AGENT_INTEROP.md §1    — shared clock (every schedule is a row)
7. docs/ops/DECISIONS.md           — D-003, D-006 (UNANSWERED), D-007, D-012–D-017
8. docs/claude-routines.md         — Claude prompt library + 9 live tasks
9. docs/claude-routine-preamble.md — paste at the top of every Claude routine
10. docs/cursor-agent-preamble.md  — start-of-run contract for Cursor agents
11. docs/ops/PORTFOLIO.md          — which repos are active vs dormant
12. docs/research/2026-08/prompt-6-agent-team.md — field survey + operating manual

================================================================
LIVE FACTS (2026-09-01 ~14:45 UTC) — SUPERSEDE PR #42's MORNING SNAPSHOT
================================================================
Looked up via cursor-cloud GetAutomation + list-cloud-agents this afternoon.
PR #42 / CURSOR-START / AUTOMATION-HANDOFF still say Integrator / Prod Smoke
/ Deploy + backlog are DISABLED. That was true this morning. It is false now.

ENABLED and firing hourly (owner Ranvir Thind, rjkind01@gmail.com):

| Dashboard name      | Automation id                          | Agent-run title              | Cron intent in-repo | Designated branch                          |
|---------------------|----------------------------------------|------------------------------|---------------------|--------------------------------------------|
| Integrator          | 880eec29-78fd-11f1-ba66-0e7d0216e441   | Claude branch absorption     | :00 UTC             | claude/hauldesk-project-setup-l1luoo       |
| Prod Smoke          | 4ad7743c-7900-11f1-ba66-0e7d0216e441   | Production smoke agent       | :30 UTC             | main                                       |
| Deploy + backlog    | 75e8fbf5-7900-11f1-ba66-0e7d0216e441   | Agent improvement loop       | :59 UTC             | main                                       |

Untitled / HaulDesk improvement cycle 61b8e855-76b8-11f1-ba66-0e7d0216e441
is NOT readable via GetAutomation (gone or private). Older runs still exist
in the agent list. Do not recreate it (D-005).

D-006 is still UNANSWERED in docs/ops/DECISIONS.md. Someone (or an agent)
enabled the trio anyway. Do not treat that as an owner yes for D-006.
Do not disable them from the repo (agents cannot click dashboards).
Do not write a "restore the trio" PR — they are already on.
Your job on the trio is QUALITY: make them stay on the designated branch
and stop without committing when there is nothing to do.

#1 FLEET BUG (observed this afternoon — this is why Cursor automations
look busy and produce nothing useful):

Cursor cloud agents DEFAULT to creating a new branch
`cursor/<automation-name>-xxxx` every firing. gitConfig.branch in the
workflow JSON is not enough. Observed:

- Integrator: sometimes correctly on claude/hauldesk-project-setup-l1luoo,
  sometimes on cursor/claude-branch-absorption-* (WRONG — second writer,
  work never reaches the integrator tip the drain reads).
- Deploy: ALWAYS on cursor/agent-improvement-loop-* instead of main
  (WRONG — Phase A/B never publishes; leaves a landfill of empty PRs).
- Prod smoke: ALWAYS on cursor/production-smoke-agent-* instead of main
  (WRONG — a green smoke that "fixes forward" on a throwaway branch
  never heals production).

Recent run examples (source=automations, all IDLE after ~1–6 min):
  bc-26ccca51… Claude branch absorption → cursor/claude-branch-absorption-9c21
  bc-7ba5f9bf… Claude branch absorption → claude/hauldesk-project-setup-l1luoo (the good case)
  bc-daa0fdf4… Agent improvement loop → cursor/agent-improvement-loop-78e2
  bc-cbc46189… Production smoke agent → cursor/production-smoke-agent-39f4

THIS is the most important Cursor-automation quality fix. Every new
.prompt.md and every live-trio prompt patch MUST include, as numbered
step 0, before any other work:

  0. Identify the designated branch from your charter (integrator /
     main / claude/lane-X). `git checkout <that-branch> && git pull`.
     If the harness already created cursor/<something>, STOP. Do not
     commit on it. Report "wrong branch — designated is <X>" and exit.
     Never `git checkout -b` unless the charter is a lane builder that
     is ALLOWED to use a session branch, and even then prefer the
     existing claude/lane-* ref.

Also add a stop-without-committing rule: if you are not on the
designated branch, you have not started.

================================================================
WHAT ALREADY EXISTS — DO NOT REBUILD
================================================================
On PR #42 (fetch that branch — these files are NOT all on main yet):

Cursor, import-ready in .cursor/automation/ (owner clicks; model pinned
cursor-grok-4.6-high-fast; canonical JSON shape =
loadoff-build-office.workflow.json):
  A office 05:13 · B driver 08:13 · C tests 11:13 · D integrations 14:13 UTC
  (daily home-repo builders, write claude/lane-*)
  E portfolio radar daily 09:37 (issues only, never commits)
  F BLS maintenance Wed 12:37 (PR on ranvir01/bls-website)
  G MyCO maintenance Thu 12:37 (PR on ranvir01/myco-website)
  Day-2 optional: owner digest Fri 19:37, dependency pass Mon 10:07.

Claude, LIVE 9 tasks on claude.ai (home repo only — D-007). Trigger ids
and paste deltas: docs/ops/CLAUDE-START.md. Do not create a 10th task.
Do not put Claude on bls-website (D-016) or myco-website.

GitHub Actions (platform-independent, keep):
  drain-integrator.yml :17/:47 (stamped --no-ff + .drain-stamp; never
  a fast-forward ref push — Vercel dedupes SHA AND identical trees).
  E2E 03:40. Others on the fleet branch: liveness :10, digest Fri 20:41,
  reaper Sun 06:00 (dry-run until D-001).

Grok Bot: 14-seat org (D-015/D-016). Never writes git. Dispatch SOPs:
  docs/grok-bots/templates/fire-cursor.md (Dex/Rex/Bee)
  docs/grok-bots/templates/fire-claude.md (Em only, idle-window gated)
  Owner trio: GOGO-START → CURSOR-START → CLAUDE-START.

Guard tests that fail your build if you break the contract (on PR #42):
  src/lib/__tests__/cursor-automation-guard.test.ts
  fleet-clock-guard.test.ts
  grok-bot-instructions-guard.test.ts
  drain-workflow-guard.test.ts

On main today (this checkout):
  .cursor/automation/loadoff-integrator.prompt.md + .workflow.json
  .cursor/automation/loadoff-prod-smoke.prompt.md + .workflow.json
  .cursor/automation/loadoff-deploy.prompt.md + .workflow.json
  docs/cursor-agent-preamble.md
  docs/claude-routine-preamble.md
  docs/ops/AGENT_INTEROP.md
  docs/claude-routines.md (history + Routine 1/2 bodies; live-9 table
  and paste deltas are fuller on the fleet branch)

CONFLICTING OPEN PR — do not ship both intents:
  PR #59 cursor/loadoff-agent-fleet-ba94
  "Restore LoadOff Cursor Automation fleet"
  Wants the trio as the intended fleet and Claude as fallback.
  That contradicts PR #42 / D-006 (trio stay disabled until owner answers)
  AND is stale vs this afternoon (trio already enabled).
  Combine by: treat #59 as superseded. Do not merge "restore the trio"
  and "keep trio disabled". The live work is prompt/branch discipline
  on the three that are already on.

================================================================
THIS SESSION (home pay copy) — DONE, DO NOT REDO
================================================================
Agent: https://cursor.com/agents/bc-a740dad3-b859-4a45-a166-f6e39155c1a4
Branch: cursor/home-otr-oo-pay-c1a4
PR #62 MERGED: Home routes OTR and owner-operator pay copy matches PAY_RATES.

What shipped:
  src/components/home/RoutesSection.tsx interpolates PAY_RATES
    LOCAL/REGIONAL/OTR/OO aliases
    OTR card: OTR.annual + OTR.perMile CPM · OO.commission owner-operator
    O/O: OO.annualGross gross potential, OO.perMile
  src/components/home/routes-section-pay-from-constants.test.ts
    source-grep: must read the four PAY_RATES paths; must not ship
    stale $65K-$280K / $0.55-$0.60 / $2.25-$3.25 / $180K-$280K / $0.60
  main already had pay-figures-in-range.test.ts — keep both.

Verified constants (src/lib/constants.ts — do not invent):
  companyDriver.otr.perMile / .annual     = $0.63 / $69K-$82K
  ownerOperator.perMile / .annualGross    = $2.50-$3.50 / $150K-$250K
  ownerOperator.commission                = 90%
  No companyDriver.cpmFloor. Do not invent $0.60/mi.

Merge lesson (you will hit this as integrator/builder):
  Both this branch AND main independently wired RoutesSection to
  PAY_RATES. Simple conflict (same intent, different interpolation).
  Resolution: keep card-specific aliases (LOCAL/REGIONAL/OTR, not
  otr.perMile on every card) + main's badge wording.
  Classify: simple = both sides already agree on the source of truth.
  Complicated = conflicting product intent, money, or permissions —
  stop and file [needs-owner], do not pick.

CI lesson:
  e2e-driver-offline-smoke ("Back online" toast / queued arrival replay)
  is a known flake on hub driver PWA. Not caused by marketing copy.
  Documented in docs/ops/AGENT_TASKS.md. Do not "fix" the homepage
  to make that smoke green. Do not weaken the smoke.

Marketing-lane rules this session confirmed:
  src/lib/constants.ts is READ-ONLY for lane-marketing. Integrator edits it.
  Never invent a public trust claim (insurance, on-time %, testimonials).
  Hero / Ticker / FAQAccordion / PayCalculator / JobDetailsDialog still
  hardcode $0.63 / 90% (currently matching). Backlog for a marketing
  builder: interpolate PAY_RATES there too. Not a reason to reopen #62.

Do not touch: Form 2290, SMTP credentials, Airtable (retired D-014),
Cursor dashboard enable/disable (owner clicks).

================================================================
HARD RULES (each one has a scar)
================================================================
- One charter, one platform. Never create a Cursor twin of a live Claude
  job or vice versa (FLEET.md reconciliation table). Same GitHub issue
  never on a scheduled lane AND a fired agent AND the Claude Corps.
- Every schedule is a row in AGENT_INTEROP.md §1 AND FLEET.md in the
  SAME change. A schedule that exists only in a dashboard is invisible.
  Cursor-reserved minutes: :07 / :13 / :37.
  Taken mechanical minutes: :00 integrator, :17/:47 drain Action,
  :30 smoke, :43 Claude integrator, :59 deploy.
  Never two writers on one minute+branch.
- Claude scheduled work is HOME REPO ONLY (D-007). Ceiling is 9 tasks:
  a new Claude task must name the live task it retires, same change.
  bls-website NEVER sees Claude Code (D-016).
  Dormant PORTFOLIO repos and the private career repo get nothing.
- Agents cannot click dashboards. Ship import-ready files + docs.
  Owner activates via CURSOR-START / CLAUDE-START. Update those packs
  when you add or change a slot — they are the owner's only UI.
- Agents never change fleet configuration unilaterally (schedules,
  lanes, .cursor/** wiring). File DECISIONS.md. D-006 is owner-only.
- After any .cursor/ change: npm run cursor:env-check, and tell the
  owner Cursor's saved environment must be re-imported
  (env 5241c374-0579-442f-bf88-309dbcbe37f3). The dashboard runs its
  stored copy, not the repo file. A 3-week outage (2026-07-26→08-19)
  happened because a Docker image with no FROM never built and nothing
  in-repo went red.
- Morgan / token discipline: act-or-exit (no "no updates" runs);
  one item per run; intake = collaborator-labeled `should` issues
  first (D-012), then Backlog: trailers; land with Closes #N;
  dedupe claude/* branches AND open cursor/* PRs before building.
- Money is integer cents. Every query is carrier-scoped. Permissions
  in server actions. No new heavy deps. No secrets in git. AGENTS.md
  is law for anything touching app code.
- Do not use CURSOR_API_KEY / api.cursor.com/v1/agents (bills outside
  the subscription). Do not launch agents from GitHub Actions.
  The drain Action is a plain git job, not an agent.

================================================================
HOW TO CREATE BETTER CURSOR AUTOMATIONS
================================================================
A new Cursor automation is 4 files in ONE commit, or you did not finish:

  1. .cursor/automation/<name>.prompt.md     — full charter
  2. .cursor/automation/<name>.workflow.json — import JSON
  3. Rows in CURSOR-START.md + FLEET.md + AGENT_INTEROP.md §1
  4. New assertions in cursor-automation-guard.test.ts
     (and fleet-clock-guard if you added a minute)

JSON shape (copy loadoff-build-office.workflow.json on the fleet branch,
or loadoff-integrator.workflow.json on main):

  name, description
  workflow.triggers[0].cron.cron     — UTC, unused minute
  workflow.prompts[0]                — SHORT. Tells the agent to read
                                       the .prompt.md. Do not dump the
                                       whole charter into the JSON.
  workflow.gitConfig.repo            — ranvir01/thind-transport-website
                                       (or the satellite repo for F/G)
  workflow.gitConfig.branch          — the ONLY branch it may write
  workflow.model                     — cursor-grok-4.6-high-fast
  workflow.agentOptions.skipInstall  — false
  workflow.memoryEnabled             — true
  workflow.actions                   — []

Prompt craft that the live trio is missing (patch them):

  - Step 0: stay on designated branch or EXIT (see LIVE FACTS).
  - Start-of-run block from docs/cursor-agent-preamble.md:
    npm run git:identity && git pull && npm run hooks:install
    && npm run agent:status && npm run agent:branches
    Then git log --all --grep before fixing anything.
  - Named stop-without-committing conditions (green smoke, empty
    backlog, already-absorbed branch, wrong branch, catch-up when
    you are not the drain).
  - Named verify: npm run build && npx vitest run
    (+ typecheck:gate / token-lint when relevant).
    This image has NO browser and NO Go/Rust. Tag [needs-browser]
    or [needs-sidecars] instead of skipping or weakening a gate.
  - One item. Backlog: trailer with tags:
    [needs-browser] [needs-sidecars] [needs-owner] [blocked-by <branch>]
  - Act-or-exit. A 90-second "nothing to do" run that still opens a
    cursor/* PR is a defect in your prompt.
  - Finder ≠ fixer. If the charter is smoke / radar / review / audit:
    file a should issue (create-or-comment). Do not push product fixes
    unless production is actually down AND you are the smoke agent
    whose designated branch is main.
  - Do not clone the repo a second time inside the prompt — the cloud
    agent already has the tree.

Home-repo builders write claude/lane-*, never main, never integrator.
Portfolio radar writes issues only.
Satellite maintenance writes one cursor/* PR on THAT repo, max.

Do not import / do not twin (CURSOR-START §2):
  marketing 20:13 — Claude 08:00 owns lane-marketing
  deep-verify Sat 07:07 — Claude Sun 10:53
  meta-governor Sun 18:07 — Claude Mon 12:00
  red-team Sun 09:07 — Claude Mon 14:00

================================================================
HOW TO CREATE BETTER CLAUDE AUTOMATIONS
================================================================
This is the other half of your job. Claude routines live on claude.ai
→ Code → Routines. You cannot click that UI. You ship PASTE DELTAS
the owner appends in one sitting (CLAUDE-START.md). Never ask the
owner to re-paste a 2,000-line charter.

The live 9 (do not recreate, do not duplicate):

| # | Task                    | Trigger id                     | Cron UTC        |
|---|-------------------------|--------------------------------|-----------------|
| 1 | Integrator + drain      | trig_01B99W8MteaPtzwk124DFF4w  | 43 */3 * * *    |
| 2 | Prod smoke              | trig_01CHi6xoyJj6J6gnw61kdM6n  | 49 16 * * *     |
| 3 | Nightly E2E             | trig_01KkHERF248AGaTKWWn3TnAN  | 33 10 * * *     |
| 4 | Weekly deep audit       | trig_01DRFH6wxq5A42VHyviZrAgz  | 53 10 * * 0     |
| 5 | Meta-governor           | trig_01VDnAmz6dKpgnXo6pqXNXic  | 0 12 * * 1      |
| 6 | Fleet watchdog          | trig_0129DPKKdN2r1SAgkoS7ji9C  | 11 15 * * *     |
| 7 | Marketing lane          | trig_01P4PLJiyBp9xqt8i9ikohr6  | 0 8 * * *       |
| 8 | Weekly outside-auditor  | trig_01QogkHyq7M3RqC5SqznGZLA  | 0 14 * * 1      |
| 9 | Sim test buddy          | trig_01Wq86Kd67ZCgEFYGnEU8sXK  | 18 */6 * * *    |

If a duplicate integrator ever appears, delete by trigger id. Two
integrators racing on claude/hauldesk-project-setup-l1luoo is how
diverged main gets made.

What a GOOD Claude routine prompt contains (in this order):

  1. The preamble (docs/claude-routine-preamble.md) — identity,
     pull, hooks:install, agent:status, agent:branches.
  2. One-line charter + the ONLY branch it may write.
  3. The allowed file surface AND the forbidden surface
     (lane table in docs/agent-improvement-loop.md §5).
  4. Numbered start: catch-up/red-main first; then should issues
     in territory; then Backlog: trailers; then lane mission.
  5. Numbered pre-fix: npm run agent:branches AND
     git log --all --oneline --grep="<bug>".
     If a fix exists on any branch, name it in Backlog: and take
     the next item. NotificationsBell was re-fixed 7+ times.
     RoutesSection was wired to PAY_RATES on two branches at once.
     Probe/QA/nightly/red-team NEVER push product-code fixes —
     they create-or-comment a should issue. Build sessions fix.
     Integrator merges. One defect, one fixer.
  6. Verify commands. Point at EXISTING smokes by filename.
     Do not say "drive the app in Playwright". The 2026-08-07
     nightly wasted ~30 minutes hand-rolling a drive that
       node scripts/e2e-invoices-smoke.mjs
       node scripts/e2e-settlements-smoke.mjs
       node scripts/e2e-driver-pod-smoke.mjs
     already cover. Update that stored nightly prompt (owner
     click — file it as a CLAUDE-START delta).
  7. Drain method if this routine is allowed to publish:
       git checkout -B main origin/main
       git merge --no-ff --no-commit <integrator>
       printf 'sha=%s\ndrained_at=%s\n' <sha> $(date -u +%FT%TZ) > .drain-stamp
       git add .drain-stamp && git commit && git push origin main
     NEVER `git push origin <integrator>:main` (SHA dedupe).
     NEVER a bare --no-ff merge (tree-identical dedupe).
     Push main FIRST, alone; FF the integrator after.
     Don't wait on a PR to reach main (PR #13 is long closed).
  8. Stop-without-committing conditions. "If production is green,
     stop" — otherwise they invent busywork when the top backlog
     items are owner-gated (observed 2026-07-22/23).
  9. Backlog: trailer required. Owner-gated discoveries go to
     DECISIONS.md / OWNER-CHECKLIST.md in the same commit, never
     sit at the top of the agent queue.
  10. Keep the stored prompt under ~40–80 lines. Details live in
      repo docs the fresh session reads. That is why the preamble
      says "read AGENTS.md + improvement-loop + AGENT_INTEROP".

Paste-delta discipline (how you actually change a live routine):

  - Append a short quoted block to docs/claude-routines.md AND
    to CLAUDE-START.md §3. Owner pastes that block onto the
    existing task. They will not re-create the task.
  - Already-written deltas in CLAUDE-START (apply if not done):
    integrator intake-first (should issues outrank trailers);
    sim buddy create-or-comment; watchdog roster = the 9 ids;
    meta-governor queue health. Do those first if still open.
  - Worthwhile NEW deltas (the "better Claude" ask):
    a. Nightly: replace hand-rolled Playwright with the three
       named smokes above. Add "do not fix product code; file
       should issues" (finder/fixer).
    b. Integrator: "one branch per run, never octopus. If the
       Cursor trio left a cursor/claude-branch-absorption-*
       branch, do not absorb it — it is a prompt bug, not a
       lane. Note it in Backlog: as [needs-owner] D-006."
    c. Marketing lane: interpolate PAY_RATES, never hardcode;
       constants.ts is read-only; keep
       routes-section-pay-from-constants.test.ts +
       pay-figures-in-range.test.ts green; tag [needs-browser]
       for design-qa. Do not invent $0.60 or mixed OTR/O/O ranges.
    d. Every red-path task: idempotent create-or-comment on
       issues (search title first). No transcript-only findings.
    e. Watchdog: also stall if the Cursor trio is firing onto
       cursor/* session branches instead of designated refs
       (the #1 bug above). That is a fleet defect, not "quiet".
    f. Act-or-exit wording on sim buddy + watchdog so they
       stop silently when healthy.
  - If you genuinely need a NEW Claude charter: it must fit the
    home repo, RETIRE one of the 9 in the same change, and land
    as prompt body + CLAUDE-START row/toggle + FLEET/INTEROP
    rows + a DECISIONS.md entry. Otherwise you are proposing a
    10th task, which is forbidden.

Claude environment facts (do not assume Cursor-image limits):
  Claude Code may have more tools than the Cursor default machine.
  Still do not assume a browser unless the prompt names one.
  Still run hooks:install (npm ci --ignore-scripts skips prepare).
  Hobby Vercel: only main builds
    (vercel.json ignoreCommand skips every other ref).
    Preview URLs are gone on purpose. Sub-daily vercel.json crons
    fail the production deploy before build.
  `live=false` on a Vercel project is not an outage — check the
    production alias SHA (seen 2026-07-19).
  Egress-blocked prod smoke is exit 2 INCONCLUSIVE, not red.
    Use Vercel MCP. Do not fix-forward on a blocked probe.
  e2e-driver-offline-smoke is a known CI flake. Do not treat a
    red e2e job as a product regression without reading
    docs/ops/AGENT_TASKS.md.

Field-survey rules you must not regress
(docs/research/2026-08/prompt-6-agent-team.md):
  High-frequency jobs are mechanical (merge / drain / smoke).
  Creative jobs are daily/weekly, not hourly. The fleet already
  drifted to 23 triggers once; prune, don't add.
  Agents may only tick a statused queue, never rewrite the plan
  to declare victory. Finder sessions never push fixes.
  Do not touch gate files / ratchets without a Gate-Change:
  trailer (METR: models overwrite validators).
  New package name requires New-Dep: trailer (slopsquatting).

================================================================
YOUR JOB, IN ORDER
================================================================
1. Inventory whatever automation designs you already started.
   For each, check FLEET.md's one-charter table. If a live Claude
   task, GitHub Action, or import-ready Cursor slot already owns
   that charter, DROP yours or write down which file it supersedes
   and why — never ship both. PR #59 is the example of a duplicate
   intent (restore the trio). Drop it.

2. Patch the LIVE trio prompts (loadoff-integrator / prod-smoke /
   deploy) with Step 0 branch-discipline + act-or-exit +
   stop-if-wrong-branch. This is the highest-value Cursor fix
   available today. Do not "re-import" them as new automations.
   Update the .prompt.md + the short workflow.prompts[0] so the
   next hourly firing reads the new rule. File [needs-owner]:
   "re-save the three dashboard prompts from the updated files;
   confirm next Integrator run is on
   claude/hauldesk-project-setup-l1luoo, next Deploy/Smoke on main."

3. Claude improvements = paste deltas only (list a–f above).
   Update CLAUDE-START.md §3 to match. Keep each delta a short
   quoted block the owner can paste in one click.

4. Only AFTER 2 and 3: add a NEW Cursor slot if your inventory
   still has a charter nobody owns. 4 files + guard assertions.
   Cron on a free :07/:13/:37 minute. Model pinned
   cursor-grok-4.6-high-fast. Act-or-exit. Never merge.

5. Verify on your branch (which has PR #42's guards):
     npm run build && npx vitest run && npm run typecheck:gate
     npm run cursor:env-check   # if you touched .cursor/
   All green before push. Do not raise a ratchet to pass.

6. Ship: push YOUR branch, open a PR titled
   "Automations: <what>". Body ends with Backlog:.
   Tag every dashboard click [needs-owner].
   Update CURSOR-START / CLAUDE-START report-back blocks if you
   changed what Ranvir must click.

================================================================
REPORT BACK (this shape, then stop)
================================================================
Combined: <your slots kept / dropped-as-duplicate / superseded>
Live trio: enabled=yes (afternoon lookup); branch-discipline patch=yes/no
  next Integrator expected on claude/hauldesk-project-setup-l1luoo
  next Deploy/Smoke expected on main
PR #59: dropped-as-duplicate / other
PR #62 pay copy: left merged; marketing deltas filed=yes/no
New Cursor slots: <name · cron · repo · writes> …
Claude deltas: <task · one-line change> …
Owner clicks added: <n> (all in CURSOR-START / CLAUDE-START)
Guards: cursor-automation-guard + fleet-clock-guard green: yes/no
Blocked: …
````

## Notes for the owner (outside the paste)

- The receiving agent needs repo access and nothing else. It cannot
  enable/disable automations or paste into claude.ai. You still click.
- D-006 is still unanswered. The trio being **on** this afternoon is
  drift, not an answer. If you want them off, disable at
  [cursor.com/automations](https://cursor.com/automations) and say so
  in `DECISIONS.md`. If you want them on, answer D-006 = A and tell
  the agent to keep the branch-discipline patch.
- Do not also hand them PR #59 as "the fleet restore" — it fights PR #42.
- Home pay-copy PR #62 is merged. No action from you.
- After they land, your sitting is still the trio:
  `GOGO-START` (done) → `CURSOR-START` (7 imports) → `CLAUDE-START`
  (toggles + deltas, including any new ones they add).

## Source of these live facts

Looked up 2026-09-01 ~14:45 UTC from the home-pay-copy agent
(`bc-a740dad3-b859-4a45-a166-f6e39155c1a4`) using cursor-cloud
`get-automation` + `list-cloud-agents` (sources=automations).
Dashboard URLs:

- https://cursor.com/automations/880eec29-78fd-11f1-ba66-0e7d0216e441
- https://cursor.com/automations/4ad7743c-7900-11f1-ba66-0e7d0216e441
- https://cursor.com/automations/75e8fbf5-7900-11f1-ba66-0e7d0216e441
