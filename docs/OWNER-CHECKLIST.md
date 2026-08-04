# Owner action queue — Thind Transport / LoadOff

**Updated 2026-08-04.** This file is the **single queue of things only the owner can do**,
per the autonomous-build plan: agents never block on these, never put them in their own
task lists, and never write secret *values* here — names and places only. Everything not
on this page is either done or automatable without you.

---

## The iOS install / origin split (current headline)

The PWA install from **thindtransport.com/hub/get-app already works** — the auth-gate bug
that served HTML as the service worker was fixed and verified live 2026-07-30. The origin
split below is the *cleaner* long-term answer (LoadOff on its own host, so an installed
app can never wander onto the website). The code is on `main`, off until one env var is
set. Three steps, two still yours:

| # | Action | Where | Status |
|---|---|---|---|
| 1 | Set env var **`NEXT_PUBLIC_APP_HOST`** = `thind-transport-website.vercel.app` (Production; Preview too if offered) | Vercel → project → Settings → Environment Variables | ☐ **you** |
| 2 | Remove the **domain redirect**: `thind-transport-website.vercel.app` currently 308-redirects every path to `thindtransport.com` (verified live 2026-08-04). Set it to "No Redirect". | Vercel → project → Settings → Domains → that domain | ☐ **you** |
| 3 | Deployment protection opened for production aliases while previews (which carry the full TMS) stay walled — `prod_deployment_urls_and_all_previews` | — | ✅ agent, 2026-08-04 |

