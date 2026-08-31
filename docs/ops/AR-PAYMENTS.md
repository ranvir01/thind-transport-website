# AR Payments LLC — holding / billing company

*Rewritten 2026-08-28 (D-014). Airtable **software** is retired. This file is
the operating model for the legal entity. If you are joining cold, start here.*

---

## 1. What this company is

**AR Payments LLC** is the legal **holding / billing company** for two motor
carriers that must stay financially and legally separate:

- **Thind Transport LLC**, d/b/a **AR Carrier Express** ("ARCE") — invoice
  numbers in the 15,000s, USDOT 2523064
- **ATS Transport LLC** ("ATS") — invoice numbers in the 5,000s

Regional dry van and reefer truckload out of **Kent, WA**, running
WA–UT–CA–ID–NV–AZ–OR. Two people run the office: **the owner** (phone-first,
Excel muscle memory) and **one dispatcher**.

The holding company exists so brokers remitting freight bills do not mix two
LLCs into one fact pattern (ATS letterhead once printed on a Thind invoice —
that is how two companies get treated as one). Operating identity (MC, USDOT,
insurance, plates, Form 2290) stays on each carrier. **Money lands in AR
Payments.**

This is **not** a factoring product for other people's freight, and **LoadOff
never holds, pools, or forwards these funds** (WA money-transmitter line —
[`docs/research/2026-08b/prompt-14-payment-rails.md`](../research/2026-08b/prompt-14-payment-rails.md)).
AR Payments may receive **Ranvir's own two carriers'** receivables. Full stop.

## 2. System of record (today)

Two live Excel files in **Dropbox**. One Master tab per carrier. Jeff (Grok
RevOps) enters loadboard rows by cell-edit on those files and matches deposits
to `DEPOSIT DATE` / `CHECK NO` / `Paid Status`.

Airtable was a 2026-08 experiment. Owner decision **2026-08-28: the software
is retired.** Do not recreate the base, do not propose Airtable work, do not
stand up a Claude Airtable lane. History of that attempt is in §7.

When LoadOff AR is live for **both** tenants, Excel becomes the backup.
Remittance still goes to the AR Payments bank, not into LoadOff.

## 3. What to do with it (operating model)

**Now — legal is done; bank and workflow are not.**

1. Open a **business checking account in AR Payments LLC's name**. Routing and
   account number go on invoices. Optional: sub-accounts or QBO classes for
   ARCE vs ATS. Owner-only click ([`OWNER-WORKSHEET.md`](OWNER-WORKSHEET.md)).
2. Invoices: operating LLC identity (MC / USDOT / letterhead) + remittance =
   AR Payments bank. Never print Thind letterhead on an ATS invoice.
3. Dispatcher + Jeff: two Dropbox xlsx stay the daily sheet. Jeff **never
   moves money**.
4. Owner, weekly: allocate AR Payments cash to each operating company for
   fuel, driver pay, insurance so the books stay split.

**Later — after LoadOff AR is live for both tenants.** Excel is backup;
LoadOff submits documents; money still lands in the AR Payments bank.

**Never without licenses.** Factoring or QuickPay for other carriers.
Sitting LoadOff in the funds flow. Rebuilding Airtable.

## 4. Design law (Excel / Dropbox — do not violate)

1. The load sheet is a spreadsheet. No forms, wizards, or record-detail flows.
2. Never sort the sheet. Newest-first is the owner's phone problem, not a new tab.
3. His Excel columns, in his Excel order. Extras go far right or nowhere.
4. Two files, never mixed. Thind rate cons never land in the ATS workbook.
5. The owner owns visual arrangement. Agents evaluate; they never rearrange.
6. Jeff enters data. Invoice-blocking problems go to gogo. Form 2290, taxes,
   and the bank application stay with the owner.

Excel Master column order (reference): Invoice No · Company · Freight Broker ·
Pick Up Date · Delivery Date · Load No · Origin City · Origin State ·
Destination City · Destination State · Rate · T Check · Pymt Rcvd · Balance ·
DEPOSIT DATE · CHECK NO · Paid Status · Paid Date · Mail Date · Driver ·
Truck No · Trailer No · Comments · Detention · Lumper · Layover

Invoice counters as of last Airtable sync (historical): **ARCE 15254 · ATS 5365**.

## 5. Who owns what

| Who | Owns |
|---|---|
| Owner | Bank account, Form 2290, SMTP, weekly cash allocation, letterhead |
| Jeff (Grok) | Daily loadboard 8:30pm PT, deposit matching, two Gmails, two xlsx |
| LoadOff (this repo) | Product AR for tenants — **data only**, never the bank |
| Claude Corps | Does **not** run an Airtable or AR-Payments software lane |

Grok paste: [`docs/grok-bots/jeff-revops.instructions.md`](../grok-bots/jeff-revops.instructions.md).

## 6. Human-only leftovers

On [`OWNER-WORKSHEET.md`](OWNER-WORKSHEET.md). Agents file them and move on:

1. File **Form 2290 HVUT** by **2026-08-31** (~$8,250, 15 trucks) — blocks plates.
2. Open the **AR Payments LLC bank account** and put remittance on invoices.
3. Optional: export a LOADS-BACKUP CSV from the retired Airtable base before
   the trial lapses ~Sep 2, if you still want a copy. Not required to run.

## 7. History — Airtable (retired 2026-08-28)

Do not recreate. IDs below are for forensics only.

The base was [AR Payments — Load Board](https://airtable.com/app0RJwxcpO3RS3X7)
(`app0RJwxcpO3RS3X7`). Carriers: Thind / ARCE `recB3mJAGTsGXVoi9` · ATS
`recbPhn32GHtPJ4Di`. Tables: Loads `tblXgUGrgV3IQm1qm` · Companies
`tblcp4YGIC1i9ddis` · Freight Brokers `tbl09uQeYgSfs39cB` · Drivers
`tblYEaEZsSTAywl1W` · Trucks `tbl2cyyAgWGoo9308` · Trailers
`tblaZb0PRy9sqTjVN` · Lanes `tbluuDf2LHDnOj2Xb` · Expenses
`tblzCEFkAoOYKqfXd` · Go-Live Board `tblBT1rOlRFJs3QeM`. Automations
`wflgnwujuPtYB7YR0` (invoice numbers), `wflDJr3ScJnNSM1AK` (Monday chase),
`wflgdUBLgx0hjMBBp` (integrity), `wflalwsUVPbDalqb2` (email invoice) were
built and never owner-toggled ON. Claude Airtable lane (brief / panel / infra
/ watchdog / trial one-shot) is **gone from the live account** — do not put
it back. Watchdog pastes that still name those tasks are stale (D-013).
