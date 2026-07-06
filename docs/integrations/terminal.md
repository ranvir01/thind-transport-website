# Terminal (withterminal.com) — TSP aggregator for ELD/telematics

Researched: 2026-07-06. Status: **built adapter**, live in `src/lib/hub/telematics.ts`
(`terminalSource`) and wired into the 30-min cron sync (`runTelematicsSync`) and the manual
"sync now" action (`src/app/hub/_actions/integrations.ts`). This is the only provider in
`docs/integrations/scout-rotation.md` with real outbound API calls at write time, so an
API change here is the one that can silently break production.

## Why we use it

TruckX (the driver-facing ELD our carriers already run) has no public API of its own — it only
exposes data through TSP aggregators. Terminal is the first (and so far only) adapter; the code
comment in `telematics.ts` notes TruckerCloud as a drop-in second aggregator, not yet built.
Terminal bills itself as "Plaid for telematics data in commercial trucking": one normalized API
in front of many underlying ELD/GPS providers, plus a hosted auth-link flow so the carrier
connects their TruckX account without us handling raw ELD provider credentials.

## Auth model (as implemented, confirmed against our code)

- Base URL: `https://api.withterminal.com/tsp/v1`, overridable via `TERMINAL_API_BASE` (not
  currently listed in `.env.example` — worth adding if a future docs pass touches that file).
- Two credential fields stored per carrier, AES-256-GCM encrypted (`src/lib/hub/credentials.ts`):
  `apiKey` and `connectionToken`.
- Every request sends both: `Authorization: Bearer {apiKey}` **and** a custom
  `Connection-Token: {connectionToken}` header. This matches Terminal's documented model of a
  per-application API key plus a per-end-customer "connection" token issued after the carrier
  completes Terminal's hosted Connect/link flow (their public docs describe a "Link" component
  used to standardize auth across underlying TSPs — analogous to Plaid Link).
- No OAuth token refresh in our code — both values are treated as long-lived and only rotate if
  the owner re-enters them via Settings → Integrations.

## Endpoints we call

| Our code | Purpose | Response mapping |
|---|---|---|
| `GET /vehicles?expand=latestLocation` | Vehicle list + last known position/odometer | `id`, `name`/`licensePlate`, `latestLocation.{latitude,longitude,odometer,locatedAt}` → `position_pings` |
| `GET /hos/available-time` | Driver HOS remaining time | `driverId`, `driverName`, `dutyStatus`, `driveRemaining`/`shiftRemaining`/`cycleRemaining` (seconds) → `hos_snapshots` (converted to minutes) |

Both are documented by Terminal as "real-time" endpoints — i.e., Terminal makes a live call
through to the underlying TSP (TruckX) at request time rather than serving a cache, so latency
depends on the upstream provider, not just Terminal.

## Rate limits

**Could not independently verify current numeric rate limits.** `docs.withterminal.com` returns
HTTP 403 to automated fetches (Cloudflare bot protection blocks this scout's tooling), and no
public rate-limit figures turned up via search. Our adapter has no rate-limit handling at all —
a single `fetch` per vehicle/HOS pull with a 15s timeout, any non-2xx throws and aborts that
sync run (`runTelematicsSync` swallows nothing; a thrown error in `source.vehicles()`/`source.hos()`
propagates up through the cron job). If Terminal starts 429-ing under load (more trucks, more
frequent syncs), the cron job has no backoff/retry — it just fails that cycle silently until the
next scheduled run.

**Backlog** (not urgent — no confirmed breaking change, but a real robustness gap): add basic
429/5xx retry-with-backoff to `terminalSource`'s `request()` helper, and surface sync failures
somewhere visible (currently a failed cron run has no owner-facing alert).

## Sandbox

No public sandbox/test-credential program found via search or docs (docs site blocked to this
scout — see below). Given Terminal's Connect/link flow authenticates against the real
underlying TSP (TruckX/others), sandbox testing likely requires a Terminal-provided test TSP or
a real TruckX test account provisioned through Terminal support — not something discoverable
without an existing partner relationship. Nothing in our code assumes a sandbox mode exists.

## Pricing / vendor risk

No public per-request or per-vehicle pricing found (typical for aggregator APIs — usage-based,
quoted per deal). Vendor context worth knowing for risk assessment:
- Y Combinator S23 (Toronto), founded 2023 by Raghav Midha (CEO) and Connor Giles (CTO),
  formerly of NorthOne.
- Raised a $3.1M USD ($4.2M CAD) seed round (Dec 2023, led by Golden Ventures per BetaKit/
  FreightWaves coverage) — no Series A announced as of this research date.
- Grown from ~13 to ~52 employees per public profiles — still small, single-vendor dependency
  for all our live GPS/HOS data with no second aggregator wired up (TruckerCloud is a stub).

This is a normal seed-stage SaaS risk profile, not a red flag, but it's worth the owner knowing
we have zero redundancy if Terminal has an outage or changes terms — the system already degrades
gracefully to the CSV import path per the code comments, which is the right mitigation already
in place.

## What this scout could and couldn't verify

- **Confirmed from source**: exact endpoints, headers, base URL, response field names our code
  expects, encryption/storage of credentials, cron wiring, graceful CSV fallback when
  disconnected.
- **Confirmed from public search**: product positioning, hosted Link/Connect auth pattern,
  "real-time" (live-passthrough, not cached) nature of the vehicles/HOS endpoints, company
  funding/size.
- **Not verifiable this cycle**: exact rate-limit numbers, sandbox program details, current
  pricing, and whether the `/vehicles` or `/hos/available-time` response shape has changed since
  this adapter was written (Phase 6, commit `484fb92`, 2026-06-11) — `docs.withterminal.com`
  returns HTTP 403 to this scout's automated fetch tooling (Cloudflare bot protection), and no
  mirrored/cached copy of the current docs turned up in search.

**Backlog** (urgent-leaning, but flagged as a verification gap rather than a confirmed break):
someone with interactive browser access (not blocked by Cloudflare) should log into
`docs.withterminal.com` and diff the `/vehicles` and `/hos/available-time` request/response
shape against what `src/lib/hub/telematics.ts` expects. This scout could not rule out drift —
absence of evidence isn't evidence of no breaking change, and this is the one adapter actually
moving live GPS/HOS data into dispatch and IFTA-adjacent workflows.
