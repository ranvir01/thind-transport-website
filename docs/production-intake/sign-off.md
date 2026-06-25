# HaulDesk Production Sign-Off — Thind Transport

Check each gate on **production** with **real data** (not demo seed). All must pass before Excel is retired.

## Automated

- [ ] `npm run build` — zero errors
- [ ] `npm test` — 109 tests green (requires Postgres for isolation suite)
- [ ] `npm run db:migrate` — clean on production DB
- [ ] Demo accounts disabled; no `ThindDemo1!` in production

## Money

- [ ] One real invoice emailed to broker; PDF + POD attached
- [ ] AR aging matches imported open invoices
- [ ] Settlement draft penny-matches manual spreadsheet
- [ ] QuickBooks CSV imports cleanly (accountant confirms)
- [ ] Factoring remit-to correct on factored invoices

## Operations

- [ ] One real load: book → dispatch → driver POD → office sees timeline
- [ ] Driver PWA: confirm dispatch → arrive → camera POD → DVIR
- [ ] Broker portal: tracks in-transit load without dispatcher action
- [ ] docs@ mailbox auto-files rate con (or unmatched queue monitored)
- [ ] Fuel quarter imported; IFTA worksheet within tolerance of prior filing

## Compliance & security

- [ ] Red/amber/green reflects real expiries
- [ ] Login lockout verified (5 fails → 15 min lock)
- [ ] Documents require auth; share links revocable
- [ ] Crons running on Vercel (compliance-scan, ar-reminders, integration-sync)

## Mobile

- [ ] Today, dispatch, driver home usable at 390px
- [ ] No horizontal page overflow on changed screens
- [ ] `node scripts/e2e-sweep.mjs` against production URL

## Cutover

- [ ] First full week: all new loads booked only in HaulDesk
- [ ] Excel retired
- [ ] Owner sign-off date: ___________

**Signed:** _________________________ **Date:** ___________
