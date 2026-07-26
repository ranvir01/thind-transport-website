# TEST_GAPS.md

Where LoadOff's 1,592 green tests are not looking, ranked by dollars at risk per hour of work.

> **Status update, 2026-07-26 (verify-and-build cycle, main@e6be22e5):** re-opened every citation below
> against the current tree instead of trusting prior "#2/#3 remain open" backlog notes, which had gone
> stale. **Resolved, with evidence:**
> - **#1** `draftSettlements` settlement_id stamp — `draft-settlements-loads.test.ts` exists and passes.
> - **#2** `runOverdueReminders` day-gate ladder — `overdue-reminder-ladder.test.ts` (landed in
>   `5c158d72`) exercises the exact rung-skip/double-send/22-day-drift cases this row describes.
> - **#3** `money.ts` `requirePermission` wiring — `money-actions-permissions.test.ts` (landed in
>   `53f2ca8a`) table-drives all 14 actions incl. the approve-vs-write tier split; `_actions/money.ts`
>   measured at 100% function coverage this cycle (`npx vitest run --coverage`, v8 provider).
> - **#4** 1099 export using the current year — `resolve1099Year` (`expenses.ts:125`) replaced the raw
>   `new Date().getFullYear()`, covered by `export-1099-year.test.ts` (landed alongside #2 in `5c158d72`).
> - **#5** `pay-rules-db.ts` untested — `pay-rules-db.test.ts` added this cycle; module now at 100%
>   stmt/branch/func coverage (was 7.7/0/0). Both the custom-beats-auto `if (custom) return` guard and
>   the `ORDER BY (name = ANY($3)) ASC` tie-break are pinned.
> - **#6** advance-apply double-deduct guard — pinned in `483a920d` (`TEST_GAPS.md #6`).
> - **#7** `arAgingTrend` payments sub-select missing `carrier_id` — fixed and tested in `ae82c650`
>   (`reports-ar-aging-tenancy.test.ts`); the live code at `reports.ts:76` already carries the filter.
>
> **Correction (verify-and-build, same cycle):** the above's #15 claim was stale at the moment it was
> written — `csv.ts:10-13` already holds one shared `csvEscape` guarding a leading `=`/`+`/`-`/`@` across
> all three former call sites (`loadboard-export.ts`, `reports.ts`, `expenses.ts`), landed via `a0406ae2`
> before this branch forked. #9 (`loads.ts` createLoad/updateLoad tenancy) and #10 (`fuel.ts`
> assignFuelToLoad/fuelFraudFlags) are also now resolved: `loads-create-update-tenancy.test.ts`
> (`2ce5bddd`) and `fuel-fraud-flags.test.ts` (`5af27d28`).
>
> **Still open:** #8 (`getAgingSummary` — three independent unmerged fixes exist on session branches;
> none merged yet), #11 (detention downward-revision — owner decision), #12 (scorecard tier table —
> owner decision), #13 (`sendFactoringPacket`).
>
> **Verify-and-build, 2026-07-26 (later cycle):** #14 (`parseRuleSet` branch coverage) is now **CLOSED**
> — see §2 row 14. The prior note here ("a test block exists but wasn't checked against all four cases")
> was correct: the one existing test only covered the non-array `rules` case, not per-rule validation.
> `parseRuleSet` now filters out-of-range/wrong-typed rules and deductions before they reach
> `evaluatePayRules`, with a test for each of the four cases this row originally specified.

Generated 2026-07-25 against main@c52ec254.
**Measured live in this session:** `npx vitest run --coverage` (v8 provider, 3 passes: `src/lib/hub/**`,
`src/app/**`, JSON detail) — 189 files / 1,592 tests, all pass, ~50s per pass; `npx tsc --noEmit`;
`psql` against the seeded `hub` schema; `git`/`ls` file inventory; `.github/workflows/` and `vercel.json` read.
**Inference / list price (flagged inline):** IRS §6721 penalty tiers, cost-of-capital %, per-incident
frequency. **Not available:** GitHub API (token 403, no `gh` auth) — no PR numbers are cited anywhere
in this file because none can be read.

> Coverage note: `@vitest/coverage-v8` is not in `package.json`. Installed 4.1.8 (version-matched to
> `vitest@4.1.8`) into `/tmp` and copied into `node_modules/` so `package.json`/lockfile stayed untouched.
> Numbers below are real v8 coverage, not file-name mapping.

---

## 0. Headline

| Surface | Statements | Branches | Functions | Evidence |
|---|---|---|---|---|
| `src/lib/hub/**` (the engine) | **72.89%** (3526/4837) | 64.93% | 71.28% | v8 coverage, this session |
| `src/app/**` (actions + routes) | **20.41%** (975/4775) | 15.50% | **9.90%** (87/878) | v8 coverage, this session |

The engine is reasonably tested. **The layer that calls the engine is not.** 9.9% function coverage on
`src/app/**` is the single biggest number in this document: the permission gate, the input parsing, and the
revalidation on every money mutation live there.

Live fleet the risk is measured against (`psql`, 2026-07-25):

