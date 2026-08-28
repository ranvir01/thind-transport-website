# Grok Bot layer — four bots, one group, never git

**The one owner file: [`SETUP.md`](SETUP.md)** — upgraded pastes for the four
live bots, the Big team kickoff, Auto Review, `/workspace` filing cabinet, and
the two live routines. Source notes: [`RESEARCH.md`](RESEARCH.md).

xAI **Grok Bot** (the always-on teammate with its own cloud computer) is the
watcher layer of this fleet. It is **not** a Cursor Automation and **not** a
Claude routine. Agents in this repo cannot create or edit Grok Bots — only the
owner can, from the Grok Bot app. **D-010:** the roster is frozen at four named
bots in one group; nobody spawns more (more bots just eat usage).

Instruction bodies are capped at **4,000 characters** (product limit).
`src/lib/__tests__/grok-bot-instructions-guard.test.ts` fails if a file here
goes over, drops the never-git rule, or loses the memory rule.

## The four

| Bot | Role | File | Connectors |
|---|---|---|---|
| **gogo** | Technical Program Manager — watcher + coding dispatcher; owns the GitHub event listener and the one-item coding board | [`gogo-tpm.instructions.md`](gogo-tpm.instructions.md) | GitHub |
| **Steve** | Deploy / CI — Vercel + Actions; `bls-website` is on **Netlify** (read GitHub checks) | [`steve-deploy-ci.instructions.md`](steve-deploy-ci.instructions.md) | GitHub, Vercel |
| **Jeff** | RevOps — two company Gmails + two live Dropbox xlsx (never mixed); loadboard routine 8:30pm PT; Gmail PDFs via **browser** (connector cannot download bytes); Airtable once authed | [`jeff-revops.instructions.md`](jeff-revops.instructions.md) | Gmail (list only), Dropbox |
| **Rav** | Career Coach — proof-only claims from `docs/portfolio/FACTS.md` and live URLs; no LinkedIn connector, no scraping | [`rav-career-coach.instructions.md`](rav-career-coach.instructions.md) | none required |

One group: **Big team** (all four). Kickoff paste: SETUP.md Step 2. Shared
files on the cloud computer: `/workspace/board.md`, `platform/last.md`,
`loadboard/last-run.md`, `career/`. Group handoffs are text-only.

## Three platforms, one repo

| Layer | What it is | Writes git? |
|---|---|---|
| **Claude Corps** | 14 scheduled tasks (2026-08-26 master context) | Yes — `claude/*` then integrator → main |
| **Cursor cloud agents** | Ad-hoc bounded fixes dispatched from gogo's board (`Goal / Files / Done when / Verify`) | Yes — `cursor/*` PRs, reviewed, never merged by Grok |
| **Cursor Automations** | Dashboard copies **DISABLED** 2026-08-26 (Integrator, Prod Smoke, Deploy + backlog, Untitled) | When enabled |
| **GitHub Actions** | Drain `:17`/`:47`, E2E `03:40` (liveness ships with the open fleet PR) | Drain writes `main` |
| **Grok Bot** | The four watchers above | **Never** |

## What Grok Bot must never do

- `git push`, open/merge PRs, force-push, or edit any repo
- Spawn bots, groups, or routines; re-wire Cursor automations or Claude routines
- Flip Airtable billing, automation toggles, or the owner's Highlight star
- Copy Dropbox files, whole-file Replace, or mix Thind and ATS data
- Rotate SMTP / env vars, file Form 2290, spend money, apply to jobs, or nag

Human-only work goes on [`docs/ops/OWNER-WORKSHEET.md`](../ops/OWNER-WORKSHEET.md).
Live clock: [`docs/ops/FLEET.md`](../ops/FLEET.md) + [`AGENT_INTEROP.md`](../ops/AGENT_INTEROP.md) §1.
