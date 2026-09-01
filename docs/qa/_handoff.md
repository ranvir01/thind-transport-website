# QA handoff

## What this is
Verification ground truth for HaulDesk, written **only** under `docs/qa/`.
Aligned to the live engine (`pay-rules.ts`, `roundHalfAwayFromZero`),
`PAY_RATES` in `src/lib/constants.ts`, seed-demo tenants, and Phase 7 gates
(`docs/phases/phase-7.md`).

`docs/contracts/` is still absent; schema comes from the master prompt + code.

## Worksheet ledger
| Worksheet | net_cents | Penny-verified? | Status | Notes |
|---|---|---|---|---|
| tariff-01-per-mile (Harpreet, seed Draft this week) | **50500** | ✅ vs evaluator | **FINAL for seed-demo** | 63¢ × 1000 loaded mi + $150 lumper − $200 advance − $75 insurance |
| tariff-02 period A (Jasdeep, THD-1012) | **263500** | ✅ vs evaluator | **FINAL for seed-demo** | 90% of $2,650 + $300 FSC − $50 escrow; detention itemized 13500 |
| tariff-02 period B (rich O/O week) | **759216** | ✅ vs evaluator | **FINAL as fixture math**; **blocked on wiring** to apply live — fuel/toll are `flat_recurring` because `draftSettlements` does not read `fuel_transactions` / `toll_transactions` | reportable 841700 |
| tariff-03-flat-per-load | **150000** | ✅ vs evaluator | FINAL as engine rule type; **not** a `PAY_RATES` published tariff | fixture-only driver |
| tariff-04-hourly-mixed | **46815** | ✅ **identical to existing unit test** | **FINAL** | `pay-rules.test.ts` golden settlement |

## 1099
| Scenario | Box1 (dollars) | Status |
|---|---|---|
| seed-demo as seeded (Jasdeep paid hist only) | **2375.00** | FINAL |
| after approving S-OO-SEED | **5060.00** | FINAL |
| fixture hist + rich week | **10792.00** | FINAL as math |

## Assumptions that are now **resolved** (were open on Path B)
- Tariffs in scope: `per_mile` and `percentage`+`fsc_passthrough` (Thind), plus engine extras `flat_per_load` / `hourly` / `percent_accessorials`.
- Company CPM = **63¢ loaded** (`PAY_RATES`), not the 60¢ `DEFAULT_SETTINGS` for new tenants.
- O/O = **90% of linehaul+accessorials + 100% FSC**. Chargebacks **after** the split.
- Rounding = `roundHalfAwayFromZero` per line.
- 1099 = gross − reimbursements, percentage drivers, approved/paid, year of `period_end`.
- Step-7 gates = Phase 7 §2 items G7-1…G7-9.
- Isolation tenants = Thind vs Cascade Demo Lines (seed-demo).

## Still blocked / do not fabricate
- **Factor fees:** the engine does not compute 3%/90% factor math. Factored vs direct is remit-to + skip-dunning. Face amounts only.
- **Fuel/toll auto-chargeback:** not wired from fuel/toll tables into settlements. Period B is the expected math **if** those amounts are on the rule set (or advances).
- **CSV column-mapping contract** for generic import: no `docs/contracts/` spec; use the live importer + these sample CSVs as examples, not a frozen schema.
- **G7-1/4/7/8** are product gates, not settlement math — e2e-plan tells the integration agent what to click; QA did not execute them.

## Deliverables
- `e2e-plan.md` — G7-1…G7-9 + P2 money appendix
- `settlement-worksheets/` — conventions + 4 worksheets
- `isolation-tests.md` — I-1…I-14 + negative controls
- `fixtures/` — companies, users, drivers, loads (json+csv), invoices (json+csv), documents, deductions, `settlements.expected.json`
- `1099-check.md`
- `_handoff.md` — this file

## Isolation of this agent
Wrote **only** `docs/qa/**`. Did not touch `src/`, `tests/`, `migrations/`,
config, `.env*`, or `e2e-sweep.mjs`. Did not run the dev server, build, tests,
seeds, or the DB.
