# Unit Economics

Per-truck baseline (RPM, CPM, deadhead %, margin/truck/week, DSO) measured against the live database, and whether each number can be trusted enough to make a decision on.

Generated 2026-07-25 against main@c52ec254. **Measured live** (psql against `hub` on the seeded local Postgres): every value in the Baseline table, the lane rankings, the fuel-vs-load mileage reconciliation, the invoice/payment ladder. **Code-read** (file:line cited inline): every claim about what the app computes or fails to compute. **List price / inference** (labeled at point of use): ATRI $2.26/mi all-in, the 15–20% small-carrier deadhead norm, the 3%/30-day factoring rate, 100,000 annual miles per truck, the 12-truck fleet size. No dollar figure below is a Thind or ATS actual.

---

## READ THIS FIRST — these are SEED numbers

Every figure in this document comes from `scripts/seed-demo.mjs`, not from Thind Transport LLC or ATS Transport LLC. Tenant 1 is "Thind Transport" (DOT 2523064, MC 876103 — real identifiers, fabricated operations). Tenant 2 in this database is **"Cascade Demo Lines"**, not ATS:

```
psql "$PGURL" -c "select name, dot_number from hub.carriers;"
 Thind Transport    | 2523064
 Cascade Demo Lines | 3411908
```

Scale of the seed: 27 Thind loads across 10 trucks over 78 days (2026-05-11 → 2026-07-28) — about 2.5 loads per truck per quarter. A real 10-truck fleet books 2–4 loads per truck per *week*. Revenue per loaded mile in the seed is **$4.12**, roughly 1.8× the real PNW dry-van market. Treat every absolute dollar below as an illustration of the arithmetic, not a forecast.

