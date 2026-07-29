# What we need from you — Thind Transport / LoadOff

**Updated 23 July 2026.** This replaces the earlier "LoadOff Setup and Sign-Off" PDF.
Nothing from that document is lost — it's all still here, plus everything that has
been built since. Work top-down: **Section 1 takes 15 minutes and unblocks the most.**

Legend: ☐ = you · ✅ = already done, no action.

---

## Already done for you (don't redo these)

| | |
|---|---|
| ✅ | Website live at thindtransport.com — graphite/white/red brand, mobile-optimised |
| ✅ | 48 state CDL-jobs pages, `/shippers` broker page, lead capture that can't lose a lead |
| ✅ | LoadOff live at `/hub` — dispatch, money, settlements, fuel/IFTA, compliance, driver phone app |
| ✅ | Driver leads board, and **Outreach** (`/hub/outreach`) that drafts on-brand emails to brokers/shippers/drivers |
| ✅ | Help centre at `/hub/help` — searchable tours, videos, playbooks |
| ✅ | Accessibility: every page passes WCAG AA contrast on phone/tablet/desktop (automated, re-checkable via `npm run design-qa`) |
| ✅ | 1,487 automated tests, build green, database migrations applied automatically on deploy |
| ✅ | Database schema, cron jobs, and integration framework all deployed |

---

## SECTION 1 — Unblock production (15 minutes, highest value)

Everything here is copy-paste. **Do this first.**

### 1a. Paste the environment values into Vercel

Go to **vercel.com → thind-transport-website → Settings → Environment Variables → Production**.
The values are in the private **env sheet file** I sent you (Section 1 of it). Add:

- ☐ `CRON_SECRET` — lets the nightly jobs authenticate
- ☐ `CREDENTIALS_KEY` — encrypts saved integration passwords
- ☐ `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` — driver push notifications
- ☐ **Redeploy** after saving (Deployments → ⋯ → Redeploy)

> Lost the env sheet? Say so and I'll regenerate it — the keys are generated, not looked up.

### 1b. Company email for sending (unlocks three things at once)

This is now the single highest-value item: it turns on **invoice emailing**, **outreach
sending**, and **lead alerts**. Without it, LoadOff still works — it just shows
"copy this and send it yourself" instead of sending.

- ☐ Decide the sending address (recommend a real company address, e.g. `dispatch@thindtransport.com`, not a personal Gmail)
- ☐ Create an **app password** for it (Gmail: Account → Security → 2-Step → App passwords)
- ☐ Add to Vercel Production: `SMTP_USER` = the address, `SMTP_PASS` = the app password
- ☐ Redeploy

> **⚠️ Currently failing, not just unset.** Production has `SMTP_USER`/`SMTP_PASS` set to
> *something*, and Gmail is rejecting it every time: `Invalid login: 535-5.7.8 Username and
> Password not accepted … BadCredentials`. First seen 2026-07-26 14:24 UTC, still recurring as
> of 2026-07-27 14:13 UTC — every `owner-digest` and `compliance-scan` cron run, and (same
> credential) every invoice/outreach/lead-alert send, has been failing silently for over a day.
> The app password was likely revoked or mistyped. Generate a fresh one and repaste both
> values above, then redeploy.

### 1c. Demo accounts — timing decision

`HUB_DEMO_LOGIN=false` disables the demo logins (`owner@demo.thind` etc.).

- ☐ **Recommendation: leave demo ON until the fellowship review is finished**, then set it to `false`.
  Reviewers may want to click into the live product; turning it off first makes that impossible.
  Set it before real driver/broker data goes in.

---

## SECTION 2 — Drop the paperwork in (no typing)

Upload at **LoadOff → Smart Setup**. Phone photos are fine, PDFs are best, messy Excel is fine.
**You never type VINs, MC numbers, or broker addresses — LoadOff reads them.**

