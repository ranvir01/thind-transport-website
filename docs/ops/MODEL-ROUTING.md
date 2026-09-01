# Model routing — use the plans, do not dump them

Canon for Finch (Grok) and for anyone who Fire Cursors / Fire Claudes.
Ridge keeps `/workspace/org/models.md` current; this file is the git copy.
Filed **2026-09-01** (D-015).

Budgets: **Cursor Ultra $200/mo** (first-party Composer/Auto pool + ~$400 API)
and **Claude Max 5x $100/mo**. Grok Bot turns burn the **Grok weekly meter**
(included with Ultra). Same ticket never runs on two plans.

## Standing card

| Work | Where | Model | Why |
|---|---|---|---|
| Default bounded PR | Cursor Ultra | `cursor-grok-4.6-high-fast` or Composer/Auto | First-party pool is the cheap volume |
| Hard judgment / integrator-shaped PR | Cursor Ultra | Opus / Fable **only when Finch flags it** | Burns the $400 API pool |
| Scheduled LoadOff lanes (live 9-task fleet) | Claude Max 5x | Sonnet marketing; Opus/Fable integrator + audit | Do not also Fire Cursor for the same ticket |
| Ad-hoc Claude Code in browser | Claude Max 5x | Fire Claude when Finch says the 5-hour window is idle | Same ticket never on both plans |
| Grok Bot turns | Grok weekly meter | No model picker | Short pastes, silent CoS, business-hours routines except Jeff 20:30 PT and GitHub events |
| Research / bookmark scan | Scout + Ridge | Grok computer + X connector | Browser scrape is last resort |

## Governor

Soft-stop **70%** / hard-stop **90%** on each meter: Cursor API, Cursor
first-party, Claude window, Grok week.

- First-party Cursor **under 40%** mid-week and `should` work exists → Finch
  **raises** the Dex+Rex Fire Cursor cap (starts at 6/week combined).
- Any meter **70%** → Finch **cuts** new Fire Cursor / Fire Claude / Scout demos.
- Any meter **90%** → Wright pauses routines and does not spawn.

No hourly attention list until week 2 (that pattern burned a $200 Grok week
in a day). One writer per shared file. Chat is history; the file is memory.

## Who decides

Ridge researches (source link required). Finch applies today's default. Em
picks Cursor vs the live Claude 9-task fleet. gogo never starts an agent.
Ranvir still merges, buys, and labels `should`.
