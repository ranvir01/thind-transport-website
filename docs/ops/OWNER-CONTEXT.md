# Owner context for agents (LoadOff + fleet + AR Payments)

Sanitized excerpt of the owner's 2026-08-26 master context. **Do not paste
personal fitness, sizing, investing, music, or hardware-gaming notes into this
repo.** Full private copy lives with the owner; this file is what every agent
on this repo is allowed to assume.

Compiled: **2026-08-26**. Owner: Ranvir Thind, Kent / Seattle, WA.
Carriers: **Thind Transport LLC** (USDOT 2523064, d/b/a AR Carrier Express) and
**ATS Transport LLC**. Billing entity: AR Payments LLC.

## Purpose (priority order)

1. Finish LoadOff (TMS) and thindtransport.com — genuinely better than competitors.
2. Scale the trucking business (larger fleets, direct shipper contracts).
3. Automate back office (invoicing, AR chase, compliance, dispatch support).
4. Ship LoadOff publicly as portfolio proof.

**Hard operating constraint:** every agent change must be executable end-to-end
with no manual human implementation. Credentials, env vars, photos, billing,
and click-only UI go on [`OWNER-WORKSHEET.md`](OWNER-WORKSHEET.md) /
[`docs/OWNER-CHECKLIST.md`](../OWNER-CHECKLIST.md). The agent **moves on**.

Works terse. Complete deliverables, not clarifying exchanges. One human task
per message. Never nag. Never claim verified unless it is.

## LoadOff (this repo)

- Repo: `github.com/ranvir01/thind-transport-website`
- Live: `thindtransport.com` · product at `/hub` · host Vercel
- Stack: Next.js 16, React 19, TypeScript, NextAuth v5, Postgres `hub` schema,
  Vercel Blob, Mapbox, **nodemailer over SMTP (Resend is NOT in the stack)**,
  web-push, optional Go worker + Rust compute sidecars
- Money is integer cents. No Postgres RLS — `WHERE carrier_id` + build-time harness.
- Drain to production: stamped `--no-ff` merge only. Never
  `git push origin <integrator>:main`.
- Commit as the owner (`npm run git:identity`). `Backlog:` trailer on every commit.

Standing product findings (agent-executable):

1. `checkSandboxInvariants()` / `COMMITTED_STATUSES` gap (`booked` omitted).
2. ~~`runOverdueReminders` empty catch~~ **fixed 2026-08-26 / this fleet branch** (`failed`/`deferred` + cron 500 + send cap 5). Not on `main` until PR #42 merges — do not write a second fix.
3. DVIR open defects not surfaced (`dvir-open-defect:` automation_key).

Marketing: state pages to WA/OR/ID standard; CA next; no unverifiable claims.

## Fleet (three platforms)

Full clock: [`FLEET.md`](FLEET.md) + [`AGENT_INTEROP.md`](AGENT_INTEROP.md) §1.
Grok Bot setup (other Bots, group chats, every project): [`docs/grok-bots/SETUP.md`](../grok-bots/SETUP.md).

**Claude Corps is the live scheduled writer** (9 LoadOff-only tasks, all enabled, 2026-08-28):

| # | Task | Cron UTC |
|---|---|---|
| 1 | Integrator + drain | `43 */3 * * *` (every 3h, not hourly) |
| 2 | Prod smoke | `49 16 * * *` |
| 3 | Nightly E2E | `33 10 * * *` |
| 4 | Weekly deep audit | `53 10 * * 0` (owner paste; was colliding with nightly at 10:33 Sun) |
| 5 | Meta-governor | `0 12 * * 1` |
| 6 | Fleet watchdog | `11 15 * * *` |
| 7 | Marketing lane | `0 8 * * *` → `claude/lane-marketing` |
| 8 | Weekly outside-auditor | `0 14 * * 1` |
| 9 | Sim test buddy | `18 */6 * * *` (owner paste; was `*/3`) |

Airtable lane: **retired** (D-014). AR Payments LLC is the holding/billing
company — [`AR-PAYMENTS.md`](AR-PAYMENTS.md). Excel in Dropbox is the SoR.

**Cursor Automations** (Grok 4.6) — dashboard copies observed **DISABLED**
2026-08-26: Integrator `880eec29-…`, Prod Smoke `4ad7743c-…`, Deploy + backlog
`75e8fbf5-…`, Untitled `61b8e855-…` (Untitled stays off). Import-ready role
slots live in `.cursor/automation/`. Import **only** slots Claude does not
already run (office / driver / tests / integrations). Do not import marketing,
deep-verify, or meta-governor while those Claude tasks are live.

**GitHub Actions** keep `main` moving when Cursor is off: drain `:17`/`:47`,
liveness `:10`, portfolio digest Fri `20:41`. Red runs file `should` issues.

**Grok Bot** is four named bots in one group (D-010): gogo (Chief of Staff +
TPM + coding dispatcher), Steve (Staff SRE), Jeff (Head of RevOps), Rav
(Talent Scout). gogo runs a one-item coding board; bounded fixes go to Cursor
cloud agents as PRs. Never git. Queue: collaborator-labeled `should` issues.
**The one file:** `docs/grok-bots/SETUP.md`.

## AR Payments (holding / billing company)

Legal entity, not Airtable. Bank + remittance + two-LLC allocation:
[`AR-PAYMENTS.md`](AR-PAYMENTS.md). Two human users, Excel-first. Agents never
mix Thind and ATS workbooks. LoadOff never holds these funds.

## How agents work here

- One branch, one writer. `claude/*` → integrator; `cursor/*` → PR.
- Search-before-fix (`git log --all --grep=`). The commit body is the bus.
- Tags: `[needs-browser]` `[needs-sidecars]` `[needs-owner]` `[blocked-by …]`
- Fleet config (schedules, live dashboard ids) is owner-gated. Agents update
  **docs + import-ready JSON**, never the live Cursor/Claude dashboards.
