# Top 10 by dollars per hour of Ranvir's time

**Generated 2026-07-25 against `main@c52ec254`.** Ranks the surviving findings from the six Section 3 audit
documents. 412 claims were checked by a second adversarial pass; 36 were killed as unsupported and 94 were
corrected. Only survivors appear here.

**How this is ranked.** Ranvir's hours, not engineering hours. Most of these are agent work — his cost is
reviewing a PR or making one phone call. Where a number is an assumption, the assumption is on the line.
Where there is no number, it says so instead of inventing one. Re-rank every Friday.

---

## The one-paragraph answer

Your prior was right about *where* the money is and wrong about *what stage the problem is at*. Deadhead and
DSO are the two biggest levers in the book — nothing else in the audit is their size. But neither number is
currently measured. Deadhead is `Math.round(miles * 0.08)` from the seed script (`scripts/seed-demo.mjs:341`,
27 of 27 loads match exactly); the field behind it on real loads is free text a dispatcher types
(`LoadForm.tsx:369`), and the lane planner that is supposed to kill deadhead does not cost deadhead at all
(`lanes.ts:47`). DSO is measured from invoice-issued, not from delivery, and `hub.loads` has no delivery
timestamp to measure from. So the first move is not a deadhead-reduction program — it is four days of
instrument work, most of which is a SQL query over data you already store. **Then** work the lever.

One thing outranks all of it and is not on your list: every uploaded document — driver CDL scans, medical
cards, PODs, W-9s, settlement statements — is stored as a public unauthenticated URL in production.

---

## The list

| # | Action | Ranvir hrs | Eng hrs | Value | A/B |
|---|---|---|---|---|---|
| 1 | Make every uploaded document private | 0.5 | 4 | Unbounded downside removed | A |
| 2 | Stop the owner dashboard reporting margin that excludes driver pay | 0.25 | 2 | Ends systematic underpricing | A |
| 3 | Measure real deadhead from the fuel card you already have | 0.5 | 6 | Unlocks $43k–$72k/yr | B |
| 4 | Invoice the delivered-but-never-billed loads, then make it automatic | 2 | 7 | Cash this week + stops recurrence | B |
| 5 | Fix the three IFTA filing bugs | 0.25 | 7 | Stops over- and under-paying fuel tax | A |
| 6 | Cost deadhead into lane ranking and raise cost/mile off 185¢ | 0.25 | 4 | Reorders every backhaul suggestion | B |
| 7 | Buy Vercel Pro | 0.25 | 0 | $240/yr to remove a ToS violation + repeat outage | A |
| 8 | Set `CREDENTIALS_KEY` and `FMCSA_WEBKEY` | 0.5 | 0 | Unblocks all 10 integrations | A |
| 9 | Add a delivery timestamp and re-anchor the unbilled-POD alert | 0.25 | 6 | $2,000–$10,500/yr | B |
| 10 | Delete 197 dead branches and fix the prune workflow | 0.5 | 1 | Repo stops lying about its own state | A |

Everything below is the same list with the evidence and the arithmetic.

---

### 1 — Every uploaded document is a public URL in production

`src/lib/hub/documents.ts:18` and `:57`, both inside `if (process.env.BLOB_READ_WRITE_TOKEN)`:

```ts
const blob = await put(`hub/${safeName}`, file, { access: "public" })
```

On Vercel this is the storage path for PODs, BOLs, CDL scans, medical cards, W-9s, COIs, driver receipts,
invoice PDFs and settlement statements. URLs are unguessable (`randomUUID()` at `documents.ts:14`) — but they
are *deliberately shared*, into broker email, factoring packets (`invoices.ts:488`) and share links, and once
shared they never expire and cannot be revoked.

The installed `@vercel/blob@2.4.0` supports `access: 'private'`. The local-disk path is guarded properly by
comparison (`src/app/api/hub/files/[name]/route.ts:20-36` checks session, carrier and portal visibility), and
two tests cover *that* route — so the whole suite stays green while production serves the files to anyone.

Not sized in dollars on purpose. This is driver PII and authority documents, not a revenue line.

**Your 30 minutes:** confirm `BLOB_READ_WRITE_TOKEN` is set in Vercel, then review the PR.
**MISSING:** whether that token is set in production — no prod env access this session.

---

### 2 — The owner dashboard shows margin that excludes driver pay, in green

