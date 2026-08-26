# AR Payments — moving the trucking back office out of Excel

*Landed in-repo 2026-08-26 from the owner's brief (24 Aug 2026). If you're a
person joining this, or an AI picking it up cold — start here. Airtable lane
agents and the Grok Bot Revenue Operations Analyst both read this file.*

---

## 1. The business

**AR Payments LLC** is the back office for two small trucking carriers that must
stay financially and legally separate:

- **Thind Transport LLC**, doing business as **AR Carrier Express** — "ARCE",
  invoice numbers in the 15,000s
- **ATS Transport LLC** — "ATS", invoice numbers in the 5,000s

Regional dry van and reefer truckload out of **Kent, WA**, running WA–UT–CA–ID–
NV–AZ–OR. Two people run the whole office: **the owner** (phone-first, Excel
muscle memory) and **one dispatcher**.

## 2. The problem

Everything ran on **two Excel files in Dropbox** — a Master tab per carrier.
It worked for years, but only one person can have the file open, broker names
get typed three ways, money owed is invisible, and invoices were built by hand
(ATS letterhead once printed on Thind invoices — the fact pattern that gets
two LLCs treated as one company).

## 3. The goal

Move the back office into **Airtable** without it feeling like new software.

> "The Excel method is easier and better to look at. Get as close to that as
> possible. No drastic change. Nothing on screen that isn't used."

When something is prettier but less like Excel, Excel wins.

## 4. What's built

**The base:** [AR Payments — Load Board](https://airtable.com/app0RJwxcpO3RS3X7)
(`app0RJwxcpO3RS3X7`)

Carriers: Thind / ARCE `recB3mJAGTsGXVoi9` · ATS `recbPhn32GHtPJ4Di`

Tables: Loads `tblXgUGrgV3IQm1qm` · Companies `tblcp4YGIC1i9ddis` (Next Invoice
No `fld4V66iJ62ivi44f`) · Freight Brokers `tbl09uQeYgSfs39cB` · Drivers
`tblYEaEZsSTAywl1W` · Trucks `tbl2cyyAgWGoo9308` · Trailers `tblaZb0PRy9sqTjVN`
· Lanes `tbluuDf2LHDnOj2Xb` · Expenses `tblzCEFkAoOYKqfXd` · Go-Live Board
`tblBT1rOlRFJs3QeM`

**Two screens, both deliberate:**

| Screen | Who | What it's for |
|---|---|---|
| The base's **Loads Grid view** | Both | The Excel Master tab. Type across the row, + at the bottom. |
| **Load Sheet** `pbdXdvfnl6f9120Tl` | Dispatcher, on a computer | 20 working columns, inline creation, tabs: Not Paid · AR Carrier Express · ATS Transport |
| **Money — owner only** `pbdJn3wb2Ce5btq7S` | Owner, on his phone | Still owed, worst debtors, newest loads first |

Load Sheet columns (exactly these, unsorted — entry order is sacred): Highlight,
Invoice No., Company, Freight Broker, Pick Up Date, Delivery Date, Load No.,
Origin City/State, Destination City/State, Rate, Pymt Rcvd, Balance, DEPOSIT
DATE, CHECK NO, Paid Status, Driver, Truck No, Comments. Rows colored by Paid
Status. Sums under Rate / Pymt Rcvd / Balance. Never restore a "Highlighted" tab.

**Four automations** (built, waiting on the owner's ON toggle):

| Id | What |
|---|---|
| `wflgnwujuPtYB7YR0` | Auto invoice number the moment a carrier is picked (test rows MUST set Invoice No. in the same create call or they burn a real number) |
| `wflDJr3ScJnNSM1AK` | Monday AR chase list |
| `wflgdUBLgx0hjMBBp` | Integrity alert |
| `wflalwsUVPbDalqb2` | Email me the invoice |

Invoice counters as of last sync: **ARCE 15254 · ATS 5365**. A non-TEST invoice
above those means delta-sync happened → mark CUTOVER STEP 1 Done.

## 5. Design law (do not violate)

1. The load sheet is a spreadsheet. No forms, wizards, or record-detail flows.
2. Never sort the sheet. Newest-first lives on the owner's phone dashboard.
3. His Excel columns, in his Excel order. Extras go far right or nowhere.
4. Two interfaces maximum — Load Sheet and Money. Watchdog reports anything else.
5. The owner owns visual arrangement. Agents evaluate; they never rearrange.
6. Structural ideas go on the Go-Live Board as an argument. He decides.
7. **Highlight `fldHvCQkYrT7JzqFj` is his.** No agent ticks or unticks it on real loads.
8. The "Color Code" emoji field was scrapped 24 Aug. Never recreate it.
9. **Never write Omni prompts.** Omni cannot create/modify views.
10. Click-only fixes (views, coloring, summary bar, field order, billing,
    automation ON, share roles) → numbered **CLICK PATH**: exact button names,
    one job, **under 6 steps, computer not phone**.
11. Tone: one task per message. Never nag. Silence when healthy.

Excel Master column order (reference): Invoice No · Company · Freight Broker ·
Pick Up Date · Delivery Date · Load No · Origin City · Origin State ·
Destination City · Destination State · Rate · T Check · Pymt Rcvd · Balance ·
DEPOSIT DATE · CHECK NO · Paid Status · Paid Date · Mail Date · Driver ·
Truck No · Trailer No · Comments · Detention · Lumper · Layover

## 6. Human-only leftovers

On [`OWNER-WORKSHEET.md`](OWNER-WORKSHEET.md). Agents never stall on them:

1. Airtable Team plan (~$40/mo, 2 seats). Free cap 1,000 records. Trial ~Sep 2.
2. Flip four automation switches ON (check next invoice numbers first).
3. Click Sheet (~10 min): row coloring, totals, money format, phone view, pick-list locks.
4. Delta-sync Excel past Aug 3 into the base.
5. Form 2290 by Aug 31 is **not** Airtable — still owner, still blocking plates.

## 7. Claude Airtable lane (do not duplicate in Cursor)

| When UTC | Who |
|---|---|
| `0 15 * * *` | Morning brief — one task, no nagging |
| `0 9 * * *` | Human panel — persona walks |
| `0 1 * * *` | Infra crew — nightly build + 13-check |
| `30 19 * * *` | Watchdog — silent unless broken |
| 2026-08-31 15:00 | Trial-decision one-shot |

Grok Bot Revenue Operations Analyst: [`docs/grok-bots/airtable-coach.instructions.md`](../grok-bots/airtable-coach.instructions.md).
It writes click paths; it does not replace this lane.