| Fact | Value | Query |
|---|---|---|
| Active drivers (Thind Transport) | 10 (6 per-mile @ $0.63/mi, 4 percentage @ 90%). Fleet-wide 11 — Cascade Demo Lines has 1 per-mile @ $0.60 | `select carrier_id,pay_type,count(*),avg(pay_rate) from hub.drivers where deleted_at is null group by 1,2` |
| Trucks | 12 fleet-wide (10 Thind / 2 Cascade) | `select carrier_id,count(*) from hub.trucks group by 1` |
| Loads | 29 (27 Thind / 2 tenant-2) | `select carrier_id,count(*) from hub.loads group by 1` |
| Linehaul per load | avg **$2,446.90**, median $2,400, max $4,300, total $70,960 | `select avg/max/percentile_cont(0.5) ... from hub.loads` |
| Settlements | 2 rows, avg gross $1,242.63, avg net **$1,180.13**. **n=2 — every "$11,801/week" below extrapolates this to 10 drivers; treat it as an order of magnitude, not a payroll number** | `select count(*),avg(gross_cents)/100,avg(net_cents)/100 from hub.settlements` |
| Open AR | **$8,920** across 3 invoices, zero partial payments; 1 overdue at **22 days past due, $2,930** | `select i.number,i.status,i.amount_cents,coalesce(sum(p.amount_cents),0) from hub.invoices i left join hub.payments p on p.invoice_id=i.id group by 1,2,3` |
| Advance cap | $1,500/driver | `src/lib/hub/advances-core.ts:32` (`MAX_DRIVER_ADVANCE_EXPOSURE_CENTS = 150000`) |
| Deadhead share | **7.10%** (1,446 dh / 20,378 total). 7.40% if the 2 NULL-deadhead loads are dropped instead of floored | `select sum(coalesce(deadhead_miles,0))::numeric/sum(coalesce(deadhead_miles,0)+coalesce(loaded_miles,0))*100 from hub.loads` |
| Detention rate | **$60/hr**, 2 free hours (Thind); $50/hr (Cascade) | `select settings->'detention' from hub.carrier_settings`; `_actions/onboarding.ts:27` `DEFAULT_DETENTION_CENTS_PER_HOUR = 6000` |

Two corrections to the working assumptions, both from the DB:

- **Tenant 2 is "Cascade Demo Lines", not ATS Transport LLC.** `select name from hub.carriers` returns
  `Thind Transport` and `Cascade Demo Lines`. ATS is not in the seed. MISSING: whether ATS exists in the
  production database — collect with `select id,name,dot_number from hub.carriers` against the Neon/Vercel
  Postgres, not this sandbox.
- **Deadhead is already 7.10%** in the seeded data, well under the 10–20% a small dry-van carrier typically
  runs. If production looks like this, deadhead % is *not* the big lever; DSO is. See §6.

---

## 1. Coverage by module — the money-critical set

Every row measured this session. "Test files" = count of `*.test.ts` importing that module.

| Module | Stmt % | Branch % | Func % | Test files | The hole |
|---|---:|---:|---:|---:|---|
| `rounding.ts` | 100 | 100 | 100 | 2 | none — 6 lines, fully pinned |
| `tenancy.ts` | 100 | 100 | 100 | 10 | none |
| `advances-core.ts` | 100 | 83.3 | 100 | 2 | `advanceBalances` null-name / non-numeric branches (`:49,:54`) |
| `fuel-core.ts` | 100 | 88.9 | 100 | 1 | `:36,:70` branches |
| `detention.ts` | 100 | 89.3 | 100 | 4 | `:127,:133,:135` — non-array accessorials, zero-dwell |
| `permissions.ts` | 100 | 50 | 100 | 2 | `:51` — the `?? false` unknown-role fallback |
| `ifta-core.ts` | 98.4 | 92.9 | 100 | 6 | `:180` bad-quarter-key throw |
| `money.ts` | 95.8 | 83.3 | 100 | 4 | `:58` `mpg <= 0` guard in `fscCentsPerMile` |
| `ifta.ts` | 95.3 | 80.9 | 69.2 | 11 | best-covered money module in the repo |
| `expenses.ts` | 88.8 | 60.4 | 76.2 | 6 | `exportCsv` cases `lanes`/`settlements`/**`1099`**/`pnl` all 0% |
| **`pay-rules.ts`** | **72.5** | **67.0** | 85.7 | 1 | `describePayRules@338` 0%; `parseRuleSet@424` branches `:429,:430` 0% |
| **`reports.ts`** | **56.6** | 57.1 | 45.5 | 3 | `fuelSpendSummary@375`, `exportFuelSpendCsv@421` still 0% (`arAgingTrend@53`, `settlementLiability@122` now covered) |
| **`invoices.ts`** | **54.0** | 44.4 | 59.3 | 11 | `getAgingSummary@287`, `runOverdueReminders@310`, `setInvoiceStatus@263`, `sendFactoringPacket@488` all 0% |
| **`settlements.ts`** | **51.1** | **29.3** | 51.9 | 7 | **`draftSettlements@89` 0% (lines 102–235)**, `payableReferralBonuses@48` 0%, `latestScorecardScore@71` 0% |
| **`loads.ts`** | **35.2** | **14.4** | 41.7 | 14 | `createLoad@212`, `updateLoad@266`, `replaceStops@363`, `insertStops@165` all 0% |
| **`fuel.ts`** | **12.1** | 22.2 | 9.1 | 2 | 10 of 11 exported functions 0%, incl. `assignFuelToLoad@96`, `fuelFraudFlags@196` |
| **`pay-rules-db.ts`** | **7.7** | **0** | **0** | 0 | **both functions 0%; no test file imports this module at all** |

