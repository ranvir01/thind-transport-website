# Grok Bot layer — watchers and connectors, never git

xAI **Grok Bot** (the always-on teammate with its own cloud computer) is the
third platform in this fleet. It is **not** a Cursor Automation and **not** a
Claude routine. Agents in this repo cannot create or edit Grok Bots — only you
can, from the Grok Bot app. These files are paste-ready so any agent can tell
you exactly what to paste, and so a Grok Bot told to "spawn siblings" copies
from here instead of inventing charters.

Instruction bodies are capped at **4,000 characters** (product limit).
`src/lib/__tests__/grok-bot-instructions-guard.test.ts` fails if a file here
goes over.

## Three platforms, one repo

| Layer | What it is | Writes git? | Lives |
|---|---|---|---|
| **Claude Corps** | 14 scheduled tasks, all enabled (2026-08-26 master context) | Yes — `claude/*` then integrator → main | claude.ai Routines |
| **Cursor Automations** | Grok 4.6 code agents. Dashboard copies currently **DISABLED** (Integrator, Prod Smoke, Deploy + backlog, Untitled — observed 2026-08-26) | Yes when enabled | cursor.com/automations |
| **GitHub Actions** | Drain `:17`/`:47`, liveness `:10`, E2E `03:40` | Drain writes `main`; liveness/E2E do not | `.github/workflows/` |
| **Grok Bot** | Watches sites, dashboards, feeds. Connectors first: **Google, GitHub, Dropbox, LinkedIn, Vercel** | **Never** | Grok Bot app (~4 named slots) |

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

It can create **sibling bots from the Grok Bot app** (not from this repo).
Cap at three named bots so slots stay useful. Paste from this folder; do not
freehand extra charters.

| Bot | File | Connectors to start |
|---|---|---|
| **Watcher** (you already have this — replace Instructions with the file) | [`watcher.instructions.md`](watcher.instructions.md) | Google, GitHub, Dropbox, LinkedIn, Vercel |
| **Deploy / CI** | [`vercel-github.instructions.md`](vercel-github.instructions.md) | GitHub, Vercel |
| **Airtable click-path coach** | [`airtable-coach.instructions.md`](airtable-coach.instructions.md) | none required; Airtable in the browser if signed in |

One-shot to the Watcher: paste [`SPAWN.md`](SPAWN.md).

## What Grok Bot must never do

- `git push`, open/merge PRs, force-push, or edit this repo
- Re-wire Cursor automations or Claude routines
- Flip Airtable billing, automation ON toggles, or the owner's Highlight star
- Rotate SMTP / env vars (names only, on `docs/OWNER-CHECKLIST.md`)
- File Form 2290, spend money, or nag. One human task per message.

Human-only work goes on [`docs/ops/OWNER-WORKSHEET.md`](../ops/OWNER-WORKSHEET.md).
Agents (including Grok Bot) move on.

Live clock: [`docs/ops/FLEET.md`](../ops/FLEET.md) + [`AGENT_INTEROP.md`](../ops/AGENT_INTEROP.md) §1.
