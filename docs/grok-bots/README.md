# Grok Bot layer — 14-seat org, never git

**The one owner file: [`SETUP.md`](SETUP.md)** — 14 pastes, six **full** group
charters, Fire Cursor written SOP, Auto Review, `/workspace` filing cabinet.
**Paste this into live gogo first: [`GOGO-START.md`](GOGO-START.md).** Source
notes: [`RESEARCH.md`](RESEARCH.md). Queue:
[`docs/ops/PORTFOLIO.md`](../ops/PORTFOLIO.md). Routing:
[`docs/ops/MODEL-ROUTING.md`](../ops/MODEL-ROUTING.md). Bench:
[`SPAWN.md`](SPAWN.md). Channels: [`GROUPS.md`](GROUPS.md). Airtable software
is **retired** (D-014); AR Payments LLC remains the holding company.
Never name the TMS product in bot chat — say **the hub**.

xAI **Grok Bot** is the always-on teammate with its own cloud computer. It is
**not** a Cursor Automation and **not** a Claude routine. Agents in this repo
cannot create or edit Grok Bots — only the owner can, from the Grok Bot app.
**D-015 / D-016:** 14 named seats, 6 groups. A GOGO-START paste is owner-yes
for those 14. Wright may create a 15th only after Ranvir says yes. Job titles
are real (Chief of Staff, Eng Mgr, ICs who Fire Cursor, FinOps, Botwright,
Experiments, Researcher, Talent Scout who applies).

Instruction bodies are capped at **4,000 characters** (product limit).
`src/lib/__tests__/grok-bot-instructions-guard.test.ts` fails if a file here
goes over, drops the never-git rule, loses the memory rule, or says the
retired product code-name.

## The fourteen

| Bot | Role | File | Group |
|---|---|---|---|
| **gogo** | Org Chief of Staff | [`gogo-cos.instructions.md`](gogo-cos.instructions.md) | HQ |
| **Finch** | FinOps / 70/90 governor | [`finch-finops.instructions.md`](finch-finops.instructions.md) | HQ |
| **Wright** | Botwright (14 from GOGO-START; 15th after yes) | [`wright-botwright.instructions.md`](wright-botwright.instructions.md) | HQ |
| **Scout** | X bookmarks | [`scout-bookmarks.instructions.md`](scout-bookmarks.instructions.md) | HQ |
| **Em** | Hub Eng Mgr | [`em-engmgr.instructions.md`](em-engmgr.instructions.md) | Hub |
| **Dex** | IC office/hub — Fire Cursor | [`dex-ic.instructions.md`](dex-ic.instructions.md) | Hub |
| **Rex** | IC driver/recruiting — Fire Cursor | [`rex-ic.instructions.md`](rex-ic.instructions.md) | Hub |
| **Steve** | Staff SRE | [`steve-deploy-ci.instructions.md`](steve-deploy-ci.instructions.md) | Hub |
| **Jeff** | Head of RevOps | [`jeff-revops.instructions.md`](jeff-revops.instructions.md) | Money |
| **Rav** | Talent Scout (hunt + apply) | [`rav-career-coach.instructions.md`](rav-career-coach.instructions.md) | Career |
| **Labs** | Experiments | [`labs-experiments.instructions.md`](labs-experiments.instructions.md) | Labs |
| **Ridge** | Model researcher | [`ridge-research.instructions.md`](ridge-research.instructions.md) | Labs |
| **Bee** | BLS CoS (Netlify, Cursor-only) | [`bee-bls.instructions.md`](bee-bls.instructions.md) | Clients |
| **My** | MyConsulting CoS | [`my-myco.instructions.md`](my-myco.instructions.md) | Clients |

You talk to gogo. gogo talks to everyone else.

## Three platforms, one repo

| Layer | What it is | Writes git? |
|---|---|---|
| **Claude Corps** | 9 scheduled tasks (live snapshot 2026-08-28), home repo only | Yes — `claude/*` then integrator → main |
| **Cursor cloud agents** | Ad-hoc bounded fixes via Fire Cursor (`Goal / Files / Done when / Verify`) | Yes — `cursor/*` PRs, reviewed, never merged by Grok |
| **Cursor Automations** | Four import-ready lanes ([`CURSOR-START.md`](../ops/CURSOR-START.md)); Integrator / Smoke / Deploy **DISABLED** | When the owner imports a lane |
| **GitHub Actions** | Drain `:17`/`:47`, E2E `03:40`, liveness `:10`, digest Fri `20:41` | Drain writes `main`; reds file issues |
| **Grok Bot** | The 14-seat org above | **Never** |

## What Grok Bot must never do

- `git push`, open/merge PRs, force-push, or edit any repo
- Spawn a 15th bot without Ranvir saying yes; re-wire Cursor automations or Claude routines
- Recreate Airtable, mix Thind and ATS data, or whole-file Replace a Dropbox xlsx
- Rotate SMTP / env vars, file Form 2290, open the AR Payments bank, spend money, or nag
- Bypass Auto Review on email / LinkedIn apply / git / Dropbox Replace
- Stand up OpenBot or Notion as a second orchestrator
- Name the TMS product, or name which AI tool wrote the code, in outreach
- Open `claude.ai/code` for BLS (Bee is Cursor-only)

Human-only work goes on [`docs/ops/OWNER-WORKSHEET.md`](../ops/OWNER-WORKSHEET.md).
Live clock: [`docs/ops/FLEET.md`](../ops/FLEET.md) + [`AGENT_INTEROP.md`](../ops/AGENT_INTEROP.md) §1.
