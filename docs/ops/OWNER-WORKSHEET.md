# Owner worksheet — agents never wait here

Single front-door for **human-only** work. Agents file an item, then move on.
They never put these on their own task lists and never write secret *values*
here — names and places only.

The long form (env vars, photos, integrations, sign-off) remains
[`docs/OWNER-CHECKLIST.md`](../OWNER-CHECKLIST.md). This page is the dated
queue so a Grok Bot, a Claude routine, or a Cursor agent can all point at the
same three things without nailing you.

Updated **2026-08-28**.

---

## Do these (dated)

| # | Action | Due | Why agents cannot |
|---|---|---|---|
| 1 | File **Form 2290 HVUT** (both EINs) and keep the stamped Schedule 1 | **2026-08-31** | IRS / IRP; ~$8,250; blocks plate renewal |
| 2 | Open a **business checking account in AR Payments LLC's name** and put remittance on invoices | this week after 2290 | Banking; holding-company workflow in [`AR-PAYMENTS.md`](AR-PAYMENTS.md) |
| 3 | Rotate Gmail **App Password** into Vercel `SMTP_USER` / `SMTP_PASS` and redeploy | overdue (SMTP 535 since 2026-07-26) | Credential only you can mint |
| 4 | Follow **[`docs/grok-bots/SETUP.md`](../grok-bots/SETUP.md)** — paste the four upgraded Bot bodies (gogo, Steve, Jeff, Rav) + the Big team kickoff | whenever | No API to edit Grok Bots from this repo; roster frozen at four (D-010) |
| 5 | Apply the Claude **9-task** paste deltas + toggles in [`docs/claude-routines.md`](../claude-routines.md) §"Live 9-task fleet" (integrator push ON, watchdog roster, Sunday 10:53, sim buddy 6h, marketing Sonnet) | whenever | No API to edit claude.ai routines from this repo |
| 6 | Optional: export a LOADS-BACKUP CSV from the retired Airtable base before ~Sep 2 if you still want a copy | ~2026-09-02 | Not required to run; software is retired (D-014) |
| 7 | Re-enable Cursor **Integrator**, **Prod Smoke**, **Deploy + backlog** only if you want Cursor as redundant drain/smoke — leave **Untitled** off | whenever | Agents cannot toggle cursor.com/automations (read-only). All four were **disabled** 2026-08-26. |
| 8 | Import Cursor role slots **only** where Claude has no twin: office, driver, tests, integrations (see FLEET.md). Do **not** import marketing / deep-verify / meta-governor while those Claude tasks are live | whenever | Same charter, two platforms = two writers on one lane |
| 9 | On GitHub mobile, label **[#65](https://github.com/ranvir01/thind-transport-website/issues/65)** and **[#66](https://github.com/ranvir01/thind-transport-website/issues/66)** with `should` + `venture:loadoff`, and **[#67](https://github.com/ranvir01/thind-transport-website/issues/67)** with `needs-owner` + `venture:career` (label names exist; the creating token 403s on PATCH) | today | A label is the owner-curated trigger (D-012). Unlabeled issues are not dispatchable; #67 must stay parked, not `should`. |

One task per ping. If an agent already asked this week, it stays quiet unless
the deadline is inside 48 hours.

## Do not do (agents handle)

- Writing code, tests, migrations, or docs in this repo
- Merging `claude/*` (integrator + drain Action)
- Watching Vercel/GitHub after Grok Bot is instructed
- Recreating Airtable or proposing it as the back office

## Claude is already running

You do **not** need to come back to a Cursor agent to "turn the fleet on."
Claude Corps (**9** LoadOff-only tasks) is live. GitHub Actions drain `main`
at `:17`/`:47` even while every Cursor automation is disabled. This worksheet
is only the clicks no robot can make.
