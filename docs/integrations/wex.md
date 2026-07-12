# WEX fuel card feed — scouting notes

Status: **adapter shipped; real feed mechanics now researched (2026-07-12) — same transport
mismatch as EFS.** The WEX-branded fleet card has no carrier-facing REST endpoint for
transaction pulls. Like EFS (see `efs.md`, researched 2026-07-11), the real delivery is a
**file-based feed over SFTP**, provisioned per-carrier — the Basic-auth JSON fetch in
`wexSource()` (`src/lib/hub/integrations/wex.ts`) cannot work as written. Nothing breaks
today (adapter reports `connected(): false` without creds; CSV import is the product), but
the transport half of `wexSource()` needs the same swap `efs.md` describes before
activation.

## Provisioning — how the real feed is set up (confirmed 2026-07-12)

Every shipping integrator (Fleetio, Geotab, Samsara, Motive, Truckpedia, Azuga) documents
the same model, with WEX-specific details that differ from EFS:

1. **Data Release Forms, not a portal menu.** The carrier supplies their **WEX Account
   Number** and signs **WEX Data Release Forms** electronically (Fleetio uses HelloSign);
   the signed forms go to WEX for processing. This replaces EFS's self-serve eManager
   "Data Sharing Preferences" flow.
2. **Account number format:** always begins with **690046** and must be a **19-digit
   number** — it is *not* the card number. (Fleetio adds: account numbers starting 0460,
   0467, 0473, or 0478 need ~7 extra business days because a third party processes them.)
3. **Lead time: 7–10 business days** (Fleetio; Samsara says 5–10) — slightly longer than
   EFS's "up to 5".
4. **What WEX issues back:** a **username and a password, sent in two separate emails**
   (Truckpedia collects exactly these two fields), plus a **file name** that maps the
   carrier's transaction file on WEX's SFTP server (Geotab/Samsara both require entering
   it). Setup/feed contact: **800-492-0669** or the WEX account rep — same number
   `efs.md` lists for WEX-side SFTP setup.

**Registry/credential impact:** the existing `feedUser` / `feedPassword` fields match the
two-email credential pair WEX actually issues — no schema change strictly required — but
the feed **file name** (and during provisioning, the 19-digit account number) has no home
in the `wex` registry entry. When the transport swap happens, add a `fileName` credential
field (or fold it into the SFTP path); until then note it in the connection help text.

## Feed shape (transport confirmed; column layout still unconfirmed)

- **Transport: file-based feed over SFTP**, same as EFS. Geotab documents the transfer
  schedule as **Monday–Friday at midnight UTC** (so no weekend files — Monday's file
  carries the weekend); Samsara says transactions upload "daily" once setup completes.
- **Gotcha (Geotab):** entering wrong SFTP credentials **more than three times locks the
  account out** of WEX's SFTP server — the future poller must fail closed after auth
  errors, not retry blindly.
- Transaction rows carry WEX **Level III data**: driver ID, fuel grade, cost per gallon,
  gallons, merchant/station location — consistent with the field set `normalizeWexRecord`
  already assumes (id, datetime, unit, merchant name/city/state, gallons, price, total,
  odometer). Exact CSV headers remain unverifiable until a real file lands; keep
  `normalizeWexRecord` the single shape-reading point.

## Auth model (confirmed at the provisioning level)

- Credentials: WEX-issued feed username + password (two separate emails) + assigned file
  name. No OAuth, no API keys, no self-serve signup.
- **`fleetapi.wexinc.com` ("WEX Mobility Developer Portal") is not a shortcut.** It's a
  partner-tier portal (OpenAPI specs and a sandbox are advertised) aimed at integrating
  fleet data into back-end systems, but no evidence surfaced of a carrier-facing
  transaction-pull endpoint or self-serve signup — access appears to require a WEX
  partner agreement, same conclusion the EFS pass reached. `developer.wexinc.com` remains
  the B2B *payments* platform (separate product). Note: `help.wextelematics.com` is WEX
  Telematics (the former GPS Insight), a telematics product — its API docs are unrelated
  to the fuel-card program despite the brand overlap.

