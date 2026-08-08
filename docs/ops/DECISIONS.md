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
