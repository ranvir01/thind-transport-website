# Thind Transport Hub — Demo Script (Phase 1)

A 5-minute walkthrough that shows the Hub running like the real deal — works on a phone
(390px) and desktop. Run it against a database seeded with `npm run seed:demo`.

## Setup

```bash
npm run db:migrate   # apply hub schema
npm run seed:demo    # believable fleet data (never run against production)
npm run dev          # http://localhost:3000/hub
```

On a phone: open `/hub`, then "Add to Home Screen" — the Hub installs as a standalone app
(`/hub.webmanifest`).

## Demo accounts (password for all: `ThindDemo1!`)

| Role | Email | Sees |
|---|---|---|
| Owner | `owner@demo.thind` | Everything incl. Users admin |
| Dispatcher | `dispatch@demo.thind` | Dispatch, loads, fleet, CRM |
| Accountant | `accounting@demo.thind` | Same office screens (money module lands Phase 2) |
| Driver | `driver@demo.thind` | Welcome screen (driver hub lands Phase 4) |
| Broker | `broker@demo.thind` | Welcome screen (portal lands Phase 5) |
| Shipper | `shipper@demo.thind` | Welcome screen (portal lands Phase 5) |

## The golden path (~5 minutes)

1. **Login** at `/hub/login` as `dispatch@demo.thind`.
2. **Dashboard** — live KPIs (active loads, in transit, awaiting POD), booked revenue
   this week/month, compliance "expiring in 60 days" with red/amber/gold pills.
3. **Dispatch board** — columns from Booked to POD Received; each card shows lane,
   broker, driver/truck, rate, and an RC/BOL/POD document checklist. Tap the gold
   button on any card to advance its status without leaving the board.
4. **Book a load** — New load → pick broker, add pickup + delivery (city/state),
   linehaul + fuel surcharge (watch the total and $/mile compute live), assign driver,
   truck, trailer → Book load. It appears in the Booked column instantly.
5. **Work the load** — open it: advance Dispatched → At Pickup, tap "Mark arrived" /
   "Mark departed" on stops (detention data starts here), upload the rate con or POD
   straight from the phone camera, watch the status history write itself.
6. **Fleet map** — every truck's latest position on OpenStreetMap; truck #101 shows a
   trail running down I-5 with an in-transit reefer load.
7. **Customers** — open Pacific Crest Logistics: revenue, load count, average $/mile,
   contacts with tap-to-call, CRM activity log, load history.
8. **Import** — upload a CSV exported from Excel, watch columns auto-map, preview, and
   import history as settled loads (brokers are created automatically).
9. **Fleet** — open a truck: registration/inspection/insurance pills, VIN decode button
   (free NHTSA API fills year/make/model), document vault.
10. **Switch roles** — sign out, log in as `owner@demo.thind` → Users admin appears;
    log in as `driver@demo.thind` → drivers see their own welcome screen, not office data.

## What Phase 1 deliberately does not include

Invoicing/settlements (Phase 2), fuel + IFTA (Phase 3), driver PWA flows (Phase 4),
external portals (Phase 5), live ELD/DAT sync (Phase 6). See `docs/tms-master-prompt.md`.