**Then redeploy with the build cache DISABLED** (Deployments → ⋯ → Redeploy → untick "Use
existing Build Cache") — `NEXT_PUBLIC_*` values are baked in at build time; a cached
rebuild silently ignores the new value and the split looks broken. Any push to `main`
also works. Until steps 1–2 are done, both hosts serve the combined site exactly as
today: nothing is broken, the split is simply off.

## Production env vars (names only — values were sent to you separately)

| Name | What it unlocks | Until set |
|---|---|---|
| `CRON_SECRET` | All 17 scheduled jobs — currently 401 | Jobs no-op silently |
| `CREDENTIALS_KEY` | Encrypts stored integration credentials; every provider connect depends on it | Integrations can't be activated |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT` | Driver-app push notifications | No push; app otherwise fine |
| `SMTP_USER`, `SMTP_PASS` | **Broken, not just missing**: nightly cron fails `535-5.7.8 BadCredentials` daily at 14:00 UTC since 07-26. Generate a fresh Gmail App Password, repaste both. | Invoice email, outreach, lead alerts silently dead |
| `FMCSA_WEBKEY` (free — mobile.fmcsa.dot.gov → Login.gov → My WebKeys) | Live authority on /trust + broker vetting | Cached snapshot, labeled |
| `EIA_API_KEY` (free — eia.gov/opendata/register.php) | Live diesel prices in the earnings calculator | Static figure |
| `HUB_DEMO_LOGIN` | `false` disables demo logins — leave ON until reviewers finish, off before real data | Demo logins active |

All set at: Vercel → project → Settings → Environment Variables → Production → Redeploy.
Note for agents: outbound mail is **nodemailer over SMTP**. Resend is NOT in this stack —
plans that say otherwise are wrong; verified stack facts live in `docs/portfolio/FACTS.md`.

## Claims removed from the site — send the source and they come back

Removed 2026-08-04 under the no-unverifiable-claims rule. A guard test
(`src/__tests__/unverifiable-claims.test.ts`) fails the build if any returns without its
entry being deleted in a commit that cites the verifying document.

| Removed claim | Where it lived | Comes back when you provide |
|---|---|---|
| "$1M+ Liability Coverage" (+ homepage Insured tile) | homepage TrustStrip, credentials list | The **COI** — real auto-liability + cargo limits |
| Published on-time percentage | never published (guarded by `TRUST_FACTS`) | Measured data, only if genuinely ≥95% |
| "Priority Application Processing" (+ "priority application status") | pre-qualify + 30-second qualifier | A written recruiting policy that says it |
| "Immediate Orientation …" + "Premium Equipment Assignment" | qualify flows | A written orientation schedule / equipment policy |

Each was replaced with constants-backed facts (sign-on bonus, weekly direct deposit, no
forced dispatch), so the cards did not thin out. The $425K / $1M+ **five-year projections**
on /pay-rates stayed — labeled projections — but should derive from `PAY_RATES` constants
instead of being hardcoded; that is agent backlog, not yours.

## Accounts / money / people

| Action | Why | Added |
|---|---|---|
| Vercel Pro ($20/mo) | Hobby is non-commercial-only; its deploy quota froze production once | 07-27 |
| Enable Web Analytics (Project → Analytics, one click) | Funnel tracking ships to every visitor with nowhere to report | 07-27 |
| Uptime monitor on `thindtransport.com/api/version`, alert when `"db":true` disappears | Catches "site up, database gone" | 07-27 |
| File **Form 2290** (~$8,250, due **Aug 31**) | Blocks plate renewal, not a fine | 07-27 |
| Run `branch-cleanup.sh` from your machine | Sandboxes get 403 on ref deletion; ~113 dead branches | 07-28 |
| Real photos (shot list: `docs/real-photos-shotlist.md`) | Biggest credibility gap; placeholders until then | 07-27 |
| Punjabi/Spanish reviewer | i18n scaffolding allowed; no machine-translated page ships | 07-27 |
| Integration credentials (EFS/WEX/Comdata feeds, Terminal **or** TruckerCloud ELD key, QBO app, DAT/Truckstop seats, factor details, docs-mailbox address) | Pasted in LoadOff → Settings → Integrations (needs `CREDENTIALS_KEY` first). Adapters are contract-tested against mocks; a credential is activation, not development. | 07-30 |
| DNS record for `app.thindtransport.com` (only when you want the branded app host; the `.vercel.app` alias tests the split first) | The end-state for the origin split | 08-04 |

The interactive worksheet (`loadoff-worksheet.html`, sent 07-30) collects the numbers only
you have — real cost per mile, 70/8 vs 60/7 dispatch, truck weights, whether ATS is live
on LoadOff. Estimates are fine; the simulation only needs to behave like your business.

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

### 4e. Universal integration wave (2026-08) — accounts only you can open

The software side is DONE and waiting: nine new integration cards are live on
`/hub/settings/integrations` (Axle, AtoB, Plaid, Bestpass, PrePass, Drivewyze, Fleetio,
SambaSafety, Stedi), each mock-tested and each with a working no-credential fallback —
including the new **FMCSA ELD output-file parser**, which reads the standardized file every
registered ELD in America is legally required to export. Nothing below blocks anything else;
open them in any order, paste the credential into the card, done.

**Sign up / ask for API access** *(each is one account + one credential paste)*
- ☐ **Axle** (withaxle.com) — third ELD aggregator, catches brands Terminal/TruckerCloud miss
- ☐ **AtoB** (atob.com) — if you switch fuel cards, this one has a real API
- ☐ **Plaid** (dashboard.plaid.com) — bank-feed fallback so fuel spend imports even with no card feed
- ☐ **Bestpass** (developer.bestpass.com) — tolls land as per-truck expenses automatically
- ☐ **PrePass** (developer.prepass.com) and/or **Drivewyze** — weigh-station bypass data
- ☐ **Fleetio** (developer.fleetio.com) — only if you want maintenance synced to an outside shop system
- ☐ **SambaSafety** (developer.sambasafety.com) — continuous MVR monitoring on every driver
- ☐ **Stedi** (stedi.com) — EDI: receive 204 load tenders from enterprise shippers as data, no VAN

**Partner applications** *(these need a signed agreement or an invite — start the conversation, I do the rest)*
- ☐ **project44 / FourKites / Descartes MacroPoint** — ask the next broker who demands tracking
  which one they use, and request carrier-side API credentials from that one first
- ☐ **Uber Freight** carrier API access (carrier account required)
- ☐ **Tenstreet or DriverReach** if recruiting volume ever outgrows the built-in board
- ☐ **Cover Whale / Nirvana** — telematics-based insurance quotes, at renewal time

**Spend decisions** *(not yet — triggers listed so future-you knows when)*
- ☐ **SOC 2 Type II** (~$25–80k first year): only when an enterprise shipper's security
  questionnaire demands it. Not needed to sell to small carriers. A Type I unblocks a single deal faster.
- ☐ **Paid support tooling**: free tier / email is fine until real ticket volume exists.

---

## SECTION 5 — Production sign-off gates

Check on **production with real data** before Excel is retired. Automated ones I can run for you.

**Automated** *(I run these — current status ✅)*
- ✅ `npm run build` — zero errors
- ✅ `npm test` — 2,500+ tests green *(was "117" in the old PDF — the suite has grown)*
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
