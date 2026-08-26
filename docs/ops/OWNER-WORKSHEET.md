# Owner worksheet — agents never wait here

Single front-door for **human-only** work. Agents file an item, then move on.
They never put these on their own task lists and never write secret *values*
here — names and places only.

The long form (env vars, photos, integrations, sign-off) remains
[`docs/OWNER-CHECKLIST.md`](../OWNER-CHECKLIST.md). This page is the dated
queue so a Grok Bot, a Claude routine, or a Cursor agent can all point at the
same three things without nailing you.

Updated **2026-08-26**.

---

## Do these (dated)

| # | Action | Due | Why agents cannot |
|---|---|---|---|
| 1 | File **Form 2290 HVUT** (both EINs) and keep the stamped Schedule 1 | **2026-08-31** | IRS / IRP; ~$8,250; blocks plate renewal |
| 2 | Airtable **Team** upgrade or accept the 1,000-record cap | **~2026-09-02** | Billing; trial started ~Aug 19 |
| 3 | Rotate Gmail **App Password** into Vercel `SMTP_USER` / `SMTP_PASS` and redeploy | overdue (SMTP 535 since 2026-07-26) | Credential only you can mint |
| 4 | Paste Grok Bot instructions ([`docs/grok-bots/`](../grok-bots/README.md)), send [`SPAWN.md`](../grok-bots/SPAWN.md), then open three group chats (LoadOff ops / Back office / Big team) and paste [`GROUPS.md`](../grok-bots/GROUPS.md) into each. Desktop: New chat → 2–6 Bots. iPhone: + → New Group Chat. | whenever | No API to create Grok Bots or groups from this repo |
| 5 | Re-enable Cursor **Integrator**, **Prod Smoke**, **Deploy + backlog** if you want Cursor as redundant drain/smoke — leave **Untitled** off | whenever | Agents cannot toggle cursor.com/automations (read-only). All four were **disabled** 2026-08-26. |
| 6 | Import Cursor role slots **only** where Claude has no twin: office, driver, tests, integrations (see FLEET.md). Do **not** import marketing / deep-verify / meta-governor while those Claude tasks are live | whenever | Same charter, two platforms = two writers on one lane |

One task per ping. If an agent already asked this week, it stays quiet unless
the deadline is inside 48 hours.

## Do not do (agents handle)

- Writing code, tests, migrations, or docs in this repo
- Merging `claude/*` (integrator + drain Action)
- Watching Vercel/GitHub after Grok Bot is instructed
- Rearranging Airtable beyond a 6-step click path on the Go-Live Board

## Claude is already running

You do **not** need to come back to a Cursor agent to "turn the fleet on."
Claude Corps (14 tasks) is live. GitHub Actions drain `main` at `:17`/`:47`
even while every Cursor automation is disabled. This worksheet is only the
clicks no robot can make.
