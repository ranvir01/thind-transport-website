# Settlement Math Conventions

Ground truth for HaulDesk (`evaluatePayRules` in `src/lib/hub/pay-rules.ts`,
consumed by `draftSettlements` in `src/lib/hub/settlements.ts`). Money is
**integer cents**. Rounding is **`roundHalfAwayFromZero`**
(`src/lib/hub/rounding.ts`): `Math.sign(v) * Math.round(Math.abs(v))`.
Percent lines compute `(amountCents * basisPoints) / 10000` then round that
result — **per line, not on the grand total**.

> `docs/contracts/` does not exist. Schema and rates come from
> `docs/tms-master-prompt.md` §6, `docs/phases/phase-2.md`, `PAY_RATES` in
> `src/lib/constants.ts`, and the live evaluator. See `../_handoff.md`.

## Canonical formula (matches the evaluator)

```
earnings          = Σ earning lines          # pay for services
reimbursements    = Σ reimbursement lines    # accountable pass-throughs (lumper, scale)
gross_cents       = earnings + reimbursements   # THIS is hub.settlements.gross_cents
deductions_cents  = advances + escrow + insurance + flat_recurring + percent_of_gross
net_cents         = gross_cents - deductions_cents
```

1099-NEC Box 1 (engine: `exportCsv(..., "1099")` in `src/lib/hub/expenses.ts`):

```
Box1 = Σ (gross_cents − reimbursement lines)   # over approved|paid settlements
       for drivers with pay_type = 'percentage'
       where EXTRACT(YEAR FROM period_end) = filing year
     = Σ earnings   # reimbursements net out
```

Company (`per_mile`) drivers **do not** appear on the 1099 export.

## Thind pay programs (`PAY_RATES` + `legacyConfigToRuleSet`)

| Program | Seeded driver | Rule set |
|---|---|---|
| Company per-mile | Harpreet Singh | `per_mile` 63¢/loaded mile (`loadedOnly: true`); insurance `$75.00`/wk; escrow `$0` |
| Owner-operator | Jasdeep Brar | `percent_linehaul` 9000 bps of **linehaul + accessorials** + `fsc_passthrough` 10000 bps; escrow `$50.00`/wk |

`PAY_RATES.companyDriver.*.perMile` is `"$0.63"`. `PAY_RATES.ownerOperator` is
`90%` + `100%` FSC. `DEFAULT_SETTINGS.pay.companyDriverPerMileCents` is **60** —
a settings default for *new* tenants, **not** Thind's published rate. Worksheets
use **63¢** / **90%**. Cascade Demo Lines seeds at 60¢ / 88% (isolation tenant).

## What the engine does **not** auto-apply

- **Fuel-card / toll chargebacks** are **not** pulled from `hub.fuel_transactions`
  or `hub.toll_transactions` into `draftSettlements` (Phase 2 typed the line;
  Phase 3 did not wire it). Variable weekly fuel/toll must sit on the driver's
  `hub.pay_rules.deductions` as `flat_recurring` (or as an advance). Worksheets
  that include fuel/toll model them that way and say so.
- **Company per-mile does not pay detention/layover/FSC.** Those are carrier
  revenue unless extra rules (`percent_accessorials`, `per_stop`, `hourly`)
  are added. Lumper the driver paid is a **reimbursable expense**.
- **Factoring fees are not computed.** A factored invoice changes **remit-to**
  (Notice of Assignment) and skips dunning. Face amount = `invoiceTotalCents`
  = linehaul + FSC + accessorials. Do not invent a 3% factor fee.

## Load statuses (forward-only)

`quoted → booked → dispatched → at_pickup → in_transit → delivered →
pod_received → invoiced → paid → settled`. Cancel allowed from any pre-delivery
status. Settlements pick loads in `delivered | pod_received | invoiced | paid`
with `settlement_id IS NULL`.

## Detention

`detentionCents(arrived, departed, freeHours, ratePerHourCents)` in `money.ts`.
Thind defaults: **2 free hours**, **$50/hr** (`ratePerHourCents: 5000`).
Accessorials whose label matches `/detention/i` are itemized on percent
settlements; the two lines **always sum to the unsplit rounded total**.
