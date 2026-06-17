# Blocked on Owner

HaulDesk will not invent missing production business facts. Sandbox data is clearly marked and separate.

## Highest impact

1. **SMTP app password**
   - Where: Vercel Production env vars.
   - Set: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`, `HR_EMAIL`.

2. **Factoring details per company**
   - Where: Hub → Onboarding → Company profile & invoice branding.
   - Need: factoring company, exact remit-to from NOA, fee %, reserve/holdback %, factoring email.

3. **Driver pay tariffs**
   - Where: Hub → Onboarding → Pay tariffs / Drivers.
   - Need: each driver’s 1099 pay rules in plain English.

4. **Fuel card CSVs**
   - Where: Hub → Import → Fuel.
   - Need: last full quarter of EFS/WEX/Comdata CSVs.

## Still blank by missing-input policy

- ATS DOT # and MC #.
- EIN last 4 for both companies.
- Mailing/yard address confirmation.
- Billing email/reply-to per company.
- Invoice prefix + last issued invoice number confirmation.
- NOA files and compliance PDFs.
- Full fleet, driver, customer, AR, advances, and recurring deduction lists.
