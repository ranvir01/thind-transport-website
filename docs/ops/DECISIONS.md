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
Answer: **A on code — still final.** Claude owns prompt engineering and git.
**Roster cap superseded by D-008** (owner, same day): Grok may spawn job-titled
specialists; Engineering Communications Lead publishes HAPPENED / IN FLIGHT / SHOULD.
Watcher paste: `docs/grok-bots/watcher.instructions.md`. Owner setup: `docs/grok-bots/SETUP.md`.

## D-008 | filed:2026-08-26 | class:fleet
Q: Give the Watcher instruction to create Bots for other projects, retitle every
Bot with a real technical job title, and have one Bot communicate all Claude
implementation that happened / is in flight / should happen.
A) Standing six titles (TPM, Staff Platform Engineer, RevOps Analyst, Staff Product
Engineer (LoadOff), Software Engineer (BLS), Engineering Communications Lead) plus
on-demand Software Engineer ({repo}) for other `ranvir01` git. Eng Comms Lead is
the Claude liaison. Claude still writes git (D-007). [owner request]
B) Keep three nicknames (Watcher / Deploy-CI / Airtable coach) and no project SEs.
Deferral cost: other projects have no named owner; Claude work stays invisible in Grok.
Answer: **A — owner 2026-08-26.** Do not shrink the roster without editing this file.

## D-009 | filed:2026-08-27 | class:fleet
Q: Grok Bots run on one shared cloud computer with skills, routines, memory, and
Teach-a-task (docs.x.ai/grok-bot) — none of which the paste files used. Adopt a
durability pass: per-Bot starter skills saved after one corrected run, exactly four
scheduled routines (Claude board daily 07:30 / platform sweep daily 07:00 / Friday
Dropbox-backup reminder / Monday career scan — `America/Los_Angeles`), the
reopen-the-source memory rule, plus on-demand **Venture Analyst ({idea})** for
business ideas with no repo yet (`docs/grok-bots/venture-analyst.instructions.md`)?
A) Yes — routines are read-only and silent-when-healthy; writes, spend, sends, and
posts stay behind owner approval; adding a routine means retiring one. [owner request]
B) Keep Bots chat-only (owner re-triggers every check by hand; memory silently stales).
Deferral cost: every check stays manual; career and new-idea work has no owner.
Answer: **A — owner 2026-08-27** (usage efficiency: Grok quota stays scarcer than
Claude's per D-007; Claude still writes all git). Setup: `docs/grok-bots/SETUP.md` Step 5.
**Roster and routine table superseded by D-010 the same day** — the owner's live
team is four bots; the durability rules (skills, memory, report-and-stop) carry over.

## D-010 | filed:2026-08-27 | class:fleet
Q: The Grok roster the owner actually runs (owner dump, 2026-08-27) is FOUR named
bots in ONE group (Big team): gogo (TPM + coding dispatcher; owns the GitHub event
listener — pr-opened / pr-merged / ci-failed on main), Steve (Deploy/CI), Jeff
(RevOps: thindcarrier + atstransport24 Gmails, two live Dropbox xlsx, loadboard
routine 8:30pm PT), Rav (Career Coach: proof-only claims, no LinkedIn connector).
Owner: no more bots, groups, or routines — usage. Coding path: one in-flight
SHOULD; bounded repo fixes go to a CURSOR CLOUD AGENT as a PR (Grok reviews,
never merges); Claude paste only when the owner asks or the work is bigger than
one PR. Replace the six-title/spawn/venture roster (D-008) and the four-routine
table (D-009) with this?
A) Yes — repo docs mirror the live four; instruction files are now gogo-tpm /
steve-deploy-ci / jeff-revops / rav-career-coach; SPAWN.md, GROUPS.md, and the
six retired pastes are deleted. [owner dump 2026-08-27]
B) Keep documenting the aspirational six-bot roster nobody runs.
Deferral cost: every doc points at bots that do not exist; pastes drift from the
bots' real working rules (Netlify BLS, live Dropbox path, proof-only career set).
Answer: **A — owner 2026-08-27.** D-007 stands for scheduled code (Claude Corps);
bounded ad-hoc fixes go to Cursor cloud agents via gogo's board. Also recorded as
live truth: `bls-website` is on **Netlify** (deploy state = GitHub commit checks);
`fleet-liveness.yml` is not live on `main` until the fleet PR merges; Dropbox is
authenticated (no first-overwrite / lock / whole-file-Replace steps); Airtable
still needsAuth; SMTP 535 / Form 2290 / Airtable billing never go to Claude or a
cloud agent.

