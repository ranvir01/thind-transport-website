# Settlement Worksheet — Mixed program (per-mile + 50% accessorials + hourly)

This is the **golden settlement** already pinned in
`src/lib/hub/__tests__/pay-rules.test.ts` ("golden settlement — mixed rules,
fuel deduction, escrow"). Restated here as QA ground truth so the integration
agent can diff a live run against the same numbers without reading the test.

- **Driver:** `D-MIXED` (fixture-only)
- **Settlement:** `S-MIXED-W`
- **Status:** FINAL — matches an existing unit test to the penny.

## Plain-English rule
Loaded miles at **63¢**, **50% of accessorials**, plus **$22.00/hr** yard time
from `hoursWorkedMinutes`. Scale-ticket reimbursement. Deductions: fuel-card
personal-use (`flat_recurring` **4850** ¢), escrow **5000** ¢, advance **20000** ¢.

## Inputs
| Load | Loaded mi | Accessorials ¢ |
|---|---|---|
| THD-2001 | 512 | 7500 |
| THD-2002 | 487 | 6255 (odd → rounding) |
Yard time: 150 minutes (2h 30m). Scale ticket: 1350 ¢.

## Hand computation
```
THD-2001 miles        = 512 * 63                              = 32256
THD-2001 50% acc.     = roundHalfAwayFromZero(7500*5000/10000) =  3750
THD-2002 miles        = 487 * 63                              = 30681
THD-2002 50% acc.     = roundHalfAwayFromZero(6255*5000/10000)
                      = roundHalfAwayFromZero(3127.5)          =  3128
hourly                = roundHalfAwayFromZero(150*2200/60)
                      = roundHalfAwayFromZero(5500)            =  5500
                      -----------------------------------------------
earnings                                                      = 75315
scale reimbursement                                           =  1350
                      -----------------------------------------------
gross_cents                                                   = 76665

advance                                                       = 20000
fuel card (flat_recurring)                                    =  4850
escrow                                                        =  5000
                      -----------------------------------------------
deductions_cents                                              = 29850

net_cents             = 76665 - 29850                         = 46815
```

## Expected result
| Field | Cents | Dollars |
|---|---|---|
| earnings | 75315 | $753.15 |
| **gross_cents** | **76665** | **$766.65** |
| deductions_cents | 29850 | $298.50 |
| **net_cents** | **46815** | **$468.15** |

Independent re-check: 32256+3750=36006; +30681=66687; +3128=69815; +5500=75315;
+1350=76665; −29850=46815. ✔ Identical to the unit test assertions.
