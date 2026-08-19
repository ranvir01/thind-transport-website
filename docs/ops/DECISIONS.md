# DECISIONS — owner approve/reject queue

One paragraph per item: question, options, the agents' recommended default, cost of deferral.
Answer by editing this file (fill `Answer:`) or telling any agent session. Spend/legal/comms/
data/fleet classes never auto-execute — they re-surface until answered. Format per
docs/research/2026-08/prompt-6-agent-team.md §5.

## D-001 | filed:2026-08-08 | class:fleet
Q: Arm the branch reaper? `.github/workflows/branch-reaper.yml` runs Sundays in DRY-RUN,
printing which fully-merged `claude/*`/`cursor/*` branches it WOULD delete (200+ dead branches
clog every integrator triage). Arming = setting repo variable `REAPER_ARMED=true` (Settings →
Secrets and variables → Actions → Variables). It deletes ONLY branches whose tip is fully
contained in main; unmerged branches are listed, never touched.
A) Review two Sundays of dry-run output, then arm. [recommended]
B) Arm immediately (the merged-only policy is conservative by construction).
C) One-shot now, no arming: GitHub → Actions → "Prune merged agent branches" →
   Run workflow → check `arm_tree_prune`. Same merged-only policy, runs once
   from any browser (2 minutes), leaves the weekly reaper in dry-run.
Deferral cost: integrator keeps re-triaging 200+ dead branches every cycle.
Answer: ____

## D-002 | filed:2026-08-08 | class:tech | safe-default:A after:2026-09-01
Q: npm audit shows advisories fixable only by semver-major bumps (nodemailer/sharp family —
re-verify at execution). Majors are owner-gated by standing rule.
A) Approve the bumps; agents run the full verify chain + e2e battery before drain. [recommended]
B) Defer another month.
Deferral cost: known advisories stay live in the mail/image paths.
Answer: ____

## D-003 | filed:2026-08-08 | class:fleet
Q: Adopt the 24/7 operating manual's fleet schedule (docs/research/2026-08/prompt-6-agent-team.md
§1): five daily build slots + Saturday deep-verify + Sunday red-team/meta-governor + Friday
owner digest, replacing ad-hoc firings. Requires you to create/update routines in claude.ai →
Code → Routines per the §1 table (agents cannot modify the fleet — your standing rule).
A) Adopt as written; agents prepare the prompt blocks in docs/claude-routines.md first. [recommended]
B) Keep the current fleet shape.
Deferral cost: none urgent; current fleet works, the manual mainly adds verification depth.
Answer: ____

## D-004 | filed:2026-08-19 | class:fleet
Q: Cursor automations cannot boot until the tested environment is Saved (personal env
`5241c374-0579-442f-bf88-309dbcbe37f3`). Recurring SYSTEM build
`bld-20260819-e34379d9-3634-4174-b245-e3c81319a7a6` SUCCEEDED 2026-08-19 08:33 (install-only);
scheduled runs through the 08:00 hour still ERROR in ~8s with `setupStatus: null`.
A) Save in the Environment panel, Enable builds, confirm the next Integrator run boots. [required]
B) Keep just-in-time boots only (hand agents work; scheduled automations keep ERROR'ing).
Deferral cost: every hourly Cursor job dies in ~8s; fleet-liveness.yml will go red while branches wait.
Answer: ____

## D-005 | filed:2026-08-19 | class:fleet
Q: Disable duplicate Cursor automation Untitled `61b8e855-76b8-11f1-ba66-0e7d0216e441` (fires as
HaulDesk improvement cycle — second writer on `main` next to Deploy + backlog).
A) Disable it. [recommended]
B) Keep both (two agents will collide on `main`).
Deferral cost: forced-push / conflict on the production branch.
Answer: ____
