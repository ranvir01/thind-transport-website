# Fill These Next — shortest path from sandbox to real HaulDesk

Start in the sandbox to click around. When you are ready to enter real info, sign into a production owner account and use **Hub → Onboarding**.

## Top 4 items that unblock real operations fastest

1. **Production SMTP app password**
   - Put it in Vercel → Project → Settings → Environment Variables → Production.
   - Required env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`, `HR_EMAIL`.
   - Result: invoices, driver invites, password resets, and owner reports can send real email.

2. **Factoring company + remit-to + fee %**
   - Enter in **Hub → Onboarding → Company profile & invoice branding** for Thind and ATS.
   - Needed fields: factoring company name, exact remit-to from NOA, fee %, reserve/holdback %, factoring email.
   - Result: invoices show the right remit-to and AR expected net cash is correct.

3. **Each driver’s pay rules in plain English**
   - Enter in **Hub → Onboarding → Pay tariffs** and then assign tariffs on each driver record.
   - Write it like: “O/O gets 88% of linehaul + 100% FSC; deduct $312 insurance, $45 ELD…”
   - Result: Friday settlement drafts match the old spreadsheet to the penny.

4. **Last full quarter of fuel card CSVs**
   - Upload in **Hub → Import → Fuel**.
   - Programs: EFS / WEX / Comdata, one CSV per program if possible.
   - Result: IFTA, fuel cost-per-load, and O/O fuel chargebacks become real.

## Then fill these

5. ATS DOT/MC numbers — **Hub → Onboarding → Company profile**.
6. Invoice prefixes and last issued invoice number — **Hub → Onboarding → Company profile**.
7. Trucks/trailers with VIN, odometer, ELD ID, fuel-card last 4 — **Hub → Fleet**.
8. Drivers with CDL/med card expiries and 1099 details — **Hub → Drivers**.
9. Brokers/shippers with billing email, terms, factoring status, slow-payer/blacklist flag — **Hub → Customers**.
10. Toll statements — **Hub → Import → Tolls**.
11. TruckX/Terminal authorization — **Hub → Onboarding → Integration credentials** plus Vercel env if needed.
12. IMAP docs mailbox — Vercel env vars for the mailbox that receives rate confirmations.

## Import templates already in the repo

If you want to prepare data in spreadsheets first, use the CSV headers in:

- `docs/production-intake/templates/drivers.csv`
- `docs/production-intake/templates/trucks.csv`
- `docs/production-intake/templates/trailers.csv`
- `docs/production-intake/templates/customers.csv`
- `docs/production-intake/templates/pay-tariffs.csv`
- `docs/production-intake/templates/recurring-transactions.csv`
- `docs/production-intake/templates/open-ar.csv`
- `docs/production-intake/templates/loadboard.csv`
- `docs/production-intake/templates/fuel.csv`
- `docs/production-intake/templates/tolls.csv`

Known facts already prefilled in production settings:

- Thind Transport LLC: DOT `2523064`, MC `876103`, phone `(206) 765-6300`.
- ATS Transport LLC: phone `(253) 410-7259`.

Everything still unknown is intentionally blank until you enter it.
