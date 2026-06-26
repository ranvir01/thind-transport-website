# HaulDesk Setup Guide

**For:** Carrier owners, dispatchers, and office staff — no prior TMS experience needed.

**Goal:** Run trucking operations start to finish in one place: set up → book → dispatch → deliver → bill → pay → stay compliant.

---

## Before you start

- Create your workspace at `/hub/signup` (or sign in if the office invited you).
- Have these handy (PDFs or photos are fine):
  - W-9 and certificate of insurance (COI)
  - Truck/trailer registrations
  - Driver CDLs and medical cards
  - Broker list or rate confirmations (for MC/DOT numbers)
  - Optional: fuel card CSV, past load spreadsheet

**Time:** Most small carriers finish setup in one afternoon.

---

## Phase 1 — Set up your company

| Step | What to do | Where in HaulDesk |
|------|------------|-------------------|
| 1 | Drop all paperwork at once | **Smart Setup** (`/hub/setup`) |
| 2 | File W-9, COI, authority docs | **Carrier packet** (`/hub/settings/packet`) |
| 3 | Connect fuel card & GPS (optional) | **Integrations** (`/hub/settings/integrations`) |

Smart Setup reads your uploads and fills trucks, drivers, and brokers. You review before anything saves.

---

## Phase 2 — Book freight

| Step | What to do | Where |
|------|------------|-------|
| 1 | Paste broker rate con text | **Loads → Paste rate con** |
| 2 | Or enter a load manually | **Loads → New load** |
| 3 | Import past loads from Excel | **Import** (`/hub/import`) |

Every load gets a reference number and tracks through its whole life.

---

## Phase 3 — Dispatch & plan

| Step | What to do | Where |
|------|------------|-------|
| 1 | Assign driver and truck | **Dispatch board** |
| 2 | See empty trucks and backhauls | **Planner** |

When you dispatch, the driver sees the load on their phone automatically.

---

## Phase 4 — Driver runs the load

| Step | What to do | Where |
|------|------------|-------|
| 1 | Driver logs in on their phone (same `/hub/login`) | **Driver app** |
| 2 | Confirm dispatch → arrive → depart → photo POD | Driver home screen |
| 3 | Chat on the load (no personal phone numbers) | **Messages** |

Office creates driver logins under **People → Drivers**.

---

## Phase 5 — Bill & collect

| Step | What to do | Where |
|------|------------|-------|
| 1 | Create invoice when POD is in | **Money** (from load or invoice list) |
| 2 | Email PDF + POD to broker | One click on invoice |
| 3 | Watch who owes you | **Money → AR aging** |

---

## Phase 6 — Pay drivers

| Step | What to do | Where |
|------|------------|-------|
| 1 | Review settlement draft | **Money → Settlements** |
| 2 | Approve and export for QuickBooks | Settlement detail |

Pay rules (per mile vs percentage) are set per driver when you add them.

---

## Phase 7 — Stay compliant

| Step | What to do | Where |
|------|------------|-------|
| 1 | Check expiring CDLs, plates, insurance | **Compliance** |
| 2 | Import fuel; run IFTA worksheet | **Fuel & cards**, **IFTA** |
| 3 | Log incidents if they happen | **Safety** |

Red on the **Today** screen means act now; amber means plan ahead.

---

## Your daily rhythm (after setup)

1. Open **Today** — handle anything unconfirmed, unbilled, or expiring.
2. Book new freight (paste rate con or dispatch board).
3. Drivers run loads on their phones; you stay on **Today** and **Dispatch**.
4. Bill when POD arrives; run settlements weekly.

---

## In the app

The same guide lives inside HaulDesk: **Setup guide** in the left menu (`/hub/guide`) or press **⌘K** and type “setup guide”.

For production credentials and integrations, see `docs/hub-go-live-requirements.md`.

---

*HaulDesk — run trucking start to finish.*
