# Grok Bot layer — watchers and connectors, never git

**Start here to create the other Bots, the group chats, and cover every
project:** [`SETUP.md`](SETUP.md)

That one file is the whole job: real job titles, specialists for LoadOff / BLS /
other `ranvir01` repos, and the Claude implementation board.

xAI **Grok Bot** (the always-on teammate with its own cloud computer) is the
third platform in this fleet. It is **not** a Cursor Automation and **not** a
Claude routine. Agents in this repo cannot create or edit Grok Bots — only you
can, from the Grok Bot app. The Technical Program Manager **can** create sibling
Bots from inside Grok once you paste [`watcher.instructions.md`](watcher.instructions.md).

Instruction bodies are capped at **4,000 characters** (product limit).
`src/lib/__tests__/grok-bot-instructions-guard.test.ts` fails if a file here
goes over.

## Three platforms, many projects

The Technical Program Manager covers Ranvir's **whole portfolio**. Default when
ambiguous: Thind Transport / LoadOff (`github.com/ranvir01/thind-transport-website`).
Other `github.com/ranvir01/*` repos (including `bls-website`), AR Payments /
Dropbox Excel, and LinkedIn career watch are in the same charter. Code writers
below apply to the home repo; Grok Bot still never pushes git anywhere.

| Layer | What it is | Writes git? | Lives |
|---|---|---|---|
| **Claude Corps** | 14 scheduled tasks, all enabled (2026-08-26 master context) | Yes — `claude/*` then integrator → main | claude.ai Routines |
| **Cursor Automations** | Grok 4.6 code agents. Dashboard copies currently **DISABLED** (Integrator, Prod Smoke, Deploy + backlog, Untitled — observed 2026-08-26) | Yes when enabled | cursor.com/automations |
| **GitHub Actions** | Drain `:17`/`:47`, liveness `:10`, E2E `03:40` | Drain writes `main`; liveness/E2E do not | `.github/workflows/` |
| **Grok Bot** | Job-titled specialists. Watch, connectors, click paths, Claude board. Connectors first: **Google, GitHub, Dropbox, LinkedIn, Vercel**. | **Never** | Grok Bot app (group cap 6) |

Code changes still land through Claude / Cursor / CI. Grok Bot **files a finding
in chat** (or a numbered click path ≤6 steps). It does not push, merge, import
automations, or spend money.

## Why this split (learned from the screenshot + daily tools)

The bot you just created already says:

> Watches sites, dashboards, and feeds for changes. The user works with
> **Google, GitHub, Dropbox, LinkedIn, Vercel** every day — start with those
> tools when suggesting connectors or taking on work.

That is the right job. Cursor cannot click Airtable views, Dropbox Excel, or
LinkedIn. Claude's Airtable lane already builds in the base; it cannot see
Vercel/GitHub CI going red while you are on your phone. Grok Bot fills that
gap without becoming a fourth writer on `main`.

**D-007:** Claude owns code and long prompts. **D-008:** the Technical Program
Manager **does** create sibling Bots with real job titles for LoadOff, BLS, and
other `ranvir01` projects. **Engineering Communications Lead** is the Claude
liaison — HAPPENED / IN FLIGHT / SHOULD. Groups hold 2–6 Bots
([xAI: chat and collaboration](https://docs.x.ai/grok-bot/chat-and-collaboration)).
Paste from this folder; do not freehand extra charters.

| Title | File | Connectors to start |
|---|---|---|
| **Technical Program Manager** (rename Watcher) | [`watcher.instructions.md`](watcher.instructions.md) | Google, GitHub, Dropbox, LinkedIn, Vercel |
| **Staff Platform Engineer** | [`vercel-github.instructions.md`](vercel-github.instructions.md) | GitHub, Vercel |
| **Revenue Operations Analyst** | [`airtable-coach.instructions.md`](airtable-coach.instructions.md) | none required; Airtable in the browser if signed in |
| **Staff Product Engineer (LoadOff)** | [`loadoff-engineer.instructions.md`](loadoff-engineer.instructions.md) | GitHub |
| **Software Engineer (BLS)** | [`bls-engineer.instructions.md`](bls-engineer.instructions.md) | GitHub, Vercel |
| **Engineering Communications Lead** | [`eng-comms.instructions.md`](eng-comms.instructions.md) | GitHub, Vercel |
| **Software Engineer ({repo})** (on-demand) | [`project-engineer.instructions.md`](project-engineer.instructions.md) | GitHub |
| **Venture Analyst ({idea})** (on-demand) | [`venture-analyst.instructions.md`](venture-analyst.instructions.md) | none required |

### Standing group chats

| Group | Members | Kickoff paste |
|---|---|---|
| **LoadOff engineering** | TPM + LoadOff PE + Platform + Eng Comms | [`SETUP.md`](SETUP.md) Step 4 |
| **BLS engineering** | TPM + BLS SE + Platform | [`SETUP.md`](SETUP.md) Step 4 |
| **Back office** | TPM + RevOps Analyst | [`SETUP.md`](SETUP.md) Step 4 |
| **Claude stand-up** | TPM + Eng Comms Lead | [`SETUP.md`](SETUP.md) Step 4 |
| **Staff** | six standing titles | [`SETUP.md`](SETUP.md) Step 4 |

Desktop: New chat → select 2–6 Bots. iPhone: **+ → New Group Chat**. Then paste
the matching kickoff from SETUP.md. `@` one Bot when it owns the next step;
`@everyone` only for a stall. One owner per stage.

One-shot to the TPM: SETUP.md Step 2 (same text as [`SPAWN.md`](SPAWN.md)).

## Durability — skills, routines, memory (SETUP.md Step 5)

All Bots share **one persistent cloud computer** (files, browser sessions,
logins — [xAI docs](https://docs.x.ai/grok-bot/computer-and-apps)); sign in once
and the roster can use it, and never treat separate Bots as a security boundary.
Bot memory holds stable preferences only — changing facts live in this repo and
the dashboards, which Bots **reopen before every consequential answer**. Each
Bot saves its repeated method as a named **skill** after one corrected hand run,
and exactly **four routines** run on schedules (`America/Los_Angeles`): the
Claude stand-up board (daily 07:30), the platform sweep (daily 07:00), the
Friday Dropbox-backup reminder, and the Monday career scan. Routines report and
stop on a missing source; adding a routine means retiring one — Grok quota is
scarcer than Claude's (D-007/D-009).

## What Grok Bot must never do

- `git push`, open/merge PRs, force-push, or edit this repo
- Re-wire Cursor automations or Claude routines
- Flip Airtable billing, automation ON toggles, or the owner's Highlight star
- Rotate SMTP / env vars (names only, on `docs/OWNER-CHECKLIST.md`)
- File Form 2290, spend money, or nag. One human task per message.

Human-only work goes on [`docs/ops/OWNER-WORKSHEET.md`](../ops/OWNER-WORKSHEET.md).
Agents (including Grok Bot) move on.

Live clock: [`docs/ops/FLEET.md`](../ops/FLEET.md) + [`AGENT_INTEROP.md`](../ops/AGENT_INTEROP.md) §1.