## D-011 | filed:2026-08-28 | class:fleet
Q: Owner asked to make the *current* four Grok Bots as useful as possible using
the product's real capabilities and the research links (docs.x.ai/grok-bot,
Avi masterclass / av1dlive, RongleCat/awesome-grok-bot, usegrokbot.com,
botdirectory.ai) — without adding bots (usage). Adopt the capability pass:
shared `/workspace` filing cabinet (board / platform / loadboard / career) so
Big team can hand off without attachments; connector-over-browser except Jeff
must use the **browser for Gmail PDFs** (connector cannot download bytes);
takeover for secrets; Auto Review Require-Approval on send/post/git/overwrite/buy;
local computer **Never allowed**; Teach a task + Test run; gogo writes Cursor
pastes but does not start the agents; reject extra directory bots and the
usegrokbot SSH-tunnel jailbreak?
A) Yes — enhance the four pastes + SETUP.md Steps 3–4; record took-vs-rejected
in `docs/grok-bots/RESEARCH.md`. No fifth bot, no third routine. [owner request]
B) Leave the four as chat-only descriptions.
Deferral cost: group stays mute (no attachments), Jeff fails silently on PDFs,
usage burns on extra bots/routines the directories push.
Answer: **A — owner 2026-08-28.** Roster ceiling stays D-010.

## D-012 | filed:2026-08-28 | class:fleet
Q: Wire Claude (9 live tasks), Cursor cloud agents, the Grok four, and GitHub
Actions into one communication hub. Options: Notion, LangGraph/CrewAI, a
webhook dispatcher, GitHub Issues as a pull-scan queue, or stay on `Backlog:`
trailers only. Model routing: keep Cursor agents on `cursor-grok-4.6-high-fast`,
Claude Opus/Fable for plans + integrator judgment, Sonnet for cheap lanes?
A) GitHub Issues + repo state + `Backlog:` trailers. Labels: `should` /
`needs-owner` / `venture:*`. Agents act only on collaborator-labeled `should`
(public repo — a label is not authorization). No claim-locks, no extra label
state machine. `npm run agent:backlog` merges open `should` issues above
trailers. Cursor agents stay `cursor-grok-4.6-high-fast`. Rejected: Notion
(three new auth surfaces, Grok OAuth already broken, drifts from git),
LangGraph/CrewAI (schedules + git + issues already orchestrate; a new runtime
is a fifth writer), webhook-dispatch services, assignee-trigger native agents,
Airtable software, LoadOff sitting in carrier funds.
B) Notion hub. C) LangGraph. D) Trailers only.
Answer: **A — owner 2026-08-28.** Registry: `docs/ops/PORTFOLIO.md`.

## D-013 | filed:2026-08-28 | class:fleet
Q: Live Claude account has **9** LoadOff-only tasks (snapshot 2026-08-28), not
the 14 documented with an Airtable lane. Tune the roster: integrator push ON;
watchdog roster = the real 9 (drop Airtable ghosts); Sunday deep audit
`33 10 * * 0` → `53 10 * * 0`; sim buddy `18 */3` → `18 */6` and file each
finding once as a `should` issue; marketing pin `claude-sonnet-5` + push on;
intake = top `should` else `agent:backlog`; land with `Closes #N`. No new
tasks. No Airtable task.
A) Yes — rewrite `docs/claude-routines.md` + FLEET/OWNER-CONTEXT to the live 9;
owner applies pastes/toggles on claude.ai. [recommended]
B) Keep documenting 14 tasks nobody runs.
Answer: **A — owner 2026-08-28.** Paste deltas and toggle checklist live in
`docs/claude-routines.md` §"Live 9-task fleet".

## D-014 | filed:2026-08-28 | class:fleet
Q: Airtable software vs AR Payments LLC the legal entity. Owner: Airtable is
out; AR Payments is the holding/billing company for Thind + ATS — legally
set up, still needs a bank account and a workflow.
A) Retire Airtable software everywhere (no Claude lane, Jeff stays off it,
SETUP/FLEET/worksheets stop asking for Team billing). Rewrite
`docs/ops/AR-PAYMENTS.md` as the holding-company operating model: Dropbox
Excel remains SoR; remittance → AR Payments bank once opened; LoadOff never
holds funds; do not factor other people's freight. [recommended]
B) Rebuild the Airtable lane. C) Retire the LLC too.
Answer: **A — owner 2026-08-28.** Bank account is owner-only
(`OWNER-WORKSHEET.md`).