`src/lib/hub/kpi.ts:61-62` emits `marginPct` and `operatingRatioPct` from `operatingCostCents`, which is fuel
+ maintenance + tracked expenses. The header comment is honest that driver settlements are excluded — but the
two derived percentages are not labelled that way, and `reports/page.tsx:162,172` renders them in the
positive-state colour.

Driver pay is not a rounding error. ATRI's 2025 figures put driver wages at 81.8¢/mi and benefits at 21¢/mi
against a $2.336/mi all-in cost — 44% of the total. Derived from your own seeded `hub.pay_rules`, the
exclusion is 50.4% of revenue.

This is the screen used to decide whether a rate is worth taking. A margin that reads ~50 points high causes
underpricing on every load, every day. It is roughly a two-hour fix: either fold settlement liability into the
cost base, or relabel both figures "before driver pay" and stop colouring them green.

**Assumption stated:** 12 trucks × $5,000/wk gross. **MISSING:** real weekly revenue.

---

### 3 — Measure real deadhead from the fuel card you already have

The 7.1% you would read off `/hub/reports` today is `Math.round(loaded_miles * 0.08)` written by
`scripts/seed-demo.mjs:341`. I checked all 27 loads that have the field populated: 27 of 27 match the formula
exactly, standard deviation 0.04 points. It is a constant wearing a metric's clothes. On real loads the field
is free text at `LoadForm.tsx:369` — nothing derives it, nothing validates it.

**The cheap instrument, and this is the part worth your attention:** you do not need an ELD to fix this. Total
miles ≈ fuel gallons × MPG. Loaded miles you already record. The difference is empty miles. On the seeded
book: 3,861 gallons × 6.0 MPG = 23,166 miles, against 19,074 miles typed across loaded + deadhead — a 4,092
mile gap, 21.5%. That would put real deadhead near 24%, not 7.4%.

*Do not act on that 24%.* Both sides of that comparison are synthetic. What is real is the **method**: it runs
on one month of fuel-card CSV, which you can export today, with no credential and no integration. That is what
makes this item cheap.

A second independent instrument already exists — `ifta.ts:145` persists GPS `fleet_miles` per quarter. And I
confirmed the delivery→next-pickup chain is computable: 100% of `hub.stops` rows carry lat/lng, and 15 of 27
truck-legs chain cleanly. Three instruments, none of them wired to the number on the screen.

**Value once real:** 3–5 points of reduction = **$43,200–$72,000/yr**. Assumptions inline: 12 trucks ×
100,000 mi/yr = 1.2M fleet miles; $1.20/mi marginal empty cost ($4.075/gal measured ÷ 6.0 MPG + ~$0.20 tires
+ ~$0.32 empty-leg driver pay). **MISSING:** power-unit count from your MCS-150, and real annual miles.

If the fuel-card check comes back at 7%, I will tell you and we cut this lever. That is the point of measuring
first.

---

### 4 — Loads delivered, driver paid, customer never invoiced

15 Thind loads past delivery with no invoice row: **$40,485**, and 10 of them have already been settled to the
driver. That is 3.2× the entire invoiced book in the same seed. `createInvoiceFromLoad` (`invoices.ts:64`)
only runs when a human opens the load and clicks; none of the 17 crons in `vercel.json` auto-invoices.

Seed figures, so treat the dollar amount as a shape not a total. But the failure mode is structural, not
synthetic: nothing in the system prevents paying a driver for a load nobody billed. `runSettlements`
(`settlements.ts:113`) does not check for an invoice.

Two moves: bill the real backlog now, then auto-invoice on `pod_received` plus a settlement guard.

**Your 2 hours:** pull the real uninvoiced list and bill it.
**MISSING:** real POD-to-invoice lag and real factored share — factored invoices collapse DSO to ~1 day at a
flat fee, so the working-capital half of this lever is worth ~$0 on them. Seed shows 3 of 29 loads factored.

---

### 5 — Three IFTA bugs: one overpays, one underpays, one credits the wrong state

**Overpay.** `import.ts:579` mints a fresh `run_id` per import and inserts without deleting prior rows for the
same carrier + quarter. `ifta.ts:99-104` then sums *all* `source='import'` rows with no `run_id` filter.
Reproduced live in a rolled-back transaction: two identical 1,000-mile WA rows returned `WA | 2000.00`. One
accidental re-upload doubles taxable gallons across every jurisdiction on that return.

**Underpay — the one that draws an audit.** `ifta.ts:78` branches on `if (trucks.length > 0)` where `trucks`
is `SELECT DISTINCT truck_id FROM hub.position_pings` for the whole carrier. One telematics-connected truck
and four on manual mileage sheets files **only the connected truck's miles**. The imported rows are never
read. Sources should be additive per truck, not exclusive per fleet.

