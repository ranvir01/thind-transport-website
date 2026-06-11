# HaulDesk — the 5-minute phone pitch to a prospective carrier

Audience: an owner running 5–50 trucks off spreadsheets, texts, and a folder of PDFs.
Run it on a phone (390px) against `npm run seed:demo` data. Password for every demo
account: `ThindDemo1!`.

> The pitch in one sentence: *"Everything your office does — dispatch, invoices, driver
> pay, IFTA, compliance, hiring — in one app your drivers will actually use, live in an
> afternoon, no sales call."*

## The walkthrough

1. **Today screen** (`dispatch@demo.thind`) — "This is your morning huddle with zero
   clicks: what's due today, which driver hasn't confirmed, which trucks go empty
   tomorrow, and the money you haven't invoiced yet."
2. **Planner** — drag a load to another truck. Watch it refuse an illegal move
   ("approved home time", "med card expired"). "The rules ride along — you can't
   accidentally book over a kid's birthday."
3. **Paste a rate con** (Loads → Paste) — booked in under 60 seconds. "No retyping."
4. **The driver's phone** (`driver@demo.thind`) — pinned paperwork request, one-tap
   *I'm here / Leaving now*, **Snap & send** the POD, a two-minute DVIR with a
   park-it question that actually grounds the truck. "Works in a dead zone — taps
   queue and send themselves when the signal comes back."
5. **One-click invoice** (`accounting@demo.thind`, THD-1008) — branded PDF, POD
   attached, emailed. "POD to invoice is one tap, the same minute."
6. **Settlements** — draft the week. "Per-mile, percentage, bonuses, advances — penny-
   exact, statement PDF emailed on approval."
7. **Fuel → IFTA** — point at the REEFER badges. "Reefer gallons are tax-exempt and the
   worksheet knows it. Quarter-end is a button, not a weekend."
8. **Broker portal** (`broker@demo.thind`) — live tracking, POD download, invoice
   status. "Your brokers stop calling. Your packet emails itself."
9. **Recruiting** — drag an applicant to Offer, hand the phone over to finger-sign,
   tick orientation, **Hire**. "Application to dispatch-legal, one screen."
10. **The closer** — open `/hub/signup` and create *their* company live: "That's your
    workspace. Add a truck tonight, import your load sheet tomorrow morning, and
    you're running on HaulDesk by lunch."

## Objection cheat-sheet

- **"We have an ELD."** Keep it — HaulDesk reads from it through an aggregator and the
  ELD stays the legal HOS record. Until it's connected, the CSV exports you already
  have do the job.
- **"My drivers hate apps."** Three taps a day: confirm, arrive, POD. Big buttons,
  plain words, works offline. The DVIR takes two minutes with a finger signature.
- **"We're on QuickBooks."** Stay on it. HaulDesk exports clean QuickBooks CSVs;
  it owns the trucking math QuickBooks is bad at.
- **"What does it cost?"** Architecture keeps the marginal cost of a truck near zero —
  flat per-truck pricing without per-user gouging (billing hooks are in place;
  pricing is a business decision, not a code change).

## Demo accounts

| Who | Email |
|---|---|
| Owner (Thind) | `owner@demo.thind` |
| Dispatcher | `dispatch@demo.thind` |
| Accountant | `accounting@demo.thind` |
| Driver | `driver@demo.thind` |
| Broker portal | `broker@demo.thind` |
| Shipper portal | `shipper@demo.thind` |
| Tenant 2 owner | `owner@cascademo.example` |
| Platform admin | `admin@hauldesk.app` |
