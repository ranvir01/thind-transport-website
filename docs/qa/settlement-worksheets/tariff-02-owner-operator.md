# Settlement Worksheet — Owner-operator (`PAY_RATES` 90% + 100% FSC)

- **Driver:** Jasdeep Brar (`pay_type = percentage`, `pay_rate = 0.9`, escrow 5000 ¢/wk)
- **Carrier:** Thind Transport
- **1099 payee:** yes (`pay_type = 'percentage'` is the 1099-NEC filter)
- **Status:** penny-verified against `legacyConfigToRuleSet` + `evaluatePayRules`

Two periods: **(A)** the seed-demo open week (one load — what "Draft this week"
produces today) and **(B)** a richer fixture week that includes detention itemization,
lumper reimbursement, fuel-card + toll **chargebacks** (modeled as `flat_recurring`
because the engine does not auto-pull `fuel_transactions` / `toll_transactions`).

## Plain-English rule
Owner-operators are paid **90% of linehaul + accessorials** plus **100% of fuel
surcharge**. Detention billed on the load is part of accessorials (90%) and is
**itemized** as its own earning line; the two lines sum to the unsplit 90%.
Lumper is a 100% reimbursement (not in the 90% base). Weekly escrow holdback
subtracts. Outstanding advances subtract. Fuel-card and toll chargebacks, when
configured on the rule set as `flat_recurring`, subtract after earnings.

`percent_linehaul` base = `linehaulCents + accessorialCents` (**FSC is separate**
via `fsc_passthrough`, not folded into the 90%).

---

## Period A — seed-demo open week (`S-OO-SEED`)

Load `THD-1012` (settle3, Seattle→Sacramento, **factored**, `pod_received`):
linehaul 250000, FSC 30000, accessorials `[{label: "Detention", amount_cents: 15000}]`,
800 loaded miles (miles do not affect O/O pay).

```
percent_linehaul 90% of (250000 + 15000)
  = roundHalfAwayFromZero(265000 * 9000 / 10000)
  = 238500

  of which detention share = roundHalfAwayFromZero(15000 * 9000 / 10000) = 13500
  remainder (linehaul share)                                         = 225000
  (225000 + 13500 = 238500 — itemization is penny-identical)

fsc_passthrough 100% of 30000                                        =  30000
                                                     --------------------
earnings                                                             = 268500
reimbursements                                                       =      0
gross_cents                                                          = 268500

escrow                                                               =   5000
deductions_cents                                                     =   5000
net_cents            = 268500 - 5000                                 = 263500
1099 reportable      = gross - reimb                                 = 268500
```

| Field | Cents |
|---|---|
| linehaul+accessorial 90% | 238500 |
| FSC 100% | 30000 |
| **gross_cents** | **268500** |
| escrow | 5000 |
| **net_cents** | **263500** |
| **reportable_comp** | **268500** |

Statement lines (labels from the evaluator):
- `THD-1012 — 90% of $2500.00` → 225000
- `THD-1012 — 90% of detention $150.00` → 13500
- `THD-1012 — fuel surcharge $300.00` → 30000
- `Escrow contribution` → 5000

Independent re-check: 0.9 × 2650.00 = 2385.00; + 300.00 FSC = 2685.00; − 50.00 = 2635.00. ✔
Matches the 90%+FSC case in `pay-rules.test.ts` (detention itemization 13500 on $150).

---

## Period B — fixture rich week (`S-OO-W3`) — fuel + toll chargebacks

Use this week when the integration agent **loads `docs/qa/fixtures/`** rather than
relying on seed-demo. Driver `D-OO`. Rule set adds two `flat_recurring` deductions
for this week's fuel-card and toll actuals.

| Load | Linehaul ¢ | FSC ¢ | Accessorials ¢ | Detention ¢ (subset) | Lumper reimb ¢ |
|---|---|---|---|---|---|
| L-3001 | 295000 | 31000 | 10000 (detention 2h × 5000) | 10000 | 0 |
| L-3002 | 142000 | 14500 | 0 | 0 | 0 |
| L-3003 | 378000 | 40200 | 15000 (layover) | 0 | 22500 |
| **Totals** | **815000** | **85700** | **25000** | **10000** | **22500** |

```
L-3001 90% of (295000+10000) = roundHalfAwayFromZero(305000*9000/10000) = 274500
       detention share       = roundHalfAwayFromZero(10000*9000/10000)  =   9000
       remainder                                                         = 265500
L-3002 90% of 142000         = 127800
L-3003 90% of (378000+15000) = 353700
FSC 100%                     = 31000+14500+40200                         =  85700
                             --------------------------------------------
earnings                                                                 = 841700
lumper reimbursement                                                     =  22500
                             --------------------------------------------
gross_cents                                                              = 864200

Chargebacks / deductions (all integer; no rounding):
  Fuel card (flat_recurring)                                             =  61234
  Tolls     (flat_recurring)                                             =   8750
  Escrow                                                                 =   5000
  Cash advance                                                           =  30000
                             --------------------------------------------
deductions_cents                                                         = 104984

net_cents            = 864200 - 104984                                   = 759216
reportable_comp      = 864200 - 22500                                    = 841700
```

| Field | Cents | Dollars |
|---|---|---|
| earnings | 841700 | $8,417.00 |
| reimbursements | 22500 | $225.00 |
| **gross_cents** | **864200** | **$8,642.00** |
| deductions | 104984 | $1,049.84 |
| **net_cents** | **759216** | **$7,592.16** |
| **reportable_comp (1099)** | **841700** | **$8,417.00** |

Independent re-check:
- 0.9×305000=274500; 0.9×142000=127800; 0.9×393000=353700. Sum 756000.
- +85700 FSC = 841700. +22500 = 864200.
- 61234+8750=69984; +5000=74984; +30000=104984.
- 864200−104984=759216. ✔
- 864200−22500=841700 reportable. ✔
