# 1099-NEC YTD verification

Engine: `exportCsv(carrierId, "1099", { year })` in `src/lib/hub/expenses.ts`.
SQL (paraphrased):

```
SUM(s.gross_cents - COALESCE(reimb.cents, 0)) / 100.0
FROM hub.settlements s
JOIN hub.drivers d ON ... AND d.pay_type = 'percentage'
WHERE s.carrier_id = $1
  AND s.status IN ('approved','paid')
  AND EXTRACT(YEAR FROM s.period_end) = $2
GROUP BY d.id
```

CSV columns: `Payee, Box1_NonemployeeCompensation, Year`
`Box1` is **dollars with 2 decimal places**, not cents.

`gross_cents` already includes reimbursements, so Box1 = **earnings only**
(settlement gross minus reimbursements) — same definition as
`docs/tms-master-prompt.md` M5.

Draft settlements **do not count**. Company (`per_mile`) drivers **do not appear**.

## Seed-demo procedure (no extra loader)
1. `npm run seed:demo`. Log in `accounting@demo.thind` / `ThindDemo1!`.
2. Export 1099-NEC for the calendar year of Jasdeep's paid settlement
   (`period_end` ≈ 30 days before today — if you run this in January the row
   may fall in the prior year; pass `?year=` or the export's year picker.
   `resolve1099Year` defaults to **prior year** when the current year is
   requested without a closed year — see `export-1099-year.test.ts`).
3. **As seeded**, only Jasdeep's historical paid settlement is approved/paid:

   | Settlement | gross_cents | reimbursements | reportable |
   |---|---|---|---|
   | S-OO-HIST (paid) | 237500 | 0 | 237500 |

   **Assert Box1 = `2375.00`** for payee `Jasdeep Brar`.
   **Assert** `Harpreet Singh` is absent.

4. Draft + **approve** the open-week O/O settlement (`S-OO-SEED`, THD-1012):
   reportable **268500**. Re-export.

   ```
   237500 + 268500 = 506000 ¢  →  Box1 = 5060.00
   ```

## Fixture-loader procedure (rich week)
Approve `S-OO-HIST` + `S-OO-W3` (do **not** also count `S-OO-SEED` unless it was
loaded). Reportable 237500 + 841700 = **1079200** ¢ → Box1 **`10792.00`**.

Escrow, advances, fuel/toll chargebacks **do not** reduce Box1 (they are
deductions, not reimbursements). Confirm `S-OO-W3` Box1 uses **841700**
(earnings) not net **759216**.

## Scoping
Thind's 1099 CSV must never include Cascade payees. Cascade's export must never
include Jasdeep. (See `isolation-tests.md` I-10.)

## Expected results
| Scenario | Payee | Box1 |
|---|---|---|
| seed-demo as seeded | Jasdeep Brar | **2375.00** |
| seed-demo after approving S-OO-SEED | Jasdeep Brar | **5060.00** |
| fixture S-OO-HIST + S-OO-W3 | D-OO / Jasdeep | **10792.00** |
| any scenario | Harpreet Singh | **absent** |
