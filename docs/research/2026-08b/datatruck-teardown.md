# Datatruck teardown — what they have, what LoadOff has, what's worth building

**2026-08-14.** Requested as "watch these videos and incorporate their useful
features." The videos are Vimeo links and could not be consumed: this
environment blocks vimeo.com at the egress proxy, and video/audio is not
something an agent can watch regardless. Everything below is from Datatruck's
own published material (site, docs, support pages, trade press), cross-read
against this repo's actual modules. Where a claim is theirs, it is labeled as
theirs — vendor marketing numbers are not independently verified.

Scope note: this is a capability comparison, the ordinary kind any product
team does. Nothing here copies their code, copy, or interface — the point is
to decide which *problems worth solving* LoadOff hasn't solved yet.

---

## Their positioning

Cloud TMS aimed at fleets of 10+ trucks, sold on being "AI-native": four AI
surfaces over one operational database, rather than AI bolted onto a legacy
TMS. Their four named tools:

| Tool | What it does (their description) |
|---|---|
| **TruckGPT** | Hybrid OCR + LLM document intake. Rate cons, BOLs, PODs, CDLs, 20+ types. Creates a load in <15s, "90%+ accuracy". Ingest via upload, Chrome extension, Outlook extension, or mobile. |
| **AI Dispatcher** | One search across DAT, Truckstop, 123Loadboard, Uber Freight, RXO + "100+ private boards". Validates broker credit, scores loads by profitability, negotiates rate, books. |
| **AI Updater** | Automated broker + driver comms across six load stages, 24/7, with ETA pulled from ELD data. They claim ~70% less comms workload. |
| **BI Agent** | Plain-English profitability questions → text-to-SQL → answers by lane, broker, truck, driver. |

Conventional surface underneath: dispatch board, multi-board search, broker
credit checks, load lifecycle, 30+ ELD/telematics integrations (Samsara,
Motive, Verizon Connect, Geotab, Azuga), profit per load/truck/lane/driver,
cost-per-mile, automated invoicing, IFTA, settlements, "50+ reports", 24/7
support.

---

## Honest scorecard against LoadOff today

**Already equal or better — do not rebuild:**

| Capability | LoadOff's version |
|---|---|
| Document AI intake | `src/lib/hub/doc-intake/` — LLM parser + enhanced analyzer, with tests. Same idea as TruckGPT. |
| Broker credit / vetting | `vetting.ts` + `vetting-fmcsa.ts`: FMCSA authority, risk score, double-broker checklist, **plus `avgDaysToPay` computed from your own invoice history** — a credit signal a vendor's generic check doesn't have. |
| Email document capture | `mailbox.ts` + `mailbox-oauth.ts` (IMAP/OAuth) covers what their Outlook extension does, without an extension to install. |
| IFTA | A real 278-line quarterly engine with surcharge columns, plus derived filing deadlines on the compliance wall. Most competitors track dates only. |
| Compliance | Wall + daily scan + 60/30/7 alerts + derived 2290/MCS-150/UCR. Deeper than anything they advertise. |
| Driver app | Installable PWA with a genuine offline queue (IndexedDB, ordered replay, schema-versioned). Their driver app is not described as offline-capable. |
| Broker/shipper portal + public tracking | `/hub/portal`, `sharelinks.ts`, `/track/[token]`. |
| Settlements, invoicing, fuel, tolls, maintenance, safety/claims, recruiting | All present. |

**Real gaps, ranked by value to a 15-truck fleet:**

1. **Automated broker status updates ("AI Updater" equivalent) — the biggest
   one.** Their strongest non-obvious claim, and the one that maps to real
   dispatcher hours. LoadOff has every input already — `load_events` with
   stage transitions, `stops` with appointment windows, `position_pings`,
   `notify.ts`, share links — but nothing proactively tells the broker
   "picked up, ETA 14:20" without a human typing it. **Build this first.**
   Blocked only on SMTP, which is already on the owner's list.

2. **ETA computation from position + appointment.** Prerequisite for #1 and
   valuable alone (detention prediction, late-delivery warning). Position
   pings and stop appointments exist; the derivation does not.

3. **Per-truck and per-driver profitability rollups.** `lanes.ts` does lane
   RPM and `operating-cost.ts` does CPM, and P&L exists — but "which truck
   made money this month" isn't a first-class view. Mostly composition of
   things already built.

4. **Multi-board aggregated search.** Adapters for DAT and Truckstop are
   built and protocol-correct but stub-first, waiting on credentials. This
   gap closes with the owner's door-knocks, not with engineering.

5. **Natural-language analytics ("BI Agent" equivalent) — build the safe
   version, not theirs.** Free-form text-to-SQL against a multi-tenant
   database is a tenancy breach waiting to happen: every query in this repo
   is `carrier_id = $n` by construction, and an LLM writing raw SQL discards
   that guarantee. The right shape here is natural language → *parameter
   selection over the existing typed report functions* (`reports.ts` already
   exposes revenue trend, AR aging, settlement liability, fuel spend, P&L
   with ranges). Same user experience, no query injection surface, and it
   still passes the cross-tenant harness.

6. **Chrome extension for load capture.** Lowest value here — the mailbox
   path already covers the common case, and an extension is a separate
   build-and-distribute pipeline for one workflow.

---

## What their claims don't tell you

- "90%+ accuracy" and "70% less comms workload" are vendor figures with no
  published methodology. Useful as direction, not as a target to promise
  customers — and never to repeat in LoadOff's own marketing (the
  unverifiable-claims guard test would reject it anyway).
- "100+ private boards" is a business-development asset, not a technical
  one. A single-tenant in-house TMS cannot replicate it and shouldn't try;
  the CHR free carrier API is the better door for this fleet.
- Their target is 10+ trucks with 24/7 support staffing. LoadOff's cost
  structure at $30/truck assumes no support desk — that is a deliberate
  positioning difference, not a gap to close.

## Recommended build order

Queued in `docs/ops/AGENT_TASKS.md`:

1. ETA derivation from position pings + stop appointments (enables 2 and 3).
2. Broker auto-updates on stage transitions, ETA included, share-link
   footer, respecting `isEmailConfigured()` so it degrades quietly until
   SMTP is fixed.
3. Per-truck / per-driver profit rollup on the reports page.
4. Natural-language report picker over `reports.ts` (typed params only —
   explicitly NOT text-to-SQL).

Items 1–3 are ordinary engineering against data LoadOff already holds. Item 4
should not start until 1–3 land, and its ADR should record the
no-raw-SQL decision before any code is written.

## Sources

1. https://www.datatruck.io/ · https://www.datatruck.io/tms · https://www.datatruck.io/ai-solution
2. https://www.datatruck.io/integrations · https://www.datatruck.io/compare-tms
3. https://support.datatruck.io/hc/en-us/articles/45614197665555-AI-Dispatcher
4. https://www.trucknews.com/products/datatruck-launches-upgraded-truckgpt-ai-tools-for-tms-users/
5. https://www.softwareadvice.com/scm/datatruck-profile/