**Wrong state.** `csv.ts:213-215` normalizes jurisdiction with `slice(0, 2)`. Minnesota → MI. Missouri → MI.
Alaska → AL. Nevada → NE. Seeded data is all two-letter so it has not fired; it fires the first time a fuel
statement spells states out.

**MISSING:** your quarterly IFTA net tax from a filed return. `hub.ifta_reports` is empty — no quarter has
ever been computed here, so no dollar figure can be derived from the repo.

---

### 6 — Lane ranking is blind to the thing it is supposed to fix

`lanes.ts:47` computes lane margin as `revenue − loaded_miles × costPerMileCents`. Deadhead miles are not
costed. `lanes.ts:109` then orders by *total* margin, not margin per mile, so the planner
(`planner.ts:162`) recommends long cheap lanes over short rich ones. And `costPerMileCents` defaults to
**185** (`settings.ts:22`) against ATRI's **$2.336**.

Recomputed on the seeded book at 226¢ including deadhead: reported margin **$40,120** → **$29,688**, a 26%
overstatement, and Kent→LA and Kent→Sacramento swap rank. Kent→Portland at $3.48/mi of margin currently ranks
20th of 21.

The seed's uniform 8% deadhead is what keeps most of the ordering intact. Real variable deadhead moves it more.

This is a three-line change and it is the lever behind Section 7 #2. **MISSING:** real lane mix and real
rates — seeded RPM is $4.12/mi, roughly 1.8× market, which flattens every ratio.

---

### 7 — Vercel Hobby, on a system that dispatches revenue freight

Hobby is restricted to non-commercial use. LoadOff dispatches for two FMCSA carriers. It has already cost you
uptime once: `docs/claude-routines.md:111-114` records production frozen mid-rollout on 2026-07-22 when the
agent fleet's preview builds exhausted the daily deploy quota. The mitigation shipped (`vercel.json:7`
`ignoreCommand` restricts builds to `main`) and is holding.

$240/yr. Buy it for the terms-of-service exposure, not the deploy cap.

Related and already fine: 17 cron jobs is well under the 100-per-project limit on every plan, and production
crons are running — Vercel runtime logs show `/api/hub/cron/[job]` reaching Postgres as recently as
2026-07-25T06:52Z. One error group in 7 days, and it is a benign `pg` SSL deprecation warning.

---

### 8 — Two environment variables are holding back everything else

`CREDENTIALS_KEY` is unset. `credentials.ts:19` throws without it and `:62` returns null, so **all ten**
integrations are unreachable regardless of what else you paste. `hub.api_credentials` is 0 rows and
`hub.integration_syncs` is 0 rows — nothing has ever authenticated.

`FMCSA_WEBKEY` is free and takes five minutes to register. It powers the daily `fmcsa-recheck` cron and the
authority check in the signup flow (`onboarding.ts:59` currently degrades to manual entry).

Worth correcting a label while you are here: `connections:check` reports 8 providers "live" and 2 "stub", but
"live" means *the adapter is wired*, not *connected*. Separately, `registry.ts:138` marks QuickBooks as a stub
when `qbo.ts` is 468 lines with working OAuth refresh and token rotation — the repo's most complete adapter is
mislabelled as its least complete.

---

### 9 — The unbilled-POD alert can be silenced by editing the load

`today.ts:156` and `tasks.ts:292` age the alert off `loads.updated_at`. `hub.loads` has no `delivered_at` or
`pod_received_at` column — the audit trail in `hub.load_events` carries the status transitions, but nothing
reads them for this. So any edit to a load resets its own overdue alarm.

The full cash cycle *is* reconstructible from data you already write: joining `load_events` where
`payload->>'to' = 'pod_received'` against `invoices.issued_on` gives a POD→invoice lag of 4 days on the
seeded book. `avgDaysToPay` (`vetting.ts:156`) measures only issued→paid, which hides the leg you control.

**Value:** $2,000–$10,500/yr. Assumptions: 12 trucks × 1,900 loaded mi/wk × $2.20/mi = $7,166/day of revenue;
3%/30-day factoring ≈ 36.5% APR; haircut applied because factored invoices save $0. **MISSING:** your actual
factoring agreement — `carrier_settings` names "Summit Capital Factoring", which is seed fiction.

---

### 10 — The repo is lying about its own state