## Adapter impact (found 2026-07-12 — latent, bites at activation; mirrors efs.md)

`wexSource().pull()` does an HTTPS GET to `${WEX_FEED_BASE}/transactions` (default
`https://api.wexinc.com/fleet/v1` — a placeholder; no such public endpoint exists) with
Basic auth and expects `{ transactions: [...] }` JSON. **The real feed is an
SFTP-delivered file.** Before activation the fetch step must become one of:

- an SFTP poller in the **Go worker** (`services/go/hauldesk-worker`) exposing parsed rows
  over its HTTP proxy — the natural home (Vercel functions can't hold SFTP sessions; a TS
  SSH lib is a heavy dependency). **One poller can serve both WEX and EFS** — same parent
  company, same delivery model, same contact for setup — parameterized by
  host/creds/file-name per provider;
- an inbound file-drop route (carrier or a forwarder pushes the daily file to us);
- WEX partner registration and whatever delivery the partner agreement specifies.

`normalizeWexRecord` stays the single shape-reading point either way — only the transport
half of `wexSource()` changes, so contract tests survive. The daily `wex-sync` cron
already matches the real Mon–Fri-midnight-UTC cadence; no cron change needed.

## Rate limits / polling

Not applicable in the REST sense — it's a scheduled batch file (Mon–Fri midnight UTC).
The only hard limit found is the SFTP three-strike credential lockout above.

## Sandbox

None for the carrier feed. The fleetapi.wexinc.com portal advertises a sandbox, but it's
partner-tier (see Auth model). Ask for a test file alongside the production feed request.

## Pricing (checked 2026-07-12)

No separately priced data-feed product surfaced — integrators (e.g. FleetRabbit) advertise
the WEX feed at no extra charge beyond the card account, matching EFS. Card account
pricing is quote-driven (~$4–8/card/month reported, occasional setup fee); no 2026 feed
pricing changes found.

## Lead time

7–10 business days after signing the Data Release Forms (some account prefixes +7 more) —
update the `creds-shopping-list.md` row 3b estimate of ~5 days accordingly.

## What ships today without any of this

The CSV statement import (`Settings → Fuel → Import`) already accepts any card program's
export, including WEX's, and lands rows in the exact same `hub.fuel_transactions` table via
the same `(carrier_id, source, external_id)` idempotency key. This adapter is additive —
it never replaces that path. Given the real feed is itself a flat file, the import path and
the future SFTP path can share row-level normalization.

## Open questions for the next pass

- Exact file format/column headers of the SFTP file (needs a provisioned feed or a WEX
  sample file — ask when submitting the Data Release Forms).
- Whether WEX will deliver to a customer-hosted SFTP endpoint (push) or only host the file
  for pickup (pull) — integrator docs imply pickup from WEX's server; confirm with the rep.
- Whether one Data Release Form submission can cover both a WEX-branded and an EFS account
  for carriers holding both.

## Sources (researched 2026-07-12)

- Geotab "Fuel Transaction Provider (WEX) Setup Process" (SFTP delivery, file name,
  690046/19-digit account format, Mon–Fri midnight UTC schedule, 3-strike lockout,
  800-492-0669): support.geotab.com
- Samsara "Integrate with WEX" (file name mapping, 5–10 business days, daily upload):
  kb.samsara.com
- Fleetio WEX Fuel Card Integration (Data Release Forms via HelloSign, account-number-only
  entry, 7–10 business days, 0460/0467/0473/0478 prefix delay, status states):
  help.fleetio.com
- Truckpedia fuel-card setup (username + password arrive in two separate WEX emails):
  knowledge-hub.truckpedia.io
- WEX developer surfaces: fleetapi.wexinc.com (Mobility portal, partner-tier, sandbox
  advertised via apitracker.io), developer.wexinc.com (B2B payments),
  help.wextelematics.com (WEX Telematics ≠ fuel cards)
- FleetRabbit WEX integration blog (no integration surcharge; card pricing ranges):
  fleetrabbit.com, freightwaves.com/checkpoint/wex-review
