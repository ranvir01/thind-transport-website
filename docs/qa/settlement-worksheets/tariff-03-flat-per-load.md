# Settlement Worksheet — Flat per load (`flat_per_load` rule)

- **Driver:** `D-FLAT` (fixture-only — Thind's seeded roster does **not** use this
  program; it is a first-class `PayRule` type in `pay-rules.ts`)
- **Settlement:** `S-FLAT-W`
- **Status:** penny-verified against `evaluatePayRules`. Scope confirmed as an
  engine rule type; **not** a `PAY_RATES` published tariff.

## Plain-English rule
The driver is paid a **flat $500 per delivered load**, plus **$25 per extra stop
after 2**, plus detention is **not** paid unless a separate rule exists (none
here). Recurring insurance `$25.00`/week subtracts. No FSC.

## Rates
| Item | Value |
|---|---|
| Flat per load | 50000 ¢ |
| Extra stop (after 2) | 2500 ¢ |
| Insurance | 2500 ¢/wk |

## The week
| Load | Stops | Extra stops | Detention billed (unpaid to this driver) |
|---|---|---|---|
| L-4001 | 3 | 1 | 1 billable hour @ $50 (customer invoice only) |
| L-4002 | 2 | 0 | 0 |
| L-4003 | 2 | 0 | 0 |

```
flat pay          = 3 × 50000                         = 150000
extra-stop pay    = 1 × 2500                          =   2500
                  ------------------------------------------
earnings          = 152500
reimbursements    = 0
gross_cents       = 152500
insurance         = 2500
net_cents         = 152500 - 2500                     = 150000
```

## Expected result
| Field | Cents | Dollars |
|---|---|---|
| earnings | 152500 | $1,525.00 |
| **gross_cents** | **152500** | **$1,525.00** |
| deductions | 2500 | $25.00 |
| **net_cents** | **150000** | **$1,500.00** |

Independent re-check: 3×500+25−25 = 1500.00. ✔
Matches the shape of `pay-rules.test.ts` "flat_per_load and per_stop"
($400 + 2 extra × $25 = $450 on a 4-stop load).
