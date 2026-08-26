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
owner digest + Monday dependency pass, replacing ad-hoc firings.
Answer: ADOPTED as **Cursor Automations on Grok 4.6** (owner, 2026-08-19, in-session) — not
Claude routines. **Alongside live Claude (2026-08-26):** Claude Corps already runs 14 tasks
including marketing `08:00`, nightly E2E `10:33`, weekly deep audit, meta-governor, and
outside-auditor. Import only Cursor slots with no Claude twin (office / driver / tests /
integrations). Skip marketing / deep-verify / meta-governor / red-team. Dashboard copies of
Integrator / Prod Smoke / Deploy + backlog were **disabled** 2026-08-26; Untitled stays off.
Grok Bot is the watcher layer (never git) — `docs/grok-bots/`. Fallback Claude prompt blocks
remain in docs/claude-routines.md §"Scheduled fleet v2".

## D-004 | filed:2026-08-19 | class:fleet
Q: Cursor automations cannot boot until the tested environment is Saved (personal env
`5241c374-0579-442f-bf88-309dbcbe37f3`). Recurring SYSTEM build
`bld-20260819-e34379d9-3634-4174-b245-e3c81319a7a6` SUCCEEDED 2026-08-19 08:33 (install-only);
scheduled runs through the 08:00 hour still ERROR in ~8s with `setupStatus: null`.
A) Save in the Environment panel, Enable builds, confirm the next Integrator run boots. [required]
B) Keep just-in-time boots only (hand agents work; scheduled automations keep ERROR'ing).
Deferral cost: every hourly Cursor job dies in ~8s; fleet-liveness.yml will go red while branches wait.
Answer: **Observed resolved 2026-08-19** — SYSTEM build green 08:33 UTC; 09:00-hour runs booted
on Grok 4.6. As of **2026-08-26** the dashboard automations are disabled (see D-006), so boot
is no longer the unattended-24/7 blocker. Claude Corps + GitHub drain publish without them.

## D-005 | filed:2026-08-19 | class:fleet
Q: Disable duplicate Cursor automation Untitled `61b8e855-76b8-11f1-ba66-0e7d0216e441` (fires as
HaulDesk improvement cycle — second writer on `main` next to Deploy + backlog).
A) Disable it. [recommended]
B) Keep both (two agents will collide on `main`).
Deferral cost: forced-push / conflict on the production branch.
Answer: **Disabled** (looked up 2026-08-26 via GetAutomation). Do not re-enable. Keep Deploy +
backlog as the only Cursor `main` writer if/when that automation is turned back on.

## D-006 | filed:2026-08-26 | class:fleet
Q: Re-enable Cursor Integrator / Prod Smoke / Deploy + backlog (all three disabled 2026-08-26)
as redundant drain/smoke next to live Claude Corps (`43 */3`, `16:49` smoke) + GitHub
`:17`/`:47` drain? Untitled stays off either way.
A) Re-enable the three; leave Claude twins running (different minutes, fetch-before-write). [recommended if Cursor compute is already paid]
B) Leave Cursor dashboard off; Claude + GitHub Actions are enough. Use Grok Bot as the watcher.
C) Re-enable Integrator only (merge redundancy); leave smoke/deploy to Claude + Actions.
Deferral cost: none for publishing — Claude already drains. Cost of A is extra Cursor
automation minutes; cost of B is a single-platform merge path if Claude.ai goes dark.
Answer: ____

## D-007 | filed:2026-08-26 | class:fleet
Q: Eventually have Grok Bots spawn extra named teammates, or write long implementation
prompts, vs giving that to Claude (more usage already on Claude Corps)?
A) Claude owns prompt engineering and code. Grok stays three named Bots + group chats.
When Grok finds work that needs code or a long prompt, it posts a short paste-ready
Claude prompt in the group and stops. [recommended — Grok Bot quota is scarcer]
B) Let Grok spawn more named Bots as work grows (burns the ~4-slot / 6-per-group cap;
duplicates the 14 live Claude tasks).
C) Let Grok iterate full implementation prompts (burns Grok usage Claude already covers).
Deferral cost: Watcher keeps inventing extra Bots and chewing Grok quota on prompt drafts.
Answer: **A — finalized 2026-08-26.** Do not reverse without editing this file. Watcher
paste: `docs/grok-bots/watcher.instructions.md` § HAND TO CLAUDE.