- ☐ **Truck + trailer registrations** — one photo/PDF each (we pull VIN, plate, unit #, expiry)
- ☐ **Driver CDL + medical card** — photo/PDF per driver (we pull numbers and expiry dates)
- ☐ **Rate confirmations** — any old ones; we build the broker list from them
- ☐ **W-9 + Certificate of Insurance + MC authority letter** — filed once, reused forever
- ☐ **Your current load sheet** (Excel/Google export) — upload as-is, we map the columns
- ☐ **One fuel statement** (CSV or PDF from the fuel-card website), and tick which card you use:
  ☐ EFS ☐ WEX ☐ Comdata ☐ Other: ________
- ☐ *Optional:* toll/Bestpass statements, sample invoices, TruckX ELD access or a mileage export

Only write something here if a truck has **no** registration paper:

| Truck nickname (what dispatch calls it) | Note |
|---|---|
| | |

Only write a driver's contact if they should get the **phone app**:

| Driver name | Cell | Email for app login |
|---|---|---|
| | | |

---

## SECTION 3 — Answer what only you know

These can't be read off a scan. Short answers are fine — write like you'd say it on the phone.

### A. Who works in the office

| Name | Email for login | Role |
|---|---|---|
| Sukhdev Thind | | Owner |
| | | Dispatch |
| | | Accounting |

- ☐ Who approves driver pay before it goes out? ____________________

### B. How each driver gets paid *(most important answer on this page)*

Example of the right level of detail:
> "Company driver. 63 cents loaded mile. Empty miles not paid. Full fuel surcharge.
> $50/week insurance taken out. Paid every Friday."

For owner-operators: the % they keep, who pays fuel, and any escrow.

- ☐ Driver 1 — ______________________________________________
- ☐ Driver 2 — ______________________________________________
- ☐ Driver 3 — ______________________________________________

### C. Money as it works today

- ☐ Pay day: ☐ Every Friday ☐ Every 2 weeks ☐ Other: ______
- ☐ Last invoice number used: #__________
- ☐ Who owes you money right now (names + rough $): ____________________
- ☐ Factoring company: ☐ No ☐ Yes → ____________________
- ☐ QuickBooks: ☐ No ☐ Yes → ☐ Desktop ☐ Online
- ☐ Detention: after ____ free hours, $______/hour (or "we don't charge")

### D. Company facts to confirm

- ☐ Yard address (where trucks actually park): ____________________
  *(We only have the PO Box — PO Box 5114, Kent, WA 98064 — on file. Google and brokers want a street address.)*
- ☐ After-hours phone: ____________________
- ☐ Insurance agent for certificate requests (name + email): ____________________

### E. Go-live

- ☐ Target date to stop using Excel: ____ / ____ / 20____
- ☐ First 3 drivers to get the phone app: 1.__________ 2.__________ 3.__________
- ☐ First 3 brokers to get tracking links: 1.__________ 2.__________ 3.__________

---

## SECTION 4 — New since the last document

### 4a. Outreach — feed it prospects

`/hub/outreach` drafts personalised, legally-compliant emails to brokers, shippers, and
drivers. It's built and live; it just needs names.

- ☐ Paste or upload a list of **brokers you want to haul for** (any format — name/company/email/phone)
- ☐ Same for **shippers** and **drivers**, if you have them
- ☐ Confirm the send rule. Right now **nothing sends until you click approve** — that's the
  safe default. Tell me if you ever want it to auto-send.

### 4b. Google Business Profile

- ☐ Paste the business description I wrote into your Google Business Profile
- ☐ Add the **street yard address** (from 3D) so you appear in local "trucking companies near me" searches

### 4c. Real photos (biggest remaining visual upgrade)

The site uses generated imagery. Ten real photos would make it unmistakably *yours* —
the exact shot list is in `docs/real-photos-shotlist.md`, and each maps to a filename I drop in.

- ☐ Take/send: fleet lineup, a driver by their truck, the yard, a loaded flatbed, a reefer, dashboard/cab interior, Sukhdev at work, a delivery, mountain-pass run, office/dispatch desk

### 4d. Scheduled agents (optional, keeps improving on its own)

- ☐ Set up the routines in `docs/design-qa-routines.md` (keeps every page legible on every device)
- ☐ And `docs/outreach.md` (keeps outreach drafts queued for your review, never auto-sends)

---

## SECTION 5 — Production sign-off gates

Check on **production with real data** before Excel is retired. Automated ones I can run for you.

**Automated** *(I run these — current status ✅)*
- ✅ `npm run build` — zero errors
- ✅ `npm test` — 1,487 tests green *(was "117" in the old PDF — the suite has grown)*
- ✅ `npm run db:migrate` — clean, and now runs automatically on every deploy
- ✅ `npm run design-qa` — 0 contrast/overflow failures, all devices
- ☐ Demo accounts disabled *(after fellowship review — see 1c)*

**Money** *(needs your real data + SMTP from 1b)*
- ☐ One real invoice emailed to a broker with PDF + POD attached
- ☐ AR aging matches your imported open invoices
- ☐ A settlement draft matches your manual spreadsheet to the penny
- ☐ QuickBooks export imports cleanly (accountant confirms)
- ☐ Factoring remit-to correct on factored invoices

**Operations**
- ☐ One real load: book → dispatch → driver POD → office sees the timeline
- ☐ Driver app: confirm dispatch → arrive → camera POD → DVIR
- ☐ Broker portal tracks an in-transit load with no dispatcher action
- ☐ Rate-con mailbox auto-files (or the unmatched queue is being watched)
- ☐ A fuel quarter imported; IFTA worksheet within tolerance of your last filing

**Compliance & security**
- ☐ Red/amber/green reflects real expiry dates
- ✅ Login lockout (5 fails → 15 min), documents require auth, share links revocable
- ☐ Crons confirmed running on Vercel *(needs `CRON_SECRET` from 1a)*

**Cutover**
- ☐ First full week: every new load booked only in LoadOff
- ☐ Excel retired
- ☐ Owner sign-off date: ______________

---

## The short version

If you only do three things:

1. **Section 1** — paste the env values + SMTP into Vercel (15 min). Unblocks emailing, outreach, crons, push.
2. **Section 2** — dump the paperwork into Smart Setup (30 min of scanning; no typing).
3. **Section 3B** — write how each driver gets paid (10 min). Nothing else can compute settlements for you.

Everything else can follow at your pace.

Signature: ____________________  Date: ____________

*Thind Transport · LoadOff · questions on this form only — upload at Admin → Smart Setup*