232 remote branches, 200 unmerged. 58 touch code; 142 are report-only; **103 are literally zero-diff commits**.
`prune-merged-branches.yml:36` uses `git branch -r --merged origin/main`, and an empty commit on an old main
is not an ancestor of main — so it can never delete them. Inflow is ~25/day against an integrator ceiling of
one merge per hour.

Verdict: 3 keep, 197 delete. `PR_TRIAGE.md` §6 has the exact `git push --delete` commands ready to run.

One salvage worth taking: `claude/relaxed-volta-fwzde0` fixes the IFTA compliance wall going red 31 hours
early every quarter. Strict `git apply --check` is clean against current main and 12 tests pass after applying.

One branch to explicitly *not* merge: `claude/eager-babbage-7o17sq` repaints the DVIR "not safe to operate"
state with the tenant accent colour, so a safety warning renders in whatever colour a carrier picked.

---

## Cut these

Named so they stop consuming attention:

- **`companyDriverPerMile` float → integer cents.** Correct in principle, worth ~$0 — `pay-rules.ts:328`
  already contains the boundary with `Math.round(payRate * 100)`.
- **Google Workspace annual-vs-flexible switch.** $34/yr for two users.
- **Self-hosting the pdfjs worker.** $0.
- **The IFTA worksheet totals row.** ~1 hr/yr, and even that is an unmeasured guess. Land it only because
  someone already wrote it.
- **Cancelling the second load board.** $1,620/yr *if* you had two. You have zero credentials on either —
  this is a do-not-buy, not a cut.

---

## What I need from you

Ordered by how much of the audit each one unblocks. Everything above is arithmetic on seed data until these land.

1. **One month of fuel-card CSV** (EFS — 35 of 36 seeded rows say EFS). Unblocks the real deadhead number,
   which is item #3 and the largest lever in the book.
2. **Settlement register, 12 months.** Unblocks the driver-pay ratio behind item #2.
3. **Invoice + payment register, 12 months** (QuickBooks). Unblocks real DSO, real AR, and the real
   uninvoiced-load count behind item #4.
4. **Your factoring agreement** — rate, advance %, recourse. Decides whether item #9 is worth $2k or $10k.
5. **Power units and annual miles per truck** from your MCS-150. Every deadhead dollar figure scales off this.
6. **Confirm three Vercel env vars are set in production:** `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`,
   `FMCSA_WEBKEY`.
7. **ATS Transport does not exist in the database.** Tenant 2 is "Cascade Demo Lines", a seed fixture.
   Onboarding ATS yourself is the fastest real test of the under-2-hours claim — and `docs/onboarding-runbook.md`
   does not exist yet, so that target is currently unmeasurable.

---

## Verification note

Each of the six documents was written by one agent and then attacked by a second, which re-opened every cited
file at the cited line, re-ran every cited query, and deleted claims whose citations did not resolve. Kill
counts: RELEASE_READINESS 8, UNIT_ECONOMICS 8, STUB_INVENTORY 7, RUN_COST 7, PR_TRIAGE 5, TEST_GAPS 1.

Independently re-verified by hand before publishing this list: the public-blob call sites and that
`@vercel/blob@2.4.0` supports `private`; both IFTA branch bugs; the seed deadhead formula (27/27 loads);
the lane-margin recomputation; the fuel-gallons cross-check; the POD→invoice reconstruction; and Vercel
production cron health.

Baseline this ran against: **189 test files, 1592 tests, all passing**; `tsc --noEmit` clean across app code
(32 test files are type-unsound, which is its own finding in TEST_GAPS §3). `npm run build` fails in this
sandbox only because egress to `fonts.googleapis.com` is blocked — an environment limit, not a repo defect,
though it does mean a Google Fonts outage fails your Vercel deploy.

```
FILES:    docs/ops/TOP_10.md, RELEASE_READINESS.md, PR_TRIAGE.md, TEST_GAPS.md,
          STUB_INVENTORY.md, RUN_COST.md, UNIT_ECONOMICS.md (all created)
PR:       none — GitHub token rejected (403), gh unauthenticated this session
IMPACT:   $43k-$72k/yr gated behind ~6 engineering hours of deadhead instrumentation;
          one production PII exposure; three IFTA filing bugs; $40,485 of seeded
          delivered-but-unbilled loads pointing at a real uninvoiced backlog
NEXT:     Make documents.ts:18 and :57 private and add a signed-read route
BLOCKED:  GitHub write access, and the six exports listed above — the fuel-card CSV
          first, because it turns the largest lever from an assumption into a number
```