Non-money modules at 0% statements: `announcements.ts`, `migrate.ts`, `users.ts`,
`doc-intake/analyze-enhanced.ts`, `doc-intake/extract-text-client.ts`, `outreach/prospects.ts`.
Highest-value non-money gaps: `planner.ts` 12.5%, `notify.ts` 13.6%, `vetting.ts` 12.1%, `loadboard.ts` 25.3%.

Bright spot: `src/lib/hub/integrations/**` is **99.8% statements (512/513) / 99.1% branches / 100% functions**.
All 12 files are at 100% statements except `webhooks.ts` (94.4%) — `dat.ts`, `qbo.ts`, `factor.ts`,
`registry.ts`, `mock.ts`, `event-processors.ts` included (the text reporter hides 100%-everything rows;
confirmed via `--coverage.reporter=json-summary`). Each adapter has its **own** test file
(`__tests__/{dat,qbo,factor,efs,wex,comdata,truckstop}.test.ts`); the shared
`integration-contract.test.ts` pins registry invariants and the **mock** reference adapter only
(`integration-contract.test.ts:11-34`), not the real clients. That per-adapter discipline is the model the
money modules should copy.

## 1b. Coverage by module — `src/app/**`, where the permission checks live

| File | Stmt % | Uncovered functions |
|---|---:|---|
| `src/app/hub/_actions/money.ts` | **15.2** | `createInvoiceAction@26`, `recordPaymentAction@44`, `disputeInvoiceAction@70`, `factoringPacketAction@87`, `submitInvoiceToFactorAction@103`, `sendCustomerStatementAction@157`, `draftSettlementsAction@177`, `approveSettlementAction@205`, `markSettlementPaidAction@222`, `createAdvanceAction@240`, `decideAdvanceAction@269`, `createExpenseAction@312` — **12 of 14** |
| `src/app/hub/_actions/people.ts` | 16.8 | `saveDriverAction@22` (writes `escrow_weekly_cents`, `insurance_weekly_cents`), `saveCustomerAction@91` (`credit_limit_cents`), + 6 more |
| `src/app/hub/_actions/loads.ts` | 22.3 | `createLoadAction@71`, `updateLoadAction@127`, `addDetentionAction@271`, `stopTimestampAction@230` |
| `src/app/api/hub/exports/[kind]/route.ts` | **0** | `GET@14` — every CSV/IIF the bookkeeper downloads |
| `src/app/api/hub/customer-statements/[customerId]/pdf/route.ts` | **0** | `GET@8` |
| `src/app/hub/_actions/messages.ts`, `packet.ts`, `planner.ts`, `tasks.ts`, `outreach.ts`, `fleet.ts` | 0 | all functions |

Both 0%-covered routes above read correctly (`user.carrierId` scoping at
`exports/[kind]/route.ts:41,58,68` and `customer-statements/.../route.ts:17`) and `exportCsv` is a
parameterized `switch` (`expenses.ts:112`) — no injection. The gap is that nothing *keeps* them that way.

---

## 2. Top 15 untested paths where a bug costs real money

Ranked by dollars-per-hour-of-owner-time. "$/incident" states its assumption on the same line.

