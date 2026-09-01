# Settlement Worksheet — Company per-mile (`PAY_RATES` $0.63/loaded mi)

- **Driver:** Harpreet Singh (`pay_type = per_mile`, `pay_rate = 0.63`, `pay_loaded_miles_only = true`)
- **Carrier:** Thind Transport `11111111-1111-1111-1111-111111111111`
- **Settlement:** `S-MILE-W` / seed-demo **"Draft this week"** for Harpreet
- **Period:** the open week containing seed loads `THD-1010` + `THD-1011`
- **Status:** penny-verified against `legacyConfigToRuleSet` + `evaluatePayRules`
- **Engine:** `per_mile` 63¢ × loaded miles; deadhead **ignored**; FSC **not paid**;
  detention/layover billed to customer **not paid** to this driver.

## Plain-English rule
Company drivers are paid **$0.63 per loaded mile**. Empty/deadhead miles are not
paid (`pay_loaded_miles_only = true`). Lumper the driver paid out of pocket is
reimbursed 100% as an accountable-plan expense. Recurring occupational-insurance
(`$75.00`/week) and outstanding cash/EFS advances subtract from net.

## Rates
| Item | Value |
|---|---|
| Loaded mile | 63 ¢/mi (`dollarsToCents(0.63)`) |
| Empty mile | 0 (not paid) |
| FSC to driver | 0 |
| Insurance | 7500 ¢/wk |
| Escrow | 0 |
| Advance (seed) | 20000 ¢ (`EFS code 4417`) |
| Lumper reimbursement (seed) | 15000 ¢ |

## The week (from `scripts/seed-demo.mjs`)
| Load | Status | Loaded mi | Deadhead mi (seeded, unpaid) | Linehaul ¢ | FSC ¢ (unpaid) |
|---|---|---|---|---|---|
| THD-1010 (settle1, Portland→Reno) | pod_received | 520 | 42 | 210000 | 20000 |
| THD-1011 (settle2, Kent→Boise) | pod_received | 480 | 38 | 195000 | 18000 |
| **Totals** | | **1000** | 80 | 405000 | 38000 |

Deadhead = `Math.round(loaded * 0.08)` in the seed; **does not affect pay**.

## Hand computation (integer cents)
```
THD-1010 mile pay = roundHalfAwayFromZero(520 * 63) = 32760
THD-1011 mile pay = roundHalfAwayFromZero(480 * 63) = 30240
                    ------------------------------------
earnings          = 32760 + 30240                   = 63000

reimbursements    = lumper 15000                    = 15000
                    ------------------------------------
gross_cents       = 63000 + 15000                   = 78000

deductions:
  Advance (EFS code 4417)                            = 20000
  Insurance                                          =  7500
                    ------------------------------------
deductions_cents  = 27500

net_cents         = 78000 - 27500                   = 50500
```

## Expected result (ground truth)
| Field | Cents | Dollars |
|---|---|---|
| earnings | 63000 | $630.00 |
| reimbursements | 15000 | $150.00 |
| **gross_cents** | **78000** | **$780.00** |
| deductions_cents | 27500 | $275.00 |
| **net_cents** | **50500** | **$505.00** |
| 1099 reportable | 0 | (W-2 company driver; excluded from 1099-NEC export) |

## Independent re-check
- 1000 × 63 = 63000. ✔
- 63000 + 15000 = 78000; − 20000 − 7500 = 50500. ✔
- Matches the two-load company-driver case in `pay-rules.test.ts` (63000 earnings on 520+480 mi) plus seed lumper + seed advance instead of that test's $50+$75 escrow/insurance pair.

## Click path
Log in as `accounting@demo.thind` / `ThindDemo1!` → `/hub/money/settlements` →
**Draft this week**. Open Harpreet's new draft. `net_cents` must be **50500**.
(`histLoads[0]` is already on a *paid* settlement and must not appear here.)