**MISSING: the real export.** Nothing here is decision-grade until the exports listed in [Section 6](#6-missing-what-to-export-to-replace-every-number-above) land. Two spreadsheets and a settlement register replace 100% of it.

---

## 1. Baseline metrics

Fleet scope: carrier `11111111-…` (Thind), all non-deleted, non-cancelled, truck-assigned loads. This is exactly the scope `truckPnlRange` (src/lib/hub/reports.ts:241-263) feeds to the reports pages, so these are the numbers the app renders. Sibling docs (RUN_COST.md, RELEASE_READINESS.md) quote 18,932 loaded / 1,446 deadhead / 7.1% over 29 loads — a wider scope (both carriers, loads with no truck). Not a contradiction; different denominator.

| Metric | Seeded value | How computed | Trustworthy? | MISSING for real data |
|---|---|---|---|---|
| Revenue | **$70,195.00** | `sum(linehaul_cents + fuel_surcharge_cents)` over 25 truck-assigned loads | Yes — integer cents end to end, one definition (src/lib/hub/reports.ts:244) | Rate confirmations or the factoring funding report |
| Loaded miles | **17,022** | `sum(loaded_miles)` | Typed by hand (src/components/hub/LoadForm.tsx:359-363); no routing check on save | ELD/Motive per-load mileage |
| Deadhead miles | **1,361** | `sum(deadhead_miles)` | **No.** Literally `Math.round(miles * 0.08)` in scripts/seed-demo.mjs:340 | ELD total miles minus loaded miles |
| Revenue / loaded mile (RPM) | **$4.12** | `7019500 / 17022` — matches `kpi.ts:60` | Arithmetic yes; input is ~1.8× market | Real rates |
| Operating cost / total mile (CPM) | **$0.89** | `(1573521 fuel + 62500 maint + 3500 other) / 18383` — `kpi.ts:59` | **No.** Excludes driver pay, truck notes, insurance, permits, office | Full P&L (see §6) |
| Deadhead % | **7.4%** | `1361 / 18383` — `kpi.ts:63` | **No.** See Finding 1 | ELD |
| Operating ratio | **23.4%** | `kpi.ts:61` | **No.** Real trucking OR is 92–99 | — |
| Net margin | **76.6%** | `kpi.ts:62`, rendered green at reports/page.tsx:172 (that page only) | **No.** Overstates by ~50 points. See Finding 2 | — |
| Gross margin / truck / week | **$482.82** displayed | `$53,799.79 net ÷ 10 trucks ÷ 11.14 wk (78-day span)` | **No** — same partial cost base | — |
| …same, driver pay included | **$165.46** | `$18,436.53 ÷ 10 ÷ 11.14` | Directionally right; still misses fixed costs | — |
| Fuel price | **$4.075/gal**, 3,861 gal, $15,735.21 | `sum(total_cents)/sum(gallons)` on `hub.fuel_transactions` | Yes — real fuel-card shape | EFS/WEX/Comdata sync (all 3 adapters are wired, 0 credentials) |
| Fuel-implied miles @ 6.0 MPG | **23,166** | `3861 × 6.0`; MPG from `hub.carrier_settings → fsc.mpg` | Yes, as an instrument | — |
| Driver pay (modeled) | **$35,363.26 = 50.4% of revenue** | Evaluated `hub.pay_rules` per load (6 co. drivers @ 63¢/loaded mi, 4 O-O @ 90% linehaul + 100% FSC — verified `select name, rules from hub.pay_rules`) | Yes — his own configured rules | Actual settlement register |
| Driver pay (as settled in DB) | **$2,485.25** | `sum(gross_cents) from hub.settlements` — 2 rows, both `status='paid'` | Only **2** of 25 loads carry a `settlement_id`; 10 more sit at `status='settled'` with none | — |
| Invoices issued | **4**, $12,480.00 | `hub.invoices` | Yes | QBO / invoice register |
| Loads at/past delivery with **no invoice** | **15**, **$40,485.00** | `loads left join invoices where i.id is null and status in ('delivered','pod_received','paid','settled') and carrier_id = Thind` | Yes, and alarming — see Finding 3 | — |
| Payments received | **1**, $3,560.00 | `hub.payments` | Yes | — |
| Open AR | **$8,920.00** | `sum(invoices) − sum(payments)` | Yes | AR aging from QBO |
| DSO (issue → cash) | **15.0 days, n=1** | `p.paid_on − i.issued_on`; this is what src/lib/hub/vetting.ts:158 and src/lib/hub/customers.ts:15 both report | Arithmetic fine; **n=1** and it is the wrong clock | — |
| DSO (delivery → cash) | **16 days, n=1** | delivery `departed_at` → `paid_on` for THD-1016 | **Not computable by the app** — see Finding 3 | — |
| POD → invoice lag | **1 day** by stop clock, **4 days** by event clock, on 4 loads | see Finding 3 | **No** — the two clocks disagree and neither is exposed in the UI | Invoice register + POD timestamps |

Two of 29 loads have `deadhead_miles IS NULL` (both Cascade). `computeFleetKpis` coerces null→0 via `Number(r.deadhead_miles ?? 0)` at owner/page.tsx:138, so a missing deadhead entry silently reads as a perfect zero-empty-mile load and pulls fleet deadhead % *down*. Small on 2 loads; systematic if dispatchers skip the field.

**Minor, flag-and-move-on:** `src/lib/hub/settings.ts:20` stores `companyDriverPerMile: 0.6` — dollars as a JS float, in a money path. It is converted at the boundary by `Math.round(config.payRate * 100)` (src/lib/hub/pay-rules.ts:328) so the error is sub-cent per mile. Real but worth ~$0/yr. Do not spend time on it.

---

## 2. Finding 1 — Deadhead % is not a measurement. It is a constant.

### The evidence

`deadhead_miles` is a free-text number field on the load form:

```
src/components/hub/LoadForm.tsx:366-370
  <label htmlFor="deadhead">Deadhead miles</label>
  <input id="deadhead" type="number" ... value={form.deadhead_miles} />
```

No suggest button, no routing call, no cross-check — the only constraint is `min="0"`. It flows straight through `schemas.ts:131` (`deadhead_miles: optionalInt`) → `_actions/loads.ts:62` → `loads.ts:244` into the column, and out again to `reports.ts:257` → `owner/page.tsx:138` → `kpi.ts:63`. I read every file that could plausibly derive it:

| File | What it actually does | Derives empty miles? |
|---|---|---|
| src/lib/hub/routing-core.ts | 30 lines: `estimateRoadMiles(gc × 1.2)` and a source label. Pure, no callers for deadhead. | No |
| src/lib/hub/geo.ts:58 | `jurisdictionMilesFromPings` — sums haversine between consecutive pings, per state, for IFTA | No (but see the fix) |
| src/lib/hub/planner.ts:135 | `emptyEta` — haversine from last ping to the delivery stop, ÷47 mph, for a "truck goes empty ~Thu 14:00" label | No. It predicts *when*, never measures *how far* |
| src/lib/hub/lanes.ts:44 | `SUM(COALESCE(l.loaded_miles,0))` — **deadhead is not in the lane aggregate at all** | No |

`grep -rn "deadhead" src/ | grep -v __tests__` returns 49 hits. Every one reads or writes the manual column. **Nothing computes it.** The 7.4% on the reports page is what a dispatcher typed.

Except in this database, nobody typed it:

```
psql "$PGURL" -c "select count(*) total,
  count(*) filter (where deadhead_miles = round(loaded_miles*0.08)) matches,
  round(stddev(100.0*deadhead_miles/(loaded_miles+deadhead_miles)),4) sd
  from hub.loads where deadhead_miles is not null;"
 total | matches |   sd
    27 |      27 | 0.0442
```

27 of 27. Standard deviation 0.04 points. The source is `scripts/seed-demo.mjs:340`:

```js
miles, Math.round(miles * 0.08),
```

Real deadhead has a standard deviation of 10+ points — 0% on a clean reload, 250 miles repositioning out of Phoenix. A σ of 0.04 is the signature of a formula.

### An independent instrument, already in the database, disagrees by 28.7 points

Fuel gallons × fleet MPG gives total miles driven. Loads give loaded + claimed-deadhead. The difference is empty running. Restricted to the 8 Thind trucks that have fuel records:

```
 gallons | implied_mi @6.0mpg | loaded | claimed_dh | implied_empty_% | reported_dh_%
    3861 |             23,166 | 14,807 |      1,184 |          36.1%  |         7.4%
```

Per truck the spread is −1.9% (unit 203) to 69.0% (unit 105) — lumpy, which is what real deadhead looks like. The flat 7.4% is not.

Honest caveat: the seed's fuel generator and load generator were never calibrated to each other, so 36.1% is an artifact, not a measurement of Thind. **That makes the point stronger, not weaker** — two independent mileage instruments sit in the same database, disagree by 28.7 points, and nothing in the application reconciles them or raises a flag.

### A third instrument agrees with the second, not with the loads

`hub.position_pings` holds 543 GPS pings across all 10 Thind trucks, 2026-04-29 → 2026-07-25. Summing haversine between consecutive pings per truck — the same math `jurisdictionMilesFromPings` (src/lib/hub/geo.ts:58) already runs for IFTA:

```
psql "$PGURL" -c "with p as (select truck_id, ts, lat, lng, lag(lat) over w plat, lag(lng) over w plng
  from hub.position_pings where carrier_id='11111111-1111-1111-1111-111111111111'
  window w as (partition by truck_id order by ts))
 select count(*) hops, round(sum(3958.8*2*asin(sqrt(power(sin(radians(lat-plat)/2),2)
   +cos(radians(plat))*cos(radians(lat))*power(sin(radians(lng-plng)/2),2))))) mi
 from p where plat is not null;"
 hops | mi
  533 | 24413
```

| Instrument | Total fleet miles |
|---|---|
| Loads (typed loaded + typed deadhead) | 18,383 |
| Fuel gallons × 6.0 MPG | 23,166 |
| GPS pings, haversine | **24,413** |

The two instruments nobody types agree within 5% of each other and both sit ~30% above the typed number. Haversine over sparse pings *understates* road miles (straight lines between fixes), so 24,413 is a floor. Caveat: 543 pings over 88 days is ~1 fix per truck per 1.6 days — too sparse to be a production mileage source on its own. It is enough to establish that the typed number is low.

The fix is one join. `src/lib/hub/ifta.ts:86-93` already computes and writes GPS-derived jurisdiction miles **per truck per quarter** into `hub.jurisdiction_miles`, and `ifta-core.ts:45` already computes `fleetMiles / fleetGallons`. Fleet total miles is sitting next to loaded miles. Subtract. (`hub.ifta_reports` is empty in this DB — 0 rows — so the path is code-verified, not data-verified.)

### What the gap is worth per year

Assumptions, all stated:
- **12 trucks** (Thind + ATS combined). MISSING: actual power-unit count from the MCS-150.
- **100,000 total miles per truck per year** = 1,200,000 fleet miles. Source: ATRI 2024 average annual miles for for-hire truckload; PNW regional runs lower, so this is generous.
- **$1.20 marginal cost per empty mile.** Built from measured data where possible: fuel $4.075/gal ÷ 6.0 MPG = **$0.679/mi** (both live from the DB), plus ~$0.20 tires/maintenance and ~$0.32 blended driver pay on the empty leg. The truck note, insurance, and permits are sunk whether the truck rolls empty or loaded, so ATRI's **$2.26 all-in** (cited in kpi.ts:6) is the wrong number here — it is only right for miles you could have *replaced* with loaded miles.

One point of deadhead = 1,200,000 × 1% = **12,000 empty miles/yr**.
12,000 × $1.20 = **$14,400 per point per year** (marginal). At $2.26 all-in: $27,120/pt.

| Scenario | Points hidden | Annual cost not shown, @ $1.20/mi |
|---|---|---|
| Reported 7.4% vs. industry low end 15% | 7.6 | **$109,440** |
| Reported 7.4% vs. industry high end 20% | 12.6 | **$181,440** |
| Reported 7.4% vs. this DB's own fuel math 36.1% | 28.7 | $413,280 (seed artifact — upper bound only) |

That is money already being spent, not money being lost by the misreport. The misreport's cost is that nobody works on it. **The recoverable slice** is what disciplined backhaul planning takes off a small carrier's deadhead — 3 to 5 points:

- 3 points × 12,000 mi × $1.20 = **$43,200/yr**
- 5 points × 12,000 mi × $1.20 = **$72,000/yr**

**That is the largest single number in this document.** It is gated entirely on building the instrument first. You cannot manage a number that is currently a constant.

---

## 3. Finding 2 — The 76.6% net margin is a 50-point overstatement, and it is rendered green on /hub/reports

### The cost base

`computeFleetKpis` is honest in its own header (src/lib/hub/kpi.ts:9-11): *"Cost basis here matches the existing per-truck P&L (fuel + maintenance + other tracked expenses); driver settlements are tracked separately."* `truckPnlRange` (src/lib/hub/reports.ts:241-263) confirms it — the SQL sums exactly three cost sources and never touches `hub.settlements` or `hub.settlement_lines`.

But the function still emits `operatingRatioPct` (kpi.ts:61) and `marginPct` (kpi.ts:62) from that partial base, and **one** page renders them:

- `src/app/hub/(office)/reports/page.tsx:162` — "Operating ratio", styled `text-ok` when `< 100`
- `src/app/hub/(office)/reports/page.tsx:172` — "Net margin", styled `text-ok` when `>= 0`

Scope correction: the owner dashboard does **not** render either. `owner/page.tsx:144` calls `computeFleetKpis` but the JSX (owner/page.tsx:148-181) renders only `cpmCents`, `rpmCents`, `loadedPct` and `deadheadPct`. `grep -n "marginPct\|operatingRatioPct" 'src/app/hub/(office)/reports/owner/page.tsx'` → no hits. The owner page also carries a separate `SettlementLiabilityPanel` — "Owed to drivers" (owner/page.tsx:186, fed by `settlementLiability` at reports.ts:122) — so driver pay is surfaced there, just not netted into any margin. In this DB that panel reads **$0**, because the query counts only `status IN ('draft','approved')` (reports.ts:127) and both seeded settlements are `paid`.

The header comment says CPM is *"labeled 'operating cost/mile' in the UI to stay honest."* CPM is. **Operating ratio and net margin are not** — they carry no qualifier on screen, and "Operating ratio · cost ÷ revenue · <100 = profit" (reports/page.tsx:163) is a direct invitation to read 23.4% as a business result.

### How big the hole is, using his own pay rules

`hub.pay_rules` has 10 active Thind rules: **6** company drivers at 63¢/loaded mile, **4** owner-operators at `percent_linehaul` 9000bp + `fsc_passthrough` 10000bp — i.e. the O-O keeps 90% of linehaul and 100% of the fuel surcharge. Evaluating those rules against every non-cancelled Thind load:

```
 loads |   revenue  | driver_pay | pct
    25 | $70,195.00 | $35,363.26 | 50.4%
```

Per truck-and-rule, driver pay ranges from 12.3% of revenue (unit 105, company driver) to **91.0%** (units 202/203/104/106/103, owner-operator). For O-O work the carrier's real gross is ~10% of linehaul.

Worked example, unit 104 (runs both a company driver and an O-O): revenue $11,990.00, tracked cost $2,044.65 → the report displays **82.9% net**. Modeled driver pay on that truck is $8,942.80, so true net is $1,002.55 = **8.4%**. A **74.5-point** overstatement on a single truck.

`hub.settlements` contains $2,485.25 across 2 rows; only 2 of 25 loads carry a `settlement_id`. The *obligation* is $35,363.26. Both are excluded from the margin either way.

### Arithmetic

| | Displayed | With driver pay |
|---|---|---|
| Revenue | $70,195.00 | $70,195.00 |
| Cost | $16,395.21 | $51,758.47 |
| Net | $53,799.79 | $18,436.53 |
| Operating ratio | **23.4%** | **73.7%** |
| Net margin | **76.6%** | **26.3%** |

**Overstatement: 50.4 percentage points.**

Per truck per week, over the seed's 78-day / 11.14-week span across 10 trucks:

```
displayed  $53,799.79 ÷ 10 ÷ 11.14 = $482.82 / truck / week
true       $18,436.53 ÷ 10 ÷ 11.14 = $165.46 / truck / week
overstated                            $317.36 / truck / week
```

At Thind's real scale the gap is a multiple of that. Driver pay is real cash out the door: **every $1.00 of revenue shows $0.766 as net when the honest figure is $0.263.** At 12 trucks × $5,000/week gross (assumption — MISSING: real weekly revenue), the report overstates weekly net by 0.504 × $60,000 = **$30,240/week**. If freight is priced off that number, it is priced 50 points too optimistically.

### The cost/mile default and lane ranking

`src/lib/hub/settings.ts:22` sets `costPerMileCents: 185`. Thind's stored settings row uses the default (verified: `select settings->'costPerMileCents' from hub.carrier_settings` → `185`). `src/lib/hub/lanes.ts:73` reads it and `lanes.ts:47` computes:

```sql
SUM(revenue) - SUM(COALESCE(l.loaded_miles,0)) * $costPerMileCents AS margin_cents
```

Two defects, one worse than the other:

**(a) $1.85 vs ATRI $2.26 — a 41¢/mi understatement.** It moves the break-even bar:

| Cost basis | Break-even revenue per loaded mile |
|---|---|
| $1.85 × loaded miles (shipped default) | **$1.85** |
| $2.26 × total miles, 7.4% deadhead | **$2.44** |
| $2.26 × total miles, 17.5% deadhead | **$2.74** |

Any lane between **$1.85 and $2.74/loaded mile shows green and is actually red.** That band is where a large share of real PNW dry-van freight sits. In the seeded data no lane flips sign — the worst lane is Spokane→Billings at $2.98 RPM — because seeded rates are ~1.8× market. **The sign-flip test is inconclusive on seed data and will not be conclusive until real rates load.** Ranking does move: at $2.26 on total miles, Kent→LA drops #2→#3, Seattle→Phoenix drops #6→#9, Portland→Denver falls out of the top ten (#9→#11).

**(b) The bigger defect: lanes are ranked by TOTAL margin, so long lanes always win.** `lanes.ts:109` (`ORDER BY margin_cents DESC`, inside `lanesOutOf` at lanes.ts:101) feeds the planner's backhaul suggestions at `planner.ts:162` — the recommendation a truck sitting empty in Denver actually sees. Ranking the same 21 seeded lanes by margin *per mile* instead nearly inverts the list (margin at the shipped $1.85 default, on loaded miles, matching `lanes.ts:47`):

| Lane | Loaded mi | Margin/loaded mi | Rank by total margin | Rank by margin/mile |
|---|---|---|---|---|
| Kent→Portland | 175 | **$4.35** | 20 of 21 | **1 of 21** |
| Spokane→Missoula | 200 | $4.25 | 19 | **2** |
| Seattle→Spokane | 280 | $3.11 | 18 | **3** |
| Seattle→Phoenix | 1,420 | **$1.51** | **6** | 20 |
| Portland→Denver | 1,240 | $1.55 | **9** | 19 |
| Kent→Los Angeles | 2,055 | $1.90 | **2** | 16 |

Kent→Portland earns $4.35/mile of margin and is ranked next to last. Seattle→Phoenix earns $1.51/mile — 2.9× worse — and is ranked sixth. **The 41¢/mi cost error is worth fixing; ranking by total margin instead of margin per mile (or per day) is worth more, and it is the same three-line change** — `hub.lanes` already stores `miles` alongside `margin_cents`, so no schema change is needed.

Caveat on how visible this is today: **`hub.lanes` is empty in this database (0 rows)**, so `lanesOutOf` currently returns nothing and the planner emits no backhaul hints at all until the `recompute-lanes` cron populates it. The ranking defect is real in code; it is not exercised by the seed.

---

## 4. Finding 3 — DSO is measured on the wrong clock, and the biggest AR number is not late payment at all

### What the app measures

`src/lib/hub/vetting.ts:156-160`:

```sql
SELECT EXTRACT(DAY FROM p.paid_on::timestamp - i.issued_on::timestamp) AS days
FROM hub.payments p JOIN hub.invoices i ON i.id = p.invoice_id ...
```

`src/lib/hub/customers.ts:15` does the same thing a second way (`AVG(p.paid_on - i.issued_on)`) and renders it on the customers list as "pays in Nd" (customers/page.tsx:58). Both start the clock at **invoice issue**. The cash clock starts at **delivery**. The stretch between them — POD in hand, invoice not sent — is the only part of the cycle Ranvir fully controls, and it is the part neither query can see.

### Can the app measure it? No.

`\d hub.loads` has **no** `delivered_at`, `pod_at`, or `pod_received_at` column. The three candidate clocks:

| Clock | Where | Seed value on THD-1016 | Usable? |
|---|---|---|---|
| Delivery stop departure | `hub.stops.departed_at` where `type='delivery'` | 2026-07-07 | Yes, but nothing joins it to `invoices.issued_on` |
| Status-change event | `hub.load_events` where `payload->>'to' = 'pod_received'` | 2026-07-04 | Populated, but **3 days *before* the delivery departure** — the seed stamps all 9 status transitions an hour apart on booking day |
| `loads.updated_at` | used as the POD proxy by today.ts:156 and tasks.ts:292 | 2026-07-25 | **Broken.** See below. |

`grep -rn "issued_on" src/ \| grep -v __tests__` returns 23 hits. Not one joins an invoice to a delivery or POD timestamp. **The POD → invoice lag is not computed anywhere in the codebase.**

On the 4 seeded invoices the two clocks give **1 day** (stop-based) and **4 days** (event-based) for the same loads. A metric where two in-database clocks disagree by 4× is not a metric.

### The `updated_at` proxy is actively wrong, and I can show it

Both age unbilled PODs off `l.updated_at`, by two different expressions:

```sql
-- src/lib/hub/today.ts:156
GREATEST(0, EXTRACT(DAY FROM NOW() - l.updated_at))::int AS delivered_days_ago
-- src/lib/hub/tasks.ts:292
AND l.updated_at < NOW() - INTERVAL '3 days'
```

Run against the four Thind loads sitting at `pod_received` with no invoice (calendar-date diff on the right column):

```
 reference | delivered_days_ago (app) | days since delivery (stops.departed_at)
 THD-1009  |                        0 |                                       2
 THD-1010  |                        0 |                                       4
 THD-1011  |                        0 |                                       3
 THD-1012  |                        0 |                                       4
```

All four report zero. `updated_at` bumps on **any** write — adding a note, uploading a document, correcting a rate. So the tasks.ts:292 alert ("POD but no invoice, 3+ days") can be silently defeated by touching the load. A load can sit unbilled for 30 days and never fire the nudge as long as somebody edits it weekly. That is a real production bug, not a seed artifact.

### The number that dwarfs DSO

```
psql "$PGURL" -c "select l.status, count(*), sum(l.linehaul_cents+l.fuel_surcharge_cents)
  from hub.loads l left join hub.invoices i on i.load_id=l.id
  where i.id is null and l.status in ('delivered','pod_received','paid','settled')
    and l.carrier_id='11111111-1111-1111-1111-111111111111' group by 1;"
 delivered    |  1 |   $2,440.00
 pod_received |  4 |  $10,490.00
 settled      | 10 |  $27,555.00
```

**15 Thind loads past delivery, $40,485.00, no invoice ever created.** (Without the `carrier_id` filter it is 16 / $42,125 — the extra load belongs to Cascade Demo Lines, a different tenant, and is not Thind's cash.) Ten of the 15 are `settled` — the driver was paid and the customer was never billed. That is not a seed accident; `src/lib/hub/settlements.ts:113` explicitly allows it:

```sql
AND status IN ('delivered','pod_received','invoiced','paid')
```

A load can reach `settled` with no row in `hub.invoices`. There is no guard. Against $12,480 actually invoiced, the uninvoiced pile is **3.2×** the entire invoiced book. Slow payment is a rate problem; this is a principal problem.

### What a day of cycle time is worth

Assumptions, stated on the line:
- **12 trucks**, **1,900 loaded miles/truck/week**, **$2.20/loaded mile** (PNW dry-van blend). MISSING: all three. → $50,160/week → **$7,166 per calendar day of revenue**.
- **Factoring at 3.0% of face for a 30-day advance ≈ 36.5% APR.** Typical small-carrier non-recourse rate. MISSING: Ranvir's actual agreement. The factor in `hub.carrier_settings` — "Summit Capital Factoring", `funding@summitcapital.demo` — is fabricated seed data.
- **Alternative: bank LOC at 11% APR.**

| Cycle-time change | Working capital freed | Value @ 36.5% (factoring) | Value @ 11% (LOC) |
|---|---|---|---|
| 1 day | $7,166 | **$2,615/yr** | $788/yr |
| 4 days (POD→invoice 5d → 1d) | $28,664 | **$10,462/yr** | $3,153/yr |

Seeded average invoice is $3,120 (n=4), average load revenue $2,807.80 (n=25) — both consistent with the per-day figure above.

**Haircut, and it is a big one.** Both columns above assume Ranvir carries every invoice himself. He does not. A factoring fee is a **flat percentage of face, not a per-diem**, so on a factored invoice the cash arrives in ~1 day and cutting cycle time saves **$0** (`docs/ops/RUN_COST.md:161` makes the same point). Seeded factored share: **1 of 4 invoices ($3,440 of $12,480 = 27.6%)**, **3 of 26 Thind loads ($8,570 of $72,795 = 11.8%)** — `select factored, count(*), sum(amount_cents) from hub.invoices group by 1`. Multiply the table by the *self-carried* share only. At the seed's 27.6% factored, the 4-day row falls from $10,462 to ~$7,575. **MISSING: the real factored share of Thind's invoices — from the factor's monthly statement.** If Ranvir factors most of his book, this entire lever is worth close to zero.

**Verdict on DSO: real but an order of magnitude smaller than deadhead, and smaller still after the factoring haircut.** A four-day improvement is worth roughly $2k–$10k/yr depending on factored share. The one-time $40,485 collection is worth more than several years of DSO improvement, and it takes an afternoon.

---

## 5. Does the evidence support the deadhead + DSO prior?

**Partially. The ranking is right; the diagnosis is wrong; and it misses the most urgent item.**

**Where the prior holds.** Deadhead is where the dollars are. 3–5 points of real reduction is **$43,200–$72,000/yr** at 12 trucks. Nothing else in this document is that size. Ranvir's instinct is correct.

**Where the prior is wrong.** These are not numbers that are *bad*. They are numbers that are *absent*, which changes what gets built first.

- Deadhead % is a manual numeric field (LoadForm.tsx:366-370) that nothing derives and nothing cross-checks. In this database it is `Math.round(miles * 0.08)` (seed-demo.mjs:340), σ = 0.04 points. A dashboard tile that says "reduce deadhead from 7.4%" is instructing the owner to optimize a constant.
- POD → invoice lag is not computed anywhere. `\d hub.loads` has no delivery timestamp; the two reconstructible clocks disagree by 4×; the one alert that exists is anchored to `updated_at` and reads 0 days on loads delivered 4 days ago.

The difference matters because "reduce deadhead 3 points" and "measure deadhead at all" are different projects with different first steps. Building a deadhead-reduction feature on top of a typed field produces a chart that moves when a dispatcher's typing habits change. **Build the instrument first, then the lever.** Both instruments already exist in the codebase and only need to be joined:

- Deadhead: `hub.fuel_transactions.gallons × settings.fsc.mpg`, or the GPS miles that `ifta.ts:86-93` already computes per truck per quarter into `hub.jurisdiction_miles`, **minus** `sum(loaded_miles)`. Show measured-vs-typed side by side and flag loads where they diverge.
- DSO: add `pod_received_at` / `delivered_at` as real columns on `hub.loads`, stamp them on the status transition, and re-anchor tasks.ts:292 and today.ts:156 to them instead of `updated_at`.

**Where the prior is incomplete, and this is the urgent one.** Neither deadhead nor DSO is the highest-severity item. That is the **76.6% net margin on `/hub/reports`** (reports/page.tsx:172), rendered green, computed from a cost base that excludes 50.4% of revenue in driver pay — a figure derived from Ranvir's own `hub.pay_rules`. A 50-point margin overstatement on a screen used to decide whether a rate is worth taking causes underpricing on every load, every day, starting now. It is a header comment away from being correct and takes about two hours. (The owner dashboard does not render this KPI — it shows CPM, RPM and loaded/deadhead only.)

### Ranked by dollars per hour of owner time

| # | Action | Owner hours | Annual value | $/hr | Why this rank |
|---|---|---|---|---|---|
| 1 | Stop rendering `marginPct` / `operatingRatioPct` from the partial base. Either add settlement liability to the cost base or relabel both as "before driver pay" and grey them. kpi.ts:61-62, reports/page.tsx:162+172 | 2 | Prevents systematic underpricing — at 12 trucks × $5k/wk (assumed; MISSING: real weekly gross), 50 points is $30,240/wk of phantom net | very high | Wrong number on the pricing screen. Cheapest fix in the file. |
| 2 | Invoice the 15 delivered-but-unbilled Thind loads; add a guard so `runSettlements` (settlements.ts:113) refuses a load with no invoice | 3 + ongoing | **$40,485 one-time** (seed figure; MISSING: real count) + stops recurrence | very high | Principal, not a rate. Cash this week. |
| 3 | Build the deadhead instrument: fuel-gallons × MPG (and ping-derived miles via `jurisdictionMilesFromPings`) minus loaded miles, per truck per week, shown next to the typed number | 8–12 | Unlocks $43,200–$72,000/yr | high | Highest ceiling in the document, but strictly gated on this step. Two independent instruments already agree with each other and disagree with the typed number by ~30%. |
| 4 | Rank lanes by margin **per mile**, not total margin (lanes.ts:109, feeds planner.ts:162); raise `costPerMileCents` off the 185 default and include deadhead miles in the lane cost | 4 | Reorders every backhaul suggestion the planner makes | high | Kent→Portland at $4.35/mi of margin currently ranks 20 of 21; Seattle→Phoenix at $1.51/mi ranks 6. |
| 5 | Add `delivered_at` / `pod_received_at` columns; re-anchor tasks.ts:292 and today.ts:156 off `updated_at`; report POD→invoice lag | 6 | $2,000–$10,500/yr depending on factored share, plus the alert stops being defeatable by an edit | medium | Real, and 10× smaller than deadhead. Shrinks further the more he factors. |
| 6 | Fix the `deadhead_miles IS NULL` → 0 coercion (owner/page.tsx:138) so blanks don't read as perfect loads | 0.5 | Small | low | Do it while in the file for #3. |
| 7 | Move `companyDriverPerMile` from float dollars to integer cents (settings.ts:20) | 2 | **~$0** — the boundary `Math.round(payRate * 100)` at pay-rules.ts:328 already contains it | ~0 | **Cut this.** Correct in principle, worth nothing in practice. |

**Production risk, unrelated to unit economics but worth one line:** `npm run build` has a hard runtime dependency on `fonts.googleapis.com` being reachable via `next/font`. If Google Fonts is unreachable during a Vercel build, the deploy fails. Not a code defect; a single-point-of-failure in the release path.

---

## 6. MISSING: what to export to replace every number above

Nothing in §1–§5 is decision-grade until these land. Ordered by how much of the document each one unblocks.

| # | Export | Source system | Format | Replaces |
|---|---|---|---|---|
| 1 | **ELD total miles per truck per week**, 12 months, split loaded vs. empty if the provider offers it | Motive / Samsara / TruckX — whichever ELD Thind and ATS run. A real TruckerCloud HTTP client exists (`src/lib/hub/telematics.ts:127-165`, not a mock) but `hub.api_credentials` is **empty (0 rows)** and `hub.integration_syncs` has 0 rows — nothing has ever synced (`npm run connections:check`). Its field mapping is also unverified: telematics.ts:98-99 says the names are "docs/integrations/truckercloud.md's best guess" | CSV: `truck_unit, week_start, total_miles, loaded_miles` | The entire deadhead finding. Without this, deadhead % stays a typed number. **Highest value.** |
| 2 | **Settlement register**, 12 months, every driver | Whatever pays drivers today — QuickBooks, a spreadsheet, or handwritten. `hub.settlements` has 2 seeded rows | CSV: `driver, period_start, period_end, gross_cents, deductions_cents, net_cents, load_refs` | The 50.4% driver-pay ratio and the whole margin finding |
| 3 | **Invoice register**, 12 months | QuickBooks Online — the `qbo` connector is a **stub** (registry.ts, `creds:0`, never synced). Export manually until it is live | CSV: `invoice_no, load_ref, customer, amount, issued_on, due_on, status` | Real DSO denominator, real AR, the uninvoiced-loads count |
| 4 | **Payment register / AR aging**, 12 months | QBO, or the bank/factoring remittance advices | CSV: `invoice_no, paid_on, amount, method` | DSO numerator. Pairs with #3. |
| 5 | **POD timestamps** — when each POD was actually received | Driver app, email, or the office scan folder. If nothing timestamps this today, say so and the answer becomes "instrument it," not "export it" | CSV: `load_ref, delivered_at, pod_received_at` | The POD→invoice lag, which is the controllable half of DSO |
| 6 | **Rate confirmations or the factoring funding report**, 12 months | Brokers, or the factor's portal | CSV: `load_ref, origin, dest, loaded_miles, linehaul, fsc, accessorials` | Real RPM. The seeded $4.12 is ~1.8× market and distorts every ratio in §1. |
| 7 | **Fuel card export**, 12 months | EFS / WEX / Comdata — all three adapters are `live` in the registry but **`creds:0`, never synced**. `live` means the adapter is wired, not that credentials exist (verify in src/lib/hub/integrations/registry.ts) | CSV: `truck_unit, date, gallons, total, state` | Real CPM, and the fuel-based deadhead cross-check in §2 |
| 8 | **Fixed cost schedule**, monthly | Truck notes, insurance declarations, permits, plates, office/parking | One-page list: `item, monthly_cost, trucks_covered` | Turns "operating cost/mile" into all-in cost/mile. Without it, CPM $0.89 vs. ATRI $2.26 stays unexplained. |
| 9 | **Factoring agreement + the factored share of the book** — rate, advance %, recourse terms, and what fraction of invoices actually go to the factor | Ranvir's actual factor. `hub.carrier_settings` names "Summit Capital Factoring" at `funding@summitcapital.demo` — fabricated | Two lines: `rate_pct_of_face, days, advance_pct` and `factored_invoices / total_invoices` | Replaces the assumed 3%/30-day = 36.5% APR in §4, **and decides whether the whole DSO lever is worth thousands or ~$0** |
| 10 | **Power unit count and annual miles per truck** | MCS-150 filing; IFTA quarterly returns for miles | Two numbers | Replaces the assumed 12 trucks × 100,000 mi/yr in §2, which scales every deadhead dollar figure |
| 11 | **ATS Transport LLC tenant data** — all of #1–#10 again | ATS. Tenant 2 in this database is "Cascade Demo Lines" (DOT 3411908), **not ATS** | same | ATS is entirely absent. Every "12 trucks" figure above is an assumption about a fleet the database has never seen. |

Also unavailable this session, stated plainly rather than guessed at: **no GitHub API or write access** (token rejected 403, `gh` unauthenticated). Every branch is readable locally via git, but PRs cannot be listed by number, commented on, merged, or pushed. No PR number appears in this document because none could be verified.

---

```
FILES:    docs/ops/UNIT_ECONOMICS.md (created, then adversarially verified — see §Verification)
PR:       none (no GitHub write access this session)
IMPACT:   $43k-$72k/yr recoverable from deadhead once it is measured; a 50.4-point
          margin overstatement on the /hub/reports pricing screen fixable in ~2 hours;
          $40,485 of delivered-but-never-invoiced Thind loads collectable this week
          (seed figure)
NEXT:     Relabel or repair marginPct/operatingRatioPct in src/lib/hub/kpi.ts:61-62 so
          src/app/hub/(office)/reports/page.tsx:162,172 stops rendering 23.4% OR and
          76.6% net margin from a cost base that excludes driver pay
BLOCKED:  Export #1 (ELD total miles per truck per week, 12 months) and export #2
          (settlement register, 12 months) from Ranvir. Everything else in this
          document is arithmetic on seed data until those two land.
```

---

## Verification

Second pass, 2026-07-25, adversarial. Every cited file opened at the cited line; every SQL block re-run against `$PGURL`; every dollar figure re-multiplied.

**Killed (claim deleted or scope-corrected, not softened)**

| Claim as written | What the code/DB actually says |
|---|---|
| "Net margin … rendered green at reports/page.tsx:172 **and owner/page.tsx:144**"; repeated 4× including in NEXT | `grep -n "marginPct\|operatingRatioPct" 'src/app/hub/(office)/reports/owner/page.tsx'` → **no hits**. The owner page calls `computeFleetKpis` at :144 but renders only `cpmCents`, `rpmCents`, `loadedPct`, `deadheadPct` (owner/page.tsx:148-181). One page renders the bad KPI, not two. |
| "**16** loads past delivery, **$42,125.00**" (baseline table, Finding 3, action #2, IMPACT) | The query omitted `carrier_id`. Thind alone: **15 loads, $40,485.00**. The 16th belongs to Cascade Demo Lines. Cross-tenant contamination in the headline cash number. |
| "Kent→Portland earns **$3.48**/mile of margin … Seattle→Phoenix earns **$0.85**/mile" | Recomputed on the `lanes.ts:47` formula at the shipped $1.85: **$4.35** and **$1.51**. The *ranks* (20-of-21 and 6-of-21) are correct. |
| "the report is showing **74.6% net on unit 104**. That is off by ~65 points" | 74.6% is unit 104's *driver-pay share*, not its displayed net. Displayed net on unit 104 is **82.9%**; true net is **8.4%**; the overstatement is **74.5 points**. Rewritten as a worked example. |
| "5 company drivers … 5 owner-operators" | `select name from hub.pay_rules` → **6** company per-mile, **4** owner-operator percentage. (The $35,363.26 / 50.4% total re-derived exactly, so only the composition was wrong.) |
| "the seed settled **3** of 25 loads" (twice) | `select count(*) from hub.loads where settlement_id is not null` → **2**. Ten more sit at `status='settled'` with no settlement row at all — which is itself the Finding-3 defect. |
| "`hub.integrations` has a truckercloud adapter" | **`hub.integrations` does not exist.** The real tables are `hub.api_credentials` (0 rows) and `hub.integration_syncs` (0 rows). Replaced with the actual client path, `src/lib/hub/telematics.ts:127-165`. |
| DSO value table presented at full face | A factoring fee is a flat % of face, not a per-diem, so cycle-time savings are **$0** on the factored share. Seed: 1 of 4 invoices / 27.6% of invoiced dollars factored. Added the haircut and the MISSING that decides it (`RUN_COST.md:161` reached the same conclusion independently — this doc had missed it). |

**Corrected line numbers** (each re-checked by opening the file): reports.ts:242→241 and 242-262→241-263; reports.ts:245→244; reports/page.tsx:164→163 (the "cost ÷ revenue" caption); owner/page.tsx:139→138 (×3); today.ts:159→156 (×3); tasks.ts:291→292 (×3, and the two files use *different* SQL predicates — the shared code block was misattributed); LoadForm.tsx:360→359-363. Grep counts: "deadhead" non-test 40→**49**; "issued_on" non-test 18→**23**.

**Also corrected:** break-even at 7.4% deadhead $2.43→**$2.44** (18,383/17,022 × $2.26); "3.4×"→**3.2×** the invoiced book.

**Added (new, independently measured)**

- **A third mileage instrument.** 543 GPS pings across all 10 Thind trucks; haversine between consecutive fixes = **24,413 mi**, against fuel-implied 23,166 and typed 18,383. The two instruments nobody types agree within 5% and both sit ~30% above the typed number. This materially strengthens Finding 1 — it was previously resting on one cross-check the doc itself called a seed artifact. Caveat stated: 1 fix per truck per 1.6 days is too sparse for production mileage.
- **`hub.lanes` is empty (0 rows)**, so `lanesOutOf` returns nothing and the planner emits no backhaul hints until `recompute-lanes` runs. The ranking defect is real in code but unexercised by the seed. Also noted that `hub.lanes.miles` already exists, so the per-mile fix needs no migration.
- **`settlementLiability` (reports.ts:122) reads $0** here because it filters `status IN ('draft','approved')` (reports.ts:127) and both seeded settlements are `paid`. The owner dashboard *does* surface driver pay via `SettlementLiabilityPanel` — it just never nets it into a margin.
- **`hub.ifta_reports` is empty (0 rows)** — the IFTA mileage path is code-verified, not data-verified.
- Scope reconciliation against the sibling docs' 18,932 / 1,446 / 7.1% / 29 loads (both carriers, untrucked loads included). Different denominator, not a contradiction.

**Survived unchanged** — re-derived and matched to the digit: 25 loads / $70,195.00 / 17,022 loaded / 1,361 deadhead; CPM $0.89 from 1,573,521 + 62,500 + 3,500 over 18,383 (the $3,500 "other" is correct — the $15,000 lumper row has `truck_id IS NULL` and is excluded by `truckPnlRange`'s per-truck join); RPM $4.12; OR 23.4%; margin 76.6%; driver pay **$35,363.26 = 50.4%** evaluated against the real `hub.pay_rules` JSON; 27/27 loads at exactly `round(loaded_miles*0.08)`, σ = **0.0442**; `seed-demo.mjs:340`; fuel $4.075/gal, 3,861 gal, 8 trucks, implied-empty **36.1%**, per-truck spread **−1.9% (unit 203) to 69.0% (unit 105)**; POD→invoice lag **1 day (stops) vs 4 days (events)** on all 4 invoiced loads; DSO 15 days n=1; all 21 lane ranks and the $2.26-on-total-miles reshuffle (Kent→LA 2→3, Seattle→Phoenix 6→9, Portland→Denver 9→11); `settlements.ts:113`; `lanes.ts:47/73/101/109`; `planner.ts:162`; `kpi.ts:6/59/60/61/62/63`; `settings.ts:20/22` and `costPerMileCents = 185` in `hub.carrier_settings`; `pay-rules.ts:328`; `schemas.ts:131` → `_actions/loads.ts:62` → `loads.ts:244` → `reports.ts:257`; `vetting.ts:158`; `customers.ts:15` and `customers/page.tsx:58`; `geo.ts:58`; `ifta-core.ts:45`; `routing-core.ts` at 30 lines; registry.ts:18-19 `live` = "activatable with credentials", qbo/factor `stub`; `hub.loads` has no `delivered_at`/`pod_at`/`pod_received_at`. All §2/§3/§4 arithmetic re-multiplied and correct.

**Failure modes checked and not found:** no integration is claimed live that routes to `integrations/mock.ts` (`mockSource` has no production callers); no PR numbers are invented — §6 correctly states there is no GitHub API access this session; the sandbox Google-Fonts build failure is correctly labeled an environment/release-path risk, not a code defect (§5); no dollar figure here is also claimed by `RUN_COST.md` §E or `RELEASE_READINESS.md` §6 (both deliberately leave the invoicing lever unsized, so there is no double-count — only the DSO haircut needed importing).

**Confidence: high on every code and SQL claim; low on every dollar figure**, all of which rest on the stated 12-truck / 100,000-mi / $2.20-per-mile / 3%-factoring assumptions and on seed data that is ~1.8× market. The ranking of the levers survives; the absolute dollars do not.