| # | Path | What breaks | Who eats it | $ / incident (assumption) | Test to write | Min |
|---|---|---|---|---|---|---:|
| 1 | `src/lib/hub/settlements.ts:89` `draftSettlements` — **0% covered, lines 102–235** | The entire weekly payroll: load selection, rule-set choice, expense reimbursement, advance deduction, `settlement_id` stamping, `settled_line_id` stamping — one 134-line uncovered block | Drivers (underpaid) or Ranvir (double-paid) | **$11,801/week** = 10 active Thind drivers × $1,180.13 avg net — *assumption: the 2 seeded settlements are representative; n=2*. Same-period re-runs are already guarded (`settlements.ts:122` period-existence check), so the exposure is the **next** period: a missed `UPDATE hub.loads SET settlement_id` at `:218` leaves the loads eligible and re-pays them, **+$11,801** | Fake `pg` client; 1 driver, 1 load, 1 reimbursable expense, 1 outstanding advance. Assert: the `INSERT hub.settlements` params equal the evaluator's `gross/deductions/net`; `UPDATE hub.loads … settlement_id = $1 AND carrier_id = $3` fired with all load ids; `UPDATE hub.expenses SET settled_line_id` fired once per expense line | 45 |
| 2 | `src/lib/hub/invoices.ts:326` `if (![3, 10, 20].includes(daysPast)) continue` inside `runOverdueReminders@310` — **0% covered** | Dunning fires only on days 3, 10 and 20 *exactly*. Miss the cron once and that invoice is never chased again. **Live proof:** `THD-INV-1002`, $2,930, **22 days past due** as of today — already past every gate, will never be emailed | Ranvir (cash) | **$2,930** worst case (that invoice ages to write-off). Carrying cost of the whole $8,920 open AR at +15 days DSO ≈ **$44** at 12% APR — *assumption: 12% cost of capital; the real number is your factoring rate* | Pure-function extract of the schedule, then: an invoice at 4, 11, 21 and 22 days past due must still produce a reminder (`>= 3` with a `sent_log` dedupe, not `=== 3`). Assert `sent_log` is appended so the reminder is idempotent | 30 |
| 3 | `src/app/hub/_actions/money.ts` — 12 of 14 actions 0% covered; the `requirePermission` string at `:29,:50,:73,:90,:106,:180,:208,:225,:248,:275` is never asserted | `permissions.test.ts:30-36` locks the role matrix, but **nothing checks the wiring**. Change `:208` from `money:approve` to `money:read` and a dispatcher can approve settlements — every test still passes | Ranvir (fraud/error surface) | **$11,801** = one full weekly settlement run approvable by an unauthorised role. Assumption: one bad approve/week, and the n=2 avg-net extrapolation above | One table-driven test per action: mock `requirePermission` to throw, assert `{ok:false, error:"Forbidden"}` **and** that the underlying `settlements`/`invoices` function was never called. 14 rows, one helper | 40 |
| 4 | `src/lib/hub/expenses.ts:199` `const year = new Date().getFullYear()` in `exportCsv` case `"1099"` (`:198–220`, **0% covered**) | The 1099-NEC export always uses the **current** year. You file 1099-NEC by Jan 31 **for the prior year** — in Jan 2027 this button (`src/app/hub/(office)/money/page.tsx:89`) returns an empty CSV. There is no year parameter anywhere in the route (`exports/[kind]/route.ts:68`) | Ranvir + accountant | **$240–$1,360** in IRS §6721 late/incorrect-filing penalties for 4 owner-operators (*list price, 2025 §6721 schedule: $60 / $130 / $340 per form — verify the current-year tier*), plus a re-do of the filing by hand | Freeze the clock to 2027-01-15, call `exportCsv(carrier, "1099")`, assert the SQL param is `2026` and the filename is `1099-nec-2026.csv`. Add a `?year=` passthrough | 25 |
| 5 | ~~`src/lib/hub/pay-rules-db.ts:21` `syncDefaultPayRules` + `:63` `getActivePayRules` — **0% covered, zero test file imports this module**~~ **CLOSED**: `pay-rules-db.test.ts` (`47ab8b45`) pins the `if (custom) return` no-clobber guard and the `ORDER BY (name = ANY($3)) ASC` custom-beats-auto tie-break. No bug found; now regression-guarded. | The driver whose custom program vanishes | The driver whose custom program vanishes | Was **$236/week fleet-wide** exposure — now regression-guarded | — | 25 |
| 6 | ~~`src/lib/hub/settlements.ts:267-272` — the advance-apply `UPDATE` loop is **0% covered**~~ **CLOSED**: `settlements-tenancy.test.ts` and `approve-settlement-advance-idempotency.test.ts` pin the `carrier_id` + `status = 'outstanding'` guard and assert a second approval issues zero further writes. No bug found; now regression-guarded. | Drivers | Drivers | Was **$15,000** double-deduction exposure across 10 drivers — now regression-guarded | — | 20 |
| 7 | ~~`src/lib/hub/reports.ts:53` `arAgingTrend` and `:122` `settlementLiability` — both **0% covered**~~ **CLOSED 2026-07-26**: `arAgingTrend`'s `carrier_id`-scoping was pinned in `reports-ar-aging-tenancy.test.ts` (a prior cycle, `ae82c650`). `settlementLiability` is now covered by `src/lib/hub/__tests__/reports-settlement-liability.test.ts` — draft+approved sum, the no-settlements-yet zero case, and the `carrier_id`/`status IN ('draft','approved')` scoping in the query itself. No bug found in `settlementLiability`; code was already correct, now regression-guarded. | The two numbers the owner reads before deciding whether to make payroll | Ranvir (a wrong cash decision) | Was a **decision**-error risk on an $8,920 AR book and an $11,801 payroll liability — now regression-guarded | — | 20 |
| 8 | ~~`src/lib/hub/invoices.ts:287` `getAgingSummary` — **0% covered**~~ **CLOSED 2026-07-26**: `src/lib/hub/__tests__/aging-summary.test.ts` pins the `status NOT IN ('paid')` + `carrier_id` scoping in the query itself, and buckets/open_cents for unpaid, half-paid and over-paid invoices (over-payment goes negative, not floored — the discrepancy stays visible). No bug found; code was already correct, now regression-guarded. | Feeds both the AR page and `runOverdueReminders` (#2). `openCents = amount_cents - (paid_cents ?? 0)` at `:297`; `paid_cents` comes from the sub-select at `:14`. A partially-paid invoice mis-bucketing means you chase money you already have, or don't chase money you don't | Ranvir + the customer relationship | Silent: **$3,560** (`THD-INV-1004`, the one seeded fully-paid invoice) chased after payment, or a real balance never chased. Largest *open* invoice is $3,440 | Three invoices — unpaid, half-paid, over-paid — assert `buckets`, `open_cents` and that fully-paid rows are excluded by the `status NOT IN ('paid')` filter at `:289` | 20 |
| 9 | ~~`src/lib/hub/loads.ts:212` `createLoad` / `:266` `updateLoad` — **0% covered**~~ **CLOSED**: `loads-create-update-tenancy.test.ts` (`2ce5bddd`) asserts `createLoad` throws before any `INSERT` on a cross-carrier customer id, plus a happy path pinning integer cents. No bug found; now regression-guarded. | Ranvir (mis-billed load) or cross-tenant leak | Ranvir (mis-billed load) or cross-tenant leak | Was a **$66,067** blast-radius exposure — now regression-guarded | — | 30 |
| 10 | ~~`src/lib/hub/fuel.ts:96` `assignFuelToLoad` and `:196` `fuelFraudFlags` — **0% covered**~~ **CLOSED**: `fuel-fraud-flags.test.ts` (`5af27d28`) asserts the duplicate-swipe and over-tank-capacity flags fire, both queries carrier-scoped. No bug found; now regression-guarded. | Ranvir (card fraud goes unseen) | Ranvir (card fraud goes unseen) | Was a **$400–$600**-per-event exposure — now regression-guarded | — | 25 |
| 11 | `src/lib/hub/detention.ts:136` `if (total <= existingCents) return { changed: false }` — the "never shrinks" rule; branches `:127,:133,:135` uncovered | A typo'd `departed_at` (20h instead of 2h dwell) permanently inflates the Detention accessorial. There is **no downward path** — not by recompute, not by correcting the timestamp | The broker (chargeback), then Ranvir (relationship) | **$1,080** = 18 phantom hours × **$60/hr** — the real seeded rate (`_actions/onboarding.ts:27` `DEFAULT_DETENTION_CENTS_PER_HOUR = 6000`, applied at `:152`; `select settings->'detention' from hub.carrier_settings` returns `{"freeHours":2,"ratePerHourCents":6000}` for Thind) | Two stops, then correct the departure earlier → assert `changed:false` **and** add an explicit `recomputeDetention(force)` path with an audit entry. The test is the spec decision | 20 |
| 12 | `src/lib/hub/settlements.ts:71` `latestScorecardScore` → `src/lib/hub/recruiting.ts:395` `computeDriverScores` — **both 0% covered** | The `scorecard_bonus` chain: monthly cron (`vercel.json` `driver-scorecards`, `0 10 1 * *`) → `hub.driver_scores` → tier lookup at `pay-rules.ts:225-237` → a real settlement earning line. End-to-end untested | Drivers (bonus never paid, or wrong tier) | Bonus amount is per-tier and carrier-set. MISSING: no `scorecard_bonus` rule exists in the 11 seeded `hub.pay_rules` rows — collect the intended tier table from Ranvir before sizing | Unit-test the tier selection at `pay-rules.ts:226-228` (sort desc, first `>=`) with scores on and between tier boundaries; separately assert `latestScorecardScore` returns `null` when `to_regclass` is null (`:75`) | 25 |
| 13 | `src/lib/hub/invoices.ts:488` `sendFactoringPacket` — **0% covered** (lines 493–529) | The packet that gets an invoice *funded*. If it silently fails, the invoice sits unfunded and nobody finds out — the caller `factoringPacketAction@87` is also 0% covered | Ranvir (cash timing) | **$2,973** avg open invoice ($8,920 / 3) held ~7 extra days ≈ **$7** carrying cost *at 12% APR*, but the real cost is the cash-flow gap on a 10-truck fleet. Label: small in interest, large in timing | Assert the packet includes invoice PDF + POD + BOL, is sent to `settings.factoring.email`, and that a send failure surfaces as `{ok:false}` rather than a swallowed catch | 25 |
| 14 | ~~`src/lib/hub/pay-rules.ts:424` `parseRuleSet` — branches `:429,:430` uncovered; the doc-comment says "defensive parse" but the body was `row.rules as PayRule[]`~~ **CLOSED 2026-07-26**: `parseRuleSet` now validates every rule/deduction's shape and range (`isValidRule`/`isValidDeduction`, `pay-rules.ts:424-479`) and drops individually invalid entries instead of trusting the cast; `pay-rules.test.ts` (`describe("parseRuleSet — defensive JSONB parse")`) covers all four named cases — `basisPoints > 10000`, a negative rate, a string `basisPoints`, and an unknown `type` — plus a mixed valid+invalid rule set asserting `evaluatePayRules` never emits a line from the dropped rule. A merely-suspicious-but-in-range value like `basisPoints: 90` (a plausible 0.9% admin fee) is deliberately still accepted — it cannot be distinguished from an intentional low rate by shape alone, so no bug was fixed there, only the previously-uncaught out-of-range/wrong-type cases. | Drivers | Was **$2,138 per load** exposure ($2,400 median linehaul × (90% − 0.9%)) for the wrong-type/out-of-range cases — now regression-guarded | — | 30 |
| 15 | `src/lib/hub/expenses.ts:102` / `src/lib/hub/reports.ts:407` / `src/lib/hub/loadboard-export.ts:4` — three duplicate `csvEscape` implementations, none escape a leading `=`/`+`/`-`/`@` (`reports.ts:276` already carries a TODO comment saying so) | A customer name typed as `=HYPERLINK(...)` becomes a live formula when the bookkeeper opens `invoices.csv` in Excel | Whoever opens the CSV | **≈$0 direct.** Labeled small on purpose — this is a $200-class item, not a payroll-class one. Fix it in the same PR as #4, do not schedule it alone | One shared `csvEscape` in `csv.ts`, prefix `'` on the four dangerous leading chars, one parameterised test | 15 |

**Total: ~6.5 hours of test writing** covering roughly **$11,800/week of recurring payroll exposure**,
**$2,930 of currently-unchaseable AR**, and a **$66k** load-write blast radius.

---

## 3. The 32 type-unsound test files

`npx tsc --noEmit` emits 108 diagnostic lines across **32 files — every one of them a test file**. Zero
errors in application code.

The failure mode is concrete and it is not theoretical: **`vitest.config.ts:11` sets `include:
["src/**/*.test.ts"]` and vitest never typechecks.** `npm test` runs esbuild transpile-only. So a test can
build a mock whose shape does not match the function it is testing, and the test still goes green. When the
production signature changes, the test does not fail — it keeps asserting against the *old* shape.

Nothing in CI runs `tsc` either (§4), so these 108 errors have never blocked anything.

### Three worst offenders

1. **`src/lib/hub/__tests__/pdf-branding.test.ts:120,125,126`** — the IFTA return PDF.
   The test builds `rows` **without `taxCents` and `surchargeCents`**, but
   `src/lib/hub/pdf.ts:353-354` requires both, and `pdf.ts:388` does
   `fmtCentsExact(row.taxCents)` unguarded. `fmtCentsExact` (`types.ts:356`) coerces
   `undefined` to `$0.00`. So the test asserts that a branded IFTA return renders — while proving nothing
   about the two columns that carry the tax owed. A regression that drops tax cents from the worksheet
   would ship green and you would file a return showing $0.00 tax per jurisdiction.
2. **`src/lib/hub/__tests__/files-route-tenancy.test.ts:60,68,76,86,96,105`** — the cross-tenant file
   read guard. **Six** mocked sessions are missing the required `email` field of `HubSessionUser`
   (`session.ts:6-13`); a seventh error at `:114` is an unrelated `TS2322 Type 'null' is not assignable to
   type 'string'`. This is the test that proves carrier B cannot read carrier A's POD by URL, and its
   session object is not the session object the code receives. If `getHubUser` starts keying off a field
   the mock does not have, the test still passes.
3. **`src/lib/hub/__tests__/onboarding-workspace.test.ts:53,187,188,214,215,218`** — 8 errors: **4×
   `TS2493 Tuple type '[sql: string]' of length '1' has no element at index '1'`** (`:53,:187,:214,:218`)
   and **4× `TS2352` casts of `undefined`** (`:53,:188,:215,:218`). The test indexes `mock.calls[n][1]`
   for query **parameters** on a mock typed as taking only SQL. It is asserting on the carrier-settings
   INSERT that seeds `pay.companyDriverPerMile` and `pay.ownerOperatorPercentage`
   (`_actions/onboarding.ts:143-151`) — the initial pay configuration for a whole new tenant — through a
   parameter array TypeScript says is not there.

Runners-up by count: `prod-smoke-staleness.test.ts` (10), `sidecars.test.ts` (4), `credentials.test.ts` (4).

**Fix, 20 min:** add `"typecheck": "tsc --noEmit"` to `package.json` scripts and run it alongside
`npx vitest run` in the two drain workflows. Then fix the 32 files. Do the second half only after the
first — otherwise they drift again.

---

## 4. The 52 e2e smoke scripts are not in CI. Nothing is.

`ls scripts/e2e-*.mjs` → **52 files** (the brief said 49; 52 is the measured count). They need a running
Next server plus a live Postgres.

**None of them run anywhere automatically.** Evidence:

- `package.json` scripts: no entry references `e2e`. The only test entry is `"test": "vitest run"`.
- `.github/workflows/` contains exactly four files: `drain-fallback.yml`, `drain-integrator.yml`,
  `main-drain-fallback.yml`, `prune-merged-branches.yml`. Grep for `pull_request` across all four returns
  nothing — **every trigger is `schedule` + `workflow_dispatch`.**
- The only verification in CI is `npm run build && npx vitest run`
  (`drain-integrator.yml`, "Verify integrator (build + tests)"), and it is gated behind
  `AGENT_CATCHUP_THRESHOLD: "3"` — it **only runs when the integrator is more than 3 commits ahead of
  main.** A one-or-two-commit change reaches production having been verified by nothing but the agent that
  wrote it.

Findings, in order:

1. **There is no PR-level CI.** 200 unmerged remote branches, 58 of them touching real code, and no
   workflow will ever build or test any of them. That is the finding, not the e2e scripts.
2. **The 52 e2e scripts run only when an agent remembers.** They are effectively documentation. Either
   wire the 5–8 that cover money paths into a `services: postgres` job on `pull_request`, or delete the
   rest so nobody mistakes them for a safety net.
3. **`npm run build` in CI has a hard runtime dependency on `fonts.googleapis.com`** being reachable at
   build time (`next/font`). That is why the local build fails in this sandbox — an environment limit, not
   a repo defect — but on Vercel it is a real single point of failure for production deploys.
4. `CRON_SECRET` gates all 17 cron jobs at `src/app/api/hub/cron/[job]/route.ts:39-43`. It is unset
   locally, so no cron path can be smoke-tested here. `cron-route.test.ts` covers the route at 78.9%
   statements — the best-covered thing in `src/app/**`.

---

## 5. Testing the "deadhead % and DSO" prior against the code and data

**DSO: the prior holds, and there is a specific bug behind it.** `runOverdueReminders` is 0% covered, its
day gate (`invoices.ts:326`) permanently skips any invoice past day 20, and the seeded book already
contains a live example — `THD-INV-1002`, $2,930, 22 days past due, unchaseable by the current code. The
cron runs once a day (`vercel.json`: `ar-reminders`, `30 14 * * *`), so one missed run silently drops a day
from the schedule forever. Item #2 in the top 15.

**Deadhead: the prior is not supported by this data.** `sum(deadhead_miles)/sum(total_miles)` over
`hub.loads` is **7.10%** (1,446 deadhead / 20,378 total; 18,932 of that is loaded). The naive
`sum(deadhead_miles)/sum(deadhead_miles+loaded_miles)` returns 7.40% because the 2 NULL-deadhead rows drop
out of both sides. The KPI math itself is clean and fully covered —
`kpi.ts:63-66` computes `deadheadPct` and derives `loadedPct` from the *unrounded* share specifically so
the two sum to 100, and `kpi.ts` is 100% statements. Two loads have `deadhead_miles IS NULL`
(`count(*) filter (where deadhead_miles is null)` = 2), which `kpi.ts:48` floors to 0 — so the true figure
is 7.10% rather than 7.40% — either way, not 15%.

Caveat, stated plainly: this is **seeded demo data**, not Ranvir's real dispatch history. MISSING: export
12 months of real `loads` rows (`reference, loaded_miles, deadhead_miles, linehaul_cents, pickup/delivery
city-state`) from production Postgres and rerun the same query. If production deadhead really is under 8%,
the deadhead lever is worth roughly nothing and every hour should go to DSO instead.

---

## 6. The single cheapest test that would have caught the most expensive plausible bug

**One test, ~20 minutes, `src/lib/hub/__tests__/draft-settlements-loads.test.ts`:**

> `draftSettlements` must issue `UPDATE hub.loads SET settlement_id = $1 … WHERE id = ANY($2::uuid[]) AND
> carrier_id = $3` containing **every** load id it just paid — and a second run over the same period must
> create nothing.

Fake `pg` client, one driver, two loads, ~40 lines. It covers the exact statement at
`src/lib/hub/settlements.ts:217-220` (SQL on `:218`) that sits inside the 134-line uncovered block, and it is the one
statement whose failure is both **silent and recurring**: if `settlement_id` is not stamped, the loads stay
eligible, and the next weekly draft pays the same work again. Nobody notices until a driver's check is
double — or until the year-end 1099 is wrong by a full week of gross.

**Cost of the bug it catches: $11,801 per week, compounding** (10 active Thind drivers × $1,180.13 avg net;
*assumption: the 2 seeded settlement rows are representative — n=2, so this is a magnitude, not a forecast*).
**Cost of the test: 20 minutes.**

Write that one first. Then #2 (the dunning day gate) and #3 (the permission-string wiring), and stop —
those three are ~1.5 hours and cover the payroll, the AR, and the authorisation surface.

---

## Verification

Adversarial re-verification pass, 2026-07-25, against `main@c52ec254`. Every citation was reopened at the
cited line, every SQL re-run against the seeded `hub` schema, and coverage re-measured from scratch.

**Re-measured and CONFIRMED exactly** (independent `npx vitest run --coverage --coverage.provider=v8` runs):
`src/lib/hub/**` 72.89% (3526/4837) stmt / 64.93% br / 71.28% func; `src/app/**` 20.41% (975/4775) stmt /
15.50% br / **9.90% (87/878) func**. Every per-module row in §1 and §1b re-derived to the reported decimal
(`settlements.ts` 51.12/29.26/51.85, `loads.ts` 35.22/14.39/41.66, `pay-rules-db.ts` 7.69/0/0,
`fuel.ts` 12.12/22.22/9.09, `_actions/money.ts` 15.20, `exports/[kind]/route.ts` 0, `cron/[job]/route.ts` 78.94).

**Code citations that resolved** (opened, not inferred): `settlements.ts:89,:122,:218,:269`;
`invoices.ts:287,:310,:326,:339,:488`; `money.ts:58` (`if (mpg <= 0) return 0`); `permissions.ts:51`;
`advances-core.ts:32`; `pay-rules-db.ts:21,:32,:63,:73`; `pay-rules.ts:225-228,:338,:424,:429-430`;
`loads.ts:165,:212,:217,:266,:271,:363`; `fuel.ts:96,:196`; `reports.ts:53,:75-79,:122,:375,:421`;
`expenses.ts:102,:112,:198-199`; `kpi.ts:48,:63-66`; `recruiting.ts:395`; `tenancy.ts:26`;
`pdf.ts:353-354,:388`; `types.ts:356`; `session.ts:6-13`; `cron/[job]/route.ts:39-43`;
`exports/[kind]/route.ts:14,:41,:58,:68`; `customer-statements/.../route.ts:8,:17`;
`money/page.tsx:89`. `arAgingTrend`'s payments sub-select **does** lack a `carrier_id` filter (`reports.ts:75-79`).

**Re-run and CONFIRMED**: 108 tsc diagnostics across 32 files, all 32 test files (`collect-backlog.test.ts`
is a test file outside `__tests__`); 52 `scripts/e2e-*.mjs`; 4 workflow files with zero `pull_request`
triggers; `AGENT_CATCHUP_THRESHOLD: "3"` at `drain-integrator.yml:43` gating the only build+test step
(`:79-87`); 17 crons; `ar-reminders 30 14 * * *`, `driver-scorecards 0 10 1 * *`; no `e2e` or `typecheck`
entry in `package.json` scripts; `@vitest/coverage-v8` present in `node_modules` but absent from
`package.json`. Seeded data: 11 `hub.pay_rules` rows, **0** containing `scorecard_bonus`; open AR $8,920
across 3 invoices with **zero** partial payments; `THD-INV-1002` at 22 days past due.

**Corrected — wrong numbers:**

| Claim as written | Verified value | How |
|---|---|---|
| Trucks = 10 | **12** (10 Thind / 2 Cascade) | the cited `select count(*) from hub.trucks` returns 12 |
| 7 per-mile + 4 percentage = "10 Thind drivers" | Thind is **6 + 4**; the 7 was fleet-wide (11 total) | `group by carrier_id, pay_type` |
| Deadhead 7.40% "(1,446 / 18,932)" | **7.10%** (1,446 / 20,378) — 1446/18932 is 7.64%, neither matches 7.40% | 7.40% only appears when the 2 NULL-deadhead rows drop from both sides |
| #11 detention $1,800 @ $100/hr | **$1,080 @ $60/hr** | `onboarding.ts:27` = `6000`; `hub.carrier_settings` = `{"ratePerHourCents":6000}` |
| #14 $2,180/load | **$2,138** ($2,400 × 89.1%) | arithmetic |
| #13 "$2,995 avg invoice" | **$2,973** ($8,920 / 3) | `hub.invoices` |
| #5 "$236/week/**driver**" | $236/week **fleet-wide**; ≈$25/week per driver | 2% of $11,801 is the fleet number, not a per-driver one |
| §3 offender 2: "seven sessions missing `email`" | **six**; `:114` is an unrelated `TS2322` null error | `tsc` output |
| §3 offender 3: "8 errors, all TS2493" | 4× TS2493 + 4× TS2352 | `tsc` output |
| Wrong cite `onboarding.ts:152` for the constant | defined at **`:27`**, consumed at `:152` | file read |
| csvEscape "three implementations" but only two cited | third is **`loadboard-export.ts:4`** | `grep -n csvEscape src/lib/hub/**` |

**Corrected — overstated capability:** §1 claimed every adapter is "pinned to a shared contract test."
`integration-contract.test.ts:11-34` pins **registry invariants and the mock adapter only**; each real
adapter has its own separate test file. The 99.8% number itself is real and covers all 12 integration files
at 100% except `webhooks.ts` — the text reporter had merely hidden the 100%-everything rows.

**Added missing assumptions:** the `$1,180.13` avg net that drives the headline `$11,801/week` in §0, #1, #3
and §6 comes from **n=2 settlement rows**; that is now stated inline everywhere the figure appears. #1 also
now notes the existing same-period idempotency guard at `settlements.ts:122`, so the re-pay exposure is the
**next** period, not a re-run.

**Killed: nothing.** No claim was unsupported enough to delete. Checked specifically for the named failure
modes and found none: no PR numbers are cited anywhere; the Google-Fonts build failure is correctly labeled
an environment limit (§4.3), not a code defect; no integration is described as functional on the basis of a
route file existing; the `live` vs credentialed distinction is not asserted in this document.

**Residual weakness, not fixed:** every dollar figure here is anchored to seeded demo data (29 loads,
2 settlements, 4 invoices). MISSING: production `hub.settlements`, `hub.invoices` and `hub.loads` exports —
without them the ranking of #1/#2/#3 is sound but the magnitudes are illustrative.

```
FILES:    docs/ops/TEST_GAPS.md (created, then verified + corrected in place)
PR:       none (no GitHub write access this session)
IMPACT:   ~6.5h of tests guards $11.8k/week of payroll, $2.9k of unchaseable AR, and a $66k load-write blast radius
NEXT:     Write src/lib/hub/__tests__/draft-settlements-loads.test.ts — assert the settlement_id stamp at settlements.ts:217 (20 min)
BLOCKED:  Three things from Ranvir: (1) production DB read access to confirm real deadhead %, AR book size, real avg settlement net (the seed has n=2), and whether ATS Transport exists as a carrier row — the seed has "Cascade Demo Lines" as tenant 2; (2) the intended scorecard_bonus tier table (0 of the 11 seeded hub.pay_rules rows contain a scorecard_bonus rule); (3) a decision on whether detention may ever be revised downward after a timestamp correction (detention.ts:135-136 currently forbids it)
```
