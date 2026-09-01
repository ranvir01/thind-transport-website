# HaulDesk QA fixtures

Schema reconstructed from `docs/tms-master-prompt.md` §6 and the live Hub
(`src/lib/hub/types.ts`, `pay-rules.ts`, `scripts/seed-demo.mjs`). There is no
`docs/contracts/` directory.

## Two ways to load
1. **`npm run seed:demo`** — preferred for the e2e sweep. Creates both tenants,
   Harpreet/Jasdeep pay configs, THD-* / CAS-* loads, factored+direct invoices,
   Harpreet's outstanding advance + lumper, Jasdeep's paid historical settlement.
2. **These JSON/CSV files** — for an integration agent that loads records
   directly. IDs `THD-*` / `CAS-*` match the seed. `L-*` / `D-FLAT` / `D-MIXED`
   are extra and will not exist until loaded.

## Hard units
- Money: integer cents. Percentages: basis points (`9000` = 90%).
- Per-mile rates in `hub.drivers.pay_rate` are **dollars** (`0.63`); the
  evaluator converts with `dollarsToCents`.
- `hub.settlements.gross_cents` = earnings **+ reimbursements**.

## Isolation pair
| Tenant | UUID | Owner login | Foreign records |
|---|---|---|---|
| Thind | `11111111-1111-1111-1111-111111111111` | `owner@demo.thind` | must not see `CAS-5001/5002` |
| Cascade | `22222222-2222-2222-2222-222222222222` | `owner@cascademo.example` | must not see `THD-*` |

Password for all demo logins: `ThindDemo1!`
